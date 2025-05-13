"""
Retirement Routes Module

This module provides FastAPI endpoints for retirement planning and analysis.
It handles comprehensive retirement calculations, scenario planning, and
investment recommendations based on user profiles and financial data.

Endpoints:
- GET /health: Retirement planning health analysis
- GET /recommendations: Personalized retirement investment recommendations
- GET /current-plan: Detailed current retirement plan calculation
- POST /scenarios: Calculate retirement scenarios with different parameters
- POST /what-if: Perform what-if analysis for retirement planning
- POST /advisor: Run the Retirement Advisor Agent
- POST /advisor/feedback: Update the Retirement Advisor analysis based on user feedback
- POST /advisor/voice-feedback: Process voice feedback for the retirement advisor and update the retirement plan

Authentication:
- All endpoints require Bearer token authentication via Supabase
- Tokens must be passed in the Authorization header

Data Storage:
- Profile data stored in client_profiles table
- Financial data in financial_overviews table
- Retirement-specific data in retirement_details table
- All tables linked via client_profile_id

Error Handling:
- 401 for authentication failures
- 404 for missing resources
- 500 for server-side errors

Dependencies:
- FastAPI for API routing
- Supabase for authentication and data storage
- Custom retirement calculation services
"""

# api/retirement_routes.py
from fastapi import APIRouter, HTTPException, Header, Body, UploadFile, File
import logging
from typing import Dict
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Dict, Any
import logging
import json
import traceback
import os

# Import specifically from retirement_functions
from .services.retirement_functions import (
    analyze_retirement_health,
    calculate_current_retirement_plan,  # This will now always be the complete version
    calculate_retirement_scenario,
    calculate_retirement_what_if
)
from .services.profile_functions import (
    get_profile,
    get_financial_overview
)
from .services.product_functions import (
    generate_retirement_recommendation
)

from .services.agent_retirement_functions import (
    run_retirement_advisor_agent, 
    update_retirement_advisor_with_feedback
)

from .services.utils_voice import (
    process_audio_file, 
    transcribe_audio
)

# Import models
from ..models import (
    RetirementWhatIfRequest,
    RetirementWhatIfResponse,
    RetirementScenarioRequest,
    RetirementPlanResponse
)

# Import database client
from ..db import supabase_client, supabase_admin

router = APIRouter()


