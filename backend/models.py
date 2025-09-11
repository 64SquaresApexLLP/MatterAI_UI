from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Union
from datetime import date, datetime
from enum import Enum

# Enums for predefined choices
class TimesheetType(str, Enum):
    FEE = "Fee"
    COST = "Cost"

class BillCode(str, Enum):
    BILLABLE = "Billable"
    NON_BILLABLE = "Non-Billable"

class Status(str, Enum):
    INVOICE = "Invoice"
    HOLD = "Hold"

class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"

class QueryType(str, Enum):
    TRANSLATION = "Translation"
    TIMESHEET = "Timesheet"
    MATTERS = "Matters"
    ENTRIES = "Entries"

# Authentication Models
class LoginRequest(BaseModel):
    username: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None
    token: Optional[str] = None

class User(BaseModel):
    id: Optional[int] = None
    username: str
    email: EmailStr
    name: str
    is_active: Optional[bool] = True

# File Upload Models
class UploadedFile(BaseModel):
    id: str
    name: str
    size: int
    type: str
    url: Optional[str] = None
    uploaded_at: Optional[datetime] = None

# Query/Search Models
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query text")
    selected_button: Optional[QueryType] = Field(None, description="Selected functionality type")
    selected_language: Optional[str] = Field(None, description="Selected language for translation")
    uploaded_files: List[UploadedFile] = Field(default=[], description="List of uploaded files")

class QueryResponse(BaseModel):
    success: bool
    message: str
    result: Optional[dict] = None
    files_processed: Optional[List[str]] = None

# Timesheet Models
class TimesheetEntry(BaseModel):
    # General Info
    client: str = Field(..., description="Client name")
    matter: str = Field(..., description="Matter description")
    timekeeper: str = Field(..., description="Timekeeper name")
    entry_date: date = Field(..., description="Entry date", alias="date")
    entry_type: TimesheetType = Field(..., description="Entry type (Fee or Cost)", alias="type")

    # Work/Cost Details (conditional based on type)
    hours_worked: Optional[float] = Field(None, description="Hours worked (for Fee entries)")
    hours_billed: Optional[float] = Field(None, description="Hours billed (for Fee entries)")
    quantity: Optional[float] = Field(None, description="Quantity (for Cost entries)")
    rate: Optional[float] = Field(0, description="Rate")
    currency: Currency = Field(Currency.USD, description="Currency")
    total: Optional[float] = Field(0, description="Total amount")

    # Phase & Activity
    phase_task: str = Field(..., description="Phase task")
    activity: Optional[str] = Field(None, description="Activity (for Fee entries)")
    expense: Optional[str] = Field(None, description="Expense type (for Cost entries)")

    # Billing Info
    bill_code: BillCode = Field(..., description="Billing code")
    entry_status: Status = Field(..., description="Entry status", alias="status")

    # Narrative
    narrative: str = Field(..., description="Description of work/expense")

    @model_validator(mode='after')
    def validate_entry_fields(self):
        """Validate fields based on entry type"""
        if self.entry_type == TimesheetType.FEE:
            if self.hours_worked is None or self.hours_billed is None:
                raise ValueError('Hours worked and hours billed are required for Fee entries')
            if self.activity is None:
                raise ValueError('Activity is required for Fee entries')

        elif self.entry_type == TimesheetType.COST:
            if self.quantity is None:
                raise ValueError('Quantity is required for Cost entries')
            if self.expense is None:
                raise ValueError('Expense type is required for Cost entries')

        return self

class TimesheetResponse(BaseModel):
    success: bool
    message: str
    entry_id: Optional[str] = None
    entry: Optional[TimesheetEntry] = None

class TimesheetListResponse(BaseModel):
    success: bool
    entries: List[TimesheetEntry]
    total_count: int
    page: int = 1
    page_size: int = 10

# File Upload Models
class FileUploadResponse(BaseModel):
    success: bool
    message: str
    file: Optional[UploadedFile] = None

# Generic Response Models
class SuccessResponse(BaseModel):
    success: bool = True
    message: str

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[dict] = None

# Dropdown Data Models (for frontend dropdowns)
class DropdownData(BaseModel):
    clients: List[str]
    matters: List[str]
    timekeepers: List[str]
    phase_tasks: List[str]
    activities: List[str]
    expenses: List[str]
    languages: List[str]
