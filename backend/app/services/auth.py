import base64
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from jose import jwt, jwk
from jose.exceptions import JWTError, ExpiredSignatureError

from app.core.config import settings
from app.models.auth import (
    AuthState,
    CallbackRequest,
    JWKS,
    LoginRequest,
    LogoutRequest,
    OIDCConfig,
    TokenResponse,
    UserInfo,
)


class AuthService:
    def __init__(self):
        self._oidc_config: Optional[OIDCConfig] = None
        self._jwks: Optional[JWKS] = None
        self._jwks_cache_time: float = 0
        self._auth_states: dict[str, AuthState] = {}

    async def get_oidc_config(self) -> OIDCConfig:
        if self._oidc_config is None:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.OIDC_ISSUER}/.well-known/openid-configuration",
                    timeout=10.0,
                )
                response.raise_for_status()
                data = response.json()
                self._oidc_config = OIDCConfig(**data)
        return self._oidc_config

    async def get_jwks(self) -> JWKS:
        now = time.time()
        if self._jwks is None or now - self._jwks_cache_time > 3600:
            oidc_config = await self.get_oidc_config()
            async with httpx.AsyncClient() as client:
                response = await client.get(oidc_config.jwks_uri, timeout=10.0)
                response.raise_for_status()
                self._jwks = JWKS(**response.json())
                self._jwks_cache_time = now
        return self._jwks

    def generate_pkce_pair(self) -> tuple[str, str]:
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")
        return code_verifier, code_challenge

    def generate_state(self) -> str:
        return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")

    def generate_nonce(self) -> str:
        return base64.urlsafe_b64encode(secrets.token_bytes(16)).decode().rstrip("=")

    async def create_login_url(self, request: LoginRequest) -> tuple[str, AuthState]:
        oidc_config = await self.get_oidc_config()
        code_verifier, code_challenge = self.generate_pkce_pair()
        state = self.generate_state()
        nonce = self.generate_nonce()

        auth_state = AuthState(
            code_verifier=code_verifier,
            state=state,
            nonce=nonce,
        )
        self._auth_states[state] = auth_state

        params = {
            "client_id": settings.OIDC_CLIENT_ID,
            "response_type": "code",
            "scope": "openid profile email roles",
            "redirect_uri": request.redirect_uri,
            "state": state,
            "nonce": nonce,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }

        auth_url = f"{oidc_config.authorization_endpoint}?{urlencode(params)}"
        return auth_url, auth_state

    async def exchange_code_for_tokens(self, request: CallbackRequest) -> TokenResponse:
        auth_state = self._auth_states.pop(request.state, None)
        if auth_state is None:
            raise ValueError("Invalid or expired state parameter")

        oidc_config = await self.get_oidc_config()

        data = {
            "grant_type": "authorization_code",
            "code": request.code,
            "redirect_uri": request.redirect_uri,
            "client_id": settings.OIDC_CLIENT_ID,
            "client_secret": settings.OIDC_CLIENT_SECRET,
            "code_verifier": auth_state.code_verifier,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                oidc_config.token_endpoint,
                data=data,
                timeout=10.0,
            )
            response.raise_for_status()
            token_data = response.json()

        return TokenResponse(**token_data)

    async def validate_token(self, token: str) -> UserInfo:
        try:
            jwks = await self.get_jwks()
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            if not kid:
                raise ValueError("Token missing kid header")

            jwk_key = None
            for key in jwks.keys:
                if key.kid == kid:
                    jwk_key = key
                    break

            if not jwk_key:
                raise ValueError(f"Key with kid {kid} not found in JWKS")

            public_key = jwk.construct(jwk_key.model_dump())
            payload = jwt.decode(
                token,
                public_key.to_pem().decode(),
                algorithms=["RS256"],
                audience=settings.OIDC_CLIENT_ID,
                issuer=settings.OIDC_ISSUER,
                options={"verify_at_hash": False},
            )

            roles = []
            if payload.get("realm_access", {}).get("roles"):
                roles = payload["realm_access"]["roles"]
            elif payload.get("resource_access", {}).get(settings.OIDC_CLIENT_ID, {}).get("roles"):
                roles = payload["resource_access"][settings.OIDC_CLIENT_ID]["roles"]

            return UserInfo(
                sub=payload["sub"],
                preferred_username=payload.get("preferred_username", ""),
                email=payload.get("email"),
                name=payload.get("name"),
                given_name=payload.get("given_name"),
                family_name=payload.get("family_name"),
                roles=roles,
                realm_access=payload.get("realm_access"),
            )

        except ExpiredSignatureError:
            raise ValueError("Token has expired")
        except JWTError as e:
            raise ValueError(f"Invalid token: {str(e)}")

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        oidc_config = await self.get_oidc_config()

        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.OIDC_CLIENT_ID,
            "client_secret": settings.OIDC_CLIENT_SECRET,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                oidc_config.token_endpoint,
                data=data,
                timeout=10.0,
            )
            response.raise_for_status()
            return TokenResponse(**response.json())

    async def get_userinfo(self, access_token: str) -> UserInfo:
        oidc_config = await self.get_oidc_config()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                oidc_config.userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

        return UserInfo(**data)

    def create_logout_url(self, request: LogoutRequest) -> str:
        oidc_config = self._oidc_config
        if oidc_config is None:
            return f"{settings.OIDC_ISSUER}/protocol/openid-connect/logout"

        params = {}
        if request.id_token_hint:
            params["id_token_hint"] = request.id_token_hint
        if request.post_logout_redirect_uri:
            params["post_logout_redirect_uri"] = request.post_logout_redirect_uri

        if params:
            return f"{oidc_config.end_session_endpoint}?{urlencode(params)}"
        return oidc_config.end_session_endpoint

    def cleanup_expired_states(self, max_age_seconds: int = 600):
        now = datetime.utcnow()
        expired = [
            state
            for state, auth_state in self._auth_states.items()
            if (now - auth_state.created_at).total_seconds() > max_age_seconds
        ]
        for state in expired:
            del self._auth_states[state]


auth_service = AuthService()