@router.get("/health")
async def get_retirement_health(authorization: str = Header(None)):
    """
    Generate comprehensive retirement health analysis for the authenticated user.

    Analyzes current retirement savings, contribution rates, and investment
    allocations to assess overall retirement planning health.

    Args:
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Retirement health analysis containing:
            - risk_assessment (str): Overall risk level assessment
            - savings_health (dict):
                - current_savings (float): Total retirement savings
                - monthly_contributions (float): Current monthly savings rate
                - savings_ratio (float): Savings vs. recommended ratio
            - retirement_age (dict):
                - projected (int): Projected retirement age at current rate
                - recommended (int): Recommended retirement age
            - recommendations (list): Prioritized action items
            - metrics (dict): Key retirement planning metrics

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 500: Server-side processing errors
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    token = authorization.replace("Bearer ", "")
    
    try:
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        profile_data = await get_profile(authorization)
        
        analysis = analyze_retirement_health(profile_data)
        # Make sure analysis includes all required fields from RetirementHealth interface
        return analysis
        
    except Exception as e:
        print(f"Error getting retirement health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def get_retirement_recommendations(
    authorization: str = Header(None),
    force_new: bool = False
):
    """Get or generate retirement recommendations for user."""
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
        
        # Only check for desired_retirement_lifestyle
        if not profile_data.get("desired_retirement_lifestyle"):
            return {
                "has_recommendation": False,
                "message": "Please complete your retirement profile first",
                "missing_fields": ["desired_retirement_lifestyle"],
                "action": "complete_profile"
            }

        # Check for existing recommendation if not forcing new
        if not force_new:
            try:
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
            except Exception as e:
                print(f"Error fetching existing recommendations: {str(e)}")
                # Continue to generate new recommendation if existing fetch fails

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
        print(f"Error in get_retirement_recommendations: {str(e)}")
        return {
            "has_recommendation": False,
            "message": "An error occurred while fetching recommendations",
            "is_existing": False
        }

@router.get("/current-plan", response_model=RetirementPlanResponse)
async def get_current_plan(authorization: str = Header(None)):
    """
    Calculate and retrieve detailed current retirement plan analysis.

    Processes user's complete financial profile to generate comprehensive
    retirement projections and analysis of current retirement strategy.

    Args:
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        RetirementPlanResponse: Complete retirement plan containing:
            - current_status (dict): Current retirement savings and contributions
            - projections (dict): Retirement age and income projections
            - gap_analysis (dict): Shortfall/surplus analysis
            - recommendations (list): Suggested improvements
            - monthly_targets (dict): Recommended contribution targets

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 404: Profile not found
            - 500: Calculation or server errors

    Notes:
        - Calculations use current market conditions and inflation projections
        - Assumes consistent contribution rates unless specified
        - Includes both registered and non-registered savings
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        print("\n=== STARTING CURRENT PLAN CALCULATION ===")
        user_response = supabase_admin.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        # First get the complete profile using the existing function
        print("\n=== FETCHING COMPLETE PROFILE ===")
        profile_data = await get_profile(authorization)
        if not profile_data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        print(f"Profile data received: {json.dumps(profile_data, indent=2)}")

        # Transform profile data into the expected format
        user_data = {
            "profile": {
                "age": profile_data.get("age", 0),
            },
            "financial": {
                "monthly_income": profile_data.get("monthly_income", 0),
                "monthly_expenses": profile_data.get("monthly_expenses", 0),
                "monthly_savings": max(0, profile_data.get("monthly_income", 0) - profile_data.get("monthly_expenses", 0)),
                "cash_holdings": profile_data.get("cash_balance", 0),
                "investment_holdings": profile_data.get("investments", 0)
            },
            "retirement": {
                "rrsp_savings": profile_data.get("rrsp_savings", 0),
                "tfsa_savings": profile_data.get("tfsa_savings", 0),
                "other_retirement_accounts": profile_data.get("other_retirement_accounts", 0),
                "desired_retirement_lifestyle": profile_data.get("desired_retirement_lifestyle", "moderate")
            }
        }

        print("\n=== CALCULATING RETIREMENT PLAN ===")
        print(f"Input data: {json.dumps(user_data, indent=2)}")
        
        # Use the more complete version of calculate_current_retirement_plan
        plan = calculate_current_retirement_plan(user_data)
        print(f"Generated plan: {json.dumps(plan.model_dump(), indent=2)}")
        
        return plan

    except Exception as e:
        logging.error(f"Error getting retirement plan: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get retirement plan")

async def get_user_retirement_data(supabase, user_id: str) -> Dict:
    """
    Fetch user's retirement-related data from Supabase database.

    Args:
        supabase: Supabase client instance
        user_id (str): User's unique identifier

    Returns:
        Dict: Combined user data containing:
            - financial (dict): Financial overview including income, expenses, and holdings
            - retirement (dict): Retirement-specific data including savings accounts
            - profile (dict): User profile information

    Raises:
        HTTPException: 404 if profile not found, 500 for server errors
    """
    try:
        profile_data = supabase.table('client_profiles') \
            .select('*') \
            .eq('user_id', user_id) \
            .single() \
            .execute()
        
        if not profile_data.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        client_profile_id = profile_data.data['id']
        
        financial_data = supabase.table('financial_overviews') \
            .select('*') \
            .eq('client_profile_id', client_profile_id) \
            .single() \
            .execute()
        
        retirement_data = supabase.table('retirement_details') \
            .select('*') \
            .eq('client_profile_id', client_profile_id) \
            .single() \
            .execute()

        financial_defaults = {
            "monthly_income": 0.0,
            "monthly_expenses": 0.0,
            "cash_holdings": 0.0,
            "investment_holdings": 0.0,
            "current_debt": 0.0
        }
        retirement_defaults = {
            "rrsp_savings": 0.0,
            "tfsa_savings": 0.0,
            "other_retirement_accounts": 0.0,
            "desired_retirement_lifestyle": "moderate"
        }

        financial = financial_data.data or financial_defaults
        retirement = retirement_data.data or retirement_defaults

        monthly_savings = max(0, financial["monthly_income"] - financial["monthly_expenses"])
        financial["monthly_savings"] = monthly_savings

        return {
            "financial": financial,
            "retirement": retirement,
            "profile": profile_data.data
        }
    except Exception as e:
        logging.error(f"Error fetching user data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user data: {str(e)}")

