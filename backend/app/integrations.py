import base64
import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .models import Integration

PROVIDERS = ("x", "linkedin", "instagram", "reddit", "brevo")


def _fernet(settings: Settings) -> Fernet:
    digest = hashlib.sha256(settings.encryption_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_token(value: str, settings: Settings) -> str:
    return _fernet(settings).encrypt(value.encode()).decode()


def decrypt_token(value: str, settings: Settings) -> str:
    return _fernet(settings).decrypt(value.encode()).decode()


def get_integration(db: Session, provider: str) -> Integration:
    item = db.scalar(select(Integration).where(Integration.provider == provider))
    if item is None:
        item = Integration(provider=provider, status="not_connected", details={})
        db.add(item)
        db.commit()
        db.refresh(item)
    return item


def configured(provider: str, settings: Settings) -> bool:
    mapping = {
        "x": bool(settings.x_client_id),
        "linkedin": bool(settings.linkedin_client_id and settings.linkedin_client_secret),
        "instagram": bool(settings.meta_client_id and settings.meta_client_secret),
        "reddit": bool(settings.reddit_client_id and settings.reddit_client_secret),
        "brevo": bool(settings.brevo_api_key),
    }
    return mapping.get(provider, False)


def callback_url(provider: str, settings: Settings) -> str:
    return f"{settings.backend_url.rstrip('/')}/v1/integrations/{provider}/callback"


def create_authorization_url(provider: str, db: Session) -> str:
    settings = get_settings()
    if provider not in PROVIDERS or provider == "brevo":
        raise HTTPException(400, "This provider does not use OAuth")
    if not configured(provider, settings):
        raise HTTPException(409, f"{provider.title()} developer credentials are not configured")

    state = secrets.token_urlsafe(32)
    item = get_integration(db, provider)
    details = {**(item.details or {}), "oauth_state": state}
    redirect_uri = callback_url(provider, settings)

    if provider == "x":
        verifier = secrets.token_urlsafe(64)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
        details["code_verifier"] = verifier
        base = "https://x.com/i/oauth2/authorize"
        params = {"response_type": "code", "client_id": settings.x_client_id, "redirect_uri": redirect_uri, "scope": "tweet.read tweet.write users.read offline.access", "state": state, "code_challenge": challenge, "code_challenge_method": "S256"}
    elif provider == "linkedin":
        base = "https://www.linkedin.com/oauth/v2/authorization"
        params = {"response_type": "code", "client_id": settings.linkedin_client_id, "redirect_uri": redirect_uri, "scope": "openid profile w_member_social", "state": state}
    elif provider == "instagram":
        base = f"https://www.facebook.com/{settings.meta_graph_version}/dialog/oauth"
        params = {"client_id": settings.meta_client_id, "redirect_uri": redirect_uri, "scope": "pages_show_list,instagram_basic,instagram_content_publish", "response_type": "code", "state": state}
    else:
        base = "https://www.reddit.com/api/v1/authorize"
        params = {"client_id": settings.reddit_client_id, "response_type": "code", "state": state, "redirect_uri": redirect_uri, "duration": "permanent", "scope": "identity submit"}

    item.details = details
    item.status = "authorizing"
    db.commit()
    return f"{base}?{urlencode(params)}"


async def complete_oauth(provider: str, code: str, state: str, db: Session) -> Integration:
    settings = get_settings()
    if provider not in PROVIDERS or provider == "brevo":
        raise HTTPException(400, "Unsupported OAuth provider")
    item = get_integration(db, provider)
    if not state or not hmac_compare(state, str((item.details or {}).get("oauth_state", ""))):
        raise HTTPException(400, "OAuth state is invalid or expired")
    redirect_uri = callback_url(provider, settings)

    async with httpx.AsyncClient(timeout=30) as client:
        if provider == "x":
            data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri, "code_verifier": item.details["code_verifier"]}
            auth = (settings.x_client_id, settings.x_client_secret) if settings.x_client_secret else None
            token_response = await client.post("https://api.x.com/2/oauth2/token", data=data, auth=auth)
        elif provider == "linkedin":
            data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri, "client_id": settings.linkedin_client_id, "client_secret": settings.linkedin_client_secret}
            token_response = await client.post("https://www.linkedin.com/oauth/v2/accessToken", data=data)
        elif provider == "instagram":
            data = {"client_id": settings.meta_client_id, "client_secret": settings.meta_client_secret, "redirect_uri": redirect_uri, "code": code}
            token_response = await client.post(f"https://graph.facebook.com/{settings.meta_graph_version}/oauth/access_token", data=data)
        elif provider == "reddit":
            data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
            token_response = await client.post("https://www.reddit.com/api/v1/access_token", data=data, auth=(settings.reddit_client_id, settings.reddit_client_secret), headers={"User-Agent": settings.reddit_user_agent})
        else:
            raise HTTPException(400, "Unsupported OAuth provider")
        if token_response.is_error:
            raise HTTPException(502, f"{provider.title()} authorization failed")
        tokens = token_response.json()
        if provider == "instagram":
            long_lived = await client.get(
                f"https://graph.facebook.com/{settings.meta_graph_version}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": settings.meta_client_id,
                    "client_secret": settings.meta_client_secret,
                    "fb_exchange_token": tokens["access_token"],
                },
            )
            if long_lived.is_success:
                tokens = long_lived.json()
        access_token = str(tokens["access_token"])
        refresh_token = str(tokens.get("refresh_token", ""))
        expires_in = int(tokens.get("expires_in", 3600))

        account_id = ""
        account_name = provider.title()
        details: dict[str, Any] = {}
        headers = {"Authorization": f"Bearer {access_token}"}
        if provider == "x":
            identity = (await client.get("https://api.x.com/2/users/me", headers=headers)).json().get("data", {})
            account_id, account_name = str(identity.get("id", "")), str(identity.get("username", "X account"))
        elif provider == "linkedin":
            identity = (await client.get("https://api.linkedin.com/v2/userinfo", headers=headers)).json()
            account_id, account_name = str(identity.get("sub", "")), str(identity.get("name", "LinkedIn member"))
        elif provider == "instagram":
            pages = (await client.get(f"https://graph.facebook.com/{settings.meta_graph_version}/me/accounts", params={"fields": "id,name,access_token,instagram_business_account{id,username}", "access_token": access_token})).json().get("data", [])
            page = next((p for p in pages if p.get("instagram_business_account")), None)
            if not page:
                raise HTTPException(409, "No Instagram professional account connected to a Facebook Page was found")
            ig = page["instagram_business_account"]
            account_id, account_name = str(ig["id"]), str(ig.get("username", page.get("name", "Instagram")))
            access_token = str(page["access_token"])
            details = {"page_id": page["id"]}
        else:
            identity = (await client.get("https://oauth.reddit.com/api/v1/me", headers={**headers, "User-Agent": settings.reddit_user_agent})).json()
            account_id = str(identity.get("id", ""))
            account_name = str(identity.get("name", "Reddit account"))

    item.status = "connected"
    item.account_id = account_id
    item.account_name = account_name
    item.access_token = encrypt_token(access_token, settings)
    item.refresh_token = encrypt_token(refresh_token, settings) if refresh_token else ""
    item.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    item.details = details
    db.commit()
    db.refresh(item)
    return item


