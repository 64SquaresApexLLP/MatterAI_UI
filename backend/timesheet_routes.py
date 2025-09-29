from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from typing import List, Optional
from pydantic import ValidationError
import uuid
from datetime import datetime, date

from models import (
    TimesheetEntry, TimesheetResponse, TimesheetListResponse,
    SuccessResponse, ErrorResponse, User
)
from auth_routes import get_current_user
from database_utils import (
    create_timesheet_entry, get_timesheet_entries,
    update_timesheet_entry, delete_timesheet_entry, run_snowflake_query
)

router = APIRouter(prefix="/timesheet", tags=["Timesheet"])

# Mock database for timesheet entries (replace with real database)
MOCK_TIMESHEET_DB = {}

def generate_entry_id() -> str:
    """Generate unique entry ID"""
    return str(uuid.uuid4())

@router.post("/entries", response_model=TimesheetResponse)
async def create_timesheet_entry_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new timesheet entry
    """
    try:
        # Get raw request body
        body = await request.json()
        print(f"📝 Raw request body: {body}")

        # Fix currency mapping
        currency_mapping = {
            'US dollars': 'USD',
            'US Dollars': 'USD',
            'USD': 'USD',
            'Euro': 'EUR',
            'EUR': 'EUR',
            'British Pound': 'GBP',
            'GBP': 'GBP'
        }

        if 'currency' in body:
            original_currency = body['currency']
            body['currency'] = currency_mapping.get(original_currency, original_currency)
            if original_currency != body['currency']:
                print(f"🔄 Mapped currency: '{original_currency}' -> '{body['currency']}'")

        # Validate and create TimesheetEntry
        try:
            entry = TimesheetEntry(**body)
            print(f"📝 Creating timesheet entry for user: {current_user.username}")
            print(f"📝 Validated entry data: {entry.model_dump()}")
        except ValidationError as e:
            print(f"❌ Validation error: {e}")
            raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
        # Generate unique ID
        entry_id = generate_entry_id()

        # Prepare entry data for database
        entry_data = entry.model_dump(by_alias=False)  # Use field names, not aliases

        # Convert enum values to strings for database storage
        if isinstance(entry_data.get('currency'), object):
            currency_value = entry_data['currency'].value if hasattr(entry_data['currency'], 'value') else str(entry_data['currency'])
        else:
            currency_value = entry_data.get('currency', 'USD')

        # Map currency display names to 3-character codes for database
        currency_mapping = {
            'US dollars': 'USD',
            'USD': 'USD',
            'EUR': 'EUR',
            'GBP': 'GBP'
        }
        entry_data['currency'] = currency_mapping.get(currency_value, 'USD')

        if isinstance(entry_data.get('entry_type'), object):
            entry_data['entry_type'] = entry_data['entry_type'].value if hasattr(entry_data['entry_type'], 'value') else str(entry_data['entry_type'])

        if isinstance(entry_data.get('bill_code'), object):
            entry_data['bill_code'] = entry_data['bill_code'].value if hasattr(entry_data['bill_code'], 'value') else str(entry_data['bill_code'])

        if isinstance(entry_data.get('entry_status'), object):
            entry_data['entry_status'] = entry_data['entry_status'].value if hasattr(entry_data['entry_status'], 'value') else str(entry_data['entry_status'])

        # Ensure entry_status has a default value
        if not entry_data.get('entry_status'):
            entry_data['entry_status'] = 'draft'

        print(f"🔄 Creating timesheet entry for user: {current_user.username}")
        print(f"📊 Entry data: {entry_data}")

        # Try to save to database first
        try:
            # Get user ID (assuming it's available in current_user)
            user_id = getattr(current_user, 'id', 1)  # Default to 1 if no ID

            db_result = create_timesheet_entry(user_id, entry_data)

            if db_result["success"]:
                print("✅ Timesheet entry saved to database successfully")
                return TimesheetResponse(
                    success=True,
                    message="Timesheet entry created successfully in database",
                    entry_id=entry_id,
                    entry=entry
                )
            else:
                print(f"⚠️ Database save failed: {db_result['message']}")
                # Fall back to mock database
                raise Exception(f"Database error: {db_result['message']}")

        except Exception as db_error:
            print(f"❌ Database error: {db_error}")
            print("🔄 Falling back to mock database")

            # Fallback to mock database
            entry_data_mock = entry.model_dump()
            entry_data_mock.update({
                "id": entry_id,
                "created_by": current_user.username,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

            MOCK_TIMESHEET_DB[entry_id] = entry_data_mock

            return TimesheetResponse(
                success=True,
                message="Timesheet entry created successfully (mock database)",
                entry_id=entry_id,
                entry=entry
            )

    except Exception as e:
        print(f"❌ Failed to create timesheet entry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create timesheet entry: {str(e)}"
        )

@router.get("/entries", response_model=TimesheetListResponse)
async def get_timesheet_entries_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    client: Optional[str] = Query(None, description="Filter by client"),
    matter: Optional[str] = Query(None, description="Filter by matter"),
    timekeeper: Optional[str] = Query(None, description="Filter by timekeeper"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    entry_type: Optional[str] = Query(None, description="Filter by entry type"),
    current_user: User = Depends(get_current_user)
):
    """
    Get timesheet entries with filtering and pagination
    """
    try:


        # Try database first
        try:
            user_id = getattr(current_user, 'id', 1)

            # Prepare filters
            filters = {
                'client': client,
                'matter': matter,
                'timekeeper': timekeeper,
                'date_from': date_from,
                'date_to': date_to,
                'entry_type': entry_type,
                'limit': page_size,
                'offset': (page - 1) * page_size
            }

            db_result = get_timesheet_entries(user_id, filters)

            if db_result["success"] and db_result["data"] is not None:
                print(f"✅ Retrieved {len(db_result['data'])} entries from database")

                # Convert database results to TimesheetEntry models
                entries = []
                for entry_data in db_result["data"]:
                    # Map database fields to model fields (Snowflake returns uppercase column names)
                    mapped_data = {
                        "client": entry_data.get("CLIENT") or entry_data.get("client"),
                        "matter": entry_data.get("MATTER") or entry_data.get("matter"),
                        "timekeeper": entry_data.get("TIMEKEEPER") or entry_data.get("timekeeper"),
                        "date": entry_data.get("ENTRY_DATE") or entry_data.get("entry_date"),
                        "type": entry_data.get("ENTRY_TYPE") or entry_data.get("entry_type"),
                        "hours_worked": entry_data.get("HOURS_WORKED") or entry_data.get("hours_worked"),
                        "hours_billed": entry_data.get("HOURS_BILLED") or entry_data.get("hours_billed"),
                        "quantity": entry_data.get("QUANTITY") or entry_data.get("quantity"),
                        "rate": entry_data.get("RATE") or entry_data.get("rate"),
                        "currency": entry_data.get("CURRENCY") or entry_data.get("currency"),
                        "total": entry_data.get("TOTAL") or entry_data.get("total"),
                        "phase_task": entry_data.get("PHASE_TASK") or entry_data.get("phase_task"),
                        "activity": entry_data.get("ACTIVITY") or entry_data.get("activity"),
                        "expense": entry_data.get("EXPENSE") or entry_data.get("expense"),
                        "bill_code": entry_data.get("BILL_CODE") or entry_data.get("bill_code"),
                        "status": entry_data.get("ENTRY_STATUS") or entry_data.get("entry_status"),
                        "narrative": entry_data.get("NARRATIVE") or entry_data.get("narrative")
                    }

                    # Remove None values
                    mapped_data = {k: v for k, v in mapped_data.items() if v is not None}

                    try:
                        entry = TimesheetEntry(**mapped_data)
                        entries.append(entry)
                    except Exception as model_error:
                        print(f"⚠️ Error creating model from data: {model_error}")
                        continue

                return TimesheetListResponse(
                    success=True,
                    entries=entries,
                    total_count=len(entries),  # Note: This is approximate for pagination
                    page=page,
                    page_size=page_size
                )
            else:
                print(f"⚠️ Database query failed: {db_result.get('message', 'Unknown error')}")
                raise Exception("Database query failed")

        except Exception as db_error:
            print(f"❌ Database error: {db_error}")
            print("🔄 Falling back to mock database")

            # Fallback to mock database
            filtered_entries = []

            for entry_data in MOCK_TIMESHEET_DB.values():
                # Apply filters
                if client and client.lower() not in entry_data["client"].lower():
                    continue
                if matter and matter.lower() not in entry_data["matter"].lower():
                    continue
                if timekeeper and timekeeper.lower() not in entry_data["timekeeper"].lower():
                    continue
                if date_from and entry_data["date"] < date_from:
                    continue
                if date_to and entry_data["date"] > date_to:
                    continue
                if entry_type and entry_data.get("entry_type", entry_data.get("type")) != entry_type:
                    continue

                # Convert to TimesheetEntry model
                try:
                    entry = TimesheetEntry(**{k: v for k, v in entry_data.items()
                                            if k in TimesheetEntry.model_fields})
                    filtered_entries.append(entry)
                except Exception as model_error:
                    print(f"⚠️ Error creating model from mock data: {model_error}")
                    continue

            # Apply pagination
            total_count = len(filtered_entries)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_entries = filtered_entries[start_idx:end_idx]

            return TimesheetListResponse(
                success=True,
                entries=paginated_entries,
                total_count=total_count,
                page=page,
                page_size=page_size
            )

    except Exception as e:
        print(f"❌ Failed to retrieve timesheet entries: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve timesheet entries: {str(e)}"
        )

@router.get("/entries/{entry_id}", response_model=TimesheetResponse)
async def get_timesheet_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific timesheet entry by ID
    """
    try:
        entry_data = MOCK_TIMESHEET_DB.get(entry_id)
        
        if not entry_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timesheet entry not found"
            )
        
        # Convert to TimesheetEntry model
        entry = TimesheetEntry(**{k: v for k, v in entry_data.items() 
                                if k in TimesheetEntry.__fields__})
        
        return TimesheetResponse(
            success=True,
            message="Timesheet entry retrieved successfully",
            entry_id=entry_id,
            entry=entry
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve timesheet entry: {str(e)}"
        )

