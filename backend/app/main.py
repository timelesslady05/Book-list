from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, add_new_book_columns, engine
from app.models import Book
from app.routers.books import router as books_router
from app.routers.catalog import router as catalog_router

app = FastAPI(
    title="Book List API",
    description="An API for saving and managing your personal book list.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importing Book above registers its table before SQLAlchemy creates the schema.
Base.metadata.create_all(bind=engine)
add_new_book_columns()

app.include_router(books_router)
app.include_router(catalog_router)


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
