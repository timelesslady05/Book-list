import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, add_new_book_columns, engine
from app.routers.auth import router as auth_router
from app.models import Book, User
from app.routers.books import router as books_router
from app.routers.catalog import router as catalog_router

app = FastAPI(
    title="Book List API",
    description="An API for saving and managing your personal book list.",
    version="1.0.0",
)

cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    cors_origins.append(frontend_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importing the models above registers their tables before schema creation.
Base.metadata.create_all(
    bind=engine, tables=[User.__table__, Book.__table__]
)
add_new_book_columns()

app.include_router(auth_router)
app.include_router(books_router)
app.include_router(catalog_router)


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
