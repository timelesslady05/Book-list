from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class BookFields(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=160)
    rating: float = Field(ge=1, le=5)
    summary: str = Field(min_length=1)
    genre: str = Field(min_length=1, max_length=80)
    published_year: int | None = Field(default=None, ge=1, le=9999)
    cover_url: str | None = Field(default=None, max_length=2000)
    status: Literal["want_to_read", "reading", "completed"] = "want_to_read"
    total_pages: int | None = Field(default=None, ge=1, le=100000)
    pages_read: int = Field(default=0, ge=0, le=100000)
    review: str | None = Field(default=None, max_length=5000)
    is_favorite: bool = False

    @field_validator("cover_url")
    @classmethod
    def validate_cover_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        parsed = urlparse(value.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Cover URL must start with http:// or https://.")
        return value.strip()

    @model_validator(mode="after")
    def validate_progress(self) -> "BookFields":
        if self.total_pages is None and self.pages_read:
            raise ValueError("Set the total pages before entering pages read.")
        if self.total_pages is not None and self.pages_read > self.total_pages:
            raise ValueError("Pages read cannot be greater than total pages.")
        if self.status == "completed" and self.total_pages is not None:
            self.pages_read = self.total_pages
        return self


class BookCreate(BookFields):
    pass


class BookUpdate(BookFields):
    pass


class BookResponse(BookFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    completed_at: datetime | None
