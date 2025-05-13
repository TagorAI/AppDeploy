"""
Profile Functions Module

This module provides asynchronous functions for managing user profiles and retrieving
financial data from a Supabase database. The module handles authentication using
Supabase token-based validation, data retrieval from multiple tables, and includes
fallback mechanisms when certain data is missing.

The module offers the following functions:
- async def get_retirement_details(authorization: str) -> Dict[str, Any]:
    Retrieves retirement planning details for the authenticated user.
- async def get_financial_overview(authorization: str) -> Dict[str, Any]:
    Retrieves the financial overview data for the authenticated user.
- async def get_profile(authorization: str) -> Dict[str, Any]:
    Retrieves the complete profile data for the authenticated user, using an RPC call
    with a fallback to direct table queries if necessary.

Endpoints:
- /api/profile/retirement-details: Retrieve retirement details for the authenticated user.
- /api/profile/financial-overview: Retrieve financial overview data for the authenticated user.
- /api/profile: Retrieve complete client profile data for the authenticated user.

Database Tables:
- client_profiles: Core user profile information.
- retirement_details: Retirement-specific data.
- financial_overviews: Financial status and metrics.
- investment_preferences: Investment-related preferences and data.
- advisor_profiles: Information about advisors associated with client profiles.

Authentication:
- Utilizes Supabase token-based authentication.
- Validates Bearer tokens for all operations.
- Maintains secure user session management.

Data Operations:
- Retrieves complete user profiles.
- Fetches financial overviews.
- Accesses retirement planning details.
- Handles missing or incomplete data gracefully.

Error Handling:
- Returns an empty dictionary for missing data.
- Raises HTTP exceptions for authentication failures.
- Logs and prints errors during database operations.
- Maintains consistent error responses.

Dependencies:
- Supabase client for database operations.
- FastAPI for HTTP exceptions.
- Environment variables for configuration.
"""

import os
import json
import logging
from typing import Dict, Any
from fastapi import HTTPException
from dotenv import load_dotenv

# If needed, import your config and db here:
from ...db import supabase_admin, supabase_client
from ...config import get_settings

load_dotenv()

