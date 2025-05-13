"""
Investment Routes Module

This module provides FastAPI router endpoints for investment-related operations,
particularly focusing on investment holdings extraction, management, and analysis.

Endpoints:
- POST /investments/extract: Extract investment holdings from a PDF statement
- POST /investments/save: Save investment holdings to the database
- GET /investments/holdings: Get all investment holdings for a user
- DELETE /investments/holdings: Delete specific or all investment holdings
- GET /investments/asset-allocation: Calculate a user's total asset allocation
- POST /scenario_analysis: Analyze a portfolio under a scenario and return structured analysis
- GET /investments/news: Get personalized investment news for the authenticated user based on their holdings
- POST /investments/deep-research: Conduct deep investment research using Perplexity API
- POST /investments/analyst-agent: Analyze if a specific investment product would be a good addition to user's portfolio using OpenAI's Agent framework
- POST /investments/voice-deep-research: Process voice-based investment deep research queries
- POST /voice-to-text: Convert voice audio to text using OpenAI's transcription API
- POST /investments/related-questions: Generate related questions a user might have based on their current learning topic

Authentication:
- All endpoints require Bearer token authentication via Supabase
- Tokens must be passed in the Authorization header

Data Processing:
- PDF extraction using Claude API
- Holdings validation and processing
- Database persistence with transaction support

Error Handling:
- 401 for authentication failures
- 400 for invalid input data
- 500 for server-side errors

Dependencies:
- FastAPI for API routing
- Supabase for authentication and data storage
- Custom service functions for investment processing
- Voice utilities for speech-to-text conversion
"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form, Body, Depends, Request
from typing import Dict, Any, List, Optional
import base64
import json
import traceback
import os
from datetime import datetime

# Database
from ..db import supabase_client, supabase_admin

# Import models
from ..models import (
    ExtractedInvestmentHolding, 
    InvestmentHolding,
    InvestmentExtractResponse,
    SaveInvestmentHoldingsRequest,
    ScenarioAnalysis
)

# Import services
from .services.agent_team_financial import run_financial_team_agent

from .services.profile_functions import get_profile

from .services.investments_functions import (
    extract_investment_holdings_from_pdf,
    process_extracted_holdings,
    save_investment_holdings,
    get_investment_holdings,
    analyze_scenario,
    calculate_asset_allocation,
    get_personalized_investment_news
)

from .services.agent_investment_analyst import run_investment_analyst_agent

from .services.agent_investment_microlearning import (
    run_microlearning_agent,
    generate_related_questions
)

from .services.agent_investment_timemachine import (
    run_investment_timemachine_agent
)

from .services.product_functions import generate_product_deepresearch
from .services.utils_voice import process_audio_file, transcribe_audio

router = APIRouter(tags=["investments"])

@router.post("/investments/extract", response_model=InvestmentExtractResponse)
async def extract_investments(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Extract investment holdings from a PDF file.
    
    Uploads a financial statement PDF and uses AI to extract investment holdings.
    Validates and returns the structured data for review before saving.
    
    Args:
        file (UploadFile): PDF file containing investment statement
        authorization (str): Bearer token for authentication
        
    Returns:
        InvestmentExtractResponse: Extracted investment holdings data
        
    Raises:
        HTTPException: 
            - 401: Missing or invalid authorization token
            - 400: Invalid file format or extraction error
            - 500: Server-side processing errors
    """
    print("\n=== ENTERING extract_investments endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Read PDF file
        pdf_bytes = await file.read()
        base64_pdf = base64.b64encode(pdf_bytes).decode("utf-8")
        
        # Extract data
        try:
            extracted_data = extract_investment_holdings_from_pdf(base64_pdf)
            print(f"Extracted data: {json.dumps(extracted_data, indent=2)}")
            
            # Process holdings
            processed_holdings = process_extracted_holdings(extracted_data)
            
            return InvestmentExtractResponse(
                success=True,
                holdings=processed_holdings,
                message=f"Successfully extracted {len(processed_holdings)} investment holdings"
            )
            
        except Exception as extraction_error:
            print(f"Extraction error: {str(extraction_error)}")
            traceback.print_exc()
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to extract investment holdings: {str(extraction_error)}"
            )
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in extract_investments: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/investments/save", response_model=dict)
async def save_investments(
    request: Request, 
    holdings_data: dict = Body(...)
):
    """
    Save investment holdings to the user's profile.
    """
    print("=== ENTERING save_investments endpoint ===")
    
    try:
        # Extract authorization header from request
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="No authorization token provided")
        
        # Get user profile
        profile = await get_profile(authorization)
        user_id = profile.get("id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid profile data")
            
        # Get the correct client_profile_id from the client_profiles table
        client_profile_response = supabase_admin.table("client_profiles") \
            .select("id") \
            .eq("user_id", user_id) \
            .limit(1) \
            .execute()
            
        if not client_profile_response.data:
            raise HTTPException(status_code=404, detail="Client profile not found")
            
        client_profile_id = client_profile_response.data[0]["id"]
        print(f"Found client_profile_id: {client_profile_id}")
        
        # Extract holdings and save mode
        holdings = holdings_data.get("holdings", [])
        save_mode = holdings_data.get("save_mode", "append")
        
        if not holdings:
            return {
                "success": False,
                "message": "No holdings data provided",
                "count": 0
            }
            
        # If overwrite mode, delete existing holdings first
        if save_mode == "overwrite":
            delete_result = supabase_admin.table("user_investment_holdings") \
                .delete() \
                .eq("client_profile_id", client_profile_id) \
                .execute()
                
        # Prepare holdings data for insertion
        holdings_to_insert = []
        for holding in holdings:
            holding_dict = holding.copy() if isinstance(holding, dict) else holding.dict()
            holding_dict["client_profile_id"] = client_profile_id  # Use the correct profile ID
            # Remove any id field if present
            if "id" in holding_dict:
                del holding_dict["id"]
            holdings_to_insert.append(holding_dict)
            
        # Insert holdings
        result = supabase_admin.table("user_investment_holdings") \
            .insert(holdings_to_insert) \
            .execute()
            
        return {
            "success": True,
            "message": f"Successfully saved {len(result.data)} investment holdings",
            "count": len(result.data)
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in save_investments: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/investments/holdings", response_model=dict)
async def get_investment_holdings_endpoint(request: Request):
    """
    Get all investment holdings for the authenticated user.
    """
    return await get_investment_holdings(request=request)

async def get_investment_holdings(request: Request = None, client_profile_id: str = None):
    """
    Get all investment holdings for a user.
    
    Can be called with either:
    - A request object (for endpoint calls)
    - A client_profile_id directly (for internal calls)
    """
    try:
        # Handle case when called with profile ID directly
        if client_profile_id:
            # Get the holdings directly using the provided client_profile_id
            holdings_response = supabase_admin.table("user_investment_holdings") \
                .select("*") \
                .eq("client_profile_id", client_profile_id) \
                .execute()
                
            return {"holdings": holdings_response.data}
        
        # Handle case when called via endpoint with request object
        elif request:
            # Extract authorization header from request
            authorization = request.headers.get("authorization")
            if not authorization:
                raise HTTPException(status_code=401, detail="No authorization token provided")
            
            # Get user profile
            profile = await get_profile(authorization)
            user_id = profile.get("id")
            
            if not user_id:
                raise HTTPException(status_code=400, detail="Invalid profile data")
                
            # Get the correct client_profile_id from the client_profiles table
            client_profile_response = supabase_admin.table("client_profiles") \
                .select("id") \
                .eq("user_id", user_id) \
                .limit(1) \
                .execute()
                
            if not client_profile_response.data:
                return {"holdings": []}
                
            client_profile_id = client_profile_response.data[0]["id"]
            
            # Get the holdings
            holdings_response = supabase_admin.table("user_investment_holdings") \
                .select("*") \
                .eq("client_profile_id", client_profile_id) \
                .execute()
                
            return {"holdings": holdings_response.data}
        else:
            raise ValueError("Either request or client_profile_id must be provided")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in get_investment_holdings: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/investments/holdings")
async def delete_investments(
    holding_ids: Optional[List[str]] = Body(None),
    delete_all: bool = Body(False),
    authorization: str = Header(None)
):
    """
    Delete specific or all investment holdings.
    
    Removes investment holdings from the database, either specific ones by ID
    or all holdings for the user if delete_all is True.
    
    Args:
        holding_ids (List[str], optional): IDs of holdings to delete
        delete_all (bool): If True, delete all holdings (overrides holding_ids)
        authorization (str): Bearer token for authentication
        
    Returns:
        dict: Operation result with status and details
        
    Raises:
        HTTPException: 
            - 401: Missing or invalid authorization token
            - 400: Invalid request (no holdings specified and delete_all is False)
            - 404: Profile not found
            - 500: Server-side processing errors
    """
    print("\n=== ENTERING delete_investments endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    if not delete_all and not holding_ids:
        raise HTTPException(
            status_code=400, 
            detail="Either provide holding_ids to delete or set delete_all to True"
        )
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user's profile ID
        profile_data = await get_profile(authorization)
        if not profile_data or "client_profile_id" not in profile_data:
            raise HTTPException(status_code=404, detail="Profile not found. Please complete your profile first.")
        
        profile_id = profile_data["client_profile_id"]
        
        # Prepare delete query
        delete_query = supabase_admin.table("user_investment_holdings").delete()
        
        if delete_all:
            # Delete all holdings for this profile
            result = delete_query.eq("client_profile_id", profile_id).execute()
            return {
                "success": True,
                "message": "All investment holdings deleted successfully",
                "count": len(result.data)
            }
        else:
            # Delete specific holdings
            # First verify these holdings belong to this profile
            holdings_query = supabase_admin.table("user_investment_holdings") \
                .select("id") \
                .eq("client_profile_id", profile_id) \
                .in_("id", holding_ids) \
                .execute()
                
            valid_ids = [holding["id"] for holding in holdings_query.data]
            
            if not valid_ids:
                return {
                    "success": False,
                    "message": "No valid holdings found to delete",
                    "count": 0
                }
            
            # Delete validated holdings
            result = delete_query.in_("id", valid_ids).execute()
            
            return {
                "success": True,
                "message": f"Successfully deleted {len(result.data)} investment holdings",
                "count": len(result.data)
            }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in delete_investments: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/investments/asset-allocation")
async def get_user_asset_allocation(authorization: str = Header(None)):
    """
    Calculate a user's total asset allocation based on their investment holdings
    and the asset allocation data of the investment products.
    
    Returns a weighted asset allocation across all asset classes.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
        
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Get user's client profile ID
        profile_response = supabase_admin.table("client_profiles") \
            .select("id") \
            .eq("user_id", str(user.id)) \
            .execute()
            
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Client profile not found")
            
        client_profile_id = profile_response.data[0]['id']
        
        # Call the new function to calculate asset allocation
        allocation_data = await calculate_asset_allocation(client_profile_id)
        
        return allocation_data
        
    except Exception as e:
        print(f"Error calculating asset allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate asset allocation: {str(e)}")

async def get_user_portfolio_data(user_id: str) -> dict:
    """
    Fetch a user's portfolio data for scenario analysis.
    
    Args:
        user_id: The user's ID
        
    Returns:
        dict: Portfolio data including total value, risk profile, and holdings
    """
    try:
        # Get the client profile ID
        client_profile_response = supabase_admin.table("client_profiles") \
            .select("id") \
            .eq("user_id", str(user_id)) \
            .execute()
            
        if not client_profile_response.data:
            return {
                "total_value": 0,
                "risk_profile": "Unknown",
                "holdings": []
            }
            
        client_profile_id = client_profile_response.data[0]['id']
        
        # Get investment preferences (for risk profile)
        investment_prefs = supabase_admin.table("investment_preferences") \
            .select("investor_type") \
            .eq("client_profile_id", client_profile_id) \
            .execute()
        
        risk_profile = "Moderate"  # Default
        if investment_prefs.data and investment_prefs.data[0].get("investor_type"):
            risk_profile = investment_prefs.data[0]["investor_type"]
        
        # Get holdings
        holdings_response = supabase_admin.table("user_investment_holdings") \
            .select("*") \
            .eq("client_profile_id", client_profile_id) \
            .execute()
            
        holdings = holdings_response.data
        
        # Calculate total value
        total_value = sum(
            float(holding["number_of_units"] or 0) * float(holding["average_cost_per_unit"] or 0) 
            for holding in holdings
        )
        
        return {
            "total_value": total_value,
            "risk_profile": risk_profile,
            "holdings": holdings
        }
        
    except Exception as e:
        print(f"Error getting user portfolio data: {str(e)}")
        return {
            "total_value": 0,
            "risk_profile": "Unknown",
            "holdings": []
        }

@router.post("/scenario_analysis", response_model=ScenarioAnalysis)
async def analyze_scenario_endpoint(
    data: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Analyze a portfolio under a scenario and return structured analysis.
    
    Args:
        data: Dictionary containing scenario_description
        authorization: Bearer token for authentication.
        
    Returns:
        ScenarioAnalysis: Structured analysis of the scenario.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")

    # Extract scenario_description from the request body
    scenario_description = data.get("scenario_description")
    if not scenario_description:
        raise HTTPException(status_code=400, detail="scenario_description is required")

    token = authorization.replace("Bearer ", "")
    
    user_response = supabase_client.auth.get_user(token)
    user = user_response.user
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Fetch user's portfolio data
    portfolio_data = await get_user_portfolio_data(user.id)

    # Call the analysis function
    analysis = await analyze_scenario(portfolio_data, scenario_description)
    
    return analysis

@router.get("/investments/news")
async def get_investment_news(authorization: str = Header(None)):
    """
    Get personalized investment news for the authenticated user based on their holdings.
    
    Args:
        authorization: Bearer token for authentication
        
    Returns:
        JSON with personalized news summary and news items
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    try:
        # Extract token and get user
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get client_profile_id for the user
        client_profile = supabase_admin.table("client_profiles")\
            .select("id")\
            .eq("user_id", str(user.id))\
            .execute()
            
        if not client_profile.data:
            raise HTTPException(status_code=404, detail="Client profile not found")
            
        client_profile_id = client_profile.data[0]['id']
        
        # Get personalized news
        news_data = await get_personalized_investment_news(client_profile_id)
        return news_data
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error fetching investment news: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/investments/deep-research")
async def get_product_deepresearch(
    query_data: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Conduct deep investment research using Perplexity API.
    
    Takes a research query and returns comprehensive analysis with citations.
    
    Args:
        query_data (dict): Contains the research query
        authorization (str): Bearer token for authentication
        
    Returns:
        dict: Deep research results with content, citations, and metadata
        
    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 400: Missing query or invalid request
            - 500: API or processing errors
    """
    print("\n=== ENTERING get_product_deepresearch endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    # Extract query from request body
    query = query_data.get("query")
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Research query is required")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"Processing deep research query: {query}")
        # Get research results
        research_results = await generate_product_deepresearch(query)
        
        return research_results
        
    except ValueError as ve:
        print(f"Deep research value error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
        
    except Exception as e:
        print(f"Deep research error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to conduct deep research")


@router.post("/investments/analyst-agent")
async def investment_analyst_agent(
    authorization: str = Header(None)
):
    """
    Automatically analyze the user's investment portfolio based on current market conditions
    using OpenAI's Agent framework.
    
    Uses o3-mini model with web search and scenario analysis tools to provide
    personalized investment advice based on user profile, current holdings,
    and market news.
    
    Args:
        authorization (str): Bearer token for authentication
        
    Returns:
        dict: Analysis results and recommendations
        
    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 404: User profile not found
            - 500: Agent processing errors
    """
    print("\n=== ENTERING investment_analyst_agent endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user profile data - this includes investments and preferences
        profile_data = await get_profile(authorization)
        if not profile_data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Get client_profile_id from the user profile
        # First check if client_profiles table has an entry for this user
        client_profile_response = supabase_admin.table("client_profiles") \
            .select("id") \
            .eq("user_id", str(user.id)) \
            .limit(1) \
            .execute()
            
        if not client_profile_response.data or len(client_profile_response.data) == 0:
            raise HTTPException(status_code=404, detail="Client profile not found")
            
        client_profile_id = client_profile_response.data[0]["id"]
        print(f"Found client_profile_id: {client_profile_id}")
        
        # Get investment holdings
        holdings_data = await get_investment_holdings(client_profile_id=client_profile_id)
        
        # Check if user has any holdings
        if not holdings_data.get("holdings"):
            return {
                "status": "no_holdings",
                "message": "You don't have any investment holdings in your portfolio yet. Add some investments to get personalized analysis.",
                "analysis": None
            }
        
        print(f"Found {len(holdings_data['holdings'])} holdings for analysis")
        
        # Setup OpenAI agent
        analysis_result = await run_investment_analyst_agent(profile_data, holdings_data)
        
        return analysis_result
        
    except ValueError as ve:
        print(f"Agent ValueError: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
        
    except Exception as e:
        print(f"Agent error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Analysis failed: An error occurred while processing your request")


@router.post("/investments/voice-deep-research")
async def voice_deep_research(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Process voice-based investment deep research queries by accepting an audio file,
    transcribing it using OpenAI's transcription API, and returning research results.
    """
    try:
        print("\n=== ENTERING /investments/voice-deep-research endpoint ===")
        if not authorization:
            raise HTTPException(status_code=401, detail="No authorization token provided")

        token = authorization.replace("Bearer ", "")
        
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        audio_content = await file.read()
        if not audio_content:
            raise HTTPException(status_code=400, detail="Empty audio file")
            
        # Process audio file to get a local path to the WAV file
        temp_audio_path = await process_audio_file(audio_content)
        
        with open(temp_audio_path, "rb") as audio_file:
            # Transcribe audio to text using OpenAI's transcription API
            transcription = await transcribe_audio(audio_file)
            
        if not transcription or transcription.strip() == "":
            return {
                "transcription": "",
                "content": "I couldn't understand what you said. Could you please try again?"
            }
            
        print(f"Processing transcribed query: {transcription}")
        
        # Use the existing deep research function with the transcribed text
        query_data = {"query": transcription}
        result = await get_product_deepresearch(query_data, authorization)
        
        # Clean up temporary audio file
        try:
            os.remove(temp_audio_path)
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
            
        return {
            "transcription": transcription,
            **result
        }

    except Exception as e:
        print(f"Voice deep research error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/investments/microlearning")
async def microlearning_route(
    payload: Dict[str, Any] = Body(...),
    authorization: str = Header(None)
):
    """
    Get personalized microlearning content on a financial topic based on user profile.
    
    Expects JSON body: { "query": "Explain dollar-cost averaging", "context": "retirement page" }
    """
    print("\n=== ENTERING microlearning_route endpoint ===")
    print(f"Query: {payload.get('query')}")
    print(f"Context: {payload.get('context')}")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    query = payload.get("query")
    context = payload.get("context", "")
    
    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query' in request body")
    
    try:
        # Get user profile data to personalize the response
        print("Fetching user profile data...")
        profile_data = await get_profile(authorization)
        print(f"Profile data retrieved: {bool(profile_data)}")
        
        # Run microlearning agent with user profile data
        print(f"Calling microlearning agent with query: '{query}'")
        result_text = await run_microlearning_agent(query, context, profile_data)
        print(f"Agent response received - length: {len(result_text)} characters")
        return {"success": True, "education": result_text}
    except Exception as e:
        print(f"Error in microlearning_route: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice-to-text")
async def voice_to_text(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Convert voice audio to text using OpenAI's transcription API.
    
    A utility endpoint that accepts an audio file and returns just the transcription,
    without any further processing. This can be reused across multiple features.
    
    Args:
        file (UploadFile): Audio file containing speech
        authorization (str): Bearer token for authentication
        
    Returns:
        dict: Containing the transcription text
        
    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 400: Empty audio file
            - 500: Transcription errors
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="No authorization token provided")

        token = authorization.replace("Bearer ", "")
        
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        audio_content = await file.read()
        if not audio_content:
            raise HTTPException(status_code=400, detail="Empty audio file")
            
        # Process audio file to get a local path to the WAV file
        temp_audio_path = await process_audio_file(audio_content)
        
        with open(temp_audio_path, "rb") as audio_file:
            # Transcribe audio to text using OpenAI's transcription API
            transcription = await transcribe_audio(audio_file)
            
        if not transcription or transcription.strip() == "":
            return {
                "success": False,
                "transcription": "",
                "message": "Could not understand the audio. Please try again."
            }
        
        # Clean up temporary audio file
        try:
            os.remove(temp_audio_path)
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
            
        return {
            "success": True,
            "transcription": transcription
        }

    except Exception as e:
        print(f"Voice transcription error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/investments/related-questions")
async def related_questions_route(
    payload: Dict[str, Any] = Body(...),
    authorization: str = Header(None)
):
    """
    Generate related questions a user might have based on their current learning topic
    
    Expects JSON body: { "query": "What is an ETF?", "context": "investment recommendations page" }
    """
    print("\n=== ENTERING related_questions_route endpoint ===")
    print(f"Query: {payload.get('query')}")
    print(f"Context: {payload.get('context')}")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    query = payload.get("query")
    context = payload.get("context", "")
    
    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query' in request body")
    
    try:
        # Get user profile data to personalize the questions
        print("Fetching user profile data...")
        profile_data = await get_profile(authorization)
        print(f"Profile data retrieved: {bool(profile_data)}")
        
        # Generate related questions
        print("Generating related questions...")
        questions = await generate_related_questions(query, context, profile_data)
        print(f"Generated {len(questions)} related questions")
        print(f"Related questions: {questions}")
        return {"success": True, "questions": questions}
    except Exception as e:
        print(f"Error in related_questions_route: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/investments/timemachine")
async def investment_timemachine(
    decision_details: Dict[str, Any] = Body(...),
    authorization: str = Header(None)
):
    """
    Project multiple possible futures for pending financial decisions.
    
    This endpoint leverages the Financial Decision Time Machine agent which
    projects potential futures for decisions being considered now.
    
    Args:
        decision_details (Dict): Contains details about the financial decision:
            - decision_description: Description of the decision
            - decision_amount: The amount of money involved
            - timeframe_years: Years to project into the future
        authorization (str): Bearer token for authentication
    """
    print("\n=== ENTERING investment_timemachine endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    # Validate required fields
    required_fields = ["decision_description", "decision_amount"]
    for field in required_fields:
        if field not in decision_details:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user profile data
        profile_data = await get_profile(authorization)
        if not profile_data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Get client_profile_id from the user profile
        client_profile_response = supabase_admin.table("client_profiles") \
            .select("id") \
            .eq("user_id", str(user.id)) \
            .limit(1) \
            .execute()
            
        if not client_profile_response.data or len(client_profile_response.data) == 0:
            raise HTTPException(status_code=404, detail="Client profile not found")
            
        client_profile_id = client_profile_response.data[0]["id"]
        print(f"Found client_profile_id: {client_profile_id}")
        
        # Get investment holdings
        holdings_data = await get_investment_holdings(client_profile_id=client_profile_id)
        
        # Set today's date
        decision_details["decision_date"] = datetime.now().strftime("%Y-%m-%d")
        
        # Always use "future" as decision type
        decision_details["decision_type"] = "future"
        
        # Set default comparison to S&P 500
        decision_details["alternatives"] = ["S&P500"]
        
        # Set default timeframe if not provided
        if "timeframe_years" not in decision_details:
            decision_details["timeframe_years"] = 10
        
        # Run the time machine agent
        analysis_result = await run_investment_timemachine_agent(
            profile_data=profile_data,
            holdings_data=holdings_data["holdings"] if "holdings" in holdings_data else [],
            decision_details=decision_details
        )
        
        return analysis_result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in investment timemachine endpoint: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail="Failed to analyze decision: An unexpected error occurred"
        )
    
@router.post("/financial-team")
async def financial_team_endpoint(
    data: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Unified endpoint for financial assistance using a team of agents.
    
    This endpoint uses a triage agent to route requests to specialized agents:
    - Retirement Advisor for retirement planning
    - Investment Time Machine for decision analysis
    
    The triage agent can also decline requests outside these domains.
    
    Args:
        data: Dictionary containing:
            - query: The user's financial question or request (required)
            - decision_details: Optional details about a financial decision being considered
              (for the Investment Time Machine agent)
        authorization: Bearer token for authentication
        
    Returns:
        Dict containing:
            - status: Success indicator
            - handled_by: Which agent handled the query ("triage", "retirement", "timemachine")
            - message: Primary message for the user
            - analysis: Detailed analysis if applicable
            - recommendations: List of actionable recommendations if applicable
            - image_url: URL to any visualization image
    """
    print("\n=== ENTERING financial_team_endpoint ===")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    # Extract query and optional specialized data
    user_query = data.get("query")  # Changed variable name to match function parameter
    decision_details = data.get("decision_details")
    
    if not user_query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        # Validate user
        token = authorization.replace("Bearer ", "")
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user profile data
        profile_data = await get_profile(authorization)
        if not profile_data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Get client_profile_id from the user profile
        client_profile_response = supabase_admin.table("client_profiles") \
            .select("id") \
            .eq("user_id", str(user.id)) \
            .limit(1) \
            .execute()
            
        if not client_profile_response.data or len(client_profile_response.data) == 0:
            raise HTTPException(status_code=404, detail="Client profile not found")
            
        client_profile_id = client_profile_response.data[0]["id"]
        print(f"Found client_profile_id: {client_profile_id}")
        
        # Get investment holdings
        holdings_response = await get_investment_holdings(client_profile_id=client_profile_id)
        holdings_data = holdings_response.get("holdings", [])
        
        # Update the team context with decision details if provided
        if decision_details:
            # If you need to store decision_details somewhere, do it here
            # For example, you might want to update the context that gets passed to the agent
            pass
              
        # Run the financial team agent with the correct parameter name
        result = await run_financial_team_agent(
            user_query=user_query,  # Changed to match the function parameter name
            profile_data=profile_data,
            holdings_data=holdings_data
        )
        
        return result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in financial_team_endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred while processing your request"
        )