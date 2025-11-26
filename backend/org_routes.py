from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from models import SuccessResponse
from database_utils import run_postgres_query
from auth_routes import get_current_user, UserResponse
import bcrypt

router = APIRouter(prefix="/org", tags=["Organization Management"])

class CreateOrgRequest(BaseModel):
    org_name: str
    description: str | None = None

    admin_username: str
    admin_email: str
    admin_password: str
    admin_name: str

@router.post("/org-create", response_model=SuccessResponse)
async def create_organization(
    data: CreateOrgRequest,
    current_user: UserResponse = Depends(get_current_user)
):

    if current_user.role_name != "SuperAdmin":
        raise HTTPException(status_code=403, detail="Only SuperAdmin can create organizations")

    check_org = run_postgres_query(
        "SELECT id FROM organizations WHERE name = %s",
        (data.org_name,)
    )

    if check_org.get("data"):
        raise HTTPException(status_code=400, detail="Organization already exists")

    org_insert_query = """
        INSERT INTO organizations (name, created_at, updated_at)
        VALUES (%s, NOW(), NOW())
    """

    org_result = run_postgres_query(
        org_insert_query,
        (data.org_name,)
    )

    if not org_result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to create organization")

    # Fetch the created organization by name
    fetch_org_query = "SELECT id, name FROM organizations WHERE name = %s"
    fetch_org_result = run_postgres_query(fetch_org_query, (data.org_name,))
    
    if not fetch_org_result.get("data"):
        raise HTTPException(status_code=500, detail="Failed to retrieve created organization")
    
    org = fetch_org_result["data"][0]
    new_org_id = org["id"]

    role_query = "SELECT id FROM roles WHERE role_name = 'OrgAdmin' LIMIT 1"
    role_result = run_postgres_query(role_query)

    if not role_result.get("data"):
        raise HTTPException(status_code=500, detail="OrgAdmin role not found. Create it first.")

    org_admin_role_id = role_result["data"][0]["id"]

    user_check = run_postgres_query(
        "SELECT id FROM users WHERE username = %s OR email = %s",
        (data.admin_username, data.admin_email)
    )
    if user_check.get("data"):
        raise HTTPException(status_code=400, detail="Admin username or email already exists")

    hashed_password = bcrypt.hashpw(
        data.admin_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    user_insert_query = """
        INSERT INTO users (org_id, username, email, password, name, role_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
    """

    admin_result = run_postgres_query(
        user_insert_query,
        (
            new_org_id,
            data.admin_username,
            data.admin_email,
            hashed_password,
            data.admin_name,
            org_admin_role_id
        )
    )

    if not admin_result.get("success"):
        raise HTTPException(status_code=500, detail="Organization created, but failed to create admin user")

    # Fetch the created user
    fetch_user_query = "SELECT id, username, email, name FROM users WHERE email = %s"
    fetch_user_result = run_postgres_query(fetch_user_query, (data.admin_email,))
    
    if not fetch_user_result.get("data"):
        raise HTTPException(status_code=500, detail="User created but could not retrieve details")
    
    admin = fetch_user_result["data"][0]

    return SuccessResponse(
        success=True,
        message=(
            f"Organization '{org['name']}' created successfully. "
            f"Org Admin '{admin['username']}' added."
        )
    )

class CreateUserRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str
    role: str

@router.post("/user-create", response_model=SuccessResponse)
async def create_user_by_org_admin(
    data: CreateUserRequest,
    current_user: UserResponse = Depends(get_current_user)
):

    if current_user.role_name != "OrgAdmin":
        raise HTTPException(status_code=403, detail="Only OrgAdmin can create users")
    
    org_id = current_user.org_id

    user_check = run_postgres_query(
        "SELECT id FROM users WHERE username = %s OR email = %s",
        (data.username, data.email)
    )

    if user_check.get("data"):
        raise HTTPException(status_code=400, detail="Username or email already exists")

    role_query = "SELECT id FROM roles WHERE role_name = %s"
    role_result = run_postgres_query(role_query, (data.role,))

    if role_result.get("data"):
        role_id = role_result["data"][0]["id"]
    else:
        create_role_query = """
            INSERT INTO roles (role_name)
            VALUES (%s)
            RETURNING id;
        """
        new_role = run_postgres_query(create_role_query, (data.role,))
        if not new_role.get("success"):
            raise HTTPException(status_code=500, detail="Failed to create new role")
        role_id = new_role["data"][0]["id"]

    hashed_password = bcrypt.hashpw(
        data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    user_insert_query = """
        INSERT INTO users (org_id, username, email, password, name, role_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        RETURNING id, username, email, name, role_id;
    """

    user_result = run_postgres_query(
        user_insert_query,
        (
            org_id,
            data.username,
            data.email,
            hashed_password,
            data.name,
            role_id
        )
    )

    if not user_result.get("success"):
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = user_result["data"][0]

    return SuccessResponse(
        success=True,
        message=(
            f"User '{user['username']}' created successfully with role '{data.role}' "
            f"in organization ID {org_id}."
        )
    )