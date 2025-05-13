"""
Product Functions Module

This module provides functions for processing and analyzing investment product data,
generating recommendations, and handling natural language queries about financial products.
It serves as a backend for investment advisory and product recommendation services.

Functions:
    process_product_query(query: str) -> dict:
        Process natural language queries about investment products and generate structured results.
        
    process_voice_product_query(file: UploadFile, authorization: str) -> dict:
        Process audio recordings of product queries, transcribe them, and generate structured results.
        
    process_audio_file(audio_data: bytes) -> str:
        Convert raw audio data into a temporary WAV file for processing.
        
    generate_investment_query(profile_data: dict) -> str:
        Generate SQL query for investment recommendations based on user profile.
        
    generate_investment_recommendation(profile_data: dict) -> Dict[str, Any]:
        Generate and save personalized investment recommendations based on user profile.
        
    generate_gic_recommendation(profile_data: dict) -> Dict[str, Any]:
        Generate and save personalized GIC (Guaranteed Investment Certificate) recommendations.
        
    generate_retirement_recommendation(profile_data: dict) -> Dict[str, Any]:
        Generate and save personalized retirement investment recommendations.
        
    generate_product_deepresearch(query: str) -> dict:
        Conduct deep research on investment products or financial topics using Perplexity's API.

Database Schema:
    investment_products: Investment fund information including returns, expense ratios and asset classes
    gic_products: GIC product details including rates, terms and providers
    retirement_products: Retirement-specific investments with appropriate risk profiles
    user_recommendations: Stored user-specific product recommendations

AI Integration:
    - OpenAI models for SQL query generation and text-to-SQL conversion
    - Claude models for detailed analysis and product recommendations
    - Audio transcription for voice-based queries
    - Structured output parsing for recommendations

Dependencies:
    - OpenAI and Anthropic APIs for AI capabilities
    - Supabase for database operations
    - Pydub for audio file processing
    - Custom response models for structured outputs
"""
import pydub    
import io
import os
import json
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, UploadFile
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic
from decimal import Decimal
import traceback
import requests
from datetime import datetime
import tempfile

# If needed, import your config and db here:
# from .config import get_settings
from ...db import supabase_admin, supabase_client

from ...models import (
    InvestmentRecommendation, 
    GICRecommendation, 
    RetirementRecommendation, 
    UserRecommendation, 
    RecommendationRequest, 
    RecommendationResponse, 
    GICRecommendationRequest
)

load_dotenv()

# Initialize clients if needed
gpt_client = OpenAI()
anthropic_client = Anthropic()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Add this near the top of the file, before the functions
schema = """
    Table: investment_products
    Columns and example data:
    - id: Unique identifier (int4) | Example: 1
    - fund_name: Full name of the fund (varchar) | Example: "Vanguard Growth ETF"
    - fund_company: Company managing the fund (varchar) | Example: "Vanguard"
    - short_description: Brief description of the fund (text) | Example: "Growth-focused ETF investing in large-cap stocks"
    - suitable_for: Target investor profile (varchar) | Values: "Defensive", "Growth"
    - returns_1_year: One-year return percentage (numeric) | Example: 12.5
    - returns_3_year: Three-year return percentage (numeric) | Example: 35.8
    - returns_since_inception: Return since fund inception (numeric) | Example: 85.2
    - expense_ratio: Fund expense ratio percentage (numeric) | Example: 0.15
    - fund_nav: Current Net Asset Value (numeric) | Example: 125.50
    - assetclass_primary: Primary asset class (varchar) | Example: "Equity", "Fixed Income"
    - product_type: Type of investment product (varchar) | Values: "ETF", "Mutual Fund"
    - fund_symbol: Trading symbol (varchar) | Example: "VUG"
"""

