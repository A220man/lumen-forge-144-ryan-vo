from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SourceType(str, Enum):
    HLS = "hls"
    DASH = "dash"
    MP4 = "mp4"
    OTHER = "other"


class SourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: HttpUrl
    type: SourceType = SourceType.OTHER
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    poster_url: Optional[HttpUrl] = None
    enabled: bool = True


class SourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[HttpUrl] = None
    type: Optional[SourceType] = None
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    poster_url: Optional[HttpUrl] = None
    enabled: Optional[bool] = None


class Source(BaseModel):
    id: int
    name: str
    url: str
    type: SourceType
    category: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    enabled: bool
    last_tested: Optional[datetime] = None
    last_status: Optional[int] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceList(BaseModel):
    items: List[Source]
    total: int
    page: int
    page_size: int
    total_pages: int


class SourceTestResult(BaseModel):
    success: bool
    status_code: Optional[int] = None
    content_type: Optional[str] = None
    error: Optional[str] = None
    response_time_ms: Optional[float] = None
