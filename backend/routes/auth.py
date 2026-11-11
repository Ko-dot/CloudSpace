import os
import secrets
import hashlib
import base64
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import (
    Table, Column, String, Integer, MetaData,
    insert, select, delete
)
from sqlalchemy.orm import Session
from jwt import PyJWKClient
from dotenv import load_dotenv

from database import Base, engine, SessionLocal
from models import User


load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])

TELEGRAM_CLIENT_ID = os.getenv("TELEGRAM_CLIENT_ID")
TELEGRAM_CLIENT_SECRET = os.getenv("TELEGRAM_CLIENT_SECRET")
JWT_SECRET = os.getenv("JWT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

ISSUER = "https://oauth.telegram.org"
AUTH_URL = "https://oauth.telegram.org/auth"
TOKEN_URL = "https://oauth.telegram.org/token"
JWKS_URL = "https://oauth.telegram.org/.well-known/jwks.json"

metadata = Base.metadata

oauth_states = Table(
    "telegram_oauth_states",
    metadata,
    Column("state", String, primary_key=True),
    Column("verifier", String, nullable=False),
    Column("nonce", String, nullable=False),
    Column("expires_at", Integer, nullable=False),
)

metadata.create_all(bind=engine)


def create_cloudspace_token(user_id: int):
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET is not configured")

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=7),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@router.get("/telegram/start")
def telegram_login_start():
    if not TELEGRAM_CLIENT_ID or not TELEGRAM_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Telegram login credentials are not configured"
        )

    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    nonce = secrets.token_urlsafe(32)

    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).decode().rstrip("=")

    db = SessionLocal()

    try:
        db.execute(
            insert(oauth_states).values(
                state=state,
                verifier=verifier,
                nonce=nonce,
                expires_at=int(time.time()) + 600,
            )
        )
        db.commit()
    finally:
        db.close()

    redirect_uri = f"{BACKEND_URL}/auth/telegram/callback"

    params = {
        "client_id": TELEGRAM_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid profile",
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }

    return {
        "authorization_url": f"{AUTH_URL}?{urlencode(params)}"
    }


@router.get("/telegram/callback")
async def telegram_login_callback(code: str, state: str):
    if not TELEGRAM_CLIENT_ID or not TELEGRAM_CLIENT_SECRET or not JWT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Authentication configuration is incomplete"
        )

    db: Session = SessionLocal()

    try:
        saved_state = db.execute(
            select(oauth_states).where(
                oauth_states.c.state == state
            )
        ).mappings().first()

        if not saved_state:
            raise HTTPException(status_code=400, detail="Invalid login state")

        db.execute(
            delete(oauth_states).where(
                oauth_states.c.state == state
            )
        )
        db.commit()

        if saved_state["expires_at"] < int(time.time()):
            raise HTTPException(status_code=400, detail="Login session expired")

        redirect_uri = f"{BACKEND_URL}/auth/telegram/callback"

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": TELEGRAM_CLIENT_ID,
                    "code_verifier": saved_state["verifier"],
                },
                auth=(TELEGRAM_CLIENT_ID, TELEGRAM_CLIENT_SECRET),
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=401,
                detail="Telegram token exchange failed"
            )

        token_data = response.json()
        id_token = token_data.get("id_token")

        if not id_token:
            raise HTTPException(
                status_code=401,
                detail="Telegram did not return an ID token"
            )

        jwks_client = PyJWKClient(JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(id_token)

        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=TELEGRAM_CLIENT_ID,
            issuer=ISSUER,
            options={"require": ["exp", "iat", "sub"]},
        )

        if claims.get("nonce") != saved_state["nonce"]:
            raise HTTPException(status_code=401, detail="Invalid login nonce")

        telegram_id = str(claims["sub"])

        user = db.query(User).filter(
            User.telegram_id == telegram_id
        ).first()

        if not user:
            user = User(
                telegram_id=telegram_id,
                name=claims.get("name") or claims.get("preferred_username"),
                email=None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        cloudspace_token = create_cloudspace_token(user.id)

        return RedirectResponse(
            url=f"{FRONTEND_URL}/#access_token={cloudspace_token}"
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=401,
            detail="Telegram authentication could not be completed"
        )

    finally:
        db.close()