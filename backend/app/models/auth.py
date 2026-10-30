from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    ID = "id"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    id_token: Optional[str] = None


class UserInfo(BaseModel):
    sub: str
    preferred_username: str
    email: Optional[str] = None
    name: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    roles: list[str] = Field(default_factory=list)
    realm_access: Optional[dict] = None


class AuthState(BaseModel):
    code_verifier: str
    state: str
    nonce: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LoginRequest(BaseModel):
    redirect_uri: str


class CallbackRequest(BaseModel):
    code: str
    state: str
    redirect_uri: str


class LogoutRequest(BaseModel):
    id_token_hint: Optional[str] = None
    post_logout_redirect_uri: Optional[str] = None


class OIDCConfig(BaseModel):
    issuer: str
    authorization_endpoint: str
    token_endpoint: str
    jwks_uri: str
    userinfo_endpoint: str
    end_session_endpoint: str


class JWKSKey(BaseModel):
    kty: str
    use: str
    kid: str
    n: str
    e: str
    alg: str


class JWKS(BaseModel):
    keys: list[JWKSKey]

