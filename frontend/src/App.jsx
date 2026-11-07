import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8001").replace(
  /\/$/,
  "",
);
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "books", label: "My Books", icon: "book" },
  { id: "add", label: "Add a Book", icon: "plus" },
  { id: "favorites", label: "Favourites", icon: "heart" },
  { id: "reading", label: "Reading List", icon: "progress" },
  { id: "profile", label: "Profile & Settings", icon: "settings" },
];
const GENRES = [
  "Fiction",
  "Fantasy",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Non-fiction",
  "Biography",
  "Other",
];
const STATUSES = [
  { value: "want_to_read", label: "Want to read" },
  { value: "reading", label: "Currently reading" },
  { value: "completed", label: "Completed" },
];
const EMPTY_BOOK = {
  title: "",
  author: "",
  rating: 5,
  summary: "",
  genre: "Fiction",
  published_year: "",
  cover_url: "",
  status: "want_to_read",
  total_pages: "",
  pages_read: 0,
  review: "",
  is_favorite: false,
};
const DEFAULT_PROFILE = { name: "Reader", email: "", yearlyGoal: 24 };

function Icon({ name, size = 20 }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /><rect x="3" y="14" width="8" height="7" rx="1.5" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    heart: <><path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.8 2.4Z" /></>,
    progress: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
    star: <><path d="m12 3 2.75 5.58 6.16.9-4.46 4.35 1.05 6.14L12 17.07l-5.5 2.9 1.05-6.14L3.1 9.48l6.16-.9z" /></>,
    edit: <><path d="m15 5 4 4M4 20l4.2-.9L19 8.3 15.7 5 4.9 15.8z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /></>,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return (
    <svg
      aria-hidden="true"
      className="brand-mark"
      fill="none"
      viewBox="0 0 40 40"
    >
      <path
        d="M8.5 10.5c4.3-.9 8.3.2 11.5 2.8v19c-3.1-2.4-7-3.3-11.5-2.4v-19.4Zm23 0c-4.3-.9-8.3.2-11.5 2.8v19c3.1-2.4 7-3.3 11.5-2.4V10.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M12 16c2 .1 3.8.8 5.3 1.8M12 20c1.7.1 3.3.6 4.7 1.5m11.3-5.3c-2 .1-3.8.8-5.3 1.8m5.3 2c-1.7.1-3.3.6-4.7 1.5"
        opacity=".78"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
      <path
        d="M20 5.2c4.3 0 7.8 3.4 7.8 7.7 0 3.5-2.1 5.1-5.1 7.5-1.5 1.2-2.7 2.8-2.7 5.1"
        stroke="#e4bd7a"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="20" cy="31.7" r="1.5" fill="#e4bd7a" />
    </svg>
  );
}

function StarRating({ value, onChange, label = "Rating" }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          aria-checked={Number(value) === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          className={Number(value) >= star ? "star-on" : ""}
          key={star}
          onClick={() => onChange(star)}
          role="radio"
          type="button"
        >
          <Icon name="star" size={19} />
        </button>
      ))}
    </div>
  );
}

function BookCover({ book, color = "sage" }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [book.cover_url]);
  return (
    <div className={`book-cover cover-${color}${book.cover_url && !imageFailed ? " has-image" : ""}`}>
      {book.cover_url && !imageFailed ? (
        <img alt={`Cover of ${book.title}`} onError={() => setImageFailed(true)} src={book.cover_url} />
      ) : (
        <>
          <span className="cover-mark"><Icon name="book" size={26} /></span>
          <span className="cover-initials">{book.title.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</span>
          {book.published_year && <span className="cover-year">{book.published_year}</span>}
        </>
      )}
    </div>
  );
}

