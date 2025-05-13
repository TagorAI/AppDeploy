"""
Profile Routes Module

This module handles user profile management operations through FastAPI endpoints.
It provides functionality for creating, retrieving, and updating user profiles and
their associated financial information in Supabase.

Endpoints:
- GET /profile: Retrieve complete user profile information
- PUT /profile: Create or update user profile and financial details

Authentication:
- All endpoints require Bearer token authentication via Supabase
- Tokens must be passed in the Authorization header

Data Storage:
- Primary profile data stored in client_profiles table
- Financial data stored in financial_overviews table
- Retirement information stored in retirement_details table
- All tables linked via client_profile_id

Error Handling:
- 401 for authentication failures
- 404 for missing resources
- 500 for server-side errors

Dependencies:
- FastAPI for API routing
- Supabase for authentication and data storage
- Custom profile service functions
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Dict, Any

# Import from services
from .services.profile_functions import (
    get_profile
)

# Import from db and models
from ..db import supabase_admin, supabase_client
from ..models import ProfileUpdate

router = APIRouter()

@router.get("/profile")
async def get_profile_endpoint(authorization: str = Header(None)):
    """
    Retrieve a user's complete profile information including financial and retirement details.

    Fetches user profile data from multiple tables including basic profile information,
    financial overview, and retirement details. Returns basic user information if no
    profile exists.

    Args:
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Complete user profile containing:
            - Basic profile data (name, age, location, etc.)
            - Financial overview (income, expenses, holdings)
            - Retirement details (savings, accounts, lifestyle preferences)
            If no profile exists, returns:
            - id (str): User's UUID
            - email (str): User's email address

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 500: Database or processing errors
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")

    try:
        # Get user info first to ensure we have at least email and ID if profile fails
        token = authorization.replace("Bearer ", "")
        try:
            user_response = supabase_client.auth.get_user(token)
            user = user_response.user
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            # Keep basic user info for fallback
            basic_user_info = {
                "id": str(user.id),
                "email": user.email
            }
        except Exception as auth_err:
            print(f"Auth error: {str(auth_err)}")
            raise HTTPException(status_code=401, detail="Authentication failed")
        
        # Try to get complete profile data
        profile_data = await get_profile(authorization)
        
        # If profile_data has an error key, handle it
        if profile_data.get("error"):
            print(f"Profile error: {profile_data.get('error')}")
            # If some error occurred but we have basic user info, return that
            return basic_user_info
            
        # If we got profile data, return it
        if profile_data:
            return profile_data
            
        # Fallback to basic user info
        return basic_user_info

    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        print(f"Error fetching profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile_endpoint(profile_data: ProfileUpdate, authorization: str = Header(None)):
    """
    Create or update a user's complete profile information.

    Handles the creation and updating of user profiles across multiple tables:
    - Basic profile information (client_profiles)
    - Financial overview (financial_overviews)
    - Retirement details (retirement_details)
    - Advisor information (advisor_profiles) when applicable

    Args:
        profile_data (ProfileUpdate): Profile update data model containing:
            - Basic info (name, age, location, etc.)
            - Financial data (income, expenses, holdings)
            - Retirement info (savings, accounts, preferences)
            - Advisor info (has_advisor, advisor details) when applicable
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Updated complete profile data including all modified information

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 500: Database or processing errors

    Notes:
        - Handles both creation and updates automatically
        - Converts all monetary values to float type
        - Skips null values in financial and retirement updates
        - Returns complete profile data after successful update
    """
    print(f"Received profile update data: {profile_data}")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")

    token = authorization.replace("Bearer ", "")
    
    try:
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Check if profile exists
        client_profile = supabase_admin.table("client_profiles")\
            .select("id")\
            .eq("user_id", str(user.id))\
            .execute()

        # Insert or update client profile
        if not client_profile.data:
            profile_insert = {
                "user_id": user.id,
                "name": profile_data.name,
                "age": profile_data.age,
                "country_of_residence": profile_data.country_of_residence,
                "marital_status": profile_data.marital_status,
                "number_of_dependents": profile_data.number_of_dependents,
                "postal_code": profile_data.postal_code,
                "has_advisor": profile_data.has_advisor
            }
            client_profile = supabase_admin.table("client_profiles")\
                .insert(profile_insert)\
                .execute()
        else:
            profile_update = {
                "name": profile_data.name,
                "age": profile_data.age,
                "country_of_residence": profile_data.country_of_residence,
                "marital_status": profile_data.marital_status,
                "number_of_dependents": profile_data.number_of_dependents,
                "postal_code": profile_data.postal_code,
                "has_advisor": profile_data.has_advisor
            }
            client_profile = supabase_admin.table("client_profiles")\
                .update(profile_update)\
                .eq("user_id", str(user.id))\
                .execute()

        profile_id = client_profile.data[0]['id']

        # Handle advisor information if client has an advisor
        if profile_data.has_advisor and profile_data.advisor_name and profile_data.advisor_email_address:
            # Check if this client already has an advisor record
            client_with_advisor = supabase_admin.table("client_profiles")\
                .select("advisor_id")\
                .eq("id", str(profile_id))\
                .execute()
                
            advisor_id = None
            if client_with_advisor.data and client_with_advisor.data[0].get('advisor_id'):
                # Update existing advisor
                advisor_id = client_with_advisor.data[0]['advisor_id']
                advisor_update = {
                    "advisor_name": profile_data.advisor_name,
                    "advisor_email_address": profile_data.advisor_email_address,
                    "advisor_company_name": profile_data.advisor_company_name
                }
                supabase_admin.table("advisor_profiles")\
                    .update(advisor_update)\
                    .eq("id", advisor_id)\
                    .execute()
            else:
                # Create new advisor profile
                advisor_data = {
                    "user_id": user.id,  # Link to same user for now
                    "advisor_name": profile_data.advisor_name,
                    "advisor_email_address": profile_data.advisor_email_address,
                    "advisor_company_name": profile_data.advisor_company_name
                }
                advisor_response = supabase_admin.table("advisor_profiles")\
                    .insert(advisor_data)\
                    .execute()
                    
                if advisor_response.data:
                    advisor_id = advisor_response.data[0]['id']
                    # Update client profile with advisor_id
                    supabase_admin.table("client_profiles")\
                        .update({"advisor_id": advisor_id})\
                        .eq("id", str(profile_id))\
                        .execute()
        elif not profile_data.has_advisor:
            # If client no longer has an advisor, remove the advisor_id reference
            supabase_admin.table("client_profiles")\
                .update({"advisor_id": None})\
                .eq("id", str(profile_id))\
                .execute()

        # Update financial overview
        financial_data = {
            "monthly_income": float(profile_data.monthly_income) if profile_data.monthly_income is not None else None,
            "monthly_expenses": float(profile_data.monthly_expenses) if profile_data.monthly_expenses is not None else None,
            "cash_holdings": float(profile_data.cash_balance) if profile_data.cash_balance is not None else None,
            "investment_holdings": float(profile_data.investments) if profile_data.investments is not None else None,
            "current_debt": float(profile_data.debt) if profile_data.debt is not None else None
        }
        financial_data = {k: v for k, v in financial_data.items() if v is not None}

        # Update retirement details
        retirement_data = {
            "rrsp_savings": float(profile_data.rrsp_savings) if profile_data.rrsp_savings is not None else None,
            "tfsa_savings": float(profile_data.tfsa_savings) if profile_data.tfsa_savings is not None else None,
            "other_retirement_accounts": float(profile_data.other_retirement_accounts) if profile_data.other_retirement_accounts is not None else None,
            "desired_retirement_lifestyle": profile_data.desired_retirement_lifestyle
        }
        retirement_data = {k: v for k, v in retirement_data.items() if v is not None}

        # Handle financial overview update/insert
        if financial_data:
            financial_exists = supabase_admin.table("financial_overviews")\
                .select("id")\
                .eq("client_profile_id", str(profile_id))\
                .execute()

            if financial_exists.data:
                supabase_admin.table("financial_overviews")\
                    .update(financial_data)\
                    .eq("client_profile_id", str(profile_id))\
                    .execute()
            else:
                financial_data["client_profile_id"] = profile_id
                supabase_admin.table("financial_overviews")\
                    .insert(financial_data)\
                    .execute()

        # Handle retirement details update/insert
        if retirement_data:
            retirement_exists = supabase_admin.table("retirement_details")\
                .select("id")\
                .eq("client_profile_id", str(profile_id))\
                .execute()

            if retirement_exists.data:
                supabase_admin.table("retirement_details")\
                    .update(retirement_data)\
                    .eq("client_profile_id", str(profile_id))\
                    .execute()
            else:
                retirement_data["client_profile_id"] = profile_id
                supabase_admin.table("retirement_details")\
                    .insert(retirement_data)\
                    .execute()

        # Prepare investment preferences data with the new JSONB arrays
        invest_data = {
            'investor_type': profile_data.investor_type,
            'advisor_preference': profile_data.advisor_preference,
            'investing_interests': profile_data.investing_interests or [],
            'investing_interests_thematic': profile_data.investing_interests_thematic or [],
            'investing_interests_geographies': profile_data.investing_interests_geographies or [],
            'product_preferences': profile_data.product_preferences,
        }
        
        invest_exists = supabase_admin.table("investment_preferences")\
            .select("id")\
            .eq("client_profile_id", str(profile_id))\
            .execute()

        if invest_exists.data:
            invest_id = invest_exists.data[0]['id']
            supabase_admin.table('investment_preferences').update(invest_data).eq('id', invest_id).execute()
        else:
            invest_data['client_profile_id'] = profile_id
            supabase_admin.table('investment_preferences').insert(invest_data).execute()

        # Return updated profile
        return await get_profile(authorization)

    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))