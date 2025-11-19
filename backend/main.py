from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Import route modules
from auth_routes import router as auth_router, init_users_table
from org_routes import router as org_routes
from query_routes import router as query_router
from timesheet_routes import router as timesheet_router, chatbot_router
from file_routes import router as file_router
from file_converter_routes import router as file_converter_router
from database_setup import initialize_database

# ============================================================
#   FastAPI App Configuration
# ============================================================
app = FastAPI(
    title="MatterAI Backend API",
    description="Backend API for MatterAI legal assistant platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================
#   CORS Configuration (Merged from both versions)
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5173/timesheet/entries",

        # Production frontend & backend servers
        "http://13.203.251.172:5173",
        "http://13.203.251.172:5174",

        # Backend ports
        "http://localhost:8000",
        "http://localhost:8002",
        "http://13.203.251.172:8002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
#   Static Files (Uploads)
# ============================================================
if not os.path.exists("uploads"):
    os.makedirs("uploads")

app.mount("/static", StaticFiles(directory="uploads"), name="static")

# ============================================================
#   Routers (All Combined)
# ============================================================
app.include_router(auth_router)
app.include_router(org_routes)
app.include_router(query_router)
app.include_router(timesheet_router)
app.include_router(chatbot_router)
app.include_router(file_router)
app.include_router(file_converter_router)

# ============================================================
#   Root Endpoint
# ============================================================
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
            "chatbot": "/chatbot",
            "files": "/files",
            "file_converter": "/file-converter"
        }
    }

# ============================================================
#   Startup Event → DB Initialization
# ============================================================
@app.on_event("startup")
async def startup_event():
    print("🚀 Starting MatterAI Backend...")

    try:
        if initialize_database():
            print("✅ Database initialized")
            # init_users_table()  # from auth_routes
        else:
            print("❌ Database initialization failed — using fallback data")

    except Exception as e:
        print(f"⚠️ Database error: {str(e)[:80]}...")
        print("📝 Continuing with fallback data...")

# ============================================================
#   Health Check
# ============================================================
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "auth": "healthy",
            "query": "healthy",
            "timesheet": "healthy",
            "chatbot": "healthy",
            "files": "healthy",
            "file_converter": "healthy",
            "database": "healthy"
        }
    }

# ============================================================
#   Local Development Server
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)