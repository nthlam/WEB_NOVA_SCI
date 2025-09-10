# backend/auth.py
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from .config import settings
from .models import Role, SessionCreate
from .services.session_service import SessionService
from .database import get_sessions_collection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class TokenData(BaseModel):
    identity: str
    role: Optional[str] = None
    session_id: Optional[str] = None

async def create_access_token(
    data: dict, 
    user_identity: str,
    user_role: str,
    expires_delta: Optional[timedelta] = None,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
    session_id: Optional[str] = None
):
    """
    Create access token with session management.
    If session_id is not provided, a new session will be created.
    """
    to_encode = data.copy()
    
    # Create or use existing session
    if not session_id:
        session_data = SessionCreate(
            user_identity=user_identity,
            user_role=user_role,
            user_agent=user_agent,
            ip_address=ip_address
        )
        session_id = await SessionService.create_session(session_data)
    else:
        # Update existing session activity
        await SessionService.update_session_activity(session_id)
    
    to_encode["session_id"] = session_id
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + settings.JWT_ACCESS_TOKEN_EXPIRES
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt, session_id

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + settings.JWT_REFRESH_TOKEN_EXPIRES
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        identity: str = payload.get("sub")
        role: str = payload.get("role")
        session_id: str = payload.get("session_id")
        if identity is None:
            raise credentials_exception
            
        # Validate session in database
        if session_id:
            session_valid = await SessionService.validate_session(session_id, identity)
            if not session_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired or invalid",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            # Update session activity
            await SessionService.update_session_activity(session_id)
            
        token_data = TokenData(identity=identity, role=role, session_id=session_id)
    except JWTError:
        raise credentials_exception
    return token_data

def role_required(roles: List[Role]):
    def role_checker(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: This endpoint requires one of the following roles: {', '.join(r.value for r in roles)}",
            )
        return current_user
    return role_checker