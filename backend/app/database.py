import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env "
        "for local development, or configure it in your hosting provider."
    )

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://", "postgresql+psycopg2://", 1
    )

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base class used by all SQLAlchemy database models."""


def add_new_book_columns() -> None:
    """Add newer book fields to an existing database without deleting its rows."""
    from app.models import Book

    inspector = inspect(engine)
    if "books" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("books")}
    dialect = engine.dialect
    quote = dialect.identifier_preparer.quote

    with engine.begin() as connection:
        for column in Book.__table__.columns:
            if column.name in existing_columns or column.primary_key:
                continue
            column_type = column.type.compile(dialect=dialect)
            default = ""
            if column.name == "status":
                default = " DEFAULT 'want_to_read'"
            elif column.name == "pages_read":
                default = " DEFAULT 0"
            elif column.name == "is_favorite":
                default = " DEFAULT false" if dialect.name == "postgresql" else " DEFAULT 0"
            nullable = "" if column.nullable else " NOT NULL"
            connection.execute(
                text(
                    f"ALTER TABLE {quote('books')} ADD COLUMN "
                    f"{quote(column.name)} {column_type}{default}{nullable}"
                )
            )
            existing_columns.add(column.name)


def get_db() -> Generator[Session, None, None]:
    """Provide one database session for an API request and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