@router.post("/scenarios")
async def calculate_retirement_scenario_endpoint(
    scenario_params: RetirementScenarioRequest,
    authorization: str = Header(None)
):
    """
    Calculate retirement scenarios based on user-provided parameters.

    Generates detailed projections for different retirement scenarios by
    adjusting key variables like savings rate, retirement age, and
    investment returns.

    Args:
        scenario_params (RetirementScenarioRequest): Scenario parameters including:
            - retirement_age (int): Target retirement age
            - monthly_contribution (float): Planned monthly savings
            - investment_return (float): Expected return rate
            - risk_tolerance (str): Risk tolerance level
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Scenario analysis containing:
            - scenario_summary (dict): Key scenario parameters and results
            - projections (dict): Year-by-year retirement savings projections
            - comparison (dict): Comparison to current retirement plan
            - risk_analysis (dict): Risk assessment for the scenario
            - feasibility_score (float): Scenario feasibility rating

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 500: Calculation or server errors
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    token = authorization.replace("Bearer ", "")
    
    try:
        user = supabase_client.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        profile_data = await get_profile(authorization)
        financial_data = await get_financial_overview(authorization)
        
        scenario = calculate_retirement_scenario(
            profile_data,
            financial_data,
            scenario_params
        )
        
        return scenario
        
    except Exception as e:
        print(f"Error calculating retirement scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/what-if", response_model=RetirementWhatIfResponse)
async def retirement_what_if(
    scenario: RetirementWhatIfRequest,
    authorization: str = Header(None)
):
    """
    Perform detailed what-if analysis for retirement planning scenarios.

    Analyzes impact of specific changes to retirement strategy, such as
    increased savings, different investment allocations, or changed
    retirement age.

    Args:
        scenario (RetirementWhatIfRequest): What-if parameters including:
            - scenario_type (str): Type of scenario to analyze
            - adjustments (dict): Specific parameter adjustments
            - time_horizon (int): Analysis period in years
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        RetirementWhatIfResponse: Analysis results containing:
            - scenario_impact (dict): Impact of proposed changes
            - comparative_analysis (dict): Comparison with base scenario
            - risk_assessment (dict): Updated risk evaluation
            - implementation_steps (list): Steps to implement changes
            - sensitivity_analysis (dict): Impact of variable changes

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 400: Invalid scenario parameters
            - 500: Calculation errors

    Notes:
        - Calculations include Monte Carlo simulations for risk analysis
        - Considers market volatility in projections
        - Includes tax implications where relevant
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")

    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        result = calculate_retirement_what_if(scenario)
        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/advisor")
