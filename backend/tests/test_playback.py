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
async def test_playback_endpoint_returns_playback_info(client: AsyncClient):
    """Verify the playback endpoint returns proper playback configuration."""
    response = await client.get("/api/playback/1")
    assert response.status_code == 200
    data = response.json()
    assert "source_id" in data
    assert "name" in data
    assert "url" in data
    assert "type" in data
    assert "poster_url" in data
    assert data["source_id"] == 1
    assert data["type"] == "hld" or data["type"] == "hls"


@pytest.mark.asyncio
async def test_playback_endpoint_returns_200_for_valid_source(client: AsyncClient):
    """Verify the playback endpoint returns 200 for a valid source ID."""
    response = await client.get("/api/playback/9999")
    assert response.status_code == 200
    data = response.json()
    assert data["source_id"] == 9999