function BookCard({ book, index, onEdit, onDelete, onFavorite, onStatusChange, onProgress }) {
  const progress = book.total_pages ? Math.round((book.pages_read / book.total_pages) * 100) : 0;
  return (
    <article className="book-card">
      <div className="book-cover-wrap">
        <BookCover book={book} color={["sage", "terracotta", "plum", "blue", "gold", "rose"][index % 6]} />
        <button
          aria-label={book.is_favorite ? `Remove ${book.title} from favourites` : `Add ${book.title} to favourites`}
          className={`favorite-toggle ${book.is_favorite ? "is-favorite" : ""}`}
          onClick={() => onFavorite(book)}
          title={book.is_favorite ? "Remove from favourites" : "Add to favourites"}
          type="button"
        >
          <Icon name="heart" size={16} />
        </button>
      </div>
      <div className="book-card-content">
        <div className="book-card-topline">
          <span className="genre-pill">{book.genre}</span>
          <span className="rating"><Icon name="star" size={14} /><span>{Number(book.rating).toFixed(1)}</span></span>
        </div>
        <h3>{book.title}</h3>
        <p className="book-author">by {book.author}</p>
        <p className="book-summary">{book.summary}</p>
        {book.total_pages ? (
          <div className="card-progress">
            <div className="progress-caption"><span>{book.pages_read} / {book.total_pages} pages</span><strong>{progress}%</strong></div>
            <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
        ) : null}
        {book.review && <p className="book-review">“{book.review}”</p>}
        <div className="book-card-meta">
          <select aria-label={`Reading status for ${book.title}`} onChange={(event) => onStatusChange(book, event.target.value)} value={book.status}>
            {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          {book.total_pages && book.status === "reading" ? (
            <button className="progress-edit" onClick={() => onProgress(book)} type="button">Update pages</button>
          ) : null}
        </div>
        <div className="book-actions">
          <button className="text-button" onClick={() => onEdit(book)} type="button"><Icon name="edit" size={15} /> Edit</button>
          <button aria-label={`Delete ${book.title}`} className="icon-button delete-button" onClick={() => onDelete(book)} title="Delete book" type="button"><Icon name="trash" size={16} /></button>
        </div>
      </div>
    </article>
  );
}

function BookForm({ book, onSave, onCancel, pageMode = false }) {
  const [form, setForm] = useState(() => book ? {
    ...book,
    rating: Number(book.rating),
    published_year: book.published_year || "",
    total_pages: book.total_pages || "",
  } : { ...EMPTY_BOOK });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState({ status: "idle", matches: [] });
  const editedFields = useRef(new Set());
  const catalogFields = useRef(new Set());
  const lookupVersion = useRef(0);

  const applyCatalogBook = useCallback(async (suggestion, signal, requestVersion) => {
    setLookup({ status: "loading_details", matches: [] });
    try {
      const response = await fetch(
        `${API_URL}/api/catalog/books/lookup/work?work_id=${encodeURIComponent(suggestion.work_id)}`,
        { signal },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          typeof result?.detail === "string"
            ? result.detail
            : "We found the book, but could not load its catalogue details.",
        );
      }
      const details = await response.json();
      if (signal?.aborted || requestVersion !== lookupVersion.current) return;
      const metadata = { ...suggestion, ...details };
      setForm((current) => {
        const updated = { ...current };
        const values = {
          cover_url: metadata.cover_url || suggestion.cover_url,
          summary: metadata.summary,
          genre: suggestion.genre !== "Other" ? suggestion.genre : metadata.genre,
          published_year: suggestion.published_year,
          total_pages: suggestion.total_pages,
        };
        for (const [field, value] of Object.entries(values)) {
          if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            !editedFields.current.has(field) &&
            (
              !current[field] ||
              catalogFields.current.has(field) ||
              (field === "genre" && current.genre === "Fiction")
            )
          ) {
            updated[field] = String(value);
            catalogFields.current.add(field);
          }
        }
        return updated;
      });
      setLookup({
        status: "found",
        matches: [],
        sourceUrl: metadata.source_url,
        summarySource: metadata.summary_source,
      });
    } catch (lookupError) {
      if (lookupError.name === "AbortError") return;
      setLookup({ status: "error", matches: [], message: lookupError.message });
    }
  }, []);

  useEffect(() => {
    const requestVersion = ++lookupVersion.current;
    if (book) return undefined;
    const title = form.title.trim();
    const author = form.author.trim();
    if (title.length < 2 || author.length < 2) {
      setLookup({ status: "idle", matches: [] });
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookup({ status: "searching", matches: [] });
      try {
        const query = new URLSearchParams({ title, author });
        const response = await fetch(
          `${API_URL}/api/catalog/books/lookup?${query}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(
            typeof result?.detail === "string"
              ? result.detail
              : "The book catalogue could not be searched.",
          );
        }
        const matches = await response.json();
        if (controller.signal.aborted) return;
        if (matches.length === 1) {
          await applyCatalogBook(matches[0], controller.signal, requestVersion);
        } else {
          setLookup({
            status: matches.length ? "matches" : "not_found",
            matches,
          });
        }
      } catch (lookupError) {
        if (lookupError.name !== "AbortError") {
          setLookup({
            status: "error",
            matches: [],
            message: lookupError.message,
          });
        }
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [applyCatalogBook, book, form.author, form.title]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    if (name === "title" || name === "author") {
      lookupVersion.current += 1;
      setLookup({ status: "idle", matches: [] });
    }
    editedFields.current.add(name);
    if (name !== "title" && name !== "author") {
      catalogFields.current.delete(name);
    }
    const fieldsToClear =
      name === "title" || name === "author"
        ? new Set(catalogFields.current)
        : null;
    if (fieldsToClear) catalogFields.current.clear();
    setForm((current) => {
      const updated = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "title" || name === "author") {
        const defaults = {
          cover_url: "",
          summary: "",
          genre: "Fiction",
          published_year: "",
          total_pages: "",
        };
        for (const [field, defaultValue] of Object.entries(defaults)) {
          if (
            fieldsToClear.has(field) &&
            !editedFields.current.has(field)
          ) {
            updated[field] = defaultValue;
          }
        }
      }
      return updated;
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        rating: Number(form.rating),
        published_year: form.published_year ? Number(form.published_year) : null,
        total_pages: form.total_pages ? Number(form.total_pages) : null,
        pages_read: Number(form.pages_read) || 0,
        cover_url: form.cover_url.trim() || null,
        review: form.review.trim() || null,
      });
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  }

  return (
    <form className={`book-form${pageMode ? " full-book-form" : ""}`} onSubmit={submitForm}>
      <div className="form-grid">
        <label>Book title<input autoFocus maxLength={200} name="title" onChange={updateField} placeholder="The name on the cover" required value={form.title} /></label>
        <label>Author<input maxLength={160} name="author" onChange={updateField} placeholder="Who wrote it?" required value={form.author} /></label>
      </div>
      {!book && lookup.status !== "idle" && (
        <section aria-live="polite" className={`catalog-lookup catalog-${lookup.status}`}>
          <div className="catalog-heading">
            <span className="catalog-icon"><Icon name="search" size={16} /></span>
            <div>
              <strong>
                {lookup.status === "searching" && "Looking for this exact title and author..."}
                {lookup.status === "loading_details" && "Found a match — fetching its cover and blurb..."}
                {lookup.status === "found" && "Book information found"}
                {lookup.status === "matches" && "Choose the matching book"}
                {lookup.status === "not_found" && "No exact match found"}
                {lookup.status === "error" && "Book lookup unavailable"}
              </strong>
              <span>
                {lookup.status === "searching" && "Checking Open Library’s public catalogue"}
                {lookup.status === "loading_details" && "Fetching the selected catalogue record"}
                {lookup.status === "found" && "Review the cover and description before adding it"}
                {lookup.status === "matches" && "We checked that the title and author match your entry"}
                {lookup.status === "not_found" && "You can still enter the cover and summary yourself"}
                {lookup.status === "error" && (lookup.message || "You can still enter all book details yourself")}
              </span>
            </div>
            {(lookup.status === "searching" || lookup.status === "loading_details") && (
              <span aria-label="Loading" className="loading-spinner" />
            )}
          </div>
          {lookup.matches.length > 0 && (
            <div className="catalog-matches">
              {lookup.matches.map((match) => (
                <button
                  className="catalog-match"
                  key={match.work_id}
                  onClick={() => {
                    const requestVersion = ++lookupVersion.current;
                    applyCatalogBook(match, undefined, requestVersion);
                  }}
                  type="button"
                >
                  {match.cover_url ? (
                    <img alt="" loading="lazy" src={match.cover_url.replace("-L.jpg", "-S.jpg")} />
                  ) : (
                    <span className="catalog-cover-placeholder"><Icon name="book" size={18} /></span>
                  )}
                  <span><strong>{match.title}</strong><small>{match.authors.join(", ")}{match.published_year ? ` · first published ${match.published_year}` : ""}{match.total_pages ? ` · ${match.total_pages} pages` : ""}</small></span>
                  <span className="catalog-select-label">Use this match</span>
                </button>
              ))}
            </div>
          )}
          {lookup.status === "found" && (
            <span className="catalog-credit">
              {lookup.summarySource === "first_sentence"
                ? "The catalogue did not include a blurb; its first sentence was added instead."
                : lookup.summarySource === "description"
                  ? "The catalogue description was added to the summary."
                  : "No description is available for this catalogue record."}
              {lookup.sourceUrl && <>{" "}Source: <a href={lookup.sourceUrl} rel="noreferrer" target="_blank">Open Library</a>.</>}
            </span>
          )}
          {lookup.status === "matches" && (
            <span className="catalog-credit">Select the matching catalogue record. Cover, page count, and publication details can vary by edition, so please check them.</span>
          )}
        </section>
      )}
      <div className="form-grid">
        <label>Genre<select name="genre" onChange={updateField} value={form.genre}>{GENRES.map((genre) => <option key={genre}>{genre}</option>)}</select></label>
        <label>Reading status<select name="status" onChange={updateField} value={form.status}>{STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
        <label>Publication year <span className="optional-label">catalogue may show the first publication year</span><input max="9999" min="1" name="published_year" onChange={updateField} placeholder="e.g. 2022" type="number" value={form.published_year} /></label>
        <label>Book cover image URL <span className="optional-label">optional</span><input maxLength={2000} name="cover_url" onChange={updateField} placeholder="https://example.com/cover.jpg" type="url" value={form.cover_url || ""} /></label>
        <label>Total pages <span className="optional-label">optional</span><input max="100000" min="1" name="total_pages" onChange={updateField} placeholder="e.g. 320" type="number" value={form.total_pages} /></label>
        <label>Pages read<input max={form.total_pages || 100000} min="0" name="pages_read" onChange={updateField} type="number" value={form.pages_read} /></label>
      </div>
      <label>Your rating</label>
      <StarRating onChange={(rating) => setForm((current) => ({ ...current, rating }))} value={form.rating} />
      <label>Short summary / blurb<textarea maxLength={1200} name="summary" onChange={updateField} placeholder="Enter the book’s blurb, or we’ll look for a catalogue description..." required rows={3} value={form.summary} /></label>
      <label>Your personal review <span className="optional-label">optional</span><textarea maxLength={5000} name="review" onChange={updateField} placeholder="What did you think? Add a note for your future self..." rows={3} value={form.review || ""} /></label>
      <label className="checkbox-label"><input checked={Boolean(form.is_favorite)} name="is_favorite" onChange={updateField} type="checkbox" /> Add to my favourites</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {onCancel && <button className="secondary-button" onClick={onCancel} type="button">Cancel</button>}
        <button className="primary-button" disabled={saving} type="submit"><Icon name={book ? "edit" : "plus"} size={17} />{saving ? "Saving..." : book ? "Save changes" : "Add to my shelf"}</button>
      </div>
    </form>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="content-page-heading">
      <div><span className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action}
    </div>
  );
}

function EmptyState({ title, message, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name="book" size={26} /></div><h3>{title}</h3><p>{message}</p>{action}</div>;
}

function ProgressModal({ book, onClose, onSave }) {
  const [pages, setPages] = useState(book.pages_read);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSave(book, Number(pages));
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    }
  }
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="progress-title" aria-modal="true" className="book-dialog progress-dialog" role="dialog">
        <div className="dialog-heading"><div><span className="eyebrow">KEEP YOUR MOMENTUM</span><h2 id="progress-title">Update progress</h2></div><button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button></div>
        <p className="progress-book-title">{book.title} <span>by {book.author}</span></p>
        <form className="book-form" onSubmit={submit}>
          <label>Pages read (of {book.total_pages})<input max={book.total_pages} min="0" onChange={(event) => setPages(event.target.value)} required type="number" value={pages} /></label>
          <div className="progress-track progress-track-large"><span style={{ width: `${Math.min(100, (pages / book.total_pages) * 100)}%` }} /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button className="secondary-button" onClick={onClose} type="button">Cancel</button><button className="primary-button" type="submit">Save progress</button></div>
        </form>
      </section>
    </div>
  );
}

function Dashboard({ books, onNavigate, onEdit, onDelete, onFavorite, onStatusChange, onProgress }) {
  const completed = books.filter((book) => book.status === "completed");
  const reading = books.filter((book) => book.status === "reading");
  const average = books.length ? (books.reduce((sum, book) => sum + Number(book.rating), 0) / books.length).toFixed(1) : "—";
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const count = books.filter((book) => {
        const date = new Date(book.created_at);
        return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
      }).length;
      return { label: month.toLocaleDateString(undefined, { month: "short" }), count };
    });
  }, [books]);
  const maxActivity = Math.max(1, ...months.map((month) => month.count));
  const recent = books.slice(0, 4);
  const readingPercent = reading.length
    ? Math.round(reading.reduce((sum, book) => sum + (book.total_pages ? book.pages_read / book.total_pages : 0), 0) / reading.length * 100)
    : 0;
  return (
    <>
      <section className="welcome-section dashboard-welcome">
        <div className="welcome-copy"><span className="eyebrow"><span className="eyebrow-line" /> WELCOME TO BOOKLOOM</span><h1>Every story<br />finds its <em>thread.</em></h1><p>Gather the books you love, keep track of every chapter, and weave your reading life together.</p><button className="primary-button dashboard-cta" onClick={() => onNavigate("add")} type="button"><Icon name="plus" size={17} /> Add a book</button></div>
        <div aria-hidden="true" className="welcome-art"><div className="art-sun" /><div className="art-shelf"><div className="art-book art-book-one" /><div className="art-book art-book-two" /><div className="art-book art-book-three" /><div className="art-book art-book-four" /><div className="art-plant"><span /><i /><b /></div></div><div className="art-shelf-line" /></div>
      </section>
      <section aria-label="Library statistics" className="stats-row dashboard-stats">
        <div className="stat-card"><span className="stat-icon stat-icon-sage"><Icon name="book" size={18} /></span><div><span className="stat-label">TOTAL BOOKS</span><strong>{books.length}</strong></div><span className="stat-caption">on your shelf</span></div>
        <div className="stat-card"><span className="stat-icon stat-icon-gold"><Icon name="star" size={18} /></span><div><span className="stat-label">AVERAGE RATING</span><strong>{average}</strong></div><span className="stat-caption">out of 5</span></div>
        <div className="stat-card"><span className="stat-icon stat-icon-sage"><Icon name="progress" size={18} /></span><div><span className="stat-label">COMPLETED</span><strong>{completed.length}</strong></div><span className="stat-caption">stories finished</span></div>
        <div className="stat-card"><span className="stat-icon stat-icon-gold"><Icon name="sparkle" size={18} /></span><div><span className="stat-label">CURRENTLY READING</span><strong>{reading.length}</strong></div><span className="stat-caption">in progress</span></div>
      </section>
      <div className="dashboard-panels">
        <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR READING JOURNEY</span><h2>Monthly activity</h2></div><span className="panel-icon"><Icon name="dashboard" size={17} /></span></div><div aria-label="Books added per month in the last six months" className="activity-chart">{months.map((month) => <div className="chart-column" key={`${month.label}-${month.count}`}><span className="chart-count">{month.count || ""}</span><div className="chart-track"><span style={{ height: `${Math.max(5, month.count / maxActivity * 100)}%` }} /></div><span className="chart-month">{month.label}</span></div>)}</div><p className="chart-caption">Books added to your library each month</p></section>
        <section className="panel reading-panel"><div className="panel-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Reading progress</h2></div><span className="panel-icon"><Icon name="progress" size={17} /></span></div>{reading.length ? <><div className="reading-progress-number">{readingPercent}<span>%</span></div><p className="reading-progress-caption">average progress across books you’re reading</p><div className="progress-track progress-track-large"><span style={{ width: `${readingPercent}%` }} /></div><button className="text-button" onClick={() => onNavigate("reading")} type="button">View your reading list <span>→</span></button></> : <div className="panel-empty"><p>Your reading progress will appear here.</p><button className="text-button" onClick={() => onNavigate("books")} type="button">Choose a book to read →</button></div>}</section>
      </div>
      <section className="dashboard-recent"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> FRESH OFF THE SHELF</span><h2>Recently added</h2></div><button className="text-button" onClick={() => onNavigate("books")} type="button">See all books <Icon name="arrow" size={14} /></button></div>{recent.length ? <div className="book-grid">{recent.map((book, index) => <BookCard book={book} index={index} key={book.id} onDelete={onDelete} onEdit={onEdit} onFavorite={onFavorite} onProgress={onProgress} onStatusChange={onStatusChange} />)}</div> : <EmptyState action={<button className="primary-button" onClick={() => onNavigate("add")} type="button"><Icon name="plus" size={17} /> Add your first book</button>} message="Start collecting the stories you love. Your first book is only a click away." title="Your shelf is a blank page" />}</section>
    </>
  );
}

function Bookshelf({ books, title, eyebrow, description, search, setSearch, genre, setGenre, minRating, setMinRating, onEdit, onDelete, onFavorite, onStatusChange, onProgress, onAdd, loading }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = books.filter((book) => {
    const term = search.trim().toLowerCase();
    const textMatch = !term || [book.title, book.author, book.summary, book.genre].some((value) => value.toLowerCase().includes(term));
    return textMatch && (genre === "all" || book.genre === genre) && (statusFilter === "all" || book.status === statusFilter) && Number(book.rating) >= Number(minRating);
  });
  return (
    <section className="listing-page">
      <PageHeading action={title === "My Books" ? <button className="primary-button" onClick={onAdd} type="button"><Icon name="plus" size={17} /> Add a book</button> : null} description={description} eyebrow={eyebrow} title={title} />
      <div className="filter-toolbar">
        <label className="search-box"><Icon name="search" size={18} /><input aria-label="Search by title or author" onChange={(event) => setSearch(event.target.value)} placeholder="Search title, author, or a note..." type="search" value={search} /></label>
        <select aria-label="Filter by genre" onChange={(event) => setGenre(event.target.value)} value={genre}><option value="all">All genres</option>{GENRES.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter by reading status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">All statuses</option>{STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <select aria-label="Filter by minimum rating" onChange={(event) => setMinRating(event.target.value)} value={minRating}><option value="1">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="5">5 stars</option></select>
      </div>
      {loading ? <div className="loading-state"><span className="loading-spinner" /> Gathering your books...</div> : filtered.length ? <div className="book-grid">{filtered.map((book, index) => <BookCard book={book} index={index} key={book.id} onDelete={onDelete} onEdit={onEdit} onFavorite={onFavorite} onProgress={onProgress} onStatusChange={onStatusChange} />)}</div> : <EmptyState action={title === "My Books" ? <button className="primary-button" onClick={onAdd} type="button"><Icon name="plus" size={17} /> Add a book</button> : null} message={books.length ? "Try changing your search or filters to find what you’re looking for." : "Your library is waiting for its first story."} title={books.length ? "No books match those filters" : "Nothing on this shelf yet"} />}
    </section>
  );
}

function ReadingList({ books, onNavigate, onEdit, onDelete, onFavorite, onStatusChange, onProgress }) {
  const [tab, setTab] = useState("all");
  const filtered = books.filter((book) => tab === "all" || book.status === tab);
  return (
    <section className="listing-page">
      <PageHeading description="Keep an eye on what you’re reading, what’s next, and every story you’ve finished." eyebrow="YOUR READING JOURNEY" title="Reading list" />
      <div className="reading-tabs">{[{ id: "all", label: "All books" }, ...STATUSES.map((item) => ({ id: item.value, label: item.label }))].map((item) => <button className={tab === item.id ? "tab-active" : ""} key={item.id} onClick={() => setTab(item.id)} type="button">{item.label}<span>{item.id === "all" ? books.length : books.filter((book) => book.status === item.id).length}</span></button>)}</div>
      {filtered.length ? <div className="book-grid">{filtered.map((book, index) => <BookCard book={book} index={index} key={book.id} onDelete={onDelete} onEdit={onEdit} onFavorite={onFavorite} onProgress={onProgress} onStatusChange={onStatusChange} />)}</div> : <EmptyState action={<button className="primary-button" onClick={() => onNavigate("books")} type="button">Explore my books</button>} message="Add books to your library, then choose their reading status." title="This list is empty for now" />}
    </section>
  );
}

function ProfileSettings({ profile, setProfile, darkMode, setDarkMode, completed, onSave }) {
  const [saved, setSaved] = useState(false);
  function submit(event) {
    event.preventDefault();
    onSave();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }
  return (
    <section className="listing-page">
      <PageHeading description="Make your reading corner feel like yours." eyebrow="YOUR ACCOUNT" title="Profile & settings" />
      <form className="settings-card" onSubmit={submit}>
        <div className="settings-section-title"><div className="profile-avatar">{(profile.name || "R").trim().charAt(0).toUpperCase()}</div><div><h2>Your profile</h2><p>Your details are saved in this browser.</p></div></div>
        <div className="settings-fields"><label>Display name<input maxLength={80} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} value={profile.name} /></label><label>Email address <span className="optional-label">optional</span><input maxLength={200} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" type="email" value={profile.email} /></label><label>Yearly reading goal<input max="365" min="1" onChange={(event) => setProfile((current) => ({ ...current, yearlyGoal: Number(event.target.value) }))} type="number" value={profile.yearlyGoal} /></label></div>
        <div className="settings-section-title settings-preferences"><span className="settings-icon"><Icon name={darkMode ? "moon" : "sun"} size={20} /></span><div><h2>Appearance</h2><p>Choose the look that feels right for you.</p></div></div>
        <label className="setting-toggle"><span><strong>Dark mode</strong><small>Use a darker palette across your library.</small></span><input checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} type="checkbox" /><span className="toggle-track" /></label>
        <div className="goal-progress"><div><span>THIS YEAR’S READING GOAL</span><strong>{completed.length} / {profile.yearlyGoal || 24} books</strong></div><div className="progress-track progress-track-large"><span style={{ width: `${Math.min(100, completed.length / (profile.yearlyGoal || 24) * 100)}%` }} /></div></div>
        <div className="settings-save"><span aria-live="polite">{saved ? "Preferences saved." : "Profile preferences stay on this device."}</span><button className="primary-button" type="submit">Save preferences</button></div>
      </form>
      <p className="settings-note">This project is a personal library for one reader. Accounts, sign-in, and shared profiles are not enabled.</p>
    </section>
  );
}

export default function App() {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("all");
  const [minRating, setMinRating] = useState("1");
  const [editBook, setEditBook] = useState(null);
  const [progressBook, setProgressBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("booknook-dark") === "true");
  const [profile, setProfile] = useState(() => {
    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem("booknook-profile") || "{}") };
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/books`);
      if (!response.ok) throw new Error("The book list could not be loaded.");
      setBooks(await response.json());
    } catch {
      setError("We couldn’t connect to your library. Check that the backend and database are running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBooks(); }, [loadBooks]);
  useEffect(() => {
    localStorage.setItem("booknook-dark", String(darkMode));
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);
  useEffect(() => { localStorage.setItem("booknook-profile", JSON.stringify(profile)); }, [profile]);

  const sortedBooks = useMemo(() => [...books].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [books]);
  const favorites = sortedBooks.filter((book) => book.is_favorite);
  const completed = sortedBooks.filter((book) => book.status === "completed");

  async function saveBook(bookData, bookId = null) {
    const response = await fetch(bookId ? `${API_URL}/api/books/${bookId}` : `${API_URL}/api/books`, {
      method: bookId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookData),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(typeof result?.detail === "string" ? result.detail : "Please check the book details and try again.");
    }
    if (bookId) setEditBook(null);
    else setPage("books");
    await loadBooks();
  }

  async function deleteBook(book) {
    if (!window.confirm(`Remove “${book.title}” from your library?`)) return;
    try {
      const response = await fetch(`${API_URL}/api/books/${book.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("The book could not be deleted. Please try again.");
      await loadBooks();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function toggleFavorite(book) {
    try {
      const response = await fetch(`${API_URL}/api/books/${book.id}/favorite`, { method: "PATCH" });
      if (!response.ok) throw new Error("Could not update favourites.");
      const updatedBook = await response.json();
      setBooks((current) => current.map((item) => item.id === book.id ? updatedBook : item));
    } catch (favoriteError) {
      setError(favoriteError.message);
    }
  }

  async function changeStatus(book, status) {
    try {
      await saveBook({ ...book, status }, book.id);
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  async function saveProgress(book, pagesRead) {
    const response = await fetch(`${API_URL}/api/books/${book.id}/progress?pages_read=${pagesRead}`, { method: "PATCH" });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(typeof result?.detail === "string" ? result.detail : "Could not update reading progress.");
    }
    const updatedBook = await response.json();
    setBooks((current) => current.map((item) => item.id === book.id ? updatedBook : item));
  }

  function navigate(nextPage) {
    setPage(nextPage);
    setError("");
  }

  function renderBookshelf(options) {
    return <Bookshelf {...options} books={options.favoritesOnly ? favorites : sortedBooks} genre={genre} loading={loading} minRating={minRating} onAdd={() => navigate("add")} onDelete={deleteBook} onEdit={setEditBook} onFavorite={toggleFavorite} onProgress={setProgressBook} onStatusChange={changeStatus} search={search} setGenre={setGenre} setMinRating={setMinRating} setSearch={setSearch} />;
  }

  const activeNav = NAV_ITEMS.find((item) => item.id === page);
  return (
    <div className={`app-shell${darkMode ? " dark-theme" : ""}`}>
      <aside className="sidebar">
        <button aria-label="BookLoom home" className="brand" onClick={() => navigate("dashboard")} type="button"><span className="brand-icon"><BrandMark /></span><span className="brand-word">Book<span className="brand-light">Loom</span><small>YOUR READING, WOVEN TOGETHER</small></span></button>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav aria-label="Main navigation" className="side-nav">
          {NAV_ITEMS.map((item) => <button aria-current={page === item.id ? "page" : undefined} className={`nav-item${page === item.id ? " nav-item-active" : ""}`} key={item.id} onClick={() => navigate(item.id)} type="button"><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === "books" && <span className="nav-count">{books.length}</span>}{item.id === "favorites" && <span className="nav-count">{favorites.length}</span>}</button>)}
        </nav>
        <div className="sidebar-note"><div className="note-icon"><Icon name="sparkle" size={18} /></div><p>Every book is a little world waiting to be revisited.</p><span>YOUR READING CORNER</span></div>
        <button className="sidebar-profile" onClick={() => navigate("profile")} type="button"><span className="profile-avatar small-avatar">{(profile.name || "R").trim().charAt(0).toUpperCase()}</span><span><strong>{profile.name || "Reader"}</strong><small>Personal library</small></span><Icon name="settings" size={16} /></button>
      </aside>
      <main className="main-content">
        <header className="topbar"><button aria-label="BookLoom home" className="mobile-brand" onClick={() => navigate("dashboard")} type="button"><span className="brand-icon"><BrandMark /></span><span>Book<span className="brand-light">Loom</span></span></button><span className="breadcrumb">Your space <span>/</span> <strong>{activeNav?.label}</strong></span><button className="topbar-add" onClick={() => navigate("add")} type="button"><Icon name="plus" size={17} /> Add a book</button></header>
        <div className="page-content">
          {error && <div className="error-banner" role="alert"><span>{error}</span><button className="text-button" onClick={loadBooks} type="button">Try again</button></div>}
          {page === "dashboard" && <Dashboard books={sortedBooks} onDelete={deleteBook} onEdit={setEditBook} onFavorite={toggleFavorite} onNavigate={navigate} onProgress={setProgressBook} onStatusChange={changeStatus} />}
          {page === "books" && renderBookshelf({ description: "Every story you’ve saved, gathered in one place.", eyebrow: "THE COLLECTION", title: "My Books" })}
          {page === "add" && <section className="listing-page"><PageHeading description="Add the details you want to remember. You can update them any time." eyebrow="A NEW CHAPTER" title="Add a book" /><div className="settings-card add-book-card"><BookForm onSave={(bookData) => saveBook(bookData)} pageMode /></div></section>}
          {page === "favorites" && renderBookshelf({ description: "The stories and authors you want to keep closest.", eyebrow: "THE ONES YOU LOVE", favoritesOnly: true, title: "Favourites" })}
          {page === "reading" && <ReadingList books={sortedBooks} onDelete={deleteBook} onEdit={setEditBook} onFavorite={toggleFavorite} onNavigate={navigate} onProgress={setProgressBook} onStatusChange={changeStatus} />}
          {page === "profile" && <ProfileSettings completed={completed} darkMode={darkMode} onSave={() => localStorage.setItem("booknook-profile", JSON.stringify(profile))} profile={profile} setDarkMode={setDarkMode} setProfile={setProfile} />}
          <footer className="page-footer">Made for the love of a good story <span>✳</span></footer>
        </div>
      </main>
      {editBook && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditBook(null); }}><section aria-labelledby="edit-book-title" aria-modal="true" className="book-dialog" role="dialog"><div className="dialog-heading"><div><span className="eyebrow">YOUR COLLECTION</span><h2 id="edit-book-title">Edit this book</h2></div><button aria-label="Close dialog" className="icon-button" onClick={() => setEditBook(null)} type="button"><Icon name="close" /></button></div><BookForm book={editBook} onCancel={() => setEditBook(null)} onSave={(bookData) => saveBook(bookData, editBook.id)} /></section></div>}
      {progressBook && <ProgressModal book={progressBook} onClose={() => setProgressBook(null)} onSave={saveProgress} />}
    </div>
  );
}
