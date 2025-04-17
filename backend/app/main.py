"""FastAPI main application module for the AI Financial Advisor API.

This module serves as the entry point for the FastAPI application, configuring middleware,
routers, and custom JSON encoding. It handles cross-origin resource sharing (CORS),
request logging, and route registration for all API endpoints.

Routes:
    Root:
        GET / - Return API status

    Auth (/api/):
        Handled by auth_router
        - POST /register - Register new user
        - POST /login - User login
        - POST /logout - User logout
        - GET /verify - Verify user session

    Profile (/api/):
        Handled by profile_router
        - GET /profile - Get user profile
        - PUT /profile - Update user profile
        - GET /profile/{user_id} - Get specific user profile

    Chat (/api/):
        Handled by chat_router
        - POST /chat - Process chat message
        - GET /chat/history - Get chat history
        - DELETE /chat/history - Clear chat history

    Admin (/api/admin/):
        Handled by admin_router
        - GET /users - List all users
        - GET /users/{user_id} - Get user details
        - PUT /users/{user_id} - Update user
        - DELETE /users/{user_id} - Delete user

    Financial (/api/):
        Handled by financial_router
        - GET /financial-assessment - Get comprehensive financial assessment
        - GET /savings-health - Get savings health analysis
        - GET /savings/gic-recommendation - Get GIC recommendations
        - GET /investment-health - Get investment portfolio health
        - GET /investment/recommendations - Get investment recommendations
        - GET /financial-snapshot - Get current financial metrics
        - POST /email-assessment - Email financial assessment
        - POST /investment/email-recommendation - Email investment recommendations

    Retirement (/api/retirement/):
        Handled by retirement_router
        - GET /health - Get retirement planning health
        - GET /recommendations - Get retirement investment recommendations
        - GET /current-plan - Get detailed retirement plan
        - POST /scenarios - Calculate retirement scenarios
        - POST /what-if - Perform retirement what-if analysis

Dependencies:
    - FastAPI - Web framework
    - CORSMiddleware - CORS handling
    - python-dotenv - Environment variable management
    - Supabase - Authentication and database
    - Custom routers - Route handling for different domains

Environment Variables:
    Required in .env file:
    - Database connection settings
    - API keys and secrets
    - CORS configuration

Notes:
    - Uses custom JSON encoder for Decimal type handling
    - Implements debug logging for all requests
    - Prints registered routes on startup
    - All routes under /api prefix except root endpoint
"""

# main.py
import os
import json
import logging
from decimal import Decimal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .config import Settings, get_settings
from .api.auth_routes import router as auth_router
from .api.profile_routes import router as profile_router
from .api.chat_routes import router as chat_router
from .api.admin_routes import router as admin_router
from .api.financial_routes import router as financial_router
from .api.retirement_routes import router as retirement_router
from .api.investment_routes import router as investment_router

load_dotenv()

app = FastAPI()

# Add more detailed CORS logging
origins = [
    "http://localhost:5173",  # Vite default
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add debug middleware to log all requests
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"\n=== Incoming Request ===")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Headers: {request.headers}")
    response = await call_next(request)
    print(f"Response Status: {response.status_code}")
    return response

settings = get_settings()

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Debug print all routes on startup
@app.on_event("startup")
async def startup_event():
    print("\n=== Registered Routes ===")
    for route in app.routes:
        print(f"Route: {route.path}, Methods: {route.methods}")
    print("=== End Routes ===\n")

# Include routers (prefixing them with "/api" for clarity).
app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(profile_router, prefix="/api", tags=["profile"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(financial_router, prefix="/api", tags=["financial"])
app.include_router(retirement_router, prefix="/api/retirement", tags=["retirement"])
app.include_router(investment_router, prefix="/api", tags=["investments"])

@app.get("/")
async def root():
    """Return API status message.

    Returns:
        dict: Status message indicating API is running
    """
    return {"message": "API is running"}