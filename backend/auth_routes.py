from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import os
from pydantic import BaseModel
from models import LoginRequest, LoginResponse, User, SuccessResponse, UserWithDetails
from database_utils import run_postgres_query

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Security
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

class TokenData(BaseModel):
    username: str
    user_id: int
    org_id: Optional[int] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    name: str = ""
    org_id: Optional[int] = None
    org_name: Optional[str] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    is_active: bool = True

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
#     if not credentials:
#         raise HTTPException(status_code=401, detail="No authorization header provided")
#     try:
#         payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
#         username: str = payload.get("sub")
#         if username is None:
#             raise HTTPException(status_code=401, detail="Invalid authentication credentials")
#         return username
#     except JWTError:
#         raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        data = TokenData(
            username = payload.get("username"),
            user_id  = payload.get("user_id"),
            org_id   = payload.get("org_id"),
            role_id  = payload.get("role_id"),
            role_name = payload.get("role_name")
        )
        print(data)
        return data

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(token_data: TokenData = Depends(verify_token)):
    query = """
        SELECT
            u.id,
            u.username,
            u.email,
            u.name,
            u.org_id,
            o.name as org_name,
            u.role_id,
            r.role_name,
            u.is_active
        FROM users u
        LEFT JOIN organizations o ON u.org_id = o.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = %s OR u.email = %s
    """

    result = run_postgres_query(query, (token_data.username, token_data.username))

    if result and result.get("success") and result.get("data"):
        row = result["data"][0]

        return UserResponse(
            id=row["id"],
            username=row["username"],
            email=row["email"],
            name=row.get("name", ""),
            org_id=row.get("org_id"),
            org_name=row.get("org_name"),
            role_id=row.get("role_id"),
            role_name=row.get("role_name"),
            is_active=row.get("is_active", True)
        )

    raise HTTPException(status_code=401, detail="User not found or inactive")

@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    identifier = login_request.username or login_request.email
    print(login_request)

    # Build query with optional organization and role filters
    query = """
        SELECT
            u.id,
            u.username,
            u.email,
            u.password,
            u.name,
            u.org_id,
            o.name as org_name,
            u.role_id,
            r.role_name,
            u.is_active
        FROM users u
        LEFT JOIN organizations o ON u.org_id = o.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE (u.username = %s OR u.email = %s)
    """

    params = [identifier, identifier]

    # If organization is specified, filter by it
    if login_request.organization:
        query += " AND o.name = %s"
        params.append(login_request.organization)

    # If role is specified, filter by it
    if login_request.role:
        query += " AND r.role_name = %s"
        params.append(login_request.role)

    query += " LIMIT 1;"

    result = run_postgres_query(query, tuple(params))

    if not result or not result.get("success") or not result.get("data"):
        raise HTTPException(status_code=401, detail="User not found with the specified credentials")

    user = result["data"][0]

    stored_hash = user["password"]

    if not bcrypt.checkpw(login_request.password.encode("utf-8"), stored_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid password")

    # Check if user is active
    if not user.get("is_active", False):
        raise HTTPException(status_code=403, detail="User account is inactive")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "username": user["username"],
            "user_id": user["id"],
            "org_id": user.get("org_id"),
            "role_id": user.get("role_id"),
            "role_name": user.get("role_name"),
        },
        expires_delta=access_token_expires
    )

    return LoginResponse(
        success=True,
        message="Login successful",
        token=access_token,
        user={
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "name": user["name"],
            "is_active": user["is_active"],
            "org_id": user.get("org_id"),
            "org_name": user.get("org_name"),
            "role_id": user.get("role_id"),
            "role_name": user.get("role_name")
        }
    )



@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)):
    return SuccessResponse(success=True, message=f"User {current_user.name} logged out successfully")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    return current_user


@router.get("/organizations")
async def get_organizations():
    """Get all organizations"""
    query = "SELECT id, name FROM public.organizations ORDER BY name"
    result = run_postgres_query(query)

    if result and result.get("success"):
        # Convert RealDictRow to regular dict
        organizations = [dict(row) for row in result.get("data", [])]
        return {
            "success": True,
            "organizations": organizations
        }

    return {"success": False, "organizations": []}


@router.get("/roles")
async def get_roles():
    """Get all roles"""
    query = "SELECT id, role_name, description FROM public.roles ORDER BY id"
    result = run_postgres_query(query)

    if result and result.get("success"):
        # Convert RealDictRow to regular dict
        roles = [dict(row) for row in result.get("data", [])]
        return {
            "success": True,
            "roles": roles
        }

    return {"success": False, "roles": []}


@router.post("/verify-token", response_model=SuccessResponse)
async def verify_user_token(current_user: UserResponse = Depends(get_current_user)):
    return SuccessResponse(success=True, message=f"Token is valid for user {current_user.name}")


@router.get("/health")
async def auth_health_check():
    return {"status": "healthy", "service": "authentication"}