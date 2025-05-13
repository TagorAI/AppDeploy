"""
Authentication Routes Module

This module handles user authentication endpoints including signup, login, and password reset functionality
using Supabase as the authentication and database provider.

Routes:
    POST /signup: Register a new user with profile and optional financial information
    POST /login: Authenticate an existing user and return session tokens
    POST /forgot-password: Send a verification code to the user's email
    POST /verify-code: Verify the password reset code
    POST /reset-password: Reset a user's password using a verified session

Dependencies:
    - FastAPI for API routing
    - Supabase for authentication and database operations
    - Custom models for request validation
"""

# api/auth_routes.py
from fastapi import APIRouter, HTTPException, Header, Body, Request, Depends
from typing import Dict, Any, Optional
import secrets
import string
from datetime import datetime, timedelta

# Database
from ..db import supabase_admin, supabase_client

# Import models
from ..models import (
    SignupRequest, 
    UserCreate, 
    ScreeningAnswers, 
    ForgotPasswordRequest, 
    ResetPasswordRequest, 
    VerifyCodeRequest
)

from pydantic import BaseModel

# Import services
from .services.profile_functions import get_profile
import os
import json
from decimal import Decimal
from dotenv import load_dotenv
from fastapi.responses import JSONResponse

router = APIRouter()

# Table for storing password reset codes - we'll create this in Supabase
PASSWORD_RESET_TABLE = "password_reset_codes"

# Helper functions for password reset flow
def generate_verification_code(length=6):
    """Generate a random verification code."""
    # Use only digits for a simple numeric code
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def store_verification_code(email: str, code: str):
    """Store a verification code in the database."""
    # Set expiration time (15 minutes from now)
    expiration = datetime.utcnow() + timedelta(minutes=15)
    
    # First, delete any existing codes for this email
    supabase_admin.table(PASSWORD_RESET_TABLE).delete().eq("email", email).execute()
    
    # Then insert the new code
    data = {
        "email": email,
        "code": code,
        "expires_at": expiration.isoformat(),
        "verified": False
    }
    
    result = supabase_admin.table(PASSWORD_RESET_TABLE).insert(data).execute()
    return result

def verify_code(email: str, code: str) -> bool:
    """Verify that a code is valid and not expired."""
    # Get the code record from the database
    result = supabase_admin.table(PASSWORD_RESET_TABLE)\
                         .select("*")\
                         .eq("email", email)\
                         .eq("code", code)\
                         .execute()
    
    if not result.data:
        return False
        
    code_record = result.data[0]
    
    # Check if code is expired
    expiry = datetime.fromisoformat(code_record["expires_at"])
    if datetime.utcnow() > expiry:
        return False
    
    # Mark the code as verified
    supabase_admin.table(PASSWORD_RESET_TABLE)\
                .update({"verified": True})\
                .eq("email", email)\
                .eq("code", code)\
                .execute()
    
    return True

def get_verified_email(email: str) -> bool:
    """Check if the email has a verified code."""
    result = supabase_admin.table(PASSWORD_RESET_TABLE)\
                         .select("*")\
                         .eq("email", email)\
                         .eq("verified", True)\
                         .execute()
    
    if not result.data:
        return False
        
    code_record = result.data[0]
    
    # Check if verification is expired
    expiry = datetime.fromisoformat(code_record["expires_at"])
    if datetime.utcnow() > expiry:
        return False
    
    return True


# Add a new request model for code verification
class VerifyCodeRequest(BaseModel):
    email: str
    code: str


def validate_screening_answers(answers: Dict[str, str]) -> bool:
    """
    Validate screening answers to determine if user is qualified.
    Returns True if answers indicate user should be disqualified.
    """
    disqualifying_responses = {
        "financial_stability": ["C"],  # Significant financial difficulties
        "investment_objective": ["B"],  # Speculative trading
        "product_preference": ["B", "C"],  # Crypto or exotic products
        "financial_literacy": ["C"]  # Inexperienced
    }

    for question, disqualifying in disqualifying_responses.items():
        if answers.get(question) in disqualifying:
            return True
            
    return False

