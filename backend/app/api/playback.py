from fastapi import APIRouter

router = APIRouter(prefix="/playback", tags=["playback"])


@router.get("/{source_id}", response_model=dict)
async def get_playback(
    source_id: int,
):
    """Get playback info for a video source.
    
    Returns playback configuration including stream URL, type, and poster image.
    """
    return {
        "source_id": source_id,
        "name": f"Source {source_id}",
        "url": f"https://example.com/stream/{source_id}",
        "type": "hls",
        "poster_url": f"https://example.com/poster/{source_id}.jpg",
    }
