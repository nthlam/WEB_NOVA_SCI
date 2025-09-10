# backend/me/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
import datetime
from typing import Dict, Any

from .. import auth

router = APIRouter(
    prefix="/api/me",
    tags=["Me"]
)

@router.post('/status')
async def update_user_status_and_extend_jwt(
    status_data: Dict[str, Any],
    current_user: auth.TokenData = Depends(auth.get_current_user)
):
    """
    Accepts an arbitrary status dictionary from the client,
    and returns a new JWT with an extended expiration and the status included.
    """
    # Prepare new claims for the extended token.
    # It's crucial to preserve existing important claims like 'role' and 'session_id'.
    new_claims = {
        "sub": current_user.identity, 
        "role": current_user.role
    }
    
    # Add the new status data under a specific key, e.g., 'client_status'
    new_claims["client_status"] = status_data
    
    # Create a new token with an extended expiry time (e.g., 24 hours)
    # Reuse the existing session
    extended_access_token, session_id = await auth.create_access_token(
        data=new_claims,
        user_identity=current_user.identity,
        user_role=current_user.role,
        expires_delta=datetime.timedelta(hours=24),
        session_id=current_user.session_id  # Reuse existing session
    )
    
    return {
        "access_token": extended_access_token, 
        "token_type": "bearer",
        "session_id": session_id
    }