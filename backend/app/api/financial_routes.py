"""
Financial Routes Module

This module provides FastAPI router endpoints for financial analysis and recommendations.
It handles user authentication via Supabase and integrates with various financial services.

Endpoints:
- GET /financial-assessment: Comprehensive financial assessment and recommendations
- GET /savings-health: Analysis of savings health and strategies
- GET /savings/gic-recommendation: Personalized GIC product recommendations
- GET /investment-health: Investment portfolio health analysis
- GET /investment/recommendations: Personalized investment recommendations
- GET /financial-snapshot: Current financial metrics and ratios
- POST /email-assessment: Email the user's financial assessment to their registered email
- POST /investment/email-recommendation: Email the user's investment recommendation to their registered email
- POST /investment/risk-profile: Update user's investment risk profile based on questionnaire answers
- GET /financial-plan: Generate a simplified financial plan for the authenticated user

Authentication:
- All endpoints require Bearer token authentication via Supabase
- Tokens must be passed in the Authorization header

Data Storage:
- User profiles and financial data stored in Supabase
- Secure data access with user-specific permissions

Error Handling:
- 401 for authentication failures
- 404 for missing resources
- 500 for server-side errors

Dependencies:
- FastAPI for API routing
- Supabase for authentication and data storage
- Custom service modules for financial calculations
"""

# routers/financial_routes.py
from fastapi import APIRouter, HTTPException, Header, Depends, Body, Response
from typing import Dict, Any
import traceback
from fastapi.responses import JSONResponse
import json
import time
from datetime import datetime, timedelta

# Database
from ..db import supabase_client, supabase_admin

# Import services
from .services.adviceassistants_functions import generate_financial_assessment

from .services.product_functions import (
    generate_investment_recommendation,
    generate_gic_recommendation,
    generate_retirement_recommendation
)

from .services.profile_functions import get_profile

from .services.utils_email_service import (
    send_email,
    format_financial_assessment,
    format_investment_recommendation
)

from .services.savings_functions import analyze_savings_health

from .services.investments_functions import analyze_investments_health

from .services.retirement_functions import (
    analyze_retirement_health, 
    calculate_current_retirement_plan
)


from .services.profile_functions import get_financial_overview
from ..config import get_settings

# Import models
from ..models import (
    UserRecommendation, 
    RecommendationResponse, 
    RecommendationRequest,
    GICRecommendationRequest
)

router = APIRouter(tags=["financial"])

# Cache storage
financial_plan_cache = {}
CACHE_EXPIRY = 300  # 5 minutes in seconds

