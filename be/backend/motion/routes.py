# backend/motion/routes.py
from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from pymongo import DESCENDING, collection
from typing import List, Optional
from datetime import datetime, timedelta
from ..models import MotionLogEntry, MotionEventLogEntry, UWBLocationLogEntry, Role
from ..database import get_motion_logs_collection, get_motion_events_collection, get_uwb_locations_collection
from .. import auth

router = APIRouter(
    prefix="/api/motion",
    tags=["Motion Logging"]
)


@router.post('/log', status_code=status.HTTP_201_CREATED)
async def log_motion_data(
    motion_data: MotionLogEntry,
    motion_logs_collection: collection.Collection = Depends(get_motion_logs_collection)
):
    """
    Log raw motion sensor data from smart cart.
    This endpoint receives real-time motion sensor readings.
    """
    try:
        # Convert to dict and insert
        log_doc = motion_data.model_dump()
        result = motion_logs_collection.insert_one(log_doc)
        
        return {
            "success": True,
            "message": "Motion data logged successfully",
            "log_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log motion data: {str(e)}"
        )


@router.post('/event', status_code=status.HTTP_201_CREATED)
async def log_motion_event(
    event_data: MotionEventLogEntry,
    motion_events_collection: collection.Collection = Depends(get_motion_events_collection)
):
    """
    Log processed motion events (add/remove operations).
    This endpoint receives processed events when items are added or removed.
    """
    try:
        # Convert to dict and insert
        event_doc = event_data.model_dump()
        result = motion_events_collection.insert_one(event_doc)
        
        return {
            "success": True,
            "message": "Motion event logged successfully",
            "event_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log motion event: {str(e)}"
        )


@router.post('/uwb-log', status_code=status.HTTP_201_CREATED)
async def log_uwb_location(
    location_data: UWBLocationLogEntry,
    uwb_locations_collection: collection.Collection = Depends(get_uwb_locations_collection)
):
    """
    Log UWB location tracking data from smart cart.
    This endpoint receives real-time location coordinates from UWB positioning system.
    """
    try:
        # Convert to dict and insert
        location_doc = location_data.model_dump()
        result = uwb_locations_collection.insert_one(location_doc)
        
        return {
            "success": True,
            "message": "UWB location logged successfully",
            "location_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log UWB location: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log motion event: {str(e)}"
        )


@router.post('/uwb-location', status_code=status.HTTP_201_CREATED)
async def log_uwb_location(
    location_data: UWBLocationLogEntry,
    uwb_locations_collection: collection.Collection = Depends(get_uwb_locations_collection)
):
    """
    Log UWB location tracking data from smart cart.
    This endpoint receives real-time position data from UWB sensors.
    """
    try:
        # Convert to dict and insert
        location_doc = location_data.model_dump()
        result = uwb_locations_collection.insert_one(location_doc)
        
        return {
            "success": True,
            "message": "UWB location logged successfully",
            "location_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log UWB location: {str(e)}"
        )


@router.get('/logs', response_model=List[MotionLogEntry])
async def get_motion_logs(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN, Role.SHOP_CLIENT])),
    motion_logs_collection: collection.Collection = Depends(get_motion_logs_collection),
    cart_id: Optional[str] = Query(None, description="Filter by cart ID"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    state: Optional[int] = Query(None, ge=0, le=2, description="Filter by motion state (0=idle, 1=adding, 2=removing)"),
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back")
):
    """
    Retrieve motion sensor logs.
    """
    try:
        # Build filter query
        filter_query = {}
        
        # Time filter
        since = datetime.utcnow() - timedelta(hours=hours)
        filter_query["timestamp"] = {"$gte": since}
        
        # Cart filter
        if cart_id:
            filter_query["cart_id"] = cart_id
            
        # Session filter
        if session_id:
            filter_query["session_id"] = session_id
            
        # State filter
        if state is not None:
            filter_query["state"] = state
        
        # Query logs
        logs = list(motion_logs_collection.find(
            filter_query,
            {'_id': 0}
        ).sort("timestamp", DESCENDING).limit(limit))
        
        return logs
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve motion logs: {str(e)}"
        )


@router.get('/events', response_model=List[MotionEventLogEntry])
async def get_motion_events(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN, Role.SHOP_CLIENT])),
    motion_events_collection: collection.Collection = Depends(get_motion_events_collection),
    cart_id: Optional[str] = Query(None, description="Filter by cart ID"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type (add/remove)"),
    limit: int = Query(100, ge=1, le=1000, description="Number of events to return"),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back")
):
    """
    Retrieve processed motion events.
    """
    try:
        # Build filter query
        filter_query = {}
        
        # Time filter
        since = datetime.utcnow() - timedelta(hours=hours)
        filter_query["timestamp"] = {"$gte": since}
        
        # Cart filter
        if cart_id:
            filter_query["cart_id"] = cart_id
            
        # Session filter
        if session_id:
            filter_query["session_id"] = session_id
            
        # Event type filter
        if event_type and event_type.lower() in ["add", "remove"]:
            filter_query["event_type"] = event_type.lower()
        
        # Query events
        events = list(motion_events_collection.find(
            filter_query,
            {'_id': 0}
        ).sort("timestamp", DESCENDING).limit(limit))
        
        return events
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve motion events: {str(e)}"
        )