def hmac_compare(left: str, right: str) -> bool:
    return secrets.compare_digest(left, right)


async def access_token_for(item: Integration, db: Session) -> str:
    settings = get_settings()
    if not item.access_token or item.status != "connected":
        raise HTTPException(409, f"{item.provider.title()} is not connected")
    expires_at = item.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at > datetime.now(timezone.utc) + timedelta(minutes=2):
        return decrypt_token(item.access_token, settings)
    if not item.refresh_token or item.provider not in {"x", "reddit"}:
        item.status = "expired"
        db.commit()
        raise HTTPException(409, f"{item.provider.title()} authorization expired; reconnect it")

    refresh_token = decrypt_token(item.refresh_token, settings)
    async with httpx.AsyncClient(timeout=30) as client:
        if item.provider == "x":
            response = await client.post(
                "https://api.x.com/2/oauth2/token",
                data={"grant_type": "refresh_token", "refresh_token": refresh_token, "client_id": settings.x_client_id},
                auth=(settings.x_client_id, settings.x_client_secret) if settings.x_client_secret else None,
            )
        else:
            response = await client.post(
                "https://www.reddit.com/api/v1/access_token",
                data={"grant_type": "refresh_token", "refresh_token": refresh_token},
                auth=(settings.reddit_client_id, settings.reddit_client_secret),
                headers={"User-Agent": settings.reddit_user_agent},
            )
    if response.is_error:
        item.status = "expired"
        db.commit()
        raise HTTPException(502, f"{item.provider.title()} token refresh failed")
    tokens = response.json()
    item.access_token = encrypt_token(str(tokens["access_token"]), settings)
    if tokens.get("refresh_token"):
        item.refresh_token = encrypt_token(str(tokens["refresh_token"]), settings)
    item.expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
    item.status = "connected"
    db.commit()
    return str(tokens["access_token"])


