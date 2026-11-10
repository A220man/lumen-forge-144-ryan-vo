import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import create_app
from app.db.session import get_db, async_session_maker
from app.models.db import Source as SourceModel
from app.models.source import SourceType


@pytest.fixture
async def client():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_session():
    async with async_session_maker() as session:
        yield session


@pytest.fixture
async def auth_headers(client: AsyncClient):
    # In demo mode, we can't easily get auth, so tests will need to work with 401
    # This fixture is for future use when we have a test auth setup
    return {}


@pytest.fixture
async def test_source(db_session: AsyncSession):
    source = SourceModel(
        name="Test Source",
        url="https://example.com/video.m3u8",
        type=SourceType.HLS,
        category="test",
        description="Test source",
        enabled=True,
    )
    db_session.add(source)
    await db_session.commit()
    await db_session.refresh(source)
    return source


class TestSources:
    """Test source management endpoints."""

    async def test_create_source_requires_auth(self, client: AsyncClient):
        response = await client.post(
            "/api/sources",
            json={
                "name": "Test Source",
                "url": "https://example.com/video.m3u8",
                "type": "hls",
            },
        )
        assert response.status_code == 401

    async def test_list_sources_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/sources")
        assert response.status_code == 401

    async def test_get_source_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/sources/1")
        assert response.status_code == 401

    async def test_update_source_requires_auth(self, client: AsyncClient):
        response = await client.put("/api/sources/1", json={"name": "Updated"})
        assert response.status_code == 401

    async def test_delete_source_requires_auth(self, client: AsyncClient):
        response = await client.delete("/api/sources/1")
        assert response.status_code == 401

    async def test_test_source_requires_auth(self, client: AsyncClient):
        response = await client.post("/api/sources/1/test")
        assert response.status_code == 401

    async def test_get_categories_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/sources/categories")
        assert response.status_code == 401

    async def test_get_types(self, client: AsyncClient):
        # This endpoint doesn't require auth currently
        response = await client.get("/api/sources/types")
        assert response.status_code == 200
        data = response.json()
        assert "hls" in data
        assert "dash" in data
        assert "mp4" in data
        assert "other" in data


class TestSourceValidation:
    """Test source model validation."""

    def test_source_create_valid(self):
        from app.models.source import SourceCreate
        source = SourceCreate(
            name="Test",
            url="https://example.com/video.m3u8",
            type=SourceType.HLS,
        )
        assert source.name == "Test"
        assert str(source.url) == "https://example.com/video.m3u8"

    def test_source_create_invalid_url(self):
        from app.models.source import SourceCreate
        with pytest.raises(Exception):
            SourceCreate(name="Test", url="not-a-url")

    def test_source_type_enum(self):
        assert SourceType.HLS.value == "hls"
        assert SourceType.DASH.value == "dash"
        assert SourceType.MP4.value == "mp4"
        assert SourceType.OTHER.value == "other"