async def retirement_advisor_agent(
    authorization: str = Header(None)
):
    """
    Run the Retirement Advisor Agent to provide personalized retirement planning advice.
    
    Uses gpt-4o model with web search and retirement plan calculation tools to provide
    personalized retirement lifestyle predictions and recommendations.
    
    Args:
        authorization (str): Bearer token for authentication
        
    Returns:
        dict: Analysis results, lifestyle descriptions, and recommendations
        
    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 404: User profile not found
            - 500: Agent processing errors
    """
    print("\n========================================================")
    print("==== ENTERING RETIREMENT_ADVISOR_AGENT ENDPOINT =======")
    print("========================================================")
    
    if not authorization:
        print("ERROR: No authorization token provided")
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        print("Validating user token...")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            print("ERROR: Invalid authentication token")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"User authenticated: {user.id}")
        
        # Get user profile data
        print("Fetching user profile data...")
        profile_data = await get_profile(authorization)
        if not profile_data:
            print("ERROR: User profile not found")
            raise HTTPException(status_code=404, detail="User profile not found")
        
        print(f"Profile data retrieved for: {profile_data.get('name')}")
        print(f"Age: {profile_data.get('age')}, Country: {profile_data.get('country_of_residence')}")
        
        # Run the retirement advisor agent
        print("\nCalling run_retirement_advisor_agent...")
        analysis_result = await run_retirement_advisor_agent(profile_data)
        
        print("\nAgent analysis completed successfully")
        print(f"Result status: {analysis_result.get('status')}")
        print(f"Analysis length: {len(analysis_result.get('analysis', ''))} characters")
        
        return analysis_result
        
    except ValueError as ve:
        print(f"Agent ValueError: {str(ve)}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(ve))
        
    except Exception as e:
        print(f"Agent error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Analysis failed: An error occurred while processing your request")

@router.post("/advisor/feedback")
async def retirement_advisor_feedback(
    feedback_data: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Update the Retirement Advisor analysis based on user feedback.
    
    Takes user feedback on the initial retirement plan and provides refined recommendations.
    
    Args:
        feedback_data (dict): Contains user feedback and previous plan data
        authorization (str): Bearer token for authentication
        
    Returns:
        dict: Updated analysis results and recommendations
        
    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 400: Missing feedback or invalid request
            - 500: Agent processing errors
    """
    print("\n========================================================")
    print("==== ENTERING RETIREMENT_ADVISOR_FEEDBACK ENDPOINT ====")
    print("========================================================")
    
    if not authorization:
        print("ERROR: No authorization token provided")
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    # Extract feedback and plan data from request body
    feedback = feedback_data.get("feedback")
    plan_data = feedback_data.get("plan_data")
    
    print(f"Received feedback: {feedback[:100]}{'...' if len(feedback) > 100 else ''}")
    print(f"Plan data received: {len(str(plan_data))} characters")
    
    if not feedback or not plan_data:
        print("ERROR: Missing required feedback or plan data")
        raise HTTPException(status_code=400, detail="Feedback and plan data are required")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        print("Validating user token...")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            print("ERROR: Invalid authentication token")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"User authenticated: {user.id}")
        
        # Get user profile data
        print("Fetching user profile data...")
        profile_data = await get_profile(authorization)
        if not profile_data:
            print("ERROR: User profile not found")
            raise HTTPException(status_code=404, detail="User profile not found")
        
        print(f"Profile data retrieved for: {profile_data.get('name')}")
        
        # Update the retirement advisor analysis
        print("\nCalling update_retirement_advisor_with_feedback...")
        updated_result = await update_retirement_advisor_with_feedback(
            profile_data=profile_data,
            feedback=feedback,
            plan_data=plan_data
        )
        
        print("\nFeedback processing completed successfully")
        print(f"Result status: {updated_result.get('status')}")
        print(f"Analysis length: {len(updated_result.get('analysis', ''))} characters")
        
        return updated_result
        
    except ValueError as ve:
        print(f"Agent ValueError: {str(ve)}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(ve))
        
    except Exception as e:
        print(f"Agent error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Analysis failed: An error occurred while processing your request")

@router.post("/advisor/voice-feedback")
async def retirement_advisor_voice_feedback(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Process voice feedback for the retirement advisor and update the retirement plan.
    
    Takes voice input, transcribes it to text, and uses it to update the retirement plan.
    
    Args:
        file (UploadFile): Audio file containing user feedback
        authorization (str): Bearer token for authentication
        
    Returns:
        dict: Updated analysis results and recommendations with transcription
        
    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 400: Invalid audio file or transcription error
            - 500: Agent processing errors
    """
    print("\n========================================================")
    print("=== ENTERING RETIREMENT_ADVISOR_VOICE_FEEDBACK ENDPOINT ===")
    print("========================================================")
    
    if not authorization:
        print("ERROR: No authorization token provided")
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        print("Validating user token...")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            print("ERROR: Invalid authentication token")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"User authenticated: {user.id}")
        
        # Get user profile data
        print("Fetching user profile data...")
        profile_data = await get_profile(authorization)
        if not profile_data:
            print("ERROR: User profile not found")
            raise HTTPException(status_code=404, detail="User profile not found")
        
        print(f"Profile data retrieved for: {profile_data.get('name')}")
        
        # Process audio file
        audio_content = await file.read()
        if not audio_content:
            raise HTTPException(status_code=400, detail="Empty audio file")
            
        # Process audio file to get a local path to the WAV file
        temp_audio_path = await process_audio_file(audio_content)
        
        # Transcribe audio to text
        with open(temp_audio_path, "rb") as audio_file:
            transcription = await transcribe_audio(audio_file)
            
        # Clean up temporary audio file
        try:
            os.remove(temp_audio_path)
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
            
        if not transcription or transcription.strip() == "":
            return {
                "transcription": "",
                "status": "error",
                "message": "I couldn't understand what you said. Could you please try again?"
            }
        
        print(f"Transcribed feedback: {transcription}")
        
        # Use the plan data from the request body
        # For now, we'll assume the plan_data will be passed from the frontend
        # based on the current plan state
        plan_data = {} # This would be populated from the frontend
        
        # Update the retirement advisor analysis
        print("\nCalling update_retirement_advisor_with_feedback...")
        updated_result = await update_retirement_advisor_with_feedback(
            profile_data=profile_data,
            feedback=transcription,
            plan_data=plan_data
        )
        
        # Add transcription to the result
        updated_result["transcription"] = transcription
        
        print("\nFeedback processing completed successfully")
        print(f"Result status: {updated_result.get('status')}")
        print(f"Analysis length: {len(updated_result.get('analysis', ''))} characters")
        
        return updated_result
        
    except ValueError as ve:
        print(f"Voice feedback ValueError: {str(ve)}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(ve))
        
    except Exception as e:
        print(f"Voice feedback error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Voice feedback processing failed: {str(e)}")