@router.put("/entries/{entry_id}", response_model=TimesheetResponse)
async def update_timesheet_entry(
    entry_id: str,
    entry: TimesheetEntry,
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing timesheet entry
    """
    try:
        existing_entry = MOCK_TIMESHEET_DB.get(entry_id)
        
        if not existing_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timesheet entry not found"
            )
        
        # Update entry data
        entry_data = entry.dict()
        entry_data.update({
            "id": entry_id,
            "created_by": existing_entry["created_by"],
            "created_at": existing_entry["created_at"],
            "updated_by": current_user.username,
            "updated_at": datetime.utcnow()
        })
        
        # Store updated entry
        MOCK_TIMESHEET_DB[entry_id] = entry_data
        
        return TimesheetResponse(
            success=True,
            message="Timesheet entry updated successfully",
            entry_id=entry_id,
            entry=entry
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update timesheet entry: {str(e)}"
        )

@router.delete("/entries/{entry_id}", response_model=SuccessResponse)
async def delete_timesheet_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a timesheet entry
    """
    try:
        if entry_id not in MOCK_TIMESHEET_DB:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timesheet entry not found"
            )
        
        # Delete entry
        del MOCK_TIMESHEET_DB[entry_id]
        
        return SuccessResponse(
            success=True,
            message="Timesheet entry deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete timesheet entry: {str(e)}"
        )

