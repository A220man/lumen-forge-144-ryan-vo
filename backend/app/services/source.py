import asyncio
import ipaddress
import socket
import time
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.source import Source, SourceCreate, SourceUpdate, SourceType, SourceTestResult


# Private IP ranges to block for SSRF protection
PRIVATE_RANGES = [
    ipaddress.IPv4Network("10.0.0.0/8"),
    ipaddress.IPv4Network("172.16.0.0/12"),
    ipaddress.IPv4Network("192.168.0.0/16"),
    ipaddress.IPv4Network("127.0.0.0/8"),
    ipaddress.IPv4Network("169.254.0.0/16"),
    ipaddress.IPv6Network("::1/128"),
    ipaddress.IPv6Network("fc00::/7"),
    ipaddress.IPv6Network("fe80::/10"),
]


def is_private_ip(ip: str) -> bool:
    """Check if an IP address is in private/reserved ranges."""
    try:
        ip_obj = ipaddress.ip_address(ip)
        return any(ip_obj in network for network in PRIVATE_RANGES)
    except ValueError:
        return True  # Invalid IP, treat as unsafe


def resolve_hostname_safe(hostname: str) -> List[str]:
    """Resolve hostname to IPs, filtering out private addresses."""
    try:
        # Use getaddrinfo for both IPv4 and IPv6
        results = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        ips = []
        for result in results:
            ip = result[4][0]
            if not is_private_ip(ip):
                ips.append(ip)
        return ips
    except socket.gaierror:
        return []


async def dns_pinned_fetch(
    url: str,
    timeout: float = 10.0,
    allowed_ips: Optional[List[str]] = None,
) -> httpx.Response:
    """
    Fetch a URL with DNS pinning to prevent SSRF via DNS rebinding.
    
    Resolves the hostname once, validates IPs are not private,
    then makes the request directly to the IP with Host header.
    """
    parsed = urlparse(url)
    hostname = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    
    if not hostname:
        raise ValueError("Invalid URL: no hostname")
    
    # Resolve hostname to IPs
    ips = resolve_hostname_safe(hostname)
    if not ips:
        raise ValueError(f"No safe IP addresses found for {hostname}")
    
    # If allowed_ips provided, filter to only those
    if allowed_ips:
        ips = [ip for ip in ips if ip in allowed_ips]
        if not ips:
            raise ValueError("No allowed IPs match resolved addresses")
    
    # Try each IP until one works
    last_error = None
    for ip in ips:
        try:
            # Build URL with IP instead of hostname
            ip_url = url.replace(f"://{hostname}", f"://{ip}")
            if ":" in ip and not ip.startswith("["):
                # IPv6 needs brackets
                ip_url = url.replace(f"://{hostname}", f"://[{ip}]")
            
            headers = {"Host": hostname}
            
            async with httpx.AsyncClient(
                timeout=timeout,
                follow_redirects=True,
                verify=parsed.scheme == "https",
            ) as client:
                response = await client.get(ip_url, headers=headers)
                return response
        except Exception as e:
            last_error = e
            continue
    
    raise last_error or ValueError("All IP addresses failed")


class SourceService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(self, source_data: SourceCreate) -> Source:
        source = Source(
            name=source_data.name,
            url=str(source_data.url),
            type=source_data.type,
            category=source_data.category,
            description=source_data.description,
            poster_url=str(source_data.poster_url) if source_data.poster_url else None,
            enabled=source_data.enabled,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(source)
        await self.db.commit()
        await self.db.refresh(source)
        return source
    
    async def get(self, source_id: int) -> Optional[Source]:
        result = await self.db.execute(select(Source).where(Source.id == source_id))
        return result.scalar_one_or_none()
    
    async def list(
        self,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None,
        enabled: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple[List[Source], int]:
        query = select(Source)
        count_query = select(func.count(Source.id))
        
        if category:
            query = query.where(Source.category == category)
            count_query = count_query.where(Source.category == category)
        if enabled is not None:
            query = query.where(Source.enabled == enabled)
            count_query = count_query.where(Source.enabled == enabled)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                (Source.name.ilike(search_term)) | (Source.description.ilike(search_term))
            )
            count_query = count_query.where(
                (Source.name.ilike(search_term)) | (Source.description.ilike(search_term))
            )
        
        total = (await self.db.execute(count_query)).scalar_one()
        query = query.order_by(Source.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.db.execute(query)
        items = result.scalars().all()
        return list(items), total
    
    async def update(self, source_id: int, source_data: SourceUpdate) -> Optional[Source]:
        source = await self.get(source_id)
        if not source:
            return None
        
        update_data = source_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "url" and value is not None:
                setattr(source, field, str(value))
            elif field == "poster_url" and value is not None:
                setattr(source, field, str(value))
            else:
                setattr(source, field, value)
        
        source.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(source)
        return source
    
    async def delete(self, source_id: int) -> bool:
        source = await self.get(source_id)
        if not source:
            return False
        await self.db.delete(source)
        await self.db.commit()
        return True
    
    async def test_source(self, source_id: int) -> SourceTestResult:
        source = await self.get(source_id)
        if not source:
            return SourceTestResult(success=False, error="Source not found")
        
        start_time = time.time()
        try:
            response = await dns_pinned_fetch(source.url, timeout=10.0)
            response_time_ms = (time.time() - start_time) * 1000
            
            source.last_tested = datetime.utcnow()
            source.last_status = response.status_code
            source.last_error = None
            await self.db.commit()
            
            return SourceTestResult(
                success=response.status_code < 400,
                status_code=response.status_code,
                content_type=response.headers.get("content-type"),
                response_time_ms=response_time_ms,
            )
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            source.last_tested = datetime.utcnow()
            source.last_status = None
            source.last_error = str(e)
            await self.db.commit()
            
            return SourceTestResult(
                success=False,
                error=str(e),
                response_time_ms=response_time_ms,
            )
    
    async def get_categories(self) -> List[str]:
        result = await self.db.execute(
            select(Source.category).where(Source.category.isnot(None)).distinct()
        )
        return [c for c in result.scalars().all() if c]
