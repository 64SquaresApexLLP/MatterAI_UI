from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Import route modules
from auth_routes import router as auth_router, init_users_table
from query_routes import router as query_router
from timesheet_routes import router as timesheet_router
from file_routes import router as file_router
from database_setup import initialize_database

# Create FastAPI app with metadata
app = FastAPI(
    title="MatterAI Backend API",
    description="Backend API for MatterAI legal assistant platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5173/timesheet/entries"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for file downloads
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# Include routers
app.include_router(auth_router)
app.include_router(query_router)
app.include_router(timesheet_router)
app.include_router(file_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "MatterAI Backend API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "auth": "/auth",
            "query": "/query",
            "timesheet": "/timesheet",
            "files": "/files"
        }
    }

# Database initialization on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on application startup"""
    print("🚀 Starting MatterAI Backend...")
    try:
        if initialize_database():
            print("✅ Database initialized")
            init_users_table()  # <-- moved inside startup after DB init
        else:
            print("📝 Continuing with mock data...")
    except Exception as e:
        print(f"⚠️ Database error: {str(e)[:50]}...")
        print("📝 Continuing with mock data...")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "auth": "healthy",
            "query": "healthy",
            "timesheet": "healthy",
            "files": "healthy",
            "database": "healthy"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