async def get_retirement_details(authorization: str) -> Dict[str, Any]:
    """
    Retrieve retirement details for the authenticated user from the Supabase database.

    This function extracts the user token from the provided authorization header,
    validates the user, retrieves the corresponding client profile, and then fetches
    the retirement details associated with that profile.

    Parameters:
        authorization (str): The authorization header containing the Bearer token.
                             Expected format is "Bearer <token>".

    Returns:
        Dict[str, Any]: A dictionary containing the retirement details if available.
                        Returns an empty dictionary if the profile or retirement details
                        are not found or if an error occurs.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase_client.auth.get_user(token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Get profile to get client_profile_id
        profile_response = supabase_client.table('client_profiles')\
            .select('id')\
            .eq('user_id', user.user.id)\
            .execute()
            
        if not profile_response.data:
            return {}
            
        client_profile_id = profile_response.data[0]['id']
        
        # Get retirement details
        retirement_response = supabase_client.table('retirement_details')\
            .select('*')\
            .eq('client_profile_id', client_profile_id)\
            .execute()
            
        if not retirement_response.data:
            return {}
            
        return retirement_response.data[0]
        
    except Exception as e:
        print(f"Error getting retirement details: {str(e)}")
        return {}

async def get_financial_overview(authorization: str) -> Dict[str, Any]:
    """
    Retrieve financial overview data for the authenticated user from the Supabase database.

    This function uses the provided authorization token to validate the user,
    retrieves the client profile based on the user's identifier, and then fetches
    the financial overview data related to that client profile.

    Parameters:
        authorization (str): The authorization header containing the Bearer token.
                             Expected format is "Bearer <token>".

    Returns:
        Dict[str, Any]: A dictionary containing the financial overview if available.
                        Returns an empty dictionary if the profile or financial overview
                        data is not found or if an error occurs.
    """
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase_client.auth.get_user(token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Get profile to get client_profile_id
        profile_response = supabase_client.table('client_profiles')\
            .select('id')\
            .eq('user_id', user.user.id)\
            .execute()
            
        if not profile_response.data:
            return {}
            
        client_profile_id = profile_response.data[0]['id']
        
        # Get financial overview
        financial_response = supabase_client.table('financial_overviews')\
            .select('*')\
            .eq('client_profile_id', client_profile_id)\
            .execute()
            
        if not financial_response.data:
            return {}
            
        return financial_response.data[0]
        
    except Exception as e:
        print(f"Error getting financial overview: {str(e)}")
        return {}

async def get_profile(authorization: str) -> Dict[str, Any]:
    """
    Retrieve complete profile data for the authenticated user from the Supabase database.

    This function attempts to obtain the complete client profile using an RPC call.
    If the RPC call fails or returns incomplete data, the function falls back to
    performing direct table queries across several related tables. It aggregates
    data from client_profiles, financial_overviews, investment_preferences,
    retirement_details, and advisor_profiles, ensuring that the user's email is
    always included.

    Parameters:
        authorization (str): The authorization header containing the Bearer token.
                             Expected format is "Bearer <token>".

    Returns:
        Dict[str, Any]: A dictionary containing the complete profile data. This includes
                        basic user information and detailed data on financial status,
                        investment preferences, retirement planning, and advisor details.
                        In case of errors or missing data, the function returns a dictionary
                        with at least the user's ID and email, and may include an error message.
    """
    try:
        print("\n=== ENTERING get_profile() ===")
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        print(f"User ID: {user.id}")
        
        if not user:
            print("No user found with token")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get the user's email directly from the user object
        user_email = user.email
            
        print("Calling get_profile_data RPC...")
        try:
            # Call the RPC function to get complete profile data
            profile_response = supabase_client.rpc(
                'get_profile_data',
                {'user_id_param': user.id}
            ).execute()
            
            # Properly check for successful response (data exists and isn't empty)
            print(f"RPC Response received: {profile_response}")
            
            if not hasattr(profile_response, 'data') or not profile_response.data or len(profile_response.data) == 0:
                print("No profile data found for user")
                return {"id": user.id, "email": user_email}  # Return at least the id and email
                
            # Process the profile data
            profile_data = profile_response.data[0]
            
            # Add the email to the profile data and ensure proper data types
            processed_profile = {
                'id': profile_data.get('id'),
                'email': user_email,
                'name': profile_data.get('name', ''),
                'age': profile_data.get('age'),
                'country_of_residence': profile_data.get('country_of_residence', ''),
                'marital_status': profile_data.get('marital_status', ''),
                'number_of_dependents': profile_data.get('number_of_dependents'),
                'postal_code': profile_data.get('postal_code', ''),
                'monthly_income': float(profile_data.get('monthly_income')) if profile_data.get('monthly_income') is not None else None,
                'monthly_expenses': float(profile_data.get('monthly_expenses')) if profile_data.get('monthly_expenses') is not None else None,
                'cash_balance': float(profile_data.get('cash_balance')) if profile_data.get('cash_balance') is not None else None,
                'investments': float(profile_data.get('investments')) if profile_data.get('investments') is not None else None,
                'debt': float(profile_data.get('debt')) if profile_data.get('debt') is not None else None,
                'investor_type': profile_data.get('investor_type', ''),
                'advisor_preference': profile_data.get('advisor_preference', ''),
                'investing_interests': profile_data.get('investing_interests', []),
                'investing_interests_thematic': profile_data.get('investing_interests_thematic', []),
                'investing_interests_geographies': profile_data.get('investing_interests_geographies', []),
                'product_preferences': profile_data.get('product_preferences', []),
                'rrsp_savings': float(profile_data.get('rrsp_savings')) if profile_data.get('rrsp_savings') is not None else None,
                'tfsa_savings': float(profile_data.get('tfsa_savings')) if profile_data.get('tfsa_savings') is not None else None,
                'other_retirement_accounts': float(profile_data.get('other_retirement_accounts')) if profile_data.get('other_retirement_accounts') is not None else None,
                'desired_retirement_lifestyle': profile_data.get('desired_retirement_lifestyle', ''),
                'has_advisor': profile_data.get('has_advisor', False),
                'advisor_id': profile_data.get('advisor_id'),
                'advisor_name': profile_data.get('advisor_name', ''),
                'advisor_email_address': profile_data.get('advisor_email_address', ''),
                'advisor_company_name': profile_data.get('advisor_company_name', '')
            }
            
            print("Profile data processed successfully via RPC")
            return processed_profile
        except Exception as rpc_error:
            error_message = str(rpc_error)
            print(f"RPC Error: {error_message}")
            
            # Check for specific type mismatch error
            if "42804" in error_message or "structure of query does not match function result type" in error_message:
                print("Type mismatch error detected - the database function may need to be updated")
            
            # If there's an RPC error, try to fall back to direct table queries
            print("Falling back to direct table queries...")
            
            # Get basic profile
            profile_query = supabase_client.table('client_profiles').select('*').eq('user_id', user.id).execute()
            if not profile_query.data or len(profile_query.data) == 0:
                print("No profile found for user in direct query")
                return {"id": user.id, "email": user_email}
                
            basic_profile = profile_query.data[0]
            profile_id = basic_profile.get('id')
            
            # Build the profile manually with data from individual tables
            fallback_profile = {
                'id': user.id,
                'email': user_email,
                'name': basic_profile.get('name', ''),
                'age': basic_profile.get('age'),
                'country_of_residence': basic_profile.get('country_of_residence', ''),
                'marital_status': basic_profile.get('marital_status', ''),
                'number_of_dependents': basic_profile.get('number_of_dependents'),
                'postal_code': basic_profile.get('postal_code', ''),
                'has_advisor': basic_profile.get('has_advisor', False),
                'advisor_id': basic_profile.get('advisor_id')
            }
            
            # Get financial data
            try:
                financial_query = supabase_client.table('financial_overviews').select('*').eq('client_profile_id', profile_id).execute()
                if financial_query.data and len(financial_query.data) > 0:
                    financial = financial_query.data[0]
                    fallback_profile.update({
                        'monthly_income': float(financial.get('monthly_income')) if financial.get('monthly_income') is not None else None,
                        'monthly_expenses': float(financial.get('monthly_expenses')) if financial.get('monthly_expenses') is not None else None,
                        'cash_balance': float(financial.get('cash_holdings')) if financial.get('cash_holdings') is not None else None,
                        'investments': float(financial.get('investment_holdings')) if financial.get('investment_holdings') is not None else None,
                        'debt': float(financial.get('current_debt')) if financial.get('current_debt') is not None else None
                    })
            except Exception as financial_error:
                print(f"Error getting financial data: {str(financial_error)}")
            
            # Get investment preferences
            try:
                investment_query = supabase_client.table('investment_preferences').select('*').eq('client_profile_id', profile_id).execute()
                if investment_query.data and len(investment_query.data) > 0:
                    investment = investment_query.data[0]
                    fallback_profile.update({
                        'investor_type': investment.get('investor_type', ''),
                        'advisor_preference': investment.get('advisor_preference', ''),
                        'investing_interests': investment.get('investing_interests', []),
                        'investing_interests_thematic': investment.get('investing_interests_thematic', []),
                        'investing_interests_geographies': investment.get('investing_interests_geographies', []),
                        'product_preferences': investment.get('product_preferences', [])
                    })
            except Exception as investment_error:
                print(f"Error getting investment data: {str(investment_error)}")
                
            # Get retirement data
            try:
                retirement_query = supabase_client.table('retirement_details').select('*').eq('client_profile_id', profile_id).execute()
                if retirement_query.data and len(retirement_query.data) > 0:
                    retirement = retirement_query.data[0]
                    fallback_profile.update({
                        'rrsp_savings': float(retirement.get('rrsp_savings')) if retirement.get('rrsp_savings') is not None else None,
                        'tfsa_savings': float(retirement.get('tfsa_savings')) if retirement.get('tfsa_savings') is not None else None,
                        'other_retirement_accounts': float(retirement.get('other_retirement_accounts')) if retirement.get('other_retirement_accounts') is not None else None,
                        'desired_retirement_lifestyle': retirement.get('desired_retirement_lifestyle', '')
                    })
            except Exception as retirement_error:
                print(f"Error getting retirement data: {str(retirement_error)}")
                
            # Get advisor data if there's an advisor_id
            if fallback_profile.get('advisor_id'):
                try:
                    advisor_query = supabase_client.table('advisor_profiles').select('*').eq('id', fallback_profile.get('advisor_id')).execute()
                    if advisor_query.data and len(advisor_query.data) > 0:
                        advisor = advisor_query.data[0]
                        fallback_profile.update({
                            'advisor_name': advisor.get('advisor_name', ''),
                            'advisor_email_address': advisor.get('advisor_email_address', ''),
                            'advisor_company_name': advisor.get('advisor_company_name', '')
                        })
                except Exception as advisor_error:
                    print(f"Error getting advisor data: {str(advisor_error)}")
            
            print("Fallback profile assembled successfully")
            return fallback_profile
            
    except Exception as e:
        error_message = str(e)
        print(f"Error in get_profile: {error_message}")
        return {
            "id": user.id if 'user' in locals() and user else None, 
            "email": user.email if 'user' in locals() and user else None, 
            "error": error_message
        }
