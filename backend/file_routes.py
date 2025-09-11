from fastapi import APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.responses import FileResponse
from typing import List
import os
import uuid
from datetime import datetime
import mimetypes

from models import UploadedFile, FileUploadResponse, SuccessResponse, User
from auth_routes import get_current_user

router = APIRouter(prefix="/files", tags=["File Management"])

# File storage configuration
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt", ".rtf",  # Documents
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff",  # Images
    ".mp3", ".wav", ".m4a",  # Audio
    ".mp4", ".avi", ".mov", ".wmv",  # Video
    ".zip", ".rar", ".7z",  # Archives
    ".csv", ".xlsx", ".xls"  # Spreadsheets
}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mock file database (replace with real database)
FILE_DB = {}

def validate_file_extension(filename: str) -> bool:
    """Validate file extension"""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

def validate_file_size(file_size: int) -> bool:
    """Validate file size"""
    return file_size <= MAX_FILE_SIZE

def get_file_type(filename: str) -> str:
    """Get file type based on extension"""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a single file with enhanced validation and metadata
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
            type=get_file_type(file.filename),
            url=f"/files/download/{file_id}",
            uploaded_at=datetime.utcnow()
        )
        
        # Store in file database
        FILE_DB[file_id] = {
            **uploaded_file.dict(),
            "original_filename": file.filename,
            "stored_filename": unique_filename,
            "file_path": file_path,
            "uploaded_by": current_user.username
        }
        
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
    if len(files) > 10:  # Limit number of files
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many files. Maximum 10 files allowed per upload."
        )
    
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

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Download a file by its ID
    """
    try:
        file_record = FILE_DB.get(file_id)
        
        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        file_path = file_record["file_path"]
        
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on disk"
            )
        
        return FileResponse(
            path=file_path,
            filename=file_record["original_filename"],
            media_type=file_record["type"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File download failed: {str(e)}"
        )

@router.get("/info/{file_id}", response_model=UploadedFile)
async def get_file_info(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get file information by ID
    """
    try:
        file_record = FILE_DB.get(file_id)
        
        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return UploadedFile(**{k: v for k, v in file_record.items() 
                             if k in UploadedFile.__fields__})
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file info: {str(e)}"
        )

@router.get("/list", response_model=List[UploadedFile])
async def list_user_files(
    current_user: User = Depends(get_current_user)
):
    """
    List all files uploaded by the current user
    """
    try:
        user_files = []
        
        for file_record in FILE_DB.values():
            if file_record["uploaded_by"] == current_user.username:
                user_files.append(UploadedFile(**{k: v for k, v in file_record.items() 
                                                 if k in UploadedFile.__fields__}))
        
        # Sort by upload date (newest first)
        user_files.sort(key=lambda x: x.uploaded_at, reverse=True)
        
        return user_files
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list files: {str(e)}"
        )

@router.delete("/{file_id}", response_model=SuccessResponse)
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a file by its ID
    """
    try:
        file_record = FILE_DB.get(file_id)
        
        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Check if user owns the file
        if file_record["uploaded_by"] != current_user.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this file"
            )
        
        # Delete file from disk
        file_path = file_record["file_path"]
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from database
        del FILE_DB[file_id]
        
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
async def file_health_check():
    """
    Health check endpoint for file service
    """
    return {
        "status": "healthy", 
        "service": "file_management",
        "upload_dir": UPLOAD_DIR,
        "max_file_size_mb": MAX_FILE_SIZE / (1024*1024),
        "allowed_extensions": list(ALLOWED_EXTENSIONS)
    }