async def publish_content(provider: str, title: str, body: str, media_url: str, subreddit: str, db: Session) -> str:
    settings = get_settings()
    item = get_integration(db, provider)
    token = await access_token_for(item, db)
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=45) as client:
        if provider == "x":
            response = await client.post("https://api.x.com/2/tweets", headers=headers, json={"text": body[:280]})
            external_id = str(response.json().get("data", {}).get("id", "")) if response.is_success else ""
        elif provider == "linkedin":
            payload = {
                "author": f"urn:li:person:{item.account_id}",
                "commentary": body,
                "visibility": "PUBLIC",
                "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
                "lifecycleState": "PUBLISHED",
                "isReshareDisabledByAuthor": False,
            }
            response = await client.post("https://api.linkedin.com/rest/posts", headers={**headers, "Linkedin-Version": "202602", "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json"}, json=payload)
            external_id = response.headers.get("x-restli-id", "")
        elif provider == "instagram":
            if not media_url.startswith("https://"):
                raise HTTPException(400, "Instagram requires a publicly accessible HTTPS image or video URL")
            create = await client.post(
                f"https://graph.facebook.com/{settings.meta_graph_version}/{item.account_id}/media",
                data={"image_url": media_url, "caption": body, "access_token": token},
            )
            if create.is_error:
                raise HTTPException(502, "Instagram media container creation failed")
            response = await client.post(
                f"https://graph.facebook.com/{settings.meta_graph_version}/{item.account_id}/media_publish",
                data={"creation_id": create.json()["id"], "access_token": token},
            )
            external_id = str(response.json().get("id", "")) if response.is_success else ""
        elif provider == "reddit":
            clean_subreddit = subreddit.removeprefix("r/").strip()
            if not clean_subreddit:
                raise HTTPException(400, "A subreddit is required for Reddit publishing")
            response = await client.post(
                "https://oauth.reddit.com/api/submit",
                headers={**headers, "User-Agent": settings.reddit_user_agent},
                data={"api_type": "json", "kind": "self", "sr": clean_subreddit, "title": title[:300], "text": body, "resubmit": "true"},
            )
            external_id = str(response.json().get("json", {}).get("data", {}).get("name", "")) if response.is_success else ""
        else:
            raise HTTPException(400, "Unsupported publishing provider")

    if response.is_error or not external_id:
        detail = response.text[:300] if settings.environment == "development" else "Provider rejected the post"
        raise HTTPException(502, f"{provider.title()} publishing failed: {detail}")
    return external_id


async def send_brevo_email(to_email: str, to_name: str, subject: str, text: str) -> str:
    settings = get_settings()
    if not settings.brevo_api_key or not settings.brevo_sender_email:
        raise HTTPException(409, "Brevo API key and verified sender are not configured")
    payload = {
        "sender": {"email": settings.brevo_sender_email, "name": settings.brevo_sender_name},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "textContent": text,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": settings.brevo_api_key, "Content-Type": "application/json", "Accept": "application/json"},
            json=payload,
        )
    if response.is_error:
        raise HTTPException(502, "Brevo rejected the email")
    return str(response.json().get("messageId", ""))
