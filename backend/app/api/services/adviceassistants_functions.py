"""
Advice Assistants Functions Module

This module provides AI-powered financial advice and information retrieval functions
using OpenAI and Anthropic APIs. It handles financial assessments, web searches,
and general financial advice generation.

Functions:
- generate_financial_assessment(profile_data: dict) -> FinancialAssessment
- web_search(query: str) -> str
- process_chat_query(query: str, profile_data: Optional[dict]) -> str
- process_audio_file(audio_data: bytes) -> str

API Integration:
- OpenAI GPT-4 for financial assessments and general advice
- Anthropic Claude for complex analysis
- Perplexity for web searches

Data Processing:
- Handles structured financial data from user profiles
- Formats responses in markdown
- Processes natural language queries

Error Handling:
- Raises ValueError for missing API keys
- Handles API rate limits and timeouts
- Provides fallback responses when data is incomplete
"""

import os
import json
import logging
import io
import tempfile
from typing import Optional, Dict
from dotenv import load_dotenv
from fastapi import HTTPException
from openai import OpenAI
from anthropic import Anthropic
from pydub import AudioSegment
from datetime import datetime

# Update imports to reflect new folder structure
from ...config import get_settings
from ...db import supabase_admin, supabase_client
from ...models import FinancialAssessment

from .utils_voice import process_audio_file

load_dotenv()

# Get settings instance
settings = get_settings()

# Initialize clients
gpt_client = OpenAI()
anthropic_client = Anthropic()


