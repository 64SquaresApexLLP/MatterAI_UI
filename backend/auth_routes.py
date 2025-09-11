from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import os

from models import LoginRequest, LoginResponse, User, SuccessResponse, ErrorResponse
from database_utils import run_snowflake_query

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Security
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours for testing

# Mock user database (replace with real database)
MOCK_USERS = {
    "a@a.com": {
        "username": "a@a.com",
        "email": "a@a.com",
        "name": "Flori",
        "password_hash": hashlib.sha256("a".encode()).hexdigest()  # Hash of "a"
    },
    "saurabh_patil": {
        "username": "saurabh_patil",
        "email": "saurabhp@64-squares.com",
        "name": "Saurabh Patil",
        "password_hash": hashlib.sha256("123".encode()).hexdigest()  # Hash of "123"
    },
    "saurabhp@64-squares.com": {
        "username": "saurabh_patil",  # Same user, different login key
        "email": "saurabhp@64-squares.com",
        "name": "Saurabh Patil",
        "password_hash": hashlib.sha256("123".encode()).hexdigest()  # Hash of "123"
    }
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authorization header provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")

        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return username
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(username: str = Depends(verify_token)):
    """Get current authenticated user"""


    # Try database first
    user = None
    try:
        # Check database for user
        query = "SELECT id, username, email, name, is_active FROM users WHERE username = %s AND is_active = TRUE"
        result = run_snowflake_query(query, (username,))

        if result["success"] and result["data"]:
            user_data = result["data"][0]
            user = {
                "id": user_data["id"],
                "username": user_data["username"],
                "email": user_data["email"],
                "name": user_data["name"],
                "is_active": user_data.get("is_active", True)
            }

    except Exception as e:

        pass  # Fallback to mock users

    # Fallback to mock users
    if not user:
        mock_user = MOCK_USERS.get(username)
        if mock_user:
            user = {
                "id": 1,  # Default ID for mock users
                "username": mock_user["username"],
                "email": mock_user["email"],
                "name": mock_user["name"],
                "is_active": True
            }


    if user is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return User(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        name=user["name"],
        is_active=user.get("is_active", True)
    )

@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    """
    Authenticate user and return access token
    """
    try:
        # Try database first, fallback to mock users
        user = None

        # Check database for user
        try:
            # For your specific user, check with plain text password first
            if login_request.username == 'saurabh_patil' and login_request.password == '123':
                # Direct database query for your user
                query = "SELECT id, username, email, name FROM users WHERE username = %s AND password_hash = %s"
                result = run_snowflake_query(query, (login_request.username, login_request.password))

                if result["success"] and result["data"]:
                    user_data = result["data"][0]
                    user = {
                        "username": user_data["username"],
                        "email": user_data["email"],
                        "name": user_data["name"]
                    }

            # If not found in database, try mock users
            if not user:
                mock_user = MOCK_USERS.get(login_request.username)
                if mock_user:
                    # Verify password with mock data
                    password_hash = hashlib.sha256(login_request.password.encode()).hexdigest()
                    if password_hash == mock_user["password_hash"]:
                        user = mock_user

        except Exception:
            # Fallback to mock users
            mock_user = MOCK_USERS.get(login_request.username)
            if mock_user:
                # Verify password with mock data
                password_hash = hashlib.sha256(login_request.password.encode()).hexdigest()
                if password_hash == mock_user["password_hash"]:
                    user = mock_user

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Please check your username and password."
            )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["username"]}, expires_delta=access_token_expires
        )

        return LoginResponse(
            success=True,
            message="Login successful",
            user={
                "username": user["username"],
                "email": user["email"],
                "name": user["name"]
            },
            token=access_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user (in a real app, you might want to blacklist the token)
    """
    return SuccessResponse(
        success=True,
        message=f"User {current_user.name} logged out successfully"
    )

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return current_user

@router.post("/verify-token", response_model=SuccessResponse)
async def verify_user_token(current_user: User = Depends(get_current_user)):
    """
    Verify if the provided token is valid
    """
    return SuccessResponse(
        success=True,
        message=f"Token is valid for user {current_user.name}"
    )

# Health check for auth service
@router.get("/health")
async def auth_health_check():
    """
    Health check endpoint for authentication service
    """
    return {"status": "healthy", "service": "authentication"}
