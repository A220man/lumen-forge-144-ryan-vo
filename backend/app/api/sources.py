from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.source import (
    Source,
    SourceCreate,
    SourceUpdate,
    SourceList,
    SourceTestResult,
    SourceType,
)
from app.services.source import SourceService

router = APIRouter(prefix="/sources", tags=["sources"])


@router.post("", response_model=Source, status_code=status.HTTP_201_CREATED)
async def create_source(
    source_data: SourceCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a new video source."""
    service = SourceService(db)
    source = await service.create(source_data)
    return source


@router.get("", response_model=SourceList)
async def list_sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    enabled: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """List video sources with pagination and filtering."""
    service = SourceService(db)
    items, total = await service.list(
        page=page,
        page_size=page_size,
        category=category,
        enabled=enabled,
        search=search,
    )
    total_pages = (total + page_size - 1) // page_size
    return SourceList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/categories", response_model=List[str])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get all unique categories."""
    service = SourceService(db)
    return await service.get_categories()


@router.get("/types", response_model=List[str])
async def get_types():
    """Get all source types."""
    return [t.value for t in SourceType]


@router.get("/{source_id}", response_model=Source)
async def get_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get a video source by ID."""
    service = SourceService(db)
    source = await service.get(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.put("/{source_id}", response_model=Source)
async def update_source(
    source_id: int,
    source_data: SourceUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Update a video source."""
    service = SourceService(db)
    source = await service.update(source_id, source_data)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Delete a video source."""
    service = SourceService(db)
    deleted = await service.delete(source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")


@router.post("/{source_id}/test", response_model=SourceTestResult)
async def test_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Test source connectivity with SSRF-protected fetch."""
    service = SourceService(db)
    result = await service.test_source(source_id)
    return result