async def generate_financial_assessment(profile_data: dict) -> FinancialAssessment:
    """
    Generate a structured financial assessment using OpenAI.

    Analyzes user profile data to create a comprehensive financial assessment
    covering money management, investments, and retirement planning.

    Args:
        profile_data (dict): User financial profile containing:
            - name (str): User's name
            - age (int): User's age
            - monthly_income (float): Monthly income
            - monthly_expenses (float): Monthly expenses
            - cash_balance (float): Current cash holdings
            - investments (float): Total investments
            - tfsa_savings (float): TFSA balance
            - other_retirement_accounts (float): Other retirement savings
            - investor_type (str): Investment style preference

    Returns:
        FinancialAssessment: Structured assessment containing:
            - everyday_money (dict): Daily financial management analysis
            - investments (dict): Investment strategy review
            - retirement (dict): Retirement planning assessment
            - recommendations (list): Actionable recommendations

    Raises:
        ValueError: If required profile data is missing
        HTTPException: For API processing errors
    """
    print("[DEBUG] Step 1: Constructing prompt for financial assessment")
    
    prompt = f"""
    Formatting re-enabled
    
    Analyze the user's financial profile and generate a comprehensive financial assessment.

    ## User Profile Data
    - Name: {profile_data.get('name')}
    - Age: {profile_data.get('age')}
    - Country: {profile_data.get('country_of_residence')}
    - Marital Status: {profile_data.get('marital_status')}
    - Dependents: {profile_data.get('number_of_dependents')}
    - Postal Code: {profile_data.get('postal_code')}
    
    ## Financial Data
    - Monthly Income: ${profile_data.get('monthly_income', 0):,.2f}
    - Monthly Expenses: ${profile_data.get('monthly_expenses', 0):,.2f}
    - Cash Balance: ${profile_data.get('cash_balance', 0):,.2f}
    - Investments: ${profile_data.get('investments', 0):,.2f}
    - Debt: ${profile_data.get('debt', 0):,.2f}
    
    ## Investment Preferences
    - Investor Type: {profile_data.get('investor_type')}
    - Advisor Preference: {profile_data.get('advisor_preference')}
    - Investment Interests: {profile_data.get('investing_interests', [])}
    - Thematic Interests: {profile_data.get('investing_interests_thematic', [])}
    - Geographic Interests: {profile_data.get('investing_interests_geographies', [])}
    - Product Preferences: {profile_data.get('product_preferences', [])}
    
    ## Retirement Data
    - RRSP Savings: ${profile_data.get('rrsp_savings', 0):,.2f}
    - TFSA Savings: ${profile_data.get('tfsa_savings', 0):,.2f}
    - Other Retirement Accounts: ${profile_data.get('other_retirement_accounts', 0):,.2f}
    - Desired Retirement Lifestyle: {profile_data.get('desired_retirement_lifestyle')}
    
    ## Advisor Information
    - Has Advisor: {profile_data.get('has_advisor')}
    - Advisor Name: {profile_data.get('advisor_name')}
    - Advisor Email: {profile_data.get('advisor_email_address')}
    - Advisor Company: {profile_data.get('advisor_company_name')}

    Generate a structured financial assessment in JSON format with the following schema:

    1. introduction (string): A brief overview of the user's financial situation in plain language.
    2. everyday_money (object):
    - status (string): Current state of day-to-day money management (e.g., "Good", "Needs Attention", "Critical").
    - strengths (array of strings): Positive points about how the user manages everyday finances.
    - areas_for_improvement (array of strings): Key issues to address for daily money management.
    3. investments (object):
    - status (string)
    - strengths (array of strings)
    - areas_for_improvement (array of strings)
    4. retirement (object):
    - status (string)
    - strengths (array of strings)
    - areas_for_improvement (array of strings)

    Keep your language friendly and supportive. Avoid heavy financial jargon. Focus on practical, clear advice that someone with limited investment knowledge can follow. 
    Emphasize maintaining adequate cash reserves, preparing for retirement, and making steady, realistic progress.
    """

    print("[DEBUG] Step 2: Full prompt being sent to model:")
    print("="*80)
    print(prompt)
    print("="*80)

    model_name = "o3-mini-2025-01-31"
    print(f"[DEBUG] Step 3: Sending request to model: {model_name}")

    try:
        completion = gpt_client.beta.chat.completions.parse(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            response_format=FinancialAssessment
        )
        
        print("[DEBUG] Step 4: Successfully received response from model")
        return completion.choices[0].message.parsed

    except Exception as e:
        print(f"[DEBUG] ERROR in generate_financial_assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def web_search(query: str) -> str:
    """
    Perform a web search using the Perplexity API.

    Executes a web search query and returns formatted results with
    citations and structured information.

    Args:
        query (str): Search query string

    Returns:
        str: Markdown-formatted search results including:
            - Main section headings
            - Bullet-pointed lists
            - Bold important terms
            - Source citations

    Raises:
        ValueError: If PERPLEXITY_API_KEY is not found
        HTTPException: For API processing errors
    """
    perplexity_api_key = os.environ.get("PERPLEXITY_API_KEY")
    if not perplexity_api_key:
        raise ValueError("PERPLEXITY_API_KEY not found in environment variables")
    
    perplexity_client = OpenAI(
        api_key=perplexity_api_key,
        base_url="https://api.perplexity.ai"
    )
    
    messages = [
        {
            "role": "system",
            "content": (
                "You are an AI assistant that performs web searches and provides detailed, accurate information.\n"
                "Format your response in clear markdown:\n\n"
                "1. Use ## for main section headings\n"
                "2. Use bullet points for lists\n"
                "3. Use **bold** for important terms or numbers\n"
                "4. Keep paragraphs concise and well-structured\n"
                "5. Use > for notable quotes or key takeaways\n"
                "6. Include source references at the end using [1], [2], etc."
            )
        },
        {
            "role": "user",
            "content": query
        }
    ]
    
    response = perplexity_client.chat.completions.create(
        model="sonar-pro",
        messages=messages
    )
    return response.choices[0].message.content


async def process_chat_query(query: str, profile_data: Optional[dict] = None) -> str:
    """
    Process chat queries using OpenAI's Responses API with specialized tools.
    
    Routes financial queries to appropriate tools based on content type,
    using FileSearch for knowledge-based financial questions and WebSearch
    for current market information and news.
    
    Args:
        query (str): User's chat query
        profile_data (Optional[dict]): User's financial profile data
    
    Returns:
        str: Processed response containing:
            - Financial advice and information
            - Web search results for current financial data if needed
            - Personalized recommendations based on user profile if applicable
            - Formatted in markdown
    
    Raises:
        HTTPException: For processing or API errors
    
    Notes:
        - Uses web search for current market data and news
        - Incorporates user profile for personalized responses
        - Declines to answer non-financial questions
    """
    try:
        # Prepare system instruction for responses API
        current_date = datetime.now().strftime("%Y-%m-%d")

        system_instruction = f"""
        Today's date is {current_date}.

        You help users answer questions about:
        - Personal finance
        - Investing
        - Retirement planning
        - Tax considerations
        - Budgeting
        - Debt management

        You have access to the following tools:
        - Web Search to find current information on financial topics

        If the user's questions is not related to personal finance, investing, or retirement planning please politely decline answer and say, I am sorry but I can only help with personal finance, investing, and retirement planning questions.

        Respond:
        - In a friendly and engaging manner
        - Directly to the user
        - Use markdown formatting
        - Directly using the user's name in first person
        """
        
        # Construct user message with profile data if available
        user_content = [{"type": "input_text", "text": query}]
        
        # If profile data exists, include it as context
        profile_context = ""
        if profile_data:
            profile_context = f"""
            Please consider this user profile information when answering:
            - Age: {profile_data.get('age', 'Not provided')}
            - Income: {profile_data.get('monthly_income', 'Not provided')}
            - Savings: {profile_data.get('cash_balance', 'Not provided')}
            - Investments: {profile_data.get('investments', 'Not provided')}
            - Debt: {profile_data.get('debt', 'Not provided')}
            - Risk profile: {profile_data.get('investor_type', 'Not provided')}
            """
            user_content.append({"type": "input_text", "text": profile_context})

        # Create the response using OpenAI's Responses API
        response = gpt_client.responses.create(
            model="gpt-4o",
            input=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content}
            ],
            tools=[
                {"type": "web_search_preview"}
            ]
        )
        
        # Extract the assistant's response from the output
        # The response structure has outputs that might include tool calls and messages
        for output_item in response.output:
            if hasattr(output_item, 'content') and output_item.content:
                # Find the text response from the assistant
                for content_item in output_item.content:
                    if hasattr(content_item, 'text'):
                        return content_item.text
        
        # Fallback if structure is different than expected
        return "I apologize, but I couldn't process your question properly. Please try again."
        
    except Exception as e:
        print(f"Error in process_chat_query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")