@router.get("/entries/{entry_id}/duplicate", response_model=TimesheetResponse)
async def duplicate_timesheet_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Duplicate an existing timesheet entry
    """
    try:
        existing_entry = MOCK_TIMESHEET_DB.get(entry_id)
        
        if not existing_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timesheet entry not found"
            )
        
        # Create new entry with same data but new ID and today's date
        new_entry_id = generate_entry_id()
        new_entry_data = existing_entry.copy()
        new_entry_data.update({
            "id": new_entry_id,
            "date": date.today(),
            "created_by": current_user.username,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # Remove update fields if they exist
        new_entry_data.pop("updated_by", None)
        
        # Store new entry
        MOCK_TIMESHEET_DB[new_entry_id] = new_entry_data
        
        # Convert to TimesheetEntry model
        entry = TimesheetEntry(**{k: v for k, v in new_entry_data.items() 
                                if k in TimesheetEntry.__fields__})
        
        return TimesheetResponse(
            success=True,
            message="Timesheet entry duplicated successfully",
            entry_id=new_entry_id,
            entry=entry
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate timesheet entry: {str(e)}"
        )

@router.get("/health")
async def timesheet_health_check():
    """
    Health check endpoint for timesheet service
    """
    return {"status": "healthy", "service": "timesheet"}

@router.get("/debug/database")
async def debug_database_connection():
    """
    Debug endpoint to test database connection and show configuration
    """
    from database_setup import get_snowflake_connection, DB_CONFIG

    # Test database connection
    conn = get_snowflake_connection()
    if conn:
        try:
            cursor = conn.cursor()

            # Test basic connection
            cursor.execute("SELECT CURRENT_VERSION()")
            version = cursor.fetchone()

            # Check current warehouse
            cursor.execute("SELECT CURRENT_WAREHOUSE()")
            current_warehouse = cursor.fetchone()

            # Check current database and schema
            cursor.execute("SELECT CURRENT_DATABASE(), CURRENT_SCHEMA()")
            current_db_schema = cursor.fetchone()

            # List available warehouses
            cursor.execute("SHOW WAREHOUSES")
            warehouses = cursor.fetchall()
            warehouse_names = [w[0] for w in warehouses] if warehouses else []

            cursor.close()
            conn.close()

            return {
                "database_connection": "success",
                "snowflake_version": version[0] if version else "unknown",
                "current_warehouse": current_warehouse[0] if current_warehouse and current_warehouse[0] else "None",
                "current_database": current_db_schema[0] if current_db_schema and current_db_schema[0] else "None",
                "current_schema": current_db_schema[1] if current_db_schema and len(current_db_schema) > 1 else "None",
                "available_warehouses": warehouse_names,
                "config": {
                    "user": DB_CONFIG.get('user', 'not_set'),
                    "account": DB_CONFIG.get('account', 'not_set'),
                    "warehouse": DB_CONFIG.get('warehouse', 'not_set'),
                    "database": DB_CONFIG.get('database', 'not_set'),
                    "schema": DB_CONFIG.get('schema', 'not_set'),
                    "password": "***" if DB_CONFIG.get('password') != 'your_password' else 'not_set'
                }
            }
        except Exception as e:
            return {
                "database_connection": "failed",
                "error": str(e),
                "config": {
                    "user": DB_CONFIG.get('user', 'not_set'),
                    "account": DB_CONFIG.get('account', 'not_set'),
                    "warehouse": DB_CONFIG.get('warehouse', 'not_set'),
                    "database": DB_CONFIG.get('database', 'not_set'),
                    "schema": DB_CONFIG.get('schema', 'not_set'),
                    "password": "***" if DB_CONFIG.get('password') != 'your_password' else 'not_set'
                }
            }
    else:
        return {
            "database_connection": "failed",
            "error": "Could not establish connection",
            "config": {
                "user": DB_CONFIG.get('user', 'not_set'),
                "account": DB_CONFIG.get('account', 'not_set'),
                "warehouse": DB_CONFIG.get('warehouse', 'not_set'),
                "database": DB_CONFIG.get('database', 'not_set'),
                "schema": DB_CONFIG.get('schema', 'not_set'),
                "password": "***" if DB_CONFIG.get('password') != 'your_password' else 'not_set'
            }
        }

@router.get("/debug/mock-data")
async def debug_mock_data():
    """
    Debug endpoint to show current mock database contents
    """
    return {
        "mock_database_entries": len(MOCK_TIMESHEET_DB),
        "entries": list(MOCK_TIMESHEET_DB.values()) if len(MOCK_TIMESHEET_DB) <= 10 else list(MOCK_TIMESHEET_DB.values())[:10]
    }

@router.get("/debug/raw-data")
async def debug_raw_data(current_user: User = Depends(get_current_user)):
    """
    Debug endpoint to show raw database data without model conversion
    """
    try:
        user_id = getattr(current_user, 'id', 1)
        db_result = get_timesheet_entries(user_id, {})

        return {
            "success": db_result["success"],
            "raw_data": db_result["data"],
            "data_count": len(db_result["data"]) if db_result["data"] else 0,
            "sample_keys": list(db_result["data"][0].keys()) if db_result["data"] and len(db_result["data"]) > 0 else []
        }
    except Exception as e:
        return {
            "error": str(e)
        }

@router.post("/debug/test-insert")
async def debug_test_insert(current_user: User = Depends(get_current_user)):
    """
    Debug endpoint to test database insertion with sample data
    """
    try:
        # Sample test data
        test_entry_data = {
            'client': 'TEST CLIENT',
            'matter': 'TEST MATTER - Database Connection Test',
            'timekeeper': 'Test User',
            'entry_date': '2025-01-11',
            'entry_type': 'Fee',
            'hours_worked': 1.0,
            'hours_billed': 1.0,
            'quantity': None,
            'rate': 100.0,
            'currency': 'USD',
            'total': 100.0,
            'phase_task': 'TEST PHASE',
            'activity': 'Testing',
            'expense': None,
            'bill_code': 'Billable',
            'entry_status': 'Invoice',
            'narrative': 'Test entry to verify database connection and data insertion'
        }

        print(f"🧪 Testing database insertion with data: {test_entry_data}")

        user_id = getattr(current_user, 'id', 1)
        db_result = create_timesheet_entry(user_id, test_entry_data)

        return {
            "test_result": "success" if db_result["success"] else "failed",
            "database_response": db_result,
            "test_data": test_entry_data
        }

    except Exception as e:
        return {
            "test_result": "error",
            "error": str(e),
            "test_data": test_entry_data
        }
