from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ValidationError
import uuid
from datetime import datetime, date

# Internal imports
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
chatbot_router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

def generate_entry_id() -> str:
    return str(uuid.uuid4())

# ==============================
# Chatbot Implementation
# ==============================

chat_sessions: Dict[str, Dict[str, Any]] = {}

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    completed: bool = False
    timesheet_data: Optional[Dict[str, Any]] = None
    next_question: Optional[str] = None

def validate_date(date_str: str) -> bool:
    try:
        datetime.strptime(date_str.strip(), "%Y-%m-%d")
        return True
    except ValueError:
        return False

def validate_number(num_str: str) -> bool:
    try:
        float(num_str.strip())
        return True
    except ValueError:
        return False

def normalize_currency(currency: str) -> str:
    mapping = {'US DOLLARS': 'USD', 'US dollars': 'USD', 'USD': 'USD', 'Euro': 'EUR', 'EUR': 'EUR', 'British Pound': 'GBP', 'GBP': 'GBP'}
    return mapping.get(currency.strip(), currency.strip().upper())

def create_session() -> str:
    sid = str(uuid.uuid4())
    chat_sessions[sid] = {
        "current_question": 0,
        "data": {},
        "completed": False,
        "created_at": datetime.now()
    }
    return sid

# Ordered chatbot questions
TIMESHEET_QUESTIONS = [
    {"field": "client", "question": "👋 Hi! Let's start with the **Client name**.", "validation": lambda x: len(x.strip()) > 0, "error": "Client name cannot be empty."},
    {"field": "matter", "question": "📋 What's the **Matter description**?", "validation": lambda x: len(x.strip()) > 0, "error": "Matter description cannot be empty."},
    {"field": "timekeeper", "question": "👤 Who is the **Timekeeper**?", "validation": lambda x: len(x.strip()) > 0, "error": "Timekeeper cannot be empty."},
    {"field": "date", "question": "📅 What's the **Entry date (YYYY-MM-DD)**?", "validation": validate_date, "error": "Invalid date format."},
    {"field": "type", "question": "⚖️ Is this a **Fee** or **Cost** entry?", "validation": lambda x: x.lower() in ['fee', 'cost'], "error": "Please enter either Fee or Cost."},
    {"field": "hours_worked", "question": "⏰ How many **hours were worked**?", "validation": validate_number, "error": "Enter a valid number."},
    {"field": "hours_billed", "question": "💰 How many **hours are billable**?", "validation": validate_number, "error": "Enter a valid number."},
    {"field": "activity", "question": "📝 What **activity** was performed?", "validation": lambda x: len(x.strip()) > 0, "error": "Activity cannot be empty."},
    {"field": "quantity", "question": "📊 What's the **quantity**?", "validation": validate_number, "error": "Enter a valid number."},
    {"field": "expense", "question": "💸 What type of **expense** is this?", "validation": lambda x: len(x.strip()) > 0, "error": "Expense cannot be empty."},
    {"field": "rate", "question": "💵 What's the **rate**?", "validation": validate_number, "error": "Enter a valid number."},
    {"field": "currency", "question": "💱 What **currency**? (USD/EUR/GBP)", "validation": lambda x: x.strip().upper() in ['USD', 'EUR', 'GBP', 'US DOLLARS'], "error": "Invalid currency."},
    {"field": "phase_task", "question": "🎯 What's the **Phase/Task**?", "validation": lambda x: len(x.strip()) > 0, "error": "Phase/Task cannot be empty."},
    {"field": "bill_code", "question": "🏷️ Is this **Billable** or **Non-Billable**?", "validation": lambda x: x.lower() in ['billable', 'non-billable'], "error": "Enter Billable or Non-Billable."},
    {"field": "status", "question": "📋 What's the **status**? (Invoice/Hold)", "validation": lambda x: x.lower() in ['invoice', 'hold'], "error": "Enter Invoice or Hold."},
    {"field": "narrative", "question": "📖 Provide a **narrative description**:", "validation": lambda x: len(x.strip()) > 0, "error": "Narrative cannot be empty."}
]

