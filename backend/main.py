from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from database import engine, Base
import models

from routes.auth import router as auth_router
from routes.folders import router as folder_router
from routes.files import router as file_router


# Create database tables
Base.metadata.create_all(bind=engine)


# FastAPI application
app = FastAPI(
    title="CloudSpace API",
    description="Backend API for Personal Cloud Storage",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
        "https://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(folder_router)
app.include_router(file_router)
app.include_router(auth_router)

@app.get("/")
def home():
    return {
        "message": "Welcome to CloudSpace Backend!",
        "status": "Running successfully"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/database-status")
def database_status():
    return {
        "message": "Database connected successfully"
    }
