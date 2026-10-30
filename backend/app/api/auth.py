from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional

from app.core.config import settings
from app.models.auth import (
    CallbackRequest,
    LoginRequest,
    LogoutRequest,
    TokenResponse,
    UserInfo,
)
from app.services.auth import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserInfo:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user = await auth_service.validate_token(credentials.credentials)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/login")
async def login(redirect_uri: str = settings.OIDC_REDIRECT_URI):
    """Initiate OIDC login flow with PKCE."""
    try:
        login_request = LoginRequest(redirect_uri=redirect_uri)
        auth_url, _ = await auth_service.create_login_url(login_request)
        return RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate login: {str(e)}",
        )


@router.get("/callback")
async def callback(
    code: str,
    state: str,
    redirect_uri: str = settings.OIDC_REDIRECT_URI,
    response: Response = None,
):
    """Handle OIDC callback, exchange code for tokens."""
    try:
        callback_request = CallbackRequest(
            code=code,
            state=state,
            redirect_uri=redirect_uri,
        )
        token_response = await auth_service.exchange_code_for_tokens(callback_request)

        # Set access token in httpOnly cookie
        response.set_cookie(
            key="access_token",
            value=token_response.access_token,
            httponly=True,
            secure=not settings.DEMO_MODE,
            samesite="lax",
            max_age=token_response.expires_in,
            path="/",
        )

        if token_response.refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=token_response.refresh_token,
                httponly=True,
                secure=not settings.DEMO_MODE,
                samesite="lax",
                max_age=60 * 60 * 24 * 30,  # 30 days
                path="/",
            )

        if token_response.id_token:
            response.set_cookie(
                key="id_token",
                value=token_response.id_token,
                httponly=True,
                secure=not settings.DEMO_MODE,
                samesite="lax",
                max_age=token_response.expires_in,
                path="/",
            )

        # Redirect to frontend home
        frontend_url = "http://localhost:5173"
        if not settings.DEMO_MODE:
            frontend_url = "https://your-domain.com"
        return RedirectResponse(url=frontend_url, status_code=status.HTTP_302_FOUND)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}",
        )


@router.post("/logout")
async def logout(
    request: LogoutRequest,
    response: Response,
    user: Optional[UserInfo] = Depends(get_current_user),
):
    """Logout and clear tokens."""
    # Clear cookies
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="id_token", path="/")

    # Build Keycloak logout URL
    logout_url = auth_service.create_logout_url(request)

    return {"logout_url": logout_url}


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(user: UserInfo = Depends(get_current_user)):
    """Get current authenticated user info."""
    return user


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
):
    """Refresh access token using refresh token cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token available",
        )

    try:
        token_response = await auth_service.refresh_token(refresh_token)

        response.set_cookie(
            key="access_token",
            value=token_response.access_token,
            httponly=True,
            secure=not settings.DEMO_MODE,
            samesite="lax",
            max_age=token_response.expires_in,
            path="/",
        )

        if token_response.refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=token_response.refresh_token,
                httponly=True,
                secure=not settings.DEMO_MODE,
                samesite="lax",
                max_age=60 * 60 * 24 * 30,
                path="/",
            )

        return token_response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}",
        )


@router.get("/config")
async def get_auth_config():
    """Get OIDC configuration for frontend."""
    return {
        "issuer": settings.OIDC_ISSUER,
        "client_id": settings.OIDC_CLIENT_ID,
        "redirect_uri": settings.OIDC_REDIRECT_URI,
    }

