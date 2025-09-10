# backend/sessions/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timedelta

from ..models import SessionInfo, Role
from ..services.session_service import SessionService
from .. import auth

router = APIRouter(
    prefix="/api/sessions",
    tags=["Session Management"]
)


@router.get("/", response_model=List[SessionInfo])
async def get_sessions(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN])),
    user_identity: Optional[str] = Query(None, description="Filter by user identity"),
    active_only: bool = Query(True, description="Show only active sessions"),
    limit: int = Query(100, ge=1, le=1000, description="Number of sessions to return")
):
    """
    Get session information. Admin only.
    """
    from ..database import get_sessions_collection
    sessions_collection = get_sessions_collection()
    
    # Build filter query
    filter_query = {}
    if user_identity:
        filter_query["user_identity"] = user_identity
    if active_only:
        filter_query["is_active"] = True
    
    # Query sessions
    sessions = list(sessions_collection.find(
        filter_query,
        {'_id': 0}
    ).sort("created_at", -1).limit(limit))
    
    return [SessionInfo(**session) for session in sessions]


@router.get("/current", response_model=SessionInfo)
async def get_current_session(
    current_user: auth.TokenData = Depends(auth.get_current_user)
):
    """
    Get information about the current session.
    """
    if not current_user.session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session found"
        )
    
    session_info = await SessionService.get_session(current_user.session_id)
    if not session_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session_info


@router.delete("/current")
async def logout_current_session(
    current_user: auth.TokenData = Depends(auth.get_current_user)
):
    """
    Logout (deactivate) the current session.
    """
    if not current_user.session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session found"
        )
    
    deactivated = await SessionService.deactivate_session(current_user.session_id)
    if deactivated:
        return {"message": "Session successfully deactivated"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already inactive"
        )


@router.delete("/user/{user_identity}")
async def logout_user_sessions(
    user_identity: str,
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN])),
    exclude_current: bool = Query(False, description="Exclude current session from deactivation")
):
    """
    Deactivate all sessions for a specific user. Admin only.
    """
    exclude_session_id = current_user.session_id if exclude_current else None
    
    deactivated_count = await SessionService.deactivate_user_sessions(
        user_identity=user_identity,
        exclude_session_id=exclude_session_id
    )
    
    return {
        "message": f"Deactivated {deactivated_count} sessions for user {user_identity}"
    }


@router.post("/cleanup")
async def cleanup_expired_sessions(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN])),
    expiry_hours: int = Query(24, ge=1, le=168, description="Hours of inactivity before session expires")
):
    """
    Clean up expired sessions. Admin only.
    """
    cleaned_count = await SessionService.cleanup_expired_sessions(expiry_hours)
    
    return {
        "message": f"Cleaned up {cleaned_count} expired sessions"
    }


@router.get("/stats")
async def get_session_stats(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN]))
):
    """
    Get session statistics. Admin only.
    """
    from ..database import get_sessions_collection
    sessions_collection = get_sessions_collection()
    
    # Get stats
    total_sessions = sessions_collection.count_documents({})
    active_sessions = sessions_collection.count_documents({"is_active": True})
    
    # Sessions created in last 24 hours
    recent_cutoff = datetime.utcnow() - timedelta(hours=24)
    recent_sessions = sessions_collection.count_documents({
        "created_at": {"$gte": recent_cutoff}
    })
    
    # Active sessions by user (top 10)
    active_by_user = list(sessions_collection.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": "$user_identity",
            "session_count": {"$sum": 1}
        }},
        {"$sort": {"session_count": -1}},
        {"$limit": 10}
    ]))
    
    return {
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "recent_sessions_24h": recent_sessions,
        "inactive_sessions": total_sessions - active_sessions,
        "top_active_users": active_by_user
    }