@router.post("/signup")
async def signup(user_data: UserCreate, screening_answers: ScreeningAnswers):
    """
    Register a new user after validating their screening answers.
    
    Args:
        user_data (UserCreate): User registration data
        screening_answers (ScreeningAnswers): Answers to screening questions
    """
    # Validate screening answers
    if validate_screening_answers(screening_answers.model_dump()):
        raise HTTPException(
            status_code=400,
            detail="Based on your responses, we recommend working with a financial professional"
        )

    try:
        # Check if user already exists in Supabase Auth
        email = user_data.email.lower().strip()
        # This is a more robust approach for checking email existence
        
        # 1. Create auth user in Supabase
        auth_response = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": user_data.password,
            "email_confirm": True
        })

        if hasattr(auth_response, 'error') and auth_response.error:
            print(f"Supabase Auth Error: {auth_response.error}")
            raise HTTPException(
                status_code=400, 
                detail=str(auth_response.error.message)
            )

        user = auth_response.user
        if not user:
            raise HTTPException(
                status_code=400, 
                detail="Failed to create user"
            )
            
        # 2. Create a record in your custom users table with role="client"
        now = datetime.utcnow().isoformat()
        user_record = {
            "id": user.id,  # Use the same UUID from Auth
            "email": email,
            "role": "client",  # Set default role
            "created_at": now,
            "updated_at": now,
            "hashed_password": "managed_by_supabase_auth"  # Always include this field
        }
        
        users_response = supabase_admin.table("users").insert(user_record).execute()
        
        if hasattr(users_response, 'error') and users_response.error:
            # Cleanup: delete auth user if custom user table creation fails
            print(f"Custom Users Table Error: {users_response.error}")
            supabase_admin.auth.admin.delete_user(user.id)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to create user record: {str(users_response.error.message)}"
            )

        # 3. Create a client profile with the provided name
        profile_data = {
            "user_id": user.id,
            "name": user_data.name,  # Use the actual name provided
        }
        
        profile_response = supabase_admin.table("client_profiles").insert(profile_data).execute()
        
        if hasattr(profile_response, 'error') and profile_response.error:
            # Cleanup: delete auth user and user record if profile creation fails
            print(f"Client Profile Error: {profile_response.error}")
            supabase_admin.auth.admin.delete_user(user.id)
            supabase_admin.table("users").delete().eq("id", user.id).execute()
            raise HTTPException(
                status_code=400,
                detail=f"Failed to create profile: {str(profile_response.error.message)}"
            )

        return {
            "message": "Account created successfully",
            "user_id": user.id,
            "email": user_data.email
        }

    except Exception as e:
        print(f"Signup error: {str(e)}")
        # Cleanup: delete auth user if any step fails
        if 'user' in locals() and user and user.id:
            try:
                supabase_admin.auth.admin.delete_user(user.id)
                # Also try to clean up the users table if it exists
                supabase_admin.table("users").delete().eq("id", user.id).execute()
            except Exception as cleanup_error:
                print(f"Cleanup error: {str(cleanup_error)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

@router.post("/login")
async def login(credentials: Dict[str, Any]):
    """
    Authenticate a user and create a new session.
    
    Validates user credentials against Supabase auth and returns session tokens
    along with basic user information and profile data.
    
    Args:
        credentials (dict): Contains:
            - email: User's email address
            - password: User's password
    
    Returns:
        dict: Contains:
            - access_token: JWT access token
            - user: Dict containing:
                - id: User ID
                - email: User email
                - profile: User profile data from client_profiles table
    
    Raises:
        HTTPException:
            - 400: If email or password is missing
            - 401: If authentication fails or credentials are invalid
            - 500: For internal server errors
    """
    try:
        email = credentials.get("email")
        password = credentials.get("password")
        
        print(f"Login attempt for email: {email}")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password are required")

        try:
            # Attempt authentication
            auth_response = supabase_client.auth.sign_in_with_password({
                "email": email.lower().strip(),
                "password": password
            })
            
            print(f"Auth response data: {auth_response.model_dump_json()}")
            
            user = auth_response.user
            session = auth_response.session

            if not user or not session:
                raise HTTPException(status_code=401, detail="Authentication failed")

            # Get user profile using the service function
            profile_data = await get_profile(f"Bearer {session.access_token}")
            
            return {
                "access_token": session.access_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "profile": profile_data
                }
            }

        except Exception as auth_error:
            print(f"Authentication error details: {str(auth_error)}")
            if "Invalid login credentials" in str(auth_error):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            raise HTTPException(status_code=401, detail=str(auth_error))

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/forgot-password")
async def forgot_password(request_data: ForgotPasswordRequest):
    """
    Initiate password reset process through backend.
    
    Args:
        request_data (ForgotPasswordRequest): Email address for password reset
    
    Returns:
        dict: Success message and verification code for development
    """
    try:
        email = request_data.email.lower().strip()
        
        # Check if email exists in Supabase (implementation details same as before)
        # ...
        
        # Generate and store verification code
        code = generate_verification_code()
        store_verification_code(email, code)
        print(f"VERIFICATION CODE FOR {email}: {code}")
        
        # Use Supabase to send an email, but don't rely on their reset flow
        # Instead, the email will contain our verification code
        try:
            # Use Supabase for email delivery only
            # In production, you would have a custom email template
            # with your verification code
            reset_response = supabase_client.auth.reset_password_for_email(
                email,
                {
                    "redirect_to": "http://localhost:5173/reset-password"
                }
            )
            
            print(f"Password reset email requested through Supabase")
            
            # For development, return the code directly
            return {
                "message": "Verification code sent to your email",
                "code": code  # Remove in production
            }
            
        except Exception as e:
            print(f"Error using Supabase email: {str(e)}")
            # For development, still return the code
            return {
                "message": "Verification code generated",
                "code": code  # Remove in production
            }
        
    except Exception as e:
        print(f"Password reset error: {str(e)}")
        return {"message": "If your email is registered, you will receive a verification code"}


@router.post("/verify-code")
async def verify_reset_code(request_data: VerifyCodeRequest):
    """
    Verify the password reset code.
    
    Args:
        request_data (VerifyCodeRequest): Email and verification code
    
    Returns:
        dict: Success or error message
    """
    try:
        email = request_data.email.lower().strip()
        code = request_data.code
        
        # Check if the code is valid
        if verify_code(email, code):
            return {"message": "Code verified successfully"}
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired verification code"
            )
        
    except Exception as e:
        print(f"Code verification error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Code verification failed: {str(e)}"
        )


@router.post("/reset-password")
async def reset_password(request_data: ResetPasswordRequest):
    """
    Reset user password after verification.
    
    Args:
        request_data (ResetPasswordRequest): Email and new password
    
    Returns:
        dict: Success message
    """
    # Keep your existing implementation but ensure it properly calls Supabase's 
    # API to update the password while maintaining the verification check
    
    # Code looks good as is - it verifies the code from our database and then 
    # uses Supabase admin to update the password
    # ...
