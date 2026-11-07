import hashlib
import hmac
import os
import time

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

AUTH_ENABLED = os.getenv("BOOKLOOM_AUTH_ENABLED", "false").lower() == "true"
BOOKLOOM_PASSWORD = os.getenv("BOOKLOOM_PASSWORD", "")
SESSION_SECRET = os.getenv("SESSION_SECRET", "")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
SESSION_COOKIE = "bookloom_session"
SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60
PASSWORD_HASH_ITERATIONS = 310_000

if AUTH_ENABLED:
    if len(BOOKLOOM_PASSWORD) < 12:
        raise RuntimeError("BOOKLOOM_PASSWORD must contain at least 12 characters.")
    if len(SESSION_SECRET) < 32:
        raise RuntimeError("SESSION_SECRET must contain at least 32 characters.")


class LoginRequest(BaseModel):
    password: str = Field(min_length=12, max_length=128)


def _password_hash(password: str) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        SESSION_SECRET.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    )


def _session_signature(expiration: str) -> str:
    return hmac.new(
        SESSION_SECRET.encode("utf-8"), expiration.encode("ascii"), hashlib.sha256
    ).hexdigest()


def _has_valid_session(request: Request) -> bool:
    token = request.cookies.get(SESSION_COOKIE, "")
    try:
        expiration, signature = token.split(".", 1)
        if int(expiration) <= int(time.time()):
            return False
        return hmac.compare_digest(signature, _session_signature(expiration))
    except (ValueError, TypeError, UnicodeEncodeError):
        return False


def require_authenticated(request: Request) -> None:
    if AUTH_ENABLED and not _has_valid_session(request):
        raise HTTPException(status_code=401, detail="Please sign in to use BookLoom.")


@router.get("/session")
def read_session(request: Request) -> dict[str, bool]:
    return {"authenticated": not AUTH_ENABLED or _has_valid_session(request)}


@router.post("/login")
def login(credentials: LoginRequest, response: Response) -> dict[str, bool]:
    if not AUTH_ENABLED:
        raise HTTPException(status_code=404, detail="Sign-in is not enabled.")
    if not hmac.compare_digest(
        _password_hash(credentials.password), _password_hash(BOOKLOOM_PASSWORD)
    ):
        raise HTTPException(status_code=401, detail="That password is not correct.")

    expiration = str(int(time.time()) + SESSION_LIFETIME_SECONDS)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=f"{expiration}.{_session_signature(expiration)}",
        max_age=SESSION_LIFETIME_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"authenticated": True}


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
