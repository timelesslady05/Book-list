import hashlib
import hmac
import os
import re
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Book, User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SESSION_SECRET = os.getenv("SESSION_SECRET", "")
if not SESSION_SECRET:
    if os.getenv("RENDER") or os.getenv("APP_ENV") == "production":
        raise RuntimeError("SESSION_SECRET must be set in the production environment.")
    SESSION_SECRET = secrets.token_urlsafe(48)
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
SESSION_COOKIE = "bookloom_session"
SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60
PASSWORD_HASH_ITERATIONS = 310_000
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AccountCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().casefold()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class RegisterRequest(AccountCredentials):
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Enter your name.")
        return normalized


class AccountResponse(BaseModel):
    id: int
    email: str
    display_name: str


def _password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS
    )
    return (
        f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}"
        f"${salt.hex()}${digest.hex()}"
    )


_DUMMY_PASSWORD_HASH = _password_hash("invalid-account-password")


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iteration_text, salt_hex, digest_hex = stored_hash.split("$", 3)
        iterations = int(iteration_text)
        if (
            algorithm != "pbkdf2_sha256"
            or not 100_000 <= iterations <= 1_000_000
        ):
            return False
        salt = bytes.fromhex(salt_hex)
        expected_digest = bytes.fromhex(digest_hex)
    except (ValueError, TypeError):
        return False

    actual_digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations
    )
    return hmac.compare_digest(actual_digest, expected_digest)


def _session_signature(user_id: int, expiration: int) -> str:
    message = f"{user_id}.{expiration}".encode("ascii")
    return hmac.new(
        SESSION_SECRET.encode("utf-8"), message, hashlib.sha256
    ).hexdigest()


def _set_session(response: Response, user: User) -> None:
    expiration = int(time.time()) + SESSION_LIFETIME_SECONDS
    signature = _session_signature(user.id, expiration)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=f"{user.id}.{expiration}.{signature}",
        max_age=SESSION_LIFETIME_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _get_session_user_id(request: Request) -> int | None:
    token = request.cookies.get(SESSION_COOKIE, "")
    try:
        user_id_text, expiration_text, signature = token.split(".", 2)
        user_id = int(user_id_text)
        expiration = int(expiration_text)
        if user_id < 1 or expiration <= int(time.time()):
            return None
        expected_signature = _session_signature(user_id, expiration)
        if not hmac.compare_digest(signature, expected_signature):
            return None
        return user_id
    except (ValueError, TypeError, UnicodeEncodeError):
        return None


def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> User:
    user_id = _get_session_user_id(request)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to use BookLoom.",
        )
    return user


def _account_response(user: User) -> AccountResponse:
    return AccountResponse(
        id=user.id, email=user.email, display_name=user.display_name
    )


@router.get("/session")
def read_session(request: Request, db: Session = Depends(get_db)) -> dict:
    user_id = _get_session_user_id(request)
    user = db.get(User, user_id) if user_id is not None else None
    return {
        "authenticated": user is not None,
        "user": _account_response(user).model_dump() if user else None,
    }


@router.post("/register", response_model=AccountResponse, status_code=201)
def register(
    credentials: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> AccountResponse:
    user = User(
        email=credentials.email,
        display_name=credentials.display_name,
        password_hash=_password_hash(credentials.password),
    )
    db.add(user)
    try:
        db.flush()
        db.execute(
            update(Book)
            .where(Book.user_id.is_(None))
            .values(user_id=user.id)
        )
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error
    db.refresh(user)
    _set_session(response, user)
    return _account_response(user)


@router.post("/login", response_model=AccountResponse)
def login(
    credentials: AccountCredentials,
    response: Response,
    db: Session = Depends(get_db),
) -> AccountResponse:
    user = db.scalar(select(User).where(User.email == credentials.email))
    stored_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    valid_password = _verify_password(credentials.password, stored_hash)
    if user is None or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )
    _set_session(response, user)
    return _account_response(user)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(
        key=SESSION_COOKIE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"authenticated": False}
