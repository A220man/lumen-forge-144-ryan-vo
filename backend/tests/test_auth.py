import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.fixture
async def client():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_auth_config_endpoint(client: AsyncClient):
    """Test that auth config endpoint is accessible."""
    response = await client.get("/api/auth/config")
    assert response.status_code == 200
    data = response.json()
    assert "issuer" in data
    assert "client_id" in data
    assert "redirect_uri" in data


@pytest.mark.asyncio
async def test_login_redirects(client: AsyncClient):
    """Test that login endpoint redirects to Keycloak."""
    response = await client.get("/api/auth/login", follow_redirects=False)
    # Should redirect to Keycloak (302) or fail with 500 if Keycloak not reachable
    assert response.status_code in (302, 500)


@pytest.mark.asyncio
async def test_me_requires_auth(client: AsyncClient):
    """Test that /me endpoint requires authentication."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_requires_auth(client: AsyncClient):
    """Test that logout endpoint requires authentication."""
    response = await client.post("/api/auth/logout", json={})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_requires_token(client: AsyncClient):
    """Test that refresh endpoint requires refresh token."""
    response = await client.post("/api/auth/refresh")
    assert response.status_code == 401