@router.get('/stats')
async def get_motion_stats(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN])),
    motion_logs_collection: collection.Collection = Depends(get_motion_logs_collection),
    motion_events_collection: collection.Collection = Depends(get_motion_events_collection),
    cart_id: Optional[str] = Query(None, description="Filter by cart ID"),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back")
):
    """
    Get motion statistics for admin dashboard.
    """
    try:
        # Time filter
        since = datetime.utcnow() - timedelta(hours=hours)
        time_filter = {"timestamp": {"$gte": since}}
        
        # Add cart filter if specified
        if cart_id:
            time_filter["cart_id"] = cart_id
        
        # Count logs by state
        state_pipeline = [
            {"$match": time_filter},
            {"$group": {
                "_id": "$state",
                "count": {"$sum": 1},
                "avg_weight": {"$avg": "$weight"}
            }}
        ]
        
        state_stats = list(motion_logs_collection.aggregate(state_pipeline))
        
        # Count events by type
        event_pipeline = [
            {"$match": time_filter},
            {"$group": {
                "_id": "$event_type",
                "count": {"$sum": 1},
                "avg_weight_change": {"$avg": "$weight_difference"}
            }}
        ]
        
        event_stats = list(motion_events_collection.aggregate(event_pipeline))
        
        # Total counts
        total_logs = motion_logs_collection.count_documents(time_filter)
        total_events = motion_events_collection.count_documents(time_filter)
        
        return {
            "period_hours": hours,
            "cart_id": cart_id,
            "total_logs": total_logs,
            "total_events": total_events,
            "state_distribution": state_stats,
            "event_distribution": event_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve motion statistics: {str(e)}"
        )


@router.get('/uwb-locations', response_model=List[UWBLocationLogEntry])
async def get_uwb_locations(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN, Role.SHOP_CLIENT])),
    uwb_locations_collection: collection.Collection = Depends(get_uwb_locations_collection),
    cart_id: Optional[str] = Query(None, description="Filter by cart ID"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    limit: int = Query(100, ge=1, le=10000, description="Number of location logs to return"),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back")
):
    """
    Retrieve UWB location tracking logs.
    """
    try:
        # Build filter query
        filter_query = {}
        
        # Time filter
        since = datetime.utcnow() - timedelta(hours=hours)
        filter_query["timestamp"] = {"$gte": since}
        
        # Cart filter
        if cart_id:
            filter_query["cart_id"] = cart_id
            
        # Session filter
        if session_id:
            filter_query["session_id"] = session_id
        
        # Query locations
        locations = list(uwb_locations_collection.find(
            filter_query,
            {'_id': 0}
        ).sort("timestamp", DESCENDING).limit(limit))
        
        return locations
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve UWB location logs: {str(e)}"
        )


@router.delete('/logs', status_code=status.HTTP_204_NO_CONTENT)
async def clear_motion_logs(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN])),
    motion_logs_collection: collection.Collection = Depends(get_motion_logs_collection),
    motion_events_collection: collection.Collection = Depends(get_motion_events_collection),
    uwb_locations_collection: collection.Collection = Depends(get_uwb_locations_collection),
    older_than_hours: int = Query(168, ge=1, description="Delete logs older than this many hours")
):
    """
    Clear old motion and location logs. Admin only.
    """
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
        filter_query = {"timestamp": {"$lt": cutoff_time}}
        
        # Delete old logs
        logs_result = motion_logs_collection.delete_many(filter_query)
        events_result = motion_events_collection.delete_many(filter_query)
        locations_result = uwb_locations_collection.delete_many(filter_query)
        
        return {
            "success": True,
            "deleted_logs": logs_result.deleted_count,
            "deleted_events": events_result.deleted_count,
            "deleted_locations": locations_result.deleted_count,
            "cutoff_time": cutoff_time.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear motion logs: {str(e)}"
        )


@router.delete('/uwb-locations', status_code=status.HTTP_200_OK)
async def clear_uwb_locations(
    current_user: auth.TokenData = Depends(auth.role_required([Role.ADMIN])),
    uwb_locations_collection: collection.Collection = Depends(get_uwb_locations_collection),
    older_than_hours: Optional[int] = Query(None, ge=1, description="Delete UWB locations older than this many hours"),
    all_data: bool = Query(False, description="Delete all UWB location data"),
    session_id: Optional[str] = Query(None, description="Delete UWB locations for specific session ID"),
    cart_id: Optional[str] = Query(None, description="Delete UWB locations for specific cart ID")
):
    """
    Clear UWB location data with various filter options. Admin only.
    
    Options:
    - older_than_hours: Delete data older than specified hours
    - all_data: Delete all UWB location data
    - session_id: Delete data for specific session
    - cart_id: Delete data for specific cart
    """
    try:
        filter_query = {}
        
        # Build filter query based on parameters
        if all_data:
            # Delete all data
            filter_query = {}
        elif older_than_hours:
            # Delete data older than specified hours
            cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
            filter_query["timestamp"] = {"$lt": cutoff_time}
        else:
            # Default: delete data older than 24 hours if no specific criteria
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            filter_query["timestamp"] = {"$lt": cutoff_time}
        
        # Add additional filters
        if session_id:
            filter_query["session_id"] = session_id
        
        if cart_id:
            filter_query["cart_id"] = cart_id
        
        # Delete UWB locations
        result = uwb_locations_collection.delete_many(filter_query)
        
        # Prepare response message
        operation_description = []
        if all_data:
            operation_description.append("all UWB location data")
        elif older_than_hours:
            operation_description.append(f"UWB locations older than {older_than_hours} hours")
        else:
            operation_description.append("UWB locations older than 24 hours (default)")
            
        if session_id:
            operation_description.append(f"for session '{session_id}'")
        if cart_id:
            operation_description.append(f"for cart '{cart_id}'")
        
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "operation": " ".join(operation_description),
            "filter_applied": filter_query,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear UWB locations: {str(e)}"
        )