async def process_product_query(query: str) -> Dict[str, Any]:
    """
    Process natural language queries about investment products using the OpenAI Responses API.
    
    This function leverages the OpenAI Responses API with the FileSearch tool to search through
    a vector store of investment product documentation, fund fact sheets, and financial data.
    It provides comprehensive responses to investment-related queries by accessing relevant
    information from the vector store.
    
    Args:
        query (str): Natural language query about investment products 
                    (e.g., "Tell me about Vanguard ETFs", "Compare VOO and SPY")
        
    Returns:
        dict: A dictionary containing:
            explanation (str): Markdown-formatted explanation of investment products
            results (list, optional): List of investment products matching the query
            
    Raises:
        HTTPException(500): If a server error occurs during processing
    """
    print("\n=== STARTING PRODUCT QUERY PROCESSING ===")
    print(f"Input query: {query}")
    
    try:
        from openai import OpenAI
        client = OpenAI()
        
        # Use the OpenAI Responses API with FileSearch tool
        response = client.responses.create(
            model="gpt-4o",
            input=[
                {
                    "role": "system",
                    "content": "You are a financial advisor specializing in investment products. Only answer questions related to investments, ETFs, mutual funds, stocks, and financial instruments. For non-investment questions, respond with: 'Sorry, I can only answer investment product related questions.'"
                },
                {
                    "role": "user",
                    "content": query
                }
            ],
            tools=[{
                "type": "file_search",
                "vector_store_ids": ["vs_67d0f48c1898819189c878eb2d6d5ee8"]
            }]
        )
        
        print(f"\n=== RESPONSE RECEIVED ===")
        
        # Initialize variables
        explanation = ""
        results = []
        
        # Extract the explanation from the response
        for output_item in response.output:
            if output_item.type == "message" and hasattr(output_item, "content"):
                for content_item in output_item.content:
                    if content_item.type == "output_text":
                        explanation = content_item.text
                        break
        
        # If no explanation was found, provide a default message
        if not explanation:
            explanation = "I'm sorry, but I couldn't find information related to your investment query. Please try again with a more specific question about investment products."
        
        return {
            "explanation": explanation,
            "results": results
        }
        
    except Exception as e:
        print(f"\n=== ERROR IN PRODUCT QUERY ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

def process_audio_file(audio_data: bytes) -> str:
    """
    Convert raw audio data into a temporary WAV file.
    
    This function takes binary audio data, attempts to detect its format,
    converts it to WAV format, and saves it to a temporary file for further processing.
    
    Args:
        audio_data (bytes): Raw binary audio data from an uploaded file
        
    Returns:
        str: Path to the temporary WAV file
        
    Raises:
        ValueError: If the audio data cannot be processed or converted
    """
    try:
        audio_io = io.BytesIO(audio_data)
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_wav(audio_io)
        except Exception:
            audio_io.seek(0)
            try:
                audio = AudioSegment.from_file(audio_io, format="webm")
            except Exception:
                audio_io.seek(0)
                audio = AudioSegment.from_file(audio_io)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        temp_file_path = temp_file.name
        temp_file.close()
        audio.export(temp_file_path, format="wav")
        return temp_file_path
    except Exception as e:
        raise ValueError(f"Error processing audio file: {str(e)}")

async def process_voice_product_query(file: UploadFile, authorization: str) -> dict:
    """
    Process an audio file for product queries.
    
    This function reads the uploaded audio file, converts it to a WAV file,
    transcribes it using OpenAI's transcription API, and then processes the
    resulting text query using process_product_query.
    
    Args:
        file (UploadFile): Uploaded audio file containing spoken product query
        authorization (str): Authorization token for user authentication
        
    Returns:
        dict: A dictionary containing:
            transcription (str): The transcribed text from the audio
            results (list): List of investment products matching the query
            explanation (str): Markdown-formatted explanation of the results
            sql_query (str): The executed SQL query
            
    Raises:
        HTTPException(401): If authorization is missing or invalid
        HTTPException(400): If the audio file is empty or cannot be processed
        HTTPException(500): If server error occurs during processing
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    token = authorization.replace("Bearer ", "")
    user_response = supabase_client.auth.get_user(token)
    user = user_response.user
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        audio_content = await file.read()
        if not audio_content:
            raise HTTPException(status_code=400, detail="Empty audio file")
        temp_audio_path = process_audio_file(audio_content)
        with open(temp_audio_path, "rb") as audio_file:
            transcription_response = openai_client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=audio_file,
                response_format="text"
            )
        transcription = transcription_response.text if hasattr(transcription_response, "text") else transcription_response
        if not transcription or transcription.strip() == "":
            return {
                "transcription": "",
                "explanation": "I couldn't understand what you said. Could you please try again?"
            }
        result = await process_product_query(transcription)
        result["transcription"] = transcription
        try:
            os.remove(temp_audio_path)
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    

def generate_investment_query(profile_data: dict) -> str:
    """
    Generate SQL query for investment recommendations based on user profile.
    
    This function maps the user's investor type to a suitability category
    and generates an optimized SQL query to find investment products that
    match the user's risk profile.
    
    Args:
        profile_data (dict): User profile data containing:
            investor_type (str): The user's investment risk appetite (e.g., "aggressive", "conservative")
            
    Returns:
        str: A SQL query string that selects investment products matching the user's
             profile, ordered by 3-year returns and limited to 5 products
    """
    print("\n=== STARTING INVESTMENT QUERY GENERATION ===")
    print(f"Profile data: {json.dumps(profile_data, indent=2)}")
    
    investor_type = profile_data.get('investor_type', '').lower()
    suitable_for = "Growth" if investor_type == "aggressive" else "Defensive"
    print(f"\n=== MAPPED INVESTOR TYPE ===")
    print(f"Original type: {investor_type}")
    print(f"Mapped to: {suitable_for}")
    
    prompt = f"""Using this schema:
    {schema}

    Generate a SQL query to find investment products where:
    - product_type is either 'ETF' or 'Mutual Fund'
    - suitable_for is '{suitable_for}'

    Rules:
    - Return only a valid SQL SELECT statement
    - Use exact column names from schema
    - Order by returns_3_year desc
    - Limit to 5 products
    - Do not include semicolons
    - Do not include markdown formatting"""

    print("\n=== GENERATING SQL WITH O3-MINI ===")
    completion = gpt_client.beta.chat.completions.parse(
        model="o3-mini",
        messages=[{
            "role": "user",
            "content": prompt
        }],
        response_format={"type": "text"}
    )
    
    sql_query = completion.choices[0].message.content
    print(f"\n=== SQL QUERY GENERATED ===")
    print(f"Generated query: {sql_query}")
    return sql_query

async def generate_investment_recommendation(profile_data: dict) -> Dict[str, Any]:
    """
    Generate and save personalized investment recommendations.
    
    This function processes a user's profile data, generates appropriate SQL queries
    to find matching investment products, uses AI to identify the best product match,
    and saves the recommendation to the database.
    
    Args:
        profile_data (dict): User profile data containing:
            user_id (str): User's unique identifier
            investor_type (str): User's investment risk profile (e.g., "aggressive")
            age (int): User's age
            investing_interests (list/str): User's investment interests or preferences
            product_preferences (str): User's product type preferences
            
    Returns:
        Dict[str, Any]: Dictionary containing:
            has_recommendation (bool): Whether a recommendation was successfully generated
            recommendation (dict): The recommendation data (if successful)
            is_existing (bool): Whether this is an existing recommendation
            
            Or on failure:
            has_recommendation (bool): False
            message (str): Error or information message
            action (str): Suggested next action ("no_products", "error", etc.)
    """
    print("\n=== STARTING INVESTMENT RECOMMENDATION GENERATION ===")
    print(f"Input profile data: {json.dumps(profile_data, indent=2)}")
    
    try:
        # 1. Verify user
        user_id = profile_data.get("user_id")
        print(f"\n=== VERIFYING USER ===")
        print(f"User ID: {user_id}")
        
        if not user_id:
            return {
                "has_recommendation": False,
                "recommendations": [],
                "is_existing": False
            }

        # 2. Generate and execute SQL query
        print("\n=== GENERATING SQL QUERY ===")
        sql_query = generate_investment_query(profile_data)
        print(f"Generated SQL query: {sql_query}")
        
        print("\n=== EXECUTING SQL QUERY ===")
        response = supabase_admin.rpc(
            'execute_sql_query',
            {'query_text': sql_query}
        ).execute()
        
        print(f"\n=== SQL QUERY RESULTS ===")
        print(f"Response data: {json.dumps(response.data, indent=2)}")
        
        if not response.data:
            return {
                "has_recommendation": False,
                "message": "No suitable investment products found at this time. Please try again later.",
                "action": "no_products"
            }
            
        # 3. Transform all product data
        product_options = []
        for product in response.data:
            product_options.append({
                "name": product["fund_name"],
                "company": product["fund_company"],
                "description": product["short_description"],
                "returns_3_year": float(product["returns_3_year"]) if product["returns_3_year"] else 0.0,
                "expense_ratio": float(product["expense_ratio"]) if product["expense_ratio"] else 0.0,
                "asset_class": product["assetclass_primary"],
                "suitable_for": product["suitable_for"],
                "id": product["id"],
                "fund_symbol": product["fund_symbol"]
            })
        print(f"\n=== TRANSFORMED PRODUCT OPTIONS ===")
        print(f"Product options: {json.dumps(product_options, indent=2)}")
        
        # 4. Generate recommendation with o3-mini
        print(f"\n=== GENERATING RECOMMENDATION WITH O3-MINI ===")
        recommendation_prompt = f"""Investment recommendation task:

Based on this investor profile:
- Type: {profile_data.get('investor_type')}
- Age: {profile_data.get('age')}
- Investment interests: {profile_data.get('investing_interests')}
- Product preferences: {profile_data.get('product_preferences')}

Available investment products:
{json.dumps(product_options, indent=2)}

Analyze the investor profile and available products. Select the single best product that matches their needs. Consider:
1. Risk tolerance based on investor type
2. Age-appropriate investment horizon
3. Alignment with stated interests
4. Product performance and costs

Return a structured recommendation with:
- product_id: ID of selected product
- recommended_symbol: Fund symbol of selected product
- recommended_rationale: Clear explanation of why this product is the best match"""

        completion = gpt_client.beta.chat.completions.parse(
            model="o3-mini",
            messages=[{
                "role": "user",
                "content": recommendation_prompt
            }],
            response_format=RecommendationRequest
        )
        
        print("\n=== O3-MINI RESPONSE ===")
        gpt_recommendation = completion.choices[0].message.parsed
        print(f"GPT recommendation: {json.dumps(gpt_recommendation.model_dump(), indent=2)}")
        
        # 5. Create database recommendation
        print("\n=== CREATING DATABASE RECOMMENDATION ===")
        db_recommendation = {
            "user_id": str(user_id),  # Convert UUID to string
            "product_type": "investment",
            "product_id": gpt_recommendation.product_id,
            "recommended_symbol": gpt_recommendation.recommended_symbol,
            "recommended_rationale": gpt_recommendation.recommended_rationale
        }
        print(f"Database recommendation: {json.dumps(db_recommendation, indent=2)}")
        
        # 6. Delete existing investment recommendations for this user
        print("\n=== DELETING EXISTING RECOMMENDATIONS ===")
        supabase_admin.table("user_recommendations")\
            .delete()\
            .eq("user_id", str(user_id))\
            .eq("product_type", "investment")\
            .execute()
        
        # 7. Save new recommendation
        print("\n=== SAVING NEW RECOMMENDATION ===")
        result = supabase_admin.table("user_recommendations")\
            .insert(db_recommendation)\
            .execute()
        print(f"Database result: {json.dumps(result.data, indent=2)}")
        
        # 8. Prepare response - UPDATED to return single recommendation
        response = {
            "has_recommendation": True,
            "recommendation": result.data[0],  # Single recommendation object
            "is_existing": False  # Set to False since this is a new recommendation
        }
        print("\n=== FINAL RESPONSE ===")
        print(f"Response: {json.dumps(response, indent=2)}")
        
        return response

    except Exception as e:
        print(f"Error in generate_investment_recommendation:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"Error traceback: {traceback.format_exc()}")
        return {
            "has_recommendation": False,
            "message": "An error occurred while generating recommendations.",
            "action": "error"
        }


async def generate_gic_recommendation(profile_data: dict) -> Dict[str, Any]:
    """
    Generate and save personalized GIC (Guaranteed Investment Certificate) recommendations.
    
    This function analyzes a user's financial situation, calculates excess cash
    beyond their emergency fund, queries available GIC products, and uses AI
    to generate a personalized GIC recommendation considering their financial needs.
    
    Args:
        profile_data (dict): User profile data containing:
            user_id (str): User's unique identifier
            monthly_expenses (float): User's monthly expense amount
            cash_balance (float): User's current cash balance
            
    Returns:
        Dict[str, Any]: Dictionary containing:
            has_recommendation (bool): Whether a recommendation was successfully generated
            recommendations (list): List of recommendation data objects (if successful)
            is_existing (bool): Whether this is an existing recommendation
            
    Raises:
        ValueError: If user_id is not provided
    """
    print("\n=== STARTING GIC RECOMMENDATION GENERATION ===")
    print(f"Input profile data: {json.dumps(profile_data, indent=2)}")
    
    try:
        # 1. Verify user
        user_id = profile_data.get("user_id")
        if not user_id:
            raise ValueError("User ID not provided")

        # 2. Calculate excess cash
        monthly_expenses = float(profile_data.get('monthly_expenses', 0))
        cash_balance = float(profile_data.get('cash_balance', 0))
        emergency_fund_target = monthly_expenses * 6
        excess_cash = max(0, cash_balance - emergency_fund_target)

        # 3. Query available GIC products
        response = supabase_admin.table("gic_products")\
            .select("*")\
            .order("rate_return_percent", desc=True)\
            .limit(1)\
            .execute()

        if not response.data:
            return {
                "has_recommendation": False,
                "recommendations": [],
                "is_existing": False
            }

        best_gic = response.data[0]

        # 4. Generate recommendation using GPT-4o
        prompt = f"""Given the client's profile and available GIC product, provide a structured recommendation.

Client Profile:
- Cash Balance: ${cash_balance:,.2f}
- Monthly Expenses: ${monthly_expenses:,.2f}
- Excess Cash (above 6-month emergency fund): ${excess_cash:,.2f}

Available GIC Product:
- Provider: {best_gic['company']}
- Product: {best_gic['product']}
- Term: {best_gic['term_years']} years
- Interest Rate: {best_gic['rate_return_percent']}%

Please provide a recommendation that includes the rationale and potential returns calculation."""

        completion = gpt_client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are a financial advisor providing clear, actionable GIC recommendations."},
                {"role": "user", "content": prompt}
            ],
            response_format=GICRecommendationRequest
        )
        
        gpt_recommendation = completion.choices[0].message.parsed

        # 5. Save recommendation to database
        db_recommendation = {
            "user_id": str(user_id),
            "product_type": "gic",
            "product_id": gpt_recommendation.product_id,
            "recommended_symbol": gpt_recommendation.recommended_product,
            "recommended_rationale": f"{gpt_recommendation.recommended_rationale}\n\nPotential Returns: {gpt_recommendation.potential_returns}"
        }

        # 6. Delete existing GIC recommendations for this user
        supabase_admin.table("user_recommendations")\
            .delete()\
            .eq("user_id", str(user_id))\
            .eq("product_type", "gic")\
            .execute()

        # 7. Save new recommendation
        result = supabase_admin.table("user_recommendations")\
            .insert(db_recommendation)\
            .execute()

        return {
            "has_recommendation": True,
            "recommendations": [result.data[0]],
            "is_existing": False
        }

    except Exception as e:
        print(f"Error in generate_gic_recommendation:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"Error traceback: {traceback.format_exc()}")
        return {
            "has_recommendation": False,
            "recommendations": [],
            "is_existing": False
        }


async def generate_retirement_recommendation(profile_data: dict) -> Dict[str, Any]:
    """
    Generate and save personalized retirement recommendations.
    
    This function analyzes a user's retirement profile including age, savings,
    and investment preferences, finds suitable retirement investment products,
    and uses AI to generate personalized retirement investment recommendations.
    
    Args:
        profile_data (dict): User retirement profile data containing:
            user_id (str): User's unique identifier
            age (int/str): User's current age
            rrsp_savings (float/str): Amount in RRSP accounts
            tfsa_savings (float/str): Amount in TFSA accounts
            investor_type (str): User's investment risk profile
            desired_retirement_lifestyle (str): User's retirement lifestyle goals
            
    Returns:
        Dict[str, Any]: Dictionary containing:
            has_recommendation (bool): Whether a recommendation was successfully generated
            recommendation (dict): The recommendation data (if successful)
            is_existing (bool): Whether this is an existing recommendation
            
            Or on failure:
            has_recommendation (bool): False
            message (str): Error or information message
            action (str): Suggested next action ("no_products", "error", etc.)
    """
    print("\n=== STARTING RETIREMENT RECOMMENDATION GENERATION ===")
    print(f"Input profile data: {json.dumps(profile_data, indent=2)}")
    
    try:
        # 1. Verify user
        user_id = profile_data.get("user_id")
        print(f"\n=== VERIFYING USER ===")
        print(f"User ID: {user_id}")
        
        if not user_id:
            return {
                "has_recommendation": False,
                "message": "User ID not provided",
                "action": "error"
            }

        # 2. Query available ETF products
        print("\n=== QUERYING INVESTMENT PRODUCTS ===")
        sql_query = generate_investment_query(profile_data)
        response = supabase_admin.rpc(
            'execute_sql_query',
            {'query_text': sql_query}
        ).execute()

        print(f"\n=== QUERY RESULTS ===")
        print(f"Response data: {json.dumps(response.data, indent=2)}")

        if not response.data:
            return {
                "has_recommendation": False,
                "message": "No suitable retirement products found at this time.",
                "action": "no_products"
            }

        # 3. Transform all product data
        product_options = []
        for product in response.data:
            product_options.append({
                "name": product["fund_name"],
                "company": product["fund_company"],
                "description": product["short_description"],
                "returns_3_year": float(product["returns_3_year"]) if product["returns_3_year"] else 0.0,
                "expense_ratio": float(product["expense_ratio"]) if product["expense_ratio"] else 0.0,
                "asset_class": product["assetclass_primary"],
                "suitable_for": product["suitable_for"],
                "id": product["id"],
                "fund_symbol": product["fund_symbol"]
            })
        print(f"\n=== TRANSFORMED PRODUCT OPTIONS ===")
        print(f"Product options: {json.dumps(product_options, indent=2)}")
        
        # Helper function to safely convert to float
        def safe_float(value, default=0.0):
            try:
                return float(value) if value is not None else default
            except (ValueError, TypeError):
                return default

        # 4. Generate recommendation with o3-mini
        print(f"\n=== GENERATING RECOMMENDATION WITH O3-MINI ===")
        recommendation_prompt = f"""As an investor seeking retirement advice, here is my profile:
- I am {profile_data.get('age', 'N/A')} years old
- I have ${safe_float(profile_data.get('rrsp_savings')):,.2f} in my RRSP
- I have ${safe_float(profile_data.get('tfsa_savings')):,.2f} in my TFSA
- My investor type is {profile_data.get('investor_type', 'not specified')}
- My desired retirement lifestyle is {profile_data.get('desired_retirement_lifestyle', 'not specified')}

Here are the available investment products I'm considering:
{json.dumps(product_options, indent=2)}

Please analyze my retirement profile and these products. Select the single best product for my retirement savings, considering:
1. An investment horizon appropriate for my age
2. My current retirement savings level
3. My investor type (which indicates my risk tolerance)
4. My desired retirement lifestyle
5. Product performance and costs
6. Tax implications for my RRSP and TFSA accounts

Return a structured recommendation with:
- product_id: ID of selected product
- recommended_symbol: Fund symbol of selected product
- recommended_rationale: Clear explanation of why this product is the best match for my retirement savings"""

        # Add detailed prompt debugging
        print("\n=== RECOMMENDATION PROMPT ===")
        print("Sending the following prompt to o3-mini:")
        print("-" * 80)
        print(recommendation_prompt)
        print("-" * 80)

        completion = gpt_client.beta.chat.completions.parse(
            model="o3-mini",
            messages=[{
                "role": "user",
                "content": recommendation_prompt
            }],
            response_format=RecommendationRequest
        )
        
        print("\n=== O3-MINI RESPONSE ===")
        gpt_recommendation = completion.choices[0].message.parsed
        print(f"GPT recommendation: {json.dumps(gpt_recommendation.model_dump(), indent=2)}")
        
        # 5. Create database recommendation
        print("\n=== CREATING DATABASE RECOMMENDATION ===")
        db_recommendation = {
            "user_id": str(user_id),
            "product_type": "retirement",
            "product_id": gpt_recommendation.product_id,
            "recommended_symbol": gpt_recommendation.recommended_symbol,
            "recommended_rationale": gpt_recommendation.recommended_rationale
        }
        print(f"Database recommendation: {json.dumps(db_recommendation, indent=2)}")
        
        # 6. Delete existing retirement recommendations for this user
        print("\n=== DELETING EXISTING RECOMMENDATIONS ===")
        supabase_admin.table("user_recommendations")\
            .delete()\
            .eq("user_id", str(user_id))\
            .eq("product_type", "retirement")\
            .execute()
        
        # 7. Save new recommendation
        print("\n=== SAVING NEW RECOMMENDATION ===")
        result = supabase_admin.table("user_recommendations")\
            .insert(db_recommendation)\
            .execute()
        print(f"Database result: {json.dumps(result.data, indent=2)}")
        
        # 8. Prepare response
        response = {
            "has_recommendation": True,
            "recommendation": result.data[0],  # Single recommendation
            "is_existing": False
        }
        print("\n=== FINAL RESPONSE ===")
        print(f"Response: {json.dumps(response, indent=2)}")
        
        return response

    except Exception as e:
        print(f"Error in generate_retirement_recommendation: {str(e)}")
        return {
            "has_recommendation": False,
            "message": "Failed to generate retirement recommendation",
            "action": "error"
        }

async def generate_product_deepresearch(query: str) -> dict:
    """
    Conduct deep research on investment products or financial topics using Perplexity's API.
    
    This function sends a financial or investment-related query to Perplexity's
    deep research API, which returns comprehensive analysis with citations and
    sources. The function formats the response into a structured format for
    display to users.
    
    Args:
        query (str): The research query or question about financial products or topics
        
    Returns:
        dict: Structured research results containing:
            content (str): Main research content and analysis
            citations (list): List of citations and sources used
            source (str): Identifier for the research source
            timestamp (str): ISO-formatted timestamp when research was conducted
            query (str): The original query
            usage (dict, optional): Token usage statistics if provided by the API
            
    Raises:
        ValueError: If the API key is missing or the API response is invalid
        requests.exceptions.HTTPError: If an error occurs during the API request
    """
    print("\n=== STARTING DEEP RESEARCH QUERY ===")
    print(f"Research query: {query}")
    
    try:
        # API endpoint for Perplexity
        url = "https://api.perplexity.ai/chat/completions"
        
        # Prepare headers with API key
        api_key = os.getenv('PERPLEXITY_API_KEY')
        if not api_key:
            raise ValueError("PERPLEXITY_API_KEY environment variable is not set")
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare request payload
        payload = {
            "model": "sonar-deep-research",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a financial research assistant that conducts comprehensive, expert-level research on investment topics and products. Focus on providing accurate, balanced analysis with clear evidence and citations."
                },
                {
                    "role": "user",
                    "content": query
                }
            ],
            "temperature": 0.2,
            "max_tokens": 4000,  # Adjust based on needs
            "top_p": 0.9
        }
        
        print("Sending request to Perplexity API...")
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        data = response.json()
        print("Received response from Perplexity API")
        
        # Extract the research content and citations
        if "choices" not in data or not data["choices"]:
            raise ValueError("No research results returned from API")
        
        research_content = data["choices"][0]["message"]["content"]
        citations = data.get("citations", [])
        
        # Format the response
        formatted_response = {
            "content": research_content,
            "citations": citations,
            "source": "perplexity-deep-research",
            "timestamp": datetime.now().isoformat(),
            "query": query
        }
        
        # Include token usage if available
        if "usage" in data:
            formatted_response["usage"] = data["usage"]
        
        return formatted_response
        
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {str(http_err)}")
        error_message = "API request failed"
        if response.status_code == 401:
            error_message = "Authentication error with research API"
        elif response.status_code == 429:
            error_message = "Rate limit exceeded with research API"
        raise ValueError(error_message)
        
    except Exception as e:
        print(f"Error in deep research: {str(e)}")
        print(f"Error traceback: {traceback.format_exc()}")
        raise ValueError(f"Failed to conduct deep research: {str(e)}")