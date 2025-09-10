# backend/services/session_service.py
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import collection
from fastapi import HTTPException, status

from ..models import SessionInfo, SessionCreate
from ..database import get_sessions_collection


class SessionService:
    """Service for managing user sessions in MongoDB."""
    
    @staticmethod
    async def create_session(
        session_data: SessionCreate,
        sessions_collection: collection.Collection = None
    ) -> str:
        """
        Create a new session and return the session_id (MongoDB ObjectId as string).
        
        Args:
            session_data: Session creation data
            sessions_collection: MongoDB collection (injected)
            
        Returns:
            str: Session ID (MongoDB ObjectId as string)
        """
        if sessions_collection is None:
            sessions_collection = get_sessions_collection()
            
        # Create session with MongoDB ObjectId
        session_id = str(ObjectId())
        
        session_info = SessionInfo(
            session_id=session_id,
            user_identity=session_data.user_identity,
            user_role=session_data.user_role,
            user_agent=session_data.user_agent,
            ip_address=session_data.ip_address,
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow(),
            is_active=True
        )
        
        # Insert session into database
        result = sessions_collection.insert_one(session_info.model_dump())
        
        if not result.inserted_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
            
        return session_id
    
    @staticmethod
    async def get_session(
        session_id: str,
        sessions_collection: collection.Collection = None
    ) -> Optional[SessionInfo]:
        """
        Retrieve session information by session_id.
        
        Args:
            session_id: Session identifier
            sessions_collection: MongoDB collection (injected)
            
        Returns:
            SessionInfo or None if not found
        """
        if sessions_collection is None:
            sessions_collection = get_sessions_collection()
            
        session_doc = sessions_collection.find_one({
            "session_id": session_id,
            "is_active": True
        })
        
        if session_doc:
            session_doc.pop('_id', None)  # Remove MongoDB _id field
            return SessionInfo(**session_doc)
        
        return None
    
    @staticmethod
    async def update_session_activity(
        session_id: str,
        sessions_collection: collection.Collection = None
    ) -> bool:
        """
        Update the last_activity timestamp for a session.
        
        Args:
            session_id: Session identifier
            sessions_collection: MongoDB collection (injected)
            
        Returns:
            bool: True if session was updated, False if not found
        """
        if sessions_collection is None:
            sessions_collection = get_sessions_collection()
            
        result = sessions_collection.update_one(
            {"session_id": session_id, "is_active": True},
            {"$set": {"last_activity": datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    async def deactivate_session(
        session_id: str,
        sessions_collection: collection.Collection = None
    ) -> bool:
        """
        Deactivate a session (soft delete).
        
        Args:
            session_id: Session identifier
            sessions_collection: MongoDB collection (injected)
            
        Returns:
            bool: True if session was deactivated, False if not found
        """
        if sessions_collection is None:
            sessions_collection = get_sessions_collection()
            
        result = sessions_collection.update_one(
            {"session_id": session_id, "is_active": True},
            {"$set": {"is_active": False, "last_activity": datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    @staticmethod
    async def deactivate_user_sessions(
        user_identity: str,
        exclude_session_id: Optional[str] = None,
        sessions_collection: collection.Collection = None
    ) -> int:
        """
        Deactivate all sessions for a user, optionally excluding one session.
        
        Args:
            user_identity: User identifier
            exclude_session_id: Session to keep active (optional)
            sessions_collection: MongoDB collection (injected)
            
        Returns:
            int: Number of sessions deactivated
        """
        if sessions_collection is None:
            sessions_collection = get_sessions_collection()
            
        filter_query = {
            "user_identity": user_identity,
            "is_active": True
        }
        
        if exclude_session_id:
            filter_query["session_id"] = {"$ne": exclude_session_id}
            
        result = sessions_collection.update_many(
            filter_query,
            {"$set": {"is_active": False, "last_activity": datetime.utcnow()}}
        )
        
        return result.modified_count
    
    @staticmethod
    async def cleanup_expired_sessions(
        expiry_hours: int = 24,
        sessions_collection: collection.Collection = None
    ) -> int:
        """
        Clean up sessions that haven't been active for the specified hours.
        
        Args:
            expiry_hours: Hours of inactivity before session expires
            sessions_collection: MongoDB collection (injected)
            
        Returns:
            int: Number of sessions cleaned up
        """
        if sessions_collection is None:
            sessions_collection = get_sessions_collection()
            
        expiry_time = datetime.utcnow() - timedelta(hours=expiry_hours)
        
        result = sessions_collection.update_many(
            {
                "last_activity": {"$lt": expiry_time},
                "is_active": True
            },
            {"$set": {"is_active": False}}
        )
        
        return result.modified_count
    
    @staticmethod
    async def validate_session(
        session_id: str,
        user_identity: str,
        sessions_collection: collection.Collection = None
    ) -> bool:
        """
        Validate that a session exists, is active, and belongs to the specified user.
        
        Args:
            session_id: Session identifier
            user_identity: Expected user identity
            sessions_collection: MongoDB collection (injected)
            
        Returns:
            bool: True if session is valid, False otherwise
        """
        session_info = await SessionService.get_session(session_id, sessions_collection)
        
        if not session_info:
            return False
            
        return (session_info.user_identity == user_identity and 
                session_info.is_active)