@router.get("/financial-assessment")
async def get_financial_assessment(authorization: str = Header(None), force_refresh: bool = False):
    """
    Get a financial assessment for the authenticated user.

    Args:
        authorization (str): Bearer token for authentication
        force_refresh (bool): Force regeneration of assessment

    Returns:
        FinancialAssessment: The user's financial assessment
    """
    print("\n=== ENTERING get_financial_assessment endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Get the profile data
        profile_data = await get_profile(authorization)
        print(f"Profile data received: {profile_data}")
        
        # Check if profile data is incomplete
        if not profile_data.get('name') or not profile_data.get('age'):
            return {
                "introduction": "Please complete your basic profile information first.",
                "everyday_money": {
                    "status": "Needs Attention",
                    "strengths": [],
                    "areas_for_improvement": ["Complete basic profile information"]
                },
                "investments": {
                    "status": "Needs Attention",
                    "strengths": [],
                    "areas_for_improvement": ["Complete financial information"]
                },
                "retirement": {
                    "status": "Needs Attention",
                    "strengths": [],
                    "areas_for_improvement": ["Complete retirement information"]
                }
            }
        
        # Convert numeric values to float
        for key in ['monthly_income', 'monthly_expenses', 'cash_balance', 'investments', 
                   'tfsa_savings', 'other_retirement_accounts']:
            if profile_data.get(key) is None:
                profile_data[key] = 0
            else:
                try:
                    profile_data[key] = float(profile_data[key])
                except (TypeError, ValueError):
                    profile_data[key] = 0
        
        # Get the correct client_profile_id from the client_profiles table
        user_id = user.id
        print(f"Querying client_profiles for user_id: {user_id}")
        client_profile_response = supabase_admin.table("client_profiles") \
            .select("id") \
            .eq("user_id", user_id) \
            .execute()
        
        client_profile_id = None
        if client_profile_response.data and len(client_profile_response.data) > 0:
            client_profile_id = client_profile_response.data[0]["id"]
            print(f"Found client profile ID: {client_profile_id}")
        else:
            print("No client profile found for this user")
        
        if not force_refresh and client_profile_id:
            # Check for existing assessment that hasn't expired
            existing_assessment = supabase_admin.table("financial_assessments") \
                .select("assessment_data, created_at") \
                .eq("client_profile_id", client_profile_id) \
                .gt("expires_at", datetime.now().isoformat()) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            
            if existing_assessment.data and len(existing_assessment.data) > 0:
                print("Found recent assessment in database")
                assessment_data = existing_assessment.data[0]["assessment_data"]
                
                # Check schema version and migrate if needed
                current_version = assessment_data.get("schema_version", "1.0")
                if current_version != "1.0":  # or whatever your latest version is
                    assessment_data = migrate_assessment(assessment_data, "1.0")
                
                assessment_data["created_at"] = existing_assessment.data[0]["created_at"]
                return assessment_data
        
        # No valid assessment found, generate a new one
        print("Generating new assessment")
        assessment = await generate_financial_assessment(profile_data)
        assessment_dict = assessment.model_dump()
        
        # Save the new assessment to the database if we have a client profile ID
        if client_profile_id:
            # If force_refresh, delete existing assessments first
            if force_refresh:
                print(f"Deleting existing assessments for client_profile_id: {client_profile_id}")
                supabase_admin.table("financial_assessments") \
                    .delete() \
                    .eq("client_profile_id", client_profile_id) \
                    .execute()
            
            # Set expiry time (7 days from now)
            expires_at = (datetime.now() + timedelta(days=7)).isoformat()
            
            print(f"Inserting assessment with client_profile_id: {client_profile_id}, user_id: {user.id}")
            # Insert new assessment
            insert_result = supabase_admin.table("financial_assessments").insert({
                "client_profile_id": client_profile_id,
                "user_id": user.id,
                "assessment_data": assessment_dict,
                "schema_version": "1.0",
                "expires_at": expires_at
            }).execute()
            
            print(f"Assessment saved to database: {insert_result.data}")
            
            # Add created_at to the response
            assessment_dict["created_at"] = datetime.now().isoformat()
        else:
            print("Cannot save assessment: No client profile ID found for this user")
        
        return assessment_dict
        
    except Exception as e:
        print(f"Error in get_financial_assessment: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/savings-health")
async def get_savings_health(authorization: str = Header(None)):
    """
    Analyze the user's savings health based on their profile data.

    Args:
        authorization (str): Bearer token for user authentication

    Returns:
        dict: Savings health analysis results

    Raises:
        HTTPException: 401 if unauthorized, 500 for server errors
    """
    print("\n=== ENTERING get_savings_health endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        profile_data = await get_profile(authorization)
        print(f"Profile data received: {profile_data}")
        
        return analyze_savings_health(profile_data)

    except Exception as e:
        print(f"Error in get_savings_health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/savings/gic-recommendation")
async def get_gic_recommendation(
    authorization: str = Header(None),
    force_new: bool = False
):
    """Get or generate GIC recommendations for user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        # If not forcing new and existing recommendations exist, return them
        if not force_new:
            existing_recommendations = supabase_admin.table("user_recommendations")\
                .select("*")\
                .eq("user_id", str(user.id))\
                .eq("product_type", "gic")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()

            if existing_recommendations.data:
                return {
                    "has_recommendation": True,
                    "recommendations": [existing_recommendations.data[0]],
                    "is_existing": True
                }

        # Generate new recommendation
        profile_data = await get_profile(authorization)
        profile_data["user_id"] = user.id
        
        recommendation = await generate_gic_recommendation(profile_data)
        return recommendation
        
    except Exception as e:
        print(f"Error in get_gic_recommendation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/investment-health")
async def get_investment_health(authorization: str = Header(None)):
    """Analyze the user's investment portfolio health."""
    print("\n=== ENTERING get_investment_health endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        profile_data = await get_profile(authorization)
        print(f"Profile data received: {profile_data}")
        
        return analyze_investments_health(profile_data)
        
    except Exception as e:
        print(f"Error in get_investment_health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/investment/recommendations")
async def get_investment_recommendations(
    authorization: str = Header(None),
    force_new: bool = False
):
    """Get or generate investment recommendations for user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Get profile data first
        profile_data = await get_profile(authorization)
        
        # Check if required profile fields are filled
        required_fields = ['investor_type', 'investing_interests', 'age']
        missing_fields = [field for field in required_fields if not profile_data.get(field)]
        
        if missing_fields:
            return {
                "has_recommendation": False,
                "message": "Please complete your investment profile first",
                "missing_fields": missing_fields,
                "action": "complete_profile"
            }

        # Check for existing recommendation
        if not force_new:
            existing_recommendations = supabase_admin.table("user_recommendations")\
                .select("*")\
                .eq("user_id", str(user.id))\
                .eq("product_type", "investment")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()

            if existing_recommendations.data:
                return {
                    "has_recommendation": True,
                    "recommendation": existing_recommendations.data[0],
                    "is_existing": True
                }

        # Generate new recommendation
        profile_data["user_id"] = user.id
        new_recommendation = await generate_investment_recommendation(profile_data)
        
        # If we got a recommendation, return it with consistent structure
        if new_recommendation.get("recommendation"):
            return {
                "has_recommendation": True,
                "recommendation": new_recommendation["recommendation"],
                "is_existing": False
            }
        
        # If no recommendation was generated
        return {
            "has_recommendation": False,
            "message": "Failed to generate recommendation",
            "is_existing": False
        }
        
    except Exception as e:
        print(f"Error in get_investment_recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/financial-snapshot")
async def get_financial_snapshot(authorization: str = Header(None)):
    """
    Generate a comprehensive snapshot of the user's current financial metrics.

    Calculates key financial ratios and indicators based on the user's profile data.

    Args:
        authorization (str): Bearer token for authentication

    Returns:
        dict: Financial metrics including various financial indicators
    """
    print("\n=== ENTERING get_financial_snapshot endpoint ===")
    
    if not authorization:
        print("No authorization token provided")
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    try:
        # Get user from token
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            print("Invalid token")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"User authenticated: {user.email}")
            
        # Get complete profile data using the existing service function
        profile_data = await get_profile(authorization)
        if not profile_data:
            print("Profile data not found")
            raise HTTPException(status_code=400, detail="Profile data not found")
        
        print(f"Profile data retrieved successfully")
        
        # Fetch investment holdings if available
        holdings = []
        try:
            client_profile_id = profile_data.get("profile_id")
            if client_profile_id:
                print(f"Fetching investment holdings for client_profile_id: {client_profile_id}")
                result = supabase_admin.table("user_investment_holdings").select("*").eq("client_profile_id", client_profile_id).execute()
                holdings = result.data
                print(f"Found {len(holdings)} investment holdings")
            else:
                print("No client_profile_id found, skipping investment holdings fetch")
        except Exception as e:
            print(f"Error fetching investment holdings: {e}")
        
        # Import the calculation function from the right place
        from .services.utils_calculation_functions import calculate_financial_metrics
        
        # Calculate all metrics
        metrics = calculate_financial_metrics(
            profile_data,
            holdings
        )
        
        print("Financial snapshot metrics calculated successfully")
        return metrics

    except Exception as e:
        print(f"Error in get_financial_snapshot: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-assessment")
async def email_assessment(authorization: str = Header(None)):
    """Email financial assessment to user."""
    print("\n=== ENTERING email_assessment endpoint ===")
    
    if not authorization:
        print("No authorization token provided")
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        # Get user from token using your existing auth pattern
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        print(f"User authenticated: {user.email}")

        # Get existing recommendation from Supabase
        print("\n=== Fetching recommendation from Supabase ===")
        recommendation = supabase_client.table("user_recommendations")\
            .select("*")\
            .eq("user_id", str(user.id))\
            .eq("product_type", "investment")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        print(f"Recommendation data: {recommendation.data}")

        if not recommendation.data:
            print("No recommendation found")
            raise HTTPException(status_code=404, detail="No recommendation found")
            
        current_recommendation = recommendation.data[0]
        print(f"Found recommendation: {current_recommendation}")

        # Format and send email
        print("\n=== Formatting and sending email ===")
        template = format_financial_assessment(current_recommendation, user.email)
        result = await send_email(template)
        
        print(f"Email sent successfully: {result}")
        return result
        
    except Exception as e:
        print(f"Error in email_assessment: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/investment/email-recommendation")
async def email_investment_recommendation(authorization: str = Header(None)):
    """Email investment recommendation to test inbox."""
    print("\n=== ENTERING email_investment_recommendation endpoint ===")
    
    if not authorization:
        print("No authorization token provided")
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        # Get user from token
        print("Validating user token")
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            print("Invalid token")
            raise HTTPException(status_code=401, detail="Invalid token")
            
        print(f"User authenticated: {user.email}")

        # Get existing recommendation from Supabase
        print("Fetching recommendation from Supabase")
        recommendation_response = supabase_admin.table("user_recommendations")\
            .select("*")\
            .eq("user_id", str(user.id))\
            .eq("product_type", "investment")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        print(f"Recommendation query response: {recommendation_response}")

        if not recommendation_response.data or len(recommendation_response.data) == 0:
            print("No recommendation found")
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "message": "No investment recommendation found. Please generate a recommendation first."
                }
            )
            
        current_recommendation = recommendation_response.data[0]
        print(f"Found recommendation: {current_recommendation}")

        # Format and send email
        print("Formatting email template")
        template = format_investment_recommendation(current_recommendation, user.email)
        
        print("Sending email via Resend")
        result = await send_email(template)
        print(f"Email result: {result}")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Investment recommendation email sent successfully to test inbox",
                "email_id": result.get("email_id")
            }
        )
        
    except Exception as e:
        print(f"Error in email_investment_recommendation: {str(e)}")
        print(f"Full error details: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=str(e)
        )

@router.post("/investment/risk-profile")
async def update_risk_profile(
    request_body: dict = Body(...),
    authorization: str = Header(None)
):
    """Update user's investment risk profile based on questionnaire answers."""
    print("\n=== ENTERING update_risk_profile endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")

    try:
        # Get user from token
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        print(f"User authenticated: {user.email}")

        # Get the client profile ID first
        profile = supabase_client.table("client_profiles") \
            .select("id") \
            .eq("user_id", str(user.id)) \
            .execute()

        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        profile_id = profile.data[0]["id"]

        # Get current profile
        current_preferences = supabase_client.table("investment_preferences") \
            .select("investor_type") \
            .eq("client_profile_id", profile_id) \
            .execute()
        
        current_profile = current_preferences.data[0]["investor_type"] if current_preferences.data else None

        # Calculate new profile
        answers = request_body.get("answers")
        if not answers:
            raise HTTPException(status_code=400, detail="Missing answers in request body")

        # Calculate score
        score = 0
        for qid, ans in answers.items():
            if ans == 'A':
                score += 1
            elif ans == 'B':
                score += 2
            elif ans == 'C':
                score += 3

        # Convert score to risk profile
        if score <= 7:
            risk_profile = "conservative"
        elif score <= 11:
            risk_profile = "moderate"
        else:
            risk_profile = "aggressive"

        print(f"Calculated risk profile: {risk_profile}")

        # Update or insert preferences
        preferences_data = {
            "client_profile_id": profile_id,
            "investor_type": risk_profile,
            "updated_at": "now()"
        }

        if current_preferences.data:
            # Update existing preferences
            supabase_client.table("investment_preferences") \
                .update(preferences_data) \
                .eq("client_profile_id", profile_id) \
                .execute()
        else:
            # Insert new preferences
            preferences_data["created_at"] = "now()"
            supabase_client.table("investment_preferences") \
                .insert(preferences_data) \
                .execute()

        print(f"Successfully updated investment preferences")

        return {
            "success": True,
            "risk_profile": risk_profile,
            "current_profile": current_profile or "Not set"
        }

    except Exception as e:
        print(f"Error in update_risk_profile: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/retirement-health")
async def get_retirement_health(authorization: str = Header(None)):
    """
    Analyze the user's retirement planning health.

    Args:
        authorization (str): Bearer token for authentication

    Returns:
        dict: Retirement health analysis results
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        profile_data = await get_profile(authorization)
        
        # Import analyze_retirement_health from retirement_functions
        from .services.retirement_functions import analyze_retirement_health
        
        # Add status and summary fields for consistency with other health functions
        retirement_health = analyze_retirement_health(profile_data)
        
        # Add fields needed by financial plan
        if "status" not in retirement_health:
            if retirement_health.get("progress", 0) >= 75:
                retirement_health["status"] = "Excellent"
            elif retirement_health.get("progress", 0) >= 50:
                retirement_health["status"] = "Good"
            elif retirement_health.get("progress", 0) >= 25:
                retirement_health["status"] = "Fair"
            else:
                retirement_health["status"] = "Needs Attention"
                
        if "summary" not in retirement_health:
            retirement_health["summary"] = "Your retirement planning is in progress."
            
        if "score" not in retirement_health:
            retirement_health["score"] = retirement_health.get("progress", 0)
            
        # Add retirement age calculation for financial plan
        retirement_health["retirement_age"] = {
            "projected": 65,  # Default value
            "recommended": 65  # Default value
        }
            
        return retirement_health
        
    except Exception as e:
        print(f"Error in get_retirement_health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/financial-plan")
async def get_financial_plan(
    authorization: str = Header(None),
    response: Response = None
):
    """
    Generate a comprehensive financial plan for the user.
    
    Combines profile, financial, investment, and retirement data to create
    an easy-to-understand overview of financial health with actionable recommendations.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        # Get user profile data
        profile_data = await get_profile(authorization)
        if not profile_data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        # Get specialized financial data
        investment_health = await get_investment_health(authorization)
        retirement_health = await get_retirement_health(authorization)
        savings_health = await get_savings_health(authorization)
        
        # Calculate emergency fund coverage
        monthly_expenses = float(profile_data.get("monthly_expenses", 0) or 0)
        cash_balance = float(profile_data.get("cash_balance", 0) or 0)
        
        emergency_fund_months = 0
        if monthly_expenses > 0:
            emergency_fund_months = round(cash_balance / monthly_expenses, 1)
            
        emergency_fund_status = "Poor"
        if emergency_fund_months >= 6:
            emergency_fund_status = "Excellent"
        elif emergency_fund_months >= 3:
            emergency_fund_status = "Good"
        elif emergency_fund_months >= 1:
            emergency_fund_status = "Fair"
            
        # Calculate debt-to-income ratio
        monthly_income = float(profile_data.get("monthly_income", 0) or 0)
        debt = float(profile_data.get("debt", 0) or 0)
        
        debt_to_income = 0
        if monthly_income > 0 and debt > 0:
            # Assuming average 5% interest rate for simplification
            monthly_debt_payment = (debt * 0.05) / 12
            debt_to_income = (monthly_debt_payment / monthly_income) * 100
            
        debt_status = "Good"
        if debt_to_income > 40:
            debt_status = "Critical"
        elif debt_to_income > 30:
            debt_status = "Poor"
        elif debt_to_income > 20:
            debt_status = "Fair"
            
        # Get recommendations
        investment_recommendation = None
        retirement_recommendation = None
        
        try:
            investment_rec_response = await get_investment_recommendations(authorization)
            if investment_rec_response.get("has_recommendation"):
                investment_recommendation = investment_rec_response.get("recommendation")
        except:
            # Continue without investment recommendation
            pass
            
        try: 
            retirement_rec_response = await fetch_retirement_recommendations(authorization)
            if retirement_rec_response.get("has_recommendation"):
                retirement_recommendation = retirement_rec_response.get("recommendation")
        except Exception as e:
            # Log the error but continue without recommendation
            print(f"Error fetching retirement recommendation: {str(e)}")
            # Continue without retirement recommendation
            pass
        
        # Optimize spending
        monthly_savings = max(0, monthly_income - monthly_expenses)
        savings_rate = 0
        if monthly_income > 0:
            savings_rate = round((monthly_savings / monthly_income) * 100, 1)
            
        # Calculate net worth
        cash = float(profile_data.get("cash_balance", 0) or 0)
        investments = float(profile_data.get("investments", 0) or 0)
        rrsp = float(profile_data.get("rrsp_savings", 0) or 0)
        tfsa = float(profile_data.get("tfsa_savings", 0) or 0)
        other_retirement = float(profile_data.get("other_retirement_accounts", 0) or 0)
        
        total_assets = cash + investments + rrsp + tfsa + other_retirement
        net_worth = total_assets - debt
        
        # Build financial plan response
        return {
            "profile_summary": {
                "name": profile_data.get("name", ""),
                "age": profile_data.get("age", 0),
                "investor_type": profile_data.get("investor_type", "Not specified"),
                "monthly_income": monthly_income,
                "monthly_expenses": monthly_expenses,
                "monthly_savings": monthly_savings,
                "savings_rate": savings_rate
            },
            "financial_health": {
                "emergency_fund": {
                    "cash_balance": cash_balance,
                    "monthly_expenses": monthly_expenses,
                    "months_coverage": emergency_fund_months,
                    "status": emergency_fund_status,
                    "target_months": 6,
                    "progress_percentage": min(100, (emergency_fund_months / 6) * 100)
                },
                "debt_overview": {
                    "total_debt": debt,
                    "debt_to_income": round(debt_to_income, 1),
                    "status": debt_status,
                    "monthly_payment_estimate": round((debt * 0.05) / 12, 2) if debt > 0 else 0
                },
                "net_worth": {
                    "total_assets": total_assets,
                    "total_liabilities": debt,
                    "net_worth": net_worth
                }
            },
            "investment_health": investment_health,
            "retirement_health": retirement_health,
            "savings_health": savings_health,
            "retirement_projection": {
                "current_retirement_savings": rrsp + tfsa + other_retirement,
                "breakdown": {
                    "rrsp": rrsp,
                    "tfsa": tfsa,
                    "other": other_retirement
                },
                "monthly_contribution": monthly_savings * 0.2 if monthly_savings else 0,  # Assuming 20% of savings goes to retirement
                "estimated_retirement_age": retirement_health.get("retirement_age", {}).get("projected", 65),
                "years_until_retirement": max(0, retirement_health.get("retirement_age", {}).get("projected", 65) - profile_data.get("age", 0))
            },
            "recommendations": {
                "investment": investment_recommendation,
                "retirement": retirement_recommendation,
                "emergency_fund": {
                    "recommendation": f"Build up to {round(monthly_expenses * 6, 2)} in emergency savings" if emergency_fund_months < 6 else "Your emergency fund is fully funded!",
                    "action": "increase_emergency_fund" if emergency_fund_months < 6 else "maintain"
                },
                "debt": {
                    "recommendation": "Prioritize debt reduction to improve financial health" if debt_to_income > 20 else "Your debt level is manageable",
                    "action": "reduce_debt" if debt_to_income > 20 else "maintain"
                }
            }
        }
        
    except Exception as e:
        print(f"Error generating financial plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate financial plan: {str(e)}")

@router.get("/recommendations")
async def get_retirement_recommendations(
    authorization: str = Header(None),
    force_new: bool = False
):
    """Get or generate retirement recommendations for user."""
    try:
        return await fetch_retirement_recommendations(authorization, force_new)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add this helper function above the get_financial_plan function
async def fetch_retirement_recommendations(authorization: str, force_new: bool = False):
    """
    Helper function to fetch retirement recommendations without going through the API.
    This avoids the need to make an internal HTTP request.
    """
    if not authorization:
        return {"has_recommendation": False, "message": "No authorization provided"}
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            return {"has_recommendation": False, "message": "Invalid token"}

        # Check for existing recommendation if not forcing new
        if not force_new:
            existing_recommendations = supabase_admin.table("user_recommendations")\
                .select("*")\
                .eq("user_id", str(user.id))\
                .eq("product_type", "retirement")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()

            if existing_recommendations.data and len(existing_recommendations.data) > 0:
                return {
                    "has_recommendation": True,
                    "recommendation": existing_recommendations.data[0],
                    "is_existing": True
                }

        # Get profile data for recommendation generation
        profile_data = await get_profile(authorization)
        
        # Only proceed if we have lifestyle preference
        if not profile_data.get("desired_retirement_lifestyle"):
            return {
                "has_recommendation": False,
                "message": "Please complete your retirement profile first",
                "missing_fields": ["desired_retirement_lifestyle"],
                "action": "complete_profile"
            }
            
        # Generate new recommendation
        profile_data["user_id"] = user.id
        new_recommendation = await generate_retirement_recommendation(profile_data)
        
        # If we got a recommendation, return it with consistent structure
        if new_recommendation.get("recommendation"):
            return {
                "has_recommendation": True,
                "recommendation": new_recommendation["recommendation"],
                "is_existing": False
            }
        
        # If no recommendation was generated
        return {
            "has_recommendation": False,
            "message": "Failed to generate recommendation",
            "is_existing": False
        }
        
    except Exception as e:
        print(f"Error in fetch_retirement_recommendations: {str(e)}")
        return {
            "has_recommendation": False,
            "message": f"An error occurred while fetching recommendations: {str(e)}",
            "is_existing": False
        }

def migrate_assessment(assessment_data: Dict[str, Any], target_version: str = "1.0") -> Dict[str, Any]:
    """Migrate assessment data between schema versions."""
    current_version = assessment_data.get("schema_version", "1.0")
    
    # If already at target version, return as-is
    if current_version == target_version:
        return assessment_data
    
    result = assessment_data.copy()
    
    # Handle migrations between versions
    if current_version == "1.0" and target_version == "1.1":
        # Example migration from 1.0 to 1.1
        result["new_field"] = "default value"
        result["schema_version"] = "1.1"
    
    # Add more version paths as needed
    
    return result