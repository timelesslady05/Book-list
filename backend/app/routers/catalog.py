import json
import re
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.routers.auth import get_current_user

router = APIRouter(
    prefix="/api/catalog/books",
    tags=["Book catalogue"],
    dependencies=[Depends(get_current_user)],
)
OPEN_LIBRARY = "https://openlibrary.org"
USER_AGENT = "BookLoom/1.0 (book cover and description lookup)"
WORK_ID_PATTERN = re.compile(r"^OL\d+W$")


class BookSuggestion(BaseModel):
    work_id: str
    title: str
    authors: list[str]
    cover_url: str | None
    published_year: int | None
    total_pages: int | None
    genre: str


class BookMetadata(BookSuggestion):
    summary: str
    summary_source: str | None
    source_url: str


def fetch_open_library_json(path: str, params: dict[str, str] | None = None) -> dict:
    url = f"{OPEN_LIBRARY}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=8) as response:
            data = json.load(response)
            if not isinstance(data, dict):
                raise HTTPException(
                    status_code=502,
                    detail="Open Library returned an unexpected catalogue response.",
                )
            return data
    except HTTPError as error:
        if error.code == 404:
            raise HTTPException(
                status_code=404, detail="This catalogue record is no longer available."
            ) from error
        if error.code == 429:
            raise HTTPException(
                status_code=503,
                detail="Open Library is receiving too many requests. Please try again shortly.",
            ) from error
        raise HTTPException(
            status_code=502,
            detail="Open Library could not complete the book lookup. Please try again.",
        ) from error
    except (TimeoutError, URLError, OSError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=502,
            detail="Open Library could not be reached. You can still enter the book details manually.",
        ) from error


def normalize_text(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.casefold())
    ascii_text = "".join(character for character in folded if not unicodedata.combining(character))
    return " ".join(re.findall(r"[^\W_]+", ascii_text, flags=re.UNICODE))


def authors_match(query_author: str, authors: list[str]) -> bool:
    query_tokens = set(normalize_text(query_author).split())
    return bool(query_tokens) and any(
        query_tokens == set(normalize_text(author).split()) for author in authors
    )


def choose_genre(subjects: list[str]) -> str:
    genre_keywords = {
        "Fantasy": ("fantasy",),
        "Mystery": ("mystery", "detective", "crime"),
        "Romance": ("romance", "love stories"),
        "Science Fiction": ("science fiction", "sci-fi", "space"),
        "Biography": ("biography", "autobiography", "memoir"),
        "Non-fiction": ("nonfiction", "non-fiction", "history", "science"),
        "Fiction": ("fiction", "novel", "literature"),
    }
    normalized_subjects = [normalize_text(subject) for subject in subjects]
    for genre, keywords in genre_keywords.items():
        if any(
            keyword in subject
            for subject in normalized_subjects
            for keyword in keywords
        ):
            return genre
    return "Other"


def make_short_blurb(description: str) -> str:
    limit = 600
    if len(description) <= limit:
        return description
    sentence_end = max(
        description.rfind(". ", 0, limit + 1),
        description.rfind("! ", 0, limit + 1),
        description.rfind("? ", 0, limit + 1),
    )
    if sentence_end >= 250:
        return description[: sentence_end + 1]
    return description[:limit].rsplit(" ", 1)[0].rstrip(" ,;:") + "…"


@router.get("/lookup", response_model=list[BookSuggestion])
def search_catalog(
    title: str = Query(min_length=2, max_length=200),
    author: str = Query(min_length=2, max_length=160),
) -> list[BookSuggestion]:
    """Find catalogue records whose title and author both match the user's entry."""
    data = fetch_open_library_json(
        "/search.json",
        {
            "title": title.strip(),
            "author": author.strip(),
            "fields": (
                "key,title,author_name,cover_i,first_publish_year,"
                "number_of_pages_median,subject"
            ),
            "limit": "40",
        },
    )

    suggestions: list[BookSuggestion] = []
    seen_work_ids: set[str] = set()
    query_title = normalize_text(title)
    for item in data.get("docs", []):
        work_key = item.get("key", "")
        if not isinstance(work_key, str):
            continue
        work_id = work_key.removeprefix("/works/")
        result_title = item.get("title", "")
        authors = item.get("author_name", [])
        if (
            not WORK_ID_PATTERN.fullmatch(work_id)
            or work_id in seen_work_ids
            or not isinstance(result_title, str)
            or normalize_text(result_title) != query_title
            or not isinstance(authors, list)
            or not all(isinstance(author_name, str) for author_name in authors)
            or not authors_match(author, authors)
        ):
            continue
        seen_work_ids.add(work_id)
        cover_id = item.get("cover_i")
        cover_url = (
            f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg?default=false"
            if isinstance(cover_id, int) and cover_id > 0
            else None
        )
        page_count = item.get("number_of_pages_median")
        published_year = item.get("first_publish_year")
        subjects = item.get("subject", [])
        suggestions.append(
            BookSuggestion(
                work_id=work_id,
                title=result_title,
                authors=authors,
                cover_url=cover_url,
                published_year=(
                    published_year
                    if isinstance(published_year, int) and 1 <= published_year <= 9999
                    else None
                ),
                total_pages=page_count if isinstance(page_count, int) and page_count > 0 else None,
                genre=choose_genre(subjects if isinstance(subjects, list) else []),
            )
        )
        if len(suggestions) == 5:
            break
    return suggestions


@router.get("/lookup/work", response_model=BookMetadata)
def get_book_metadata(work_id: str = Query(pattern=r"^OL\d+W$")) -> BookMetadata:
    """Fetch a selected work's description from its verified Open Library record."""
    item = fetch_open_library_json(f"/works/{work_id}.json")
    title = item.get("title")
    if not isinstance(title, str) or not title.strip():
        raise HTTPException(
            status_code=404, detail="This catalogue record has no usable book title."
        )

    description = item.get("description")
    if isinstance(description, dict):
        description = description.get("value")
    summary_source = "description" if isinstance(description, str) else None
    if not isinstance(description, str) or not description.strip():
        first_sentence = item.get("first_sentence")
        if isinstance(first_sentence, dict):
            first_sentence = first_sentence.get("value")
        if isinstance(first_sentence, list):
            first_sentence = next(
                (
                    sentence
                    for sentence in first_sentence
                    if isinstance(sentence, str) and sentence.strip()
                ),
                None,
            )
        description = first_sentence if isinstance(first_sentence, str) else ""
        summary_source = "first_sentence" if description else None

    cover_ids = item.get("covers", [])
    if not isinstance(cover_ids, list):
        cover_ids = []
    cover_id = next(
        (cover for cover in cover_ids if isinstance(cover, int) and cover > 0),
        None,
    )
    cover_url = (
        f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg?default=false"
        if cover_id
        else None
    )

    return BookMetadata(
        work_id=work_id,
        title=title.strip(),
        authors=[],
        cover_url=cover_url,
        published_year=None,
        total_pages=None,
        genre=choose_genre(
            item.get("subjects", [])
            if isinstance(item.get("subjects", []), list)
            else []
        ),
        summary=make_short_blurb(description.strip()),
        summary_source=summary_source,
        source_url=f"{OPEN_LIBRARY}/works/{work_id}",
    )
