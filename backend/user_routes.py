from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from models import SuccessResponse, UserWithDetails
from database_utils import run_postgres_query
from auth_routes import get_current_user, UserResponse
import bcrypt
 
router = APIRouter(prefix="/users", tags=["User Management"])
 
class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1, max_length=255)
    role_id: Optional[int] = None
    org_id: Optional[int] = None
 
class CreateUserResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserWithDetails] = None
 
@router.post("/", response_model=CreateUserResponse)
async def create_user(
    data: CreateUserRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Create a new user.
    - SuperAdmin can create users in any organization with any role.
    - OrgAdmin can create users in their own organization with role <= User.
    - Regular users cannot create users.
    """
 
    # Check authorization
    if current_user.role_name not in ["SuperAdmin", "OrgAdmin"]:
        raise HTTPException(
            status_code=403,
            detail="Only SuperAdmin or OrgAdmin can create users"
        )
 
    # If OrgAdmin, enforce organization boundary
    if current_user.role_name == "OrgAdmin":
        if data.org_id and data.org_id != current_user.org_id:
            raise HTTPException(
                status_code=403,
                detail="OrgAdmin can only create users in their own organization"
            )
        # Auto-assign to current user's org
        data.org_id = current_user.org_id
 
    # Validate role_id if provided
    if data.role_id:
        role_query = "SELECT id, role_name FROM roles WHERE id = %s"
        role_result = run_postgres_query(role_query, (data.role_id,))
        if not role_result.get("data"):
            raise HTTPException(status_code=400, detail="Invalid role_id")
       
        role_name = role_result["data"][0]["role_name"]
       
        # OrgAdmin can't create SuperAdmin
        if current_user.role_name == "OrgAdmin" and role_name == "SuperAdmin":
            raise HTTPException(
                status_code=403,
                detail="OrgAdmin cannot create SuperAdmin users"
            )
 
    # Check if user already exists
    user_check = run_postgres_query(
        "SELECT id FROM users WHERE username = %s OR email = %s",
        (data.username, data.email)
    )
    if user_check.get("data"):
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists"
        )
 
    # Hash password
    hashed_password = bcrypt.hashpw(
        data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")
 
    # Insert user
    insert_query = """
        INSERT INTO users (username, email, password, name, role_id, org_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
    """
   
    result = run_postgres_query(
        insert_query,
        (
            data.username,
            data.email,
            hashed_password,
            data.name,
            data.role_id,
            data.org_id
        )
    )
 
    if not result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to create user")
 
    # Fetch the created user
    fetch_query = "SELECT id, username, email, name, org_id, role_id, is_active FROM users WHERE email = %s"
    fetch_result = run_postgres_query(fetch_query, (data.email,))
   
    if not fetch_result.get("data"):
        raise HTTPException(status_code=500, detail="User created but could not retrieve details")
   
    user_row = fetch_result["data"][0]
 
    # Fetch org and role names for response
    org_name = None
    if user_row["org_id"]:
        org_query = "SELECT name FROM organizations WHERE id = %s"
        org_result = run_postgres_query(org_query, (user_row["org_id"],))
        if org_result.get("data"):
            org_name = org_result["data"][0]["name"]
 
    role_name = None
    if user_row["role_id"]:
        role_query = "SELECT role_name FROM roles WHERE id = %s"
        role_result = run_postgres_query(role_query, (user_row["role_id"],))
        if role_result.get("data"):
            role_name = role_result["data"][0]["role_name"]
 
    user_response = UserWithDetails(
        id=user_row["id"],
        username=user_row["username"],
        email=user_row["email"],
        name=user_row["name"],
        org_id=user_row["org_id"],
        org_name=org_name,
        role_id=user_row["role_id"],
        role_name=role_name,
        is_active=user_row["is_active"]
    )
 
    return CreateUserResponse(
        success=True,
        message=f"User '{data.username}' created successfully",
        user=user_response
    )
 
@router.get("/")
async def list_users(
    current_user: UserResponse = Depends(get_current_user)
):
    """List users. SuperAdmin sees all users. OrgAdmin sees users in their org."""
    if current_user.role_name == "SuperAdmin":
        query = """
            SELECT u.id, u.username, u.email, u.name, u.org_id, o.name as org_name,
                   u.role_id, r.role_name, u.is_active
            FROM users u
            LEFT JOIN organizations o ON u.org_id = o.id
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id DESC
        """
        res = run_postgres_query(query)
    else:
        # OrgAdmin or others: restrict to org
        query = """
            SELECT u.id, u.username, u.email, u.name, u.org_id, o.name as org_name,
                   u.role_id, r.role_name, u.is_active
            FROM users u
            LEFT JOIN organizations o ON u.org_id = o.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.org_id = %s
            ORDER BY u.id DESC
        """
        res = run_postgres_query(query, (current_user.org_id,))
 
    if not res.get("data"):
        return []
 
    users = []
    for row in res["data"]:
        users.append(UserWithDetails(
            id=row["id"],
            username=row["username"],
            email=row["email"],
            name=row["name"],
            org_id=row["org_id"],
            org_name=row.get("org_name"),
            role_id=row.get("role_id"),
            role_name=row.get("role_name"),
            is_active=row.get("is_active", True)
        ))
 
    return users
 
 
@router.get("/{user_id}", response_model=UserWithDetails)
async def get_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get user details by ID"""
    query = """
        SELECT
            u.id, u.username, u.email, u.name, u.org_id,
            o.name as org_name, u.role_id, r.role_name, u.is_active
        FROM users u
        LEFT JOIN organizations o ON u.org_id = o.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = %s
    """
    result = run_postgres_query(query, (user_id,))
   
    if not result.get("data"):
        raise HTTPException(status_code=404, detail="User not found")
   
    row = result["data"][0]
   
    return UserWithDetails(
        id=row["id"],
        username=row["username"],
        email=row["email"],
        name=row["name"],
        org_id=row["org_id"],
        org_name=row["org_name"],
        role_id=row["role_id"],
        role_name=row["role_name"],
        is_active=row["is_active"]
    )
 
 
class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    name: Optional[str] = None
    role_id: Optional[int] = None
    org_id: Optional[int] = None
    is_active: Optional[bool] = None
 
 
@router.put("/{user_id}")
async def update_user(
    user_id: int,
    data: UpdateUserRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update a user's fields. SuperAdmin can update any user; OrgAdmin can update users in their org (but not elevate to SuperAdmin)."""
    # Fetch existing user
    q = "SELECT id, org_id, role_id FROM users WHERE id = %s"
    existing = run_postgres_query(q, (user_id,))
    if not existing.get("data"):
        raise HTTPException(status_code=404, detail="User not found")
 
    row = existing["data"][0]
    target_org = row.get("org_id")
    target_role = row.get("role_id")
 
    # Authorization
    if current_user.role_name == "OrgAdmin":
        if target_org != current_user.org_id:
            raise HTTPException(status_code=403, detail="OrgAdmin can only manage users in their org")
 
    # If role_id provided, validate
    if data.role_id is not None:
        role_check = run_postgres_query("SELECT role_name FROM roles WHERE id = %s", (data.role_id,))
        if not role_check.get("data"):
            raise HTTPException(status_code=400, detail="Invalid role_id")
        new_role_name = role_check["data"][0]["role_name"]
        if current_user.role_name == "OrgAdmin" and new_role_name == "SuperAdmin":
            raise HTTPException(status_code=403, detail="OrgAdmin cannot assign SuperAdmin role")
 
    # Build update query parts
    updates = []
    params = []
 
    if data.username is not None:
        updates.append("username = %s")
        params.append(data.username)
    if data.email is not None:
        updates.append("email = %s")
        params.append(data.email)
    if data.name is not None:
        updates.append("name = %s")
        params.append(data.name)
    if data.role_id is not None:
        updates.append("role_id = %s")
        params.append(data.role_id)
    if data.org_id is not None:
        updates.append("org_id = %s")
        params.append(data.org_id)
    if data.is_active is not None:
        updates.append("is_active = %s")
        params.append(data.is_active)
    if data.password is not None:
        hashed = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        updates.append("password = %s")
        params.append(hashed)
 
    if not updates:
        return {"success": True, "message": "No changes provided"}
 
    params.append(user_id)
    update_query = f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE id = %s"
    res = run_postgres_query(update_query, tuple(params))
    if not res.get("success"):
        raise HTTPException(status_code=500, detail="Failed to update user")
 
    return {"success": True, "message": "User updated"}
 
 
@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a user. Only SuperAdmin can delete across orgs; OrgAdmin can delete within org."""
    # Fetch existing user
    q = "SELECT org_id, role_id FROM users WHERE id = %s"
    existing = run_postgres_query(q, (user_id,))
    if not existing.get("data"):
        raise HTTPException(status_code=404, detail="User not found")
    row = existing["data"][0]
    if current_user.role_name == "OrgAdmin" and row.get("org_id") != current_user.org_id:
        raise HTTPException(status_code=403, detail="OrgAdmin can only delete users in their org")
 
    # Prevent deleting SuperAdmin by OrgAdmin
    if current_user.role_name == "OrgAdmin":
        role_check = run_postgres_query("SELECT role_name FROM roles WHERE id = %s", (row.get("role_id"),))
        if role_check.get("data") and role_check["data"][0]["role_name"] == "SuperAdmin":
            raise HTTPException(status_code=403, detail="Cannot delete SuperAdmin")
 
    del_query = "DELETE FROM users WHERE id = %s"
    res = run_postgres_query(del_query, (user_id,))
    if not res.get("success"):
        raise HTTPException(status_code=500, detail="Failed to delete user")
 
    return {"success": True, "message": "User deleted"}
 
 