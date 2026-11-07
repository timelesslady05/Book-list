from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Book
from app.routers.auth import require_authenticated
from app.schemas import BookCreate, BookResponse, BookUpdate

router = APIRouter(
    prefix="/api/books",
    tags=["Books"],
    dependencies=[Depends(require_authenticated)],
)


@router.get("", response_model=list[BookResponse])
def list_books(
    search: str | None = Query(default=None, max_length=200),
    genre: str | None = Query(default=None, max_length=80),
    reading_status: str | None = Query(
        default=None, pattern="^(want_to_read|reading|completed)$"
    ),
    min_rating: float | None = Query(default=None, ge=1, le=5),
    favorites_only: bool = False,
    db: Session = Depends(get_db),
) -> list[Book]:
    """Return books matching the supplied search and filter options."""
    statement = select(Book).order_by(Book.created_at.desc(), Book.id.desc())
    if search and search.strip():
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Book.title.ilike(term),
                Book.author.ilike(term),
                Book.summary.ilike(term),
                Book.genre.ilike(term),
            )
        )
    if genre:
        statement = statement.where(Book.genre == genre)
    if reading_status:
        statement = statement.where(Book.status == reading_status)
    if min_rating is not None:
        statement = statement.where(Book.rating >= min_rating)
    if favorites_only:
        statement = statement.where(Book.is_favorite.is_(True))
    return list(db.scalars(statement).all())


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
def create_book(book_data: BookCreate, db: Session = Depends(get_db)) -> Book:
    book = Book(**book_data.model_dump())
    if book.status == "completed":
        book.pages_read = book.total_pages or book.pages_read
        book.completed_at = datetime.now(timezone.utc)
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.get("/{book_id}", response_model=BookResponse)
def get_book(book_id: int, db: Session = Depends(get_db)) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    return book


@router.put("/{book_id}", response_model=BookResponse)
def update_book(
    book_id: int, book_data: BookUpdate, db: Session = Depends(get_db)
) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    previous_status = book.status
    for field, value in book_data.model_dump().items():
        setattr(book, field, value)
    if book.status == "completed":
        book.pages_read = book.total_pages or book.pages_read
        if previous_status != "completed":
            book.completed_at = datetime.now(timezone.utc)
    else:
        book.completed_at = None
    db.commit()
    db.refresh(book)
    return book


@router.patch("/{book_id}/favorite", response_model=BookResponse)
def toggle_favorite(book_id: int, db: Session = Depends(get_db)) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    book.is_favorite = not book.is_favorite
    db.commit()
    db.refresh(book)
    return book


@router.patch("/{book_id}/progress", response_model=BookResponse)
def update_progress(
    book_id: int,
    pages_read: int = Query(ge=0, le=100000),
    db: Session = Depends(get_db),
) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    if book.total_pages is None:
        raise HTTPException(
            status_code=422,
            detail="Add the total page count before updating reading progress.",
        )
    if pages_read > book.total_pages:
        raise HTTPException(
            status_code=422, detail="Pages read cannot be greater than total pages."
        )
    book.pages_read = pages_read
    if pages_read == book.total_pages:
        book.status = "completed"
        book.completed_at = datetime.now(timezone.utc)
    elif pages_read > 0:
        book.status = "reading"
        book.completed_at = None
    else:
        book.status = "want_to_read"
        book.completed_at = None
    db.commit()
    db.refresh(book)
    return book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)) -> Response:
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found.")
    db.delete(book)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
