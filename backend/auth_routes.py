from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import os
from pydantic import BaseModel
from models import LoginRequest, LoginResponse, User, SuccessResponse
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
    role: str
    org_id: int

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    name: str = ""
    is_active: bool = True

    role_id: int | None = None
    role_name: str | None = None

    org_id: int | None = None
    org_name: str | None = None

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
            role     = payload.get("role"),
            org_id   = payload.get("org_id")
        )
        print(data)
        return data

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
# def get_current_user(username: str = Depends(verify_token)):
#     query = """
#         SELECT ID, USERNAME, EMAIL, NAME, IS_ACTIVE
#         FROM USERS
#         WHERE USERNAME = %s OR EMAIL = %s
#     """
#     # result = run_snowflake_query(query, (username, username))
#     result = run_postgres_query(query, (username, username))
#     if result and result.get("success") and result.get("data"):
#         user_data = result["data"][0]
#         return User(
#             id=user_data.get("ID") or user_data.get("id"),
#             username=user_data.get("USERNAME") or user_data.get("username"),
#             email=user_data.get("EMAIL") or user_data.get("email"),
#             name=user_data.get("NAME") or user_data.get("name", ""),
#             is_active=user_data.get("IS_ACTIVE", True) or user_data.get("is_active", True)
#         )
#     raise HTTPException(status_code=401, detail="User not found or inactive")

def get_current_user(token_data: TokenData = Depends(verify_token)):
    query = """
        SELECT 
            u.id AS user_id,
            u.username,
            u.email,
            u.name,
            u.is_active,

            r.id AS role_id,
            r.role_name,

            o.id AS org_id,
            o.org_name

        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN organizations o ON u.org_id = o.id
        WHERE u.username = %s OR u.email = %s
    """

    result = run_postgres_query(query, (token_data.username, token_data.username))

    if result and result.get("success") and result.get("data"):
        row = result["data"][0]

        return UserResponse(
            id=row["user_id"],
            username=row["username"],
            email=row["email"],
            name=row.get("name", ""),
            is_active=row.get("is_active", True),

            role_id=row.get("role_id"),
            role_name=row.get("role_name"),

            org_id=row.get("org_id"),
            org_name=row.get("org_name"),
        )

    raise HTTPException(status_code=401, detail="User not found or inactive")

@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    identifier = login_request.username or login_request.email
    print(login_request)

    query = """
        SELECT 
            u.id,
            u.username,
            u.email,
            u.password,
            u.name,
            u.is_active,
            u.org_id,
            r.name AS role_name,
            o.name AS org_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN organizations o ON u.org_id = o.id
        WHERE (u.username = %s OR u.email = %s)
        LIMIT 1;
    """

    result = run_postgres_query(query, (identifier, identifier))

    if not result or not result.get("success") or not result.get("data"):
        raise HTTPException(status_code=401, detail="User not found")

    user = result["data"][0]

    stored_hash = user["password"]

    if not bcrypt.checkpw(login_request.password.encode("utf-8"), stored_hash.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid password")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "username": user["username"],
            "user_id": user["id"],
            "role": user["role_name"],
            "org_id": user["org_id"],
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
            "org_id": user["org_id"],
            "org_name": user["org_name"],
            "role": user["role_name"]
        }
    )



@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)):
    return SuccessResponse(success=True, message=f"User {current_user.name} logged out successfully")


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/verify-token", response_model=SuccessResponse)
async def verify_user_token(current_user: User = Depends(get_current_user)):
    return SuccessResponse(success=True, message=f"Token is valid for user {current_user.name}")


@router.get("/health")
async def auth_health_check():
    return {"status": "healthy", "service": "authentication"}