@chatbot_router.post("/chat", response_model=ChatResponse)
async def chat_timesheet(chat_message: ChatMessage, current_user: User = Depends(get_current_user)):
    """
    Conversational chatbot for timesheet creation
    """
    try:
        sid = chat_message.session_id
        if not sid or sid not in chat_sessions:
            sid = create_session()
            return ChatResponse(response=TIMESHEET_QUESTIONS[0]["question"], session_id=sid, next_question=TIMESHEET_QUESTIONS[0]["question"])

        session = chat_sessions[sid]
        msg = chat_message.message.strip()

        # Confirmation phase handling
        if session.get("pending_confirmation", False):
            if msg.lower() == "yes":
                data = session["data"].copy()
                rate = data.get("rate", 0)
                total = rate * (data.get("hours_billed", 0) if data["type"] == "Fee" else data.get("quantity", 0))
                data["total"] = total

                class MockRequest:
                    def __init__(self, data): self._json_data = data
                    async def json(self): return self._json_data

                req = MockRequest(data)
                try:
                    await create_timesheet_entry_endpoint(req, current_user)
                    session["completed"] = True
                    session["pending_confirmation"] = False
                    return ChatResponse(
                        response=f"✅ Entry created successfully!\nClient: {data['client']}\nType: {data['type']}\nTotal: {data['currency']} {total:.2f}",
                        session_id=sid, completed=True, timesheet_data=data
                    )
                except Exception as e:
                    session["completed"] = True
                    session["pending_confirmation"] = False
                    return ChatResponse(response=f"❌ Error saving entry: {e}", session_id=sid, completed=True)
            else:
                # User says "no" or anything else, start over
                sid = create_session()
                return ChatResponse(response="Let's start a new timesheet.\n" + TIMESHEET_QUESTIONS[0]["question"], session_id=sid)

        idx = session["current_question"]
        q = TIMESHEET_QUESTIONS[idx]
        if not q["validation"](msg):
            return ChatResponse(response=f"❌ {q['error']}\n\n{q['question']}", session_id=sid, next_question=q["question"])

        field = q["field"]
        if field in ["hours_worked", "hours_billed", "quantity", "rate"]:
            session["data"][field] = float(msg)
        elif field == "currency":
            session["data"][field] = normalize_currency(msg)
        elif field == "type":
            session["data"][field] = msg.title()
        else:
            session["data"][field] = msg

        session["current_question"] += 1

        if session["current_question"] >= len(TIMESHEET_QUESTIONS):
            # Show confirmation summary instead of inserting
            data = session["data"].copy()
            rate = data.get("rate", 0)
            total = rate * (data.get("hours_billed", 0) if data["type"] == "Fee" else data.get("quantity", 0))
            data["total"] = total
            summary = "\n".join([f"{k.title().replace('_', ' ')}: {v}" for k, v in data.items()])
            session["pending_confirmation"] = True
            return ChatResponse(
                response=f"🔍 Here is your timesheet entry:\n{summary}\n\nIs everything OK? Reply 'yes' to submit or 'no' to start over.",
                session_id=sid, timesheet_data=data, next_question="Is everything OK? Reply 'yes' to submit or 'no' to start over."
            )

        next_q = TIMESHEET_QUESTIONS[session["current_question"]]
        return ChatResponse(response=f"✅ Got it!\n\n{next_q['question']}", session_id=sid, next_question=next_q["question"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@chatbot_router.get("/sessions")
async def list_sessions(current_user: User = Depends(get_current_user)):
    return {"count": len(chat_sessions), "active_sessions": list(chat_sessions.keys())}

@chatbot_router.delete("/session/{sid}")
async def delete_session(sid: str, current_user: User = Depends(get_current_user)):
    if sid in chat_sessions:
        del chat_sessions[sid]
        return {"message": "Session deleted"}
    raise HTTPException(status_code=404, detail="Session not found")

# =====================================
# TIMESHEET CRUD (All Features)
# =====================================

@router.post("/entries", response_model=TimesheetResponse)
async def create_timesheet_entry_endpoint(request: Request, current_user: User = Depends(get_current_user)):
    try:
        body = await request.json()
        currency_mapping = {
            'US dollars': 'USD', 'US Dollars': 'USD', 'USD': 'USD',
            'Euro': 'EUR', 'EUR': 'EUR', 'British Pound': 'GBP', 'GBP': 'GBP'
        }
        if 'currency' in body:
            body['currency'] = currency_mapping.get(body['currency'], body['currency'])

        # Attempt to validate with TimesheetEntry model
        try:
            entry = TimesheetEntry(**body)
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")

        entry_id = generate_entry_id()
        entry_data = entry.model_dump(by_alias=False)

        # Map values for DB (enum/string)
        if isinstance(entry_data.get('currency'), object):
            currency_value = entry_data['currency'].value if hasattr(entry_data['currency'], 'value') else str(entry_data['currency'])
        else:
            currency_value = entry_data.get('currency', 'USD')
        entry_data['currency'] = currency_mapping.get(currency_value, 'USD')

        for f in ['entry_type', 'bill_code', 'entry_status']:
            if isinstance(entry_data.get(f), object):
                entry_data[f] = entry_data[f].value if hasattr(entry_data[f], 'value') else str(entry_data[f])
        if not entry_data.get('entry_status'):
            entry_data['entry_status'] = 'draft'

        # Save to database
        user_id = getattr(current_user, 'id', 1)
        db_result = create_timesheet_entry(user_id, entry_data)

        if db_result["success"]:
            return TimesheetResponse(success=True, message="Timesheet entry created successfully", entry_id=entry_id, entry=entry)
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {db_result['message']}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create timesheet entry: {str(e)}")

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
        user_id = getattr(current_user, 'id', 1)

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

        if not db_result["success"] or db_result["data"] is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {db_result.get('message', 'Unknown error')}")

        entries = []
        for entry_data in db_result["data"]:
            # Get ID or generate one if missing
            entry_id = entry_data.get("ID") or entry_data.get("id") or str(entry_data.get("ENTRY_ID", ""))
            if not entry_id:
                entry_id = generate_entry_id()
            # Convert to string if it's an integer
            entry_id = str(entry_id)

            mapped_data = {
                "id": entry_id,
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
            # Filter out None values except for id
            mapped_data = {k: v for k, v in mapped_data.items() if k == "id" or v is not None}
            try:
                entry = TimesheetEntry(**mapped_data)
                entries.append(entry)
            except Exception as model_error:
                continue

        return TimesheetListResponse(success=True, entries=entries, total_count=len(entries), page=page, page_size=page_size)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve timesheet entries: {str(e)}")

@router.get("/entries/{entry_id}", response_model=TimesheetResponse)
async def get_timesheet_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        entry_data = MOCK_TIMESHEET_DB.get(entry_id)
        if not entry_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet entry not found")
        entry = TimesheetEntry(**{k: v for k, v in entry_data.items() if k in TimesheetEntry.model_fields})
        return TimesheetResponse(success=True, message="Entry retrieved", entry_id=entry_id, entry=entry)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve timesheet entry: {str(e)}")

@router.put("/entries/{entry_id}", response_model=TimesheetResponse)
async def update_timesheet_entry_endpoint(
    entry_id: str,
    entry: TimesheetEntry,
    current_user: User = Depends(get_current_user)
):
    try:
        existing_entry = MOCK_TIMESHEET_DB.get(entry_id)
        if not existing_entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet entry not found")
        entry_data = entry.model_dump()
        entry_data.update({
            "id": entry_id,
            "created_by": existing_entry.get("created_by"),
            "created_at": existing_entry.get("created_at"),
            "updated_by": current_user.username,
            "updated_at": datetime.utcnow()
        })
        MOCK_TIMESHEET_DB[entry_id] = entry_data
        return TimesheetResponse(success=True, message="Timesheet entry updated successfully", entry_id=entry_id, entry=entry)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update timesheet entry: {str(e)}")

@router.delete("/entries/{entry_id}", response_model=SuccessResponse)
async def delete_timesheet_entry_endpoint(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        # Convert entry_id to int for database query
        try:
            entry_id_int = int(entry_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid entry ID format")

        db_result = delete_timesheet_entry(entry_id_int)

        if db_result["success"]:
            return SuccessResponse(success=True, message="Timesheet entry deleted successfully")
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {db_result['message']}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete timesheet entry: {str(e)}")

@router.get("/entries/{entry_id}/duplicate", response_model=TimesheetResponse)
async def duplicate_timesheet_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        existing_entry = MOCK_TIMESHEET_DB.get(entry_id)
        if not existing_entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timesheet entry not found")
        new_entry_id = generate_entry_id()
        new_entry_data = existing_entry.copy()
        new_entry_data.update({
            "id": new_entry_id,
            "date": date.today(),
            "created_by": current_user.username,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        new_entry_data.pop("updated_by", None)
        MOCK_TIMESHEET_DB[new_entry_id] = new_entry_data
        entry = TimesheetEntry(**{k: v for k, v in new_entry_data.items() if k in TimesheetEntry.model_fields})
        return TimesheetResponse(success=True, message="Entry duplicated successfully", entry_id=new_entry_id, entry=entry)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to duplicate timesheet entry: {str(e)}")

# ================
# Health/Debug
# ================

@router.get("/health")
async def timesheet_health_check():
    return {"status": "healthy", "service": "timesheet"}

@router.get("/debug/database")
async def debug_database_connection():
    from database_setup import get_snowflake_connection, DB_CONFIG
    conn = get_snowflake_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT CURRENT_VERSION()")
            version = cursor.fetchone()
            cursor.execute("SELECT CURRENT_WAREHOUSE()")
            current_warehouse = cursor.fetchone()
            cursor.execute("SELECT CURRENT_DATABASE(), CURRENT_SCHEMA()")
            current_db_schema = cursor.fetchone()
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
    return {
        "mock_database_entries": len(MOCK_TIMESHEET_DB),
        "entries": list(MOCK_TIMESHEET_DB.values()) if len(MOCK_TIMESHEET_DB) <= 10 else list(MOCK_TIMESHEET_DB.values())[:10]
    }

@router.get("/debug/raw-data")
async def debug_raw_data(current_user: User = Depends(get_current_user)):
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
        return {"error": str(e)}

@router.post("/debug/test-insert")
async def debug_test_insert(current_user: User = Depends(get_current_user)):
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
    try:
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
