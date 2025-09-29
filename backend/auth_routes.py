from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import os

from models import LoginRequest, LoginResponse, User, SuccessResponse
from database_utils import run_snowflake_query   # ✅ always use this

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Security
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440


# ----------------------------
# Database Init
# ----------------------------
def init_users_table():
    """Create USERS table if not exists and insert default admin"""
    # The table should already exist from database_setup.py, but let's ensure it has the right structure
    try:
        # Just insert the admin user if it doesn't exist
        insert_query = """
        INSERT INTO MATTERAI_DB.PUBLIC.USERS (USERNAME, EMAIL, PASSWORD, NAME)
        SELECT 'admin', 'admin@gmail.com', '1234', 'Admin User'
        WHERE NOT EXISTS (
            SELECT 1 FROM MATTERAI_DB.PUBLIC.USERS WHERE USERNAME = 'admin'
        )
        """
        result = run_snowflake_query(insert_query)

        # Also add a test user
        insert_test_query = """
        INSERT INTO MATTERAI_DB.PUBLIC.USERS (USERNAME, EMAIL, PASSWORD, NAME)
        SELECT 'test', 'test@test.com', 'test', 'Test User'
        WHERE NOT EXISTS (
            SELECT 1 FROM MATTERAI_DB.PUBLIC.USERS WHERE USERNAME = 'test'
        )
        """
        run_snowflake_query(insert_test_query)

        return result["success"] if result else False
    except Exception as e:
        print(f"Error in init_users_table: {e}")
        return False


# ----------------------------
# JWT Helpers
# ----------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="No authorization header provided")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


def get_current_user(username: str = Depends(verify_token)):
    query = """
        SELECT ID, USERNAME, EMAIL, NAME, IS_ACTIVE
        FROM MATTERAI_DB.PUBLIC.USERS
        WHERE USERNAME = %s OR EMAIL = %s
    """
    result = run_snowflake_query(query, (username, username))
    if result and result.get("success") and result.get("data"):
        user_data = result["data"][0]
        return User(
            id=user_data.get("ID") or user_data.get("id"),
            username=user_data.get("USERNAME") or user_data.get("username"),
            email=user_data.get("EMAIL") or user_data.get("email"),
            name=user_data.get("NAME") or user_data.get("name", ""),
            is_active=user_data.get("IS_ACTIVE", True) or user_data.get("is_active", True)
        )
    raise HTTPException(status_code=401, detail="User not found or inactive")


# ----------------------------
# Routes
# ----------------------------
@router.get("/debug/users")
async def debug_users():
    """Debug endpoint to see all users in database"""
    query = "SELECT ID, USERNAME, EMAIL, PASSWORD, NAME, IS_ACTIVE FROM MATTERAI_DB.PUBLIC.USERS"
    result = run_snowflake_query(query)

    if result and result.get("success"):
        return {
            "users": result["data"],
            "count": len(result["data"]) if result["data"] else 0
        }
    else:
        error_msg = result.get("message", "Database query failed") if result else "Database connection failed"
        return {"error": error_msg}

@router.get("/debug/create-admin")
async def create_admin_user():
    """Debug endpoint to manually create admin user"""
    try:
        # First ensure the table exists
        init_users_table()

        # Check if admin already exists
        check_query = "SELECT COUNT(*) as count FROM MATTERAI_DB.PUBLIC.USERS WHERE USERNAME = 'admin'"
        check_result = run_snowflake_query(check_query)

        if check_result and check_result.get("success") and check_result.get("data"):
            count = check_result["data"][0].get("COUNT") or check_result["data"][0].get("count")
            if count > 0:
                return {"message": "Admin user already exists"}

        # Create admin user
        insert_query = """
        INSERT INTO MATTERAI_DB.PUBLIC.USERS (USERNAME, EMAIL, PASSWORD, NAME)
        VALUES ('admin', 'admin@gmail.com', '1234', 'Admin User')
        """
        result = run_snowflake_query(insert_query)

        if result and result.get("success"):
            return {"message": "Admin user created successfully"}
        else:
            error_msg = result.get('message', 'Unknown error') if result else "Database connection failed"
            return {"error": f"Failed to create admin user: {error_msg}"}

    except Exception as e:
        return {"error": f"Exception: {str(e)}"}

@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    # Get the identifier (username or email)
    identifier = login_request.username or login_request.email

    # Snowflake query
    query = """
       SELECT ID, USERNAME, EMAIL, PASSWORD, NAME, IS_ACTIVE, CREATED_AT, UPDATED_AT
       FROM MATTERAI_DB.PUBLIC.USERS
       WHERE (USERNAME = %s OR EMAIL = %s)
       AND PASSWORD = %s
    """
    result = run_snowflake_query(
        query,
        (identifier, identifier, login_request.password)
    )

    # Handle case where run_snowflake_query returns None
    if not result or not result.get("success") or not result.get("data"):
        # Debug: Let's also check if user exists without password check
        debug_query = """
           SELECT ID, USERNAME, EMAIL, PASSWORD
           FROM MATTERAI_DB.PUBLIC.USERS
           WHERE (USERNAME = %s OR EMAIL = %s)
        """
        debug_result = run_snowflake_query(debug_query, (identifier, identifier))

        if debug_result and debug_result.get("success") and debug_result.get("data"):
            # User exists but password is wrong
            raise HTTPException(status_code=401, detail="Invalid password")
        else:
            # User doesn't exist or database connection failed
            print(f"🔍 Debug result: {debug_result}")
            raise HTTPException(status_code=401, detail="User not found")

    user_data = result["data"][0]

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.get("USERNAME") or user_data.get("username")},
        expires_delta=access_token_expires
    )

    return LoginResponse(
        success=True,
        message="Login successful",
        token=access_token,
        user={
            "id": user_data.get("ID") or user_data.get("id"),
            "username": user_data.get("USERNAME") or user_data.get("username"),
            "email": user_data.get("EMAIL") or user_data.get("email"),
            "name": user_data.get("NAME") or user_data.get("name", ""),
            "is_active": user_data.get("IS_ACTIVE", True)
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
