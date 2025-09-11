from fastapi import APIRouter, HTTPException, Depends, status, File, UploadFile, Form
from typing import List, Optional
import uuid
from datetime import datetime
import os
import shutil

from models import (
    QueryRequest, QueryResponse, UploadedFile, FileUploadResponse, 
    SuccessResponse, ErrorResponse, DropdownData, User
)
from auth_routes import get_current_user

router = APIRouter(prefix="/query", tags=["Query & Search"])

# File upload configuration
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".gif"}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mock data for dropdowns (replace with database queries)
DROPDOWN_DATA = {
    "clients": ["014 - General Dynamics", "101 - Envada"],
    "matters": [
        "0003US - METHODS AND APPARATUS FOR GENERATING A MULTIPLEXED COMMUNICATION SIGNALS",
        "0012US - ANALOG TO DIGITAL CONVERTER",
        "0025US - SIGNAL SEPARATION"
    ],
    "timekeepers": ["John Doe", "Jane Smith", "Bob Johnson"],
    "phase_tasks": [
        "P100 - Case Assessment",
        "P200 - Discovery",
        "P300 - Motion Practice",
        "P400 - Trial Preparation"
    ],
    "activities": ["A102 - Research", "A103 - Drafting", "A104 - Meeting"],
    "expenses": [
        "E001 - Travel",
        "E002 - Meals",
        "E003 - Lodging",
        "E004 - Communications"
    ],
    "languages": [
        "Spanish", "French", "German", "Italian", "Portuguese",
        "Chinese", "Japanese", "Korean", "Russian", "Arabic"
    ]
}

def validate_file_extension(filename: str) -> bool:
    """Validate file extension"""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

def validate_file_size(file_size: int) -> bool:
    """Validate file size"""
    return file_size <= MAX_FILE_SIZE

@router.post("/search", response_model=QueryResponse)
async def search_query(
    query_request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Process search query with optional file context
    """
    try:
        # Mock search logic - replace with actual search implementation
        result = {
            "query": query_request.query,
            "type": query_request.selected_button,
            "language": query_request.selected_language,
            "files_count": len(query_request.uploaded_files),
            "user": current_user.name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Different processing based on query type
        if query_request.selected_button == "Translation":
            result["translation_result"] = f"Translated '{query_request.query}' to {query_request.selected_language}"
        elif query_request.selected_button == "Matters":
            result["matters_found"] = ["Matter 1", "Matter 2", "Matter 3"]
        elif query_request.selected_button == "Entries":
            result["entries_found"] = ["Entry 1", "Entry 2", "Entry 3"]
        else:
            result["general_result"] = f"Processed query: {query_request.query}"
        
        # Process uploaded files if any
        files_processed = []
        if query_request.uploaded_files:
            for file in query_request.uploaded_files:
                files_processed.append(f"Processed file: {file.name}")
        
        return QueryResponse(
            success=True,
            message="Query processed successfully",
            result=result,
            files_processed=files_processed
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query processing failed: {str(e)}"
        )

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a single file
    """
    try:
        # Validate file extension
        if not validate_file_extension(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content to check size
        content = await file.read()
        if not validate_file_size(len(content)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Create file record
        uploaded_file = UploadedFile(
            id=file_id,
            name=file.filename,
            size=len(content),
            type=file.content_type or "application/octet-stream",
            url=f"/files/{unique_filename}",
            uploaded_at=datetime.utcnow()
        )
        
        return FileUploadResponse(
            success=True,
            message="File uploaded successfully",
            file=uploaded_file
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

@router.post("/upload-multiple", response_model=List[FileUploadResponse])
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload multiple files
    """
    results = []
    
    for file in files:
        try:
            # Use the single file upload logic
            result = await upload_file(file, current_user)
            results.append(result)
        except HTTPException as e:
            # Add failed upload to results
            results.append(FileUploadResponse(
                success=False,
                message=f"Failed to upload {file.filename}: {e.detail}",
                file=None
            ))
    
    return results

@router.get("/dropdown-data", response_model=DropdownData)
async def get_dropdown_data(current_user: User = Depends(get_current_user)):
    """
    Get dropdown data for forms
    """
    return DropdownData(**DROPDOWN_DATA)

@router.delete("/file/{file_id}", response_model=SuccessResponse)
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete an uploaded file
    """
    try:
        # Find file by ID (in a real app, you'd query the database)
        file_found = False
        for filename in os.listdir(UPLOAD_DIR):
            if filename.startswith(file_id):
                file_path = os.path.join(UPLOAD_DIR, filename)
                os.remove(file_path)
                file_found = True
                break
        
        if not file_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return SuccessResponse(
            success=True,
            message="File deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File deletion failed: {str(e)}"
        )

@router.get("/health")
async def query_health_check():
    """
    Health check endpoint for query service
    """
    return {"status": "healthy", "service": "query"}
