"""
Investment Functions Module

This module provides comprehensive tools for investment analysis, portfolio management, 
and financial data processing in a financial advisory platform.

Functions:
    analyze_investments_health(profile_data: dict) -> dict:
        Analyzes user's investment health and generates a progress checklist.

    extract_investment_holdings_from_pdf(pdf_base64: str) -> Dict[str, Any]:
        Extracts investment holdings data from PDF statements using Anthropic Claude API.

    process_with_structured_output(extracted_text: str) -> Dict[str, Any]:
        Processes Claude extraction output using OpenAI GPT-4o with structured output.

    process_extracted_holdings(extracted_data: Dict[str, Any]) -> List[ExtractedInvestmentHolding]:
        Validates and transforms raw extracted data into structured holding objects.

    save_investment_holdings(profile_id: str, holdings: List[ExtractedInvestmentHolding], save_mode: str) -> Dict[str, Any]:
        Saves investment holdings to database with append or overwrite options.

    get_investment_holdings(profile_id: str) -> List[InvestmentHolding]:
        Retrieves all investment holdings for a specific client profile.

    analyze_scenario(portfolio_data: dict, scenario_description: str) -> ScenarioAnalysis:
        Analyzes portfolio performance under specific market scenarios.

    calculate_asset_allocation(client_profile_id: str) -> dict:
        Calculates detailed asset allocation based on investment holdings.

    get_personalized_investment_news(client_profile_id: str) -> Dict[str, Any]:
        Retrieves and summarizes relevant news for a client's investment portfolio.

    fetch_stock_news(ticker: str) -> List[Dict[str, Any]]:
        Fetches recent news articles for a specific stock ticker.

    generate_news_summary(news_items: List[Dict[str, Any]], tickers: List[str], client_profile_id: str) -> str:
        Creates personalized news summaries using AI for client portfolios.

This module integrates with external AI services (Anthropic Claude and OpenAI) for sophisticated 
text analysis, document processing, and personalized content generation. It handles investment data
extraction, portfolio analysis, asset allocation calculation, and personalized financial news delivery.

Dependencies:
    - Anthropic API for PDF extraction and text generation
    - OpenAI API for structured data processing
    - Supabase for database operations
    - Custom financial models for structured data validation
"""

import logging
from typing import Dict, Any, List, Optional
import base64
import json
from datetime import datetime
from ...db import supabase_admin, supabase_client
from ...models import ExtractedInvestmentHolding, InvestmentHolding, ScenarioAnalysis

# Anthropic API integration
from anthropic import Anthropic
from openai import OpenAI
import os
import time
import traceback
import asyncio
import requests
import anthropic
import aiohttp  # Add this for async HTTP requests

# Initialize clients
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Model configurations
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
GPT_MODEL = "gpt-4o-mini"

def analyze_investments_health(profile_data: dict) -> dict:
    """
    Analyze user's investment health and generate a checklist
    """
    try:
        cash = float(profile_data.get('cash_balance', 0) or 0)
        investor_type = profile_data.get('investor_type', '')
        
        checklist = {
            "cash_balance": {
                "title": "Do you have cash to invest?",
                "status": "completed" if cash > 0 else "pending",
                "current": f"${cash:,.2f}",
                "target": "Available cash",
                "message": (
                    "You have cash available to invest!"
                    if cash > 0
                    else "Add cash to start investing"
                )
            },
            "risk_profile": {
                "title": "Have you set up your risk profile?",
                "status": "completed" if investor_type else "pending",
                "current": investor_type if investor_type else "Not set",
                "target": "Profile defined",
                "message": (
                    f"Your risk profile is set as: {investor_type}"
                    if investor_type
                    else "Define your risk profile to get personalized recommendations"
                )
            }
        }
        
        completed_items = sum(1 for item in checklist.values() if item["status"] == "completed")
        progress = (completed_items / len(checklist)) * 100
        
        return {
            "status": "complete",
            "checklist": checklist,
            "progress": progress,
            "total_cash": cash
        }
        
    except Exception as e:
        print(f"Error calculating investment health: {str(e)}")
        return {
            "status": "error",
            "message": "An error occurred while analyzing your investment health. Please ensure all values are valid.",
            "checklist": {},
            "progress": 0,
            "total_cash": 0
        }

def extract_investment_holdings_from_pdf(pdf_base64: str) -> Dict[str, Any]:
    """
    Extract investment holdings from a PDF using Anthropic Claude.
    
    Args:
        pdf_base64: Base64 encoded PDF content
        
    Returns:
        Dict containing the extracted investment data
    """
    from anthropic import Anthropic
    import os
    
    prompt = """
    Please extract all investment holdings from this financial statement PDF.
    
    Output valid JSON with the following structure:
    {
        "account_info": {
            "account_type": "string", // e.g., TFSA, RRSP, Margin
            "institution": "string",  // e.g., TD Bank, Scotia Bank
            "currency": "string"      // e.g., CAD, USD
        },
        "holdings": [
            {
                "holding_name": "string",  // Full name of the investment
                "holding_symbol": "string", // Symbol/ticker of the investment
                "number_of_units": number,  // Number of units/shares held
                "average_cost_per_unit": number, // Cost per unit/share
                "currency": "string"        // Currency of this holding (if different from account)
            }
        ]
    }
    
    For any missing information, use null rather than guessing.
    If currency isn't specified for a holding, use the account currency.
    No extra text - only return valid JSON.
    """
    
    try:
        # Initialize Anthropic client with beta features for PDF support
        anthropic_client = Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            default_headers={"anthropic-beta": "pdfs-2024-09-25"}
        )
        
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
        
        # Get Claude's extraction response
        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            messages=messages
        )
        
        extracted_text = response.content[0].text
        
        # Always process with GPT-4o using structured output
        extracted_data = process_with_structured_output(extracted_text)
        return extracted_data
            
    except Exception as e:
        print(f"Error extracting investment holdings: {str(e)}")
        raise ValueError(f"Failed to extract investment holdings: {str(e)}")

def process_with_structured_output(extracted_text: str) -> Dict[str, Any]:
    """
    Process extracted text using GPT-4o with structured output support.
    
    Args:
        extracted_text: Text extracted by Claude from PDF
        
    Returns:
        Structured dictionary conforming to our schema
    """
    from openai import OpenAI
    import os
    from ...models import ExtractedInvestmentHolding
    from pydantic import BaseModel
    from typing import List, Optional
    
    # Use models that directly match your schema structure
    class AccountInfo(BaseModel):
        institution: Optional[str] = None
        account_type: Optional[str] = None
        currency: str = "CAD"
    
    class InvestmentExtraction(BaseModel):
        account_info: AccountInfo
        holdings: List[ExtractedInvestmentHolding]
    
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    system_prompt = """
    Convert the extracted investment data to a structured format.
    If the input is already valid JSON, format it according to the specified schema.
    If the input is not valid JSON, extract the relevant information and format it appropriately.
    """
    
    try:
        # Using the parse method for structured outputs
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Format this data according to the schema:\n\n{extracted_text}"}
            ],
            response_format=InvestmentExtraction,
        )
        
        result = completion.choices[0].message.parsed
        return result.model_dump()
    
    except Exception as e:
        print(f"Error in structured output processing: {str(e)}")
        # Fallback to basic JSON parsing
        try:
            import json
            parsed_data = json.loads(extracted_text)
            validated_data = InvestmentExtraction.model_validate(parsed_data)
            return validated_data.model_dump()
        except:
            return {
                "account_info": {"institution": None, "account_type": None, "currency": "CAD"},
                "holdings": []
            }

def process_extracted_holdings(extracted_data: Dict[str, Any]) -> List[ExtractedInvestmentHolding]:
    """
    Process the extracted data into validated ExtractedInvestmentHolding objects.
    
    Args:
        extracted_data: Raw extracted data from PDF
        
    Returns:
        List of validated ExtractedInvestmentHolding objects
    """
    processed_holdings = []
    account_info = extracted_data.get("account_info", {})
    default_currency = account_info.get("currency", "CAD")
    default_institution = account_info.get("institution", None)
    default_account_type = account_info.get("account_type", None)
    
    for holding_data in extracted_data.get("holdings", []):
        # Handle missing or non-numeric values
        number_of_units = holding_data.get("number_of_units")
        if number_of_units is not None:
            try:
                number_of_units = float(number_of_units)
            except (TypeError, ValueError):
                number_of_units = None
                
        avg_cost = holding_data.get("average_cost_per_unit")
        if avg_cost is not None:
            try:
                avg_cost = float(avg_cost)
            except (TypeError, ValueError):
                avg_cost = None
        
        # Create holding with defaults from account_info if needed
        holding = ExtractedInvestmentHolding(
            holding_name=holding_data.get("holding_name", "Unknown Investment"),
            holding_symbol=holding_data.get("holding_symbol"),
            number_of_units=number_of_units,
            average_cost_per_unit=avg_cost,
            currency=holding_data.get("currency", default_currency),
            institution=holding_data.get("institution", default_institution),
            account_type=holding_data.get("account_type", default_account_type)
        )
        
        processed_holdings.append(holding)
    
    return processed_holdings

async def save_investment_holdings(profile_id: str, holdings: List[ExtractedInvestmentHolding], save_mode: str = "append") -> Dict[str, Any]:
    """
    Save investment holdings to the database.
    
    Args:
        profile_id: Client profile ID
        holdings: List of investment holdings to save
        save_mode: Either "append" (add to existing) or "overwrite" (replace all existing)
        
    Returns:
        Dict with operation status and details
    """
    try:
        # If overwrite mode, delete existing holdings
        if save_mode == "overwrite":
            supabase_admin.table("user_investment_holdings") \
                .delete() \
                .eq("client_profile_id", profile_id) \
                .execute()
        
        # Prepare holdings for insertion
        holdings_to_insert = []
        for holding in holdings:
            holding_data = {
                "client_profile_id": profile_id,
                "holding_name": holding.holding_name,
                "holding_symbol": holding.holding_symbol,
                "number_of_units": holding.number_of_units,
                "average_cost_per_unit": holding.average_cost_per_unit,
                "currency": holding.currency,
                "institution": holding.institution,
                "account_type": holding.account_type
            }
            holdings_to_insert.append(holding_data)
        
        # Insert holdings
        result = supabase_admin.table("user_investment_holdings") \
            .insert(holdings_to_insert) \
            .execute()
        
        return {
            "success": True,
            "message": f"Successfully saved {len(holdings)} investment holdings with mode: {save_mode}",
            "count": len(holdings),
            "save_mode": save_mode
        }
    
    except Exception as e:
        print(f"Error saving investment holdings: {str(e)}")
        raise ValueError(f"Failed to save investment holdings: {str(e)}")

async def get_investment_holdings(profile_id: str) -> List[InvestmentHolding]:
    """
    Get all investment holdings for a client profile.
    
    Args:
        profile_id: Client profile ID
        
    Returns:
        List of investment holdings
    """
    try:
        result = supabase_admin.table("user_investment_holdings") \
            .select("*") \
            .eq("client_profile_id", profile_id) \
            .execute()
        
        return [InvestmentHolding(**holding) for holding in result.data]
    
    except Exception as e:
        print(f"Error fetching investment holdings: {str(e)}")
        raise ValueError(f"Failed to fetch investment holdings: {str(e)}")

async def analyze_scenario(portfolio_data: dict, scenario_description: str) -> ScenarioAnalysis:
    """
    Analyze a portfolio under a scenario and return structured analysis.
    
    Args:
        portfolio_data: Dictionary containing user's portfolio data.
        scenario_description: Description of the scenario to analyze.
        
    Returns:
        ScenarioAnalysis: Structured analysis of the scenario.
    """
    print("\n======= BEGIN SCENARIO ANALYSIS =======")
    print(f"[DEBUG] Step 1: Initializing scenario analysis for: '{scenario_description}'")
    print(f"[DEBUG] Portfolio value: ${portfolio_data['total_value']:,.2f}")
    print(f"[DEBUG] Risk profile: {portfolio_data['risk_profile']}")
    print(f"[DEBUG] Number of holdings: {len(portfolio_data['holdings'])}")
    
    try:
        print(f"[DEBUG] Step 2: Initializing OpenAI client")
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        print(f"[DEBUG] Step 3: Constructing prompt with portfolio data and scenario")
        prompt = f"""
        I am the user. Here is my profile:
        - Total Value: ${portfolio_data['total_value']:,.2f}
        - Risk Profile: {portfolio_data['risk_profile']}
        
        Holdings:
        {json.dumps(portfolio_data['holdings'], indent=2)}
        
        Scenario:
        {scenario_description}
        
        Please analyze this scenario and provide a structured response in JSON format according to the schema below:
        
        {{
          "impact_analysis": "A detailed analysis of how the scenario impacts the portfolio.",
          "risk_assessment": "An evaluation of the risks in this scenario.",
          "recommended_actions": "Specific recommended actions based on the analysis."
        }}
        """
        
        print("\n[DEBUG] Step 4: Full prompt being sent to model:")
        print("="*80)
        print(prompt)
        print("="*80)
        
        model_name = "o3-mini-2025-01-31"
        print(f"[DEBUG] Step 5: Sending request to model: {model_name}")
        
        print(f"[DEBUG] Step 6: Calling OpenAI API with structured output parsing")
        start_time = time.time()
        completion = client.beta.chat.completions.parse(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            response_format=ScenarioAnalysis
        )
        end_time = time.time()
        
        print(f"[DEBUG] Step 7: Received response in {end_time - start_time:.2f} seconds")
        
        result = completion.choices[0].message.parsed
        print(f"[DEBUG] Step 8: Successfully parsed structured response")
        
        # Print a sample of each part of the response for debugging
        print("\n[DEBUG] Response preview:")
        print(f"Impact Analysis (first 100 chars): {result.impact_analysis[:100]}...")
        print(f"Risk Assessment (first 100 chars): {result.risk_assessment[:100]}...")
        print(f"Recommended Actions (first 100 chars): {result.recommended_actions[:100]}...")
        
        print("\n======= END SCENARIO ANALYSIS =======")
        return result
        
    except Exception as e:
        print(f"[DEBUG] ERROR in analyze_scenario: {str(e)}")
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        print("\n======= END SCENARIO ANALYSIS (WITH ERROR) =======")
        raise ValueError(f"Failed to analyze scenario: {str(e)}")

async def calculate_asset_allocation(client_profile_id: str) -> dict:
    """
    Calculate a user's total asset allocation based on their investment holdings
    and the asset allocation data of the investment products.
    
    Args:
        client_profile_id: The ID of the client's profile.
        
    Returns:
        dict: A dictionary containing the total value and allocations.
    """
    try:
        # Fetch holdings for the client profile
        holdings_response = supabase_admin.table("user_investment_holdings") \
            .select("*") \
            .eq("client_profile_id", client_profile_id) \
            .execute()
        
        if not holdings_response.data:
            return {
                "total_value": 0,
                "allocations": {},
                "mapped_percentage": 0,
                "unmapped_holdings": [],
                "message": "No investment holdings found"
            }
        
        # Calculate total portfolio value
        total_portfolio_value = sum(
            float(holding["number_of_units"] or 0) * float(holding["average_cost_per_unit"] or 0) 
            for holding in holdings_response.data
        )
        
        if total_portfolio_value == 0:
            return {
                "total_value": 0,
                "allocations": {},
                "mapped_percentage": 0,
                "unmapped_holdings": [],
                "message": "No investment value found"
            }
        
        # Get allocations data
        allocations_response = supabase_admin.table("investment_products_asset_allocations") \
            .select("*") \
            .execute()
        
        allocations_data = {item["investment_product_id"]: item for item in allocations_response.data}
        
        # Calculate weighted allocations
        allocation_sums = {
            "equity_us": 0,
            "equity_europe": 0,
            "equity_canada": 0,
            "equity_emerging_markets": 0,
            "commodity_gold": 0,
            "commodity_other": 0,
            "bonds_investmentgrade_us": 0,
            "bonds_investmentgrade_canada": 0,
            "bonds_international_ex_us": 0,
            "bonds_emerging_markets": 0,
            "real_estate": 0,
            "alternatives": 0
        }
        
        mapped_value = 0
        unmapped_holdings = []
        
        for holding in holdings_response.data:
            holding_value = float(holding["number_of_units"] or 0) * float(holding["average_cost_per_unit"] or 0)
            product_id = holding.get("investment_product_id")
            
            if product_id and product_id in allocations_data:
                # This holding has allocation data
                allocation = allocations_data[product_id]
                mapped_value += holding_value
                
                # Add weighted allocations
                for key in allocation_sums:
                    if key in allocation and allocation[key] is not None:
                        allocation_sums[key] += (holding_value * float(allocation[key])) / 100
            else:
                # This is an unmapped holding
                unmapped_holdings.append({
                    "holding_name": holding["holding_name"],
                    "holding_symbol": holding["holding_symbol"],
                    "number_of_units": float(holding["number_of_units"] or 0),
                    "average_cost_per_unit": float(holding["average_cost_per_unit"] or 0),
                    "holding_value": holding_value
                })
        
        # Calculate percentages
        final_allocations = {}
        for key, value in allocation_sums.items():
            if mapped_value > 0:
                final_allocations[key] = round((value / total_portfolio_value) * 100, 2)
            else:
                final_allocations[key] = 0
                
        mapped_percentage = 0
        if total_portfolio_value > 0:
            mapped_percentage = (mapped_value / total_portfolio_value) * 100
            
        return {
            "total_value": total_portfolio_value,
            "allocations": final_allocations,
            "mapped_percentage": round(mapped_percentage, 2),
            "unmapped_holdings": unmapped_holdings,
            "message": "Asset allocation calculated successfully"
        }
        
    except Exception as e:
        print(f"Error calculating asset allocation: {str(e)}")
        raise ValueError(f"Failed to calculate asset allocation: {str(e)}")

async def get_personalized_investment_news(client_profile_id: str) -> Dict[str, Any]:
    """
    Get personalized investment news based on a user's holdings.
    
    Args:
        client_profile_id: Client profile ID
        
    Returns:
        Dict with personalized news status, summary and news items
    """
    try:
        # Get the user's investment holdings
        holdings = await get_investment_holdings(client_profile_id)
        
        if not holdings or len(holdings) == 0:
            print("DEBUG: No holdings found for user")
            return {
                "status": "no_holdings",
                "message": "No investment holdings found to generate news for",
                "summary": None,
                "news_items": []
            }
        
        # Extract tickers from holdings
        tickers = [holding.holding_symbol for holding in holdings if holding.holding_symbol]
        unique_tickers = list(set(tickers))  # Remove duplicates
        
        # If we have no valid tickers, can't fetch news
        if not unique_tickers:
            print("DEBUG: No valid tickers found in holdings")
            return {
                "status": "no_tickers",
                "message": "No valid ticker symbols found in your holdings",
                "summary": None,
                "news_items": []
            }
        
        print(f"DEBUG: Found {len(unique_tickers)} unique tickers: {', '.join(unique_tickers)}")
        
        # Get news for each ticker (limit to top 5 tickers to avoid API limits)
        # Use asyncio.gather to fetch news for all tickers concurrently
        news_tasks = [fetch_stock_news(ticker) for ticker in unique_tickers[:5]]
        news_results = await asyncio.gather(*news_tasks)
        
        # Flatten the list of news results
        all_news = []
        for ticker_news in news_results:
            all_news.extend(ticker_news)
        
        # Import aiohttp at the top of the file
        print(f"DEBUG: Collected a total of {len(all_news)} news items across all tickers")
        
        # If no news found, return early
        if not all_news:
            print("DEBUG: No news found for user's tickers")
            return {
                "status": "no_news",
                "message": "No recent news found for your investments",
                "summary": None,
                "news_items": []
            }
        
        # Sort news by recency (most recent first) and take top items
        sorted_news = sorted(
            all_news, 
            key=lambda x: x.get("time_published", ""), 
            reverse=True
        )
        top_news = sorted_news[:min(5, len(sorted_news))]
        
        # Generate personalized summary with Claude
        if top_news:
            news_summary = await generate_news_summary(top_news, unique_tickers, client_profile_id)
            
            return {
                "status": "success",
                "message": "Successfully retrieved personalized news",
                "summary": news_summary,
                "news_items": top_news
            }
        else:
            return {
                "status": "no_news",
                "message": "No recent news found for your investments",
                "summary": None,
                "news_items": []
            }
        
    except Exception as e:
        print(f"ERROR in get_personalized_investment_news: {str(e)}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Error retrieving personalized news: {str(e)}",
            "summary": None,
            "news_items": []
        }

async def fetch_stock_news(ticker: str) -> List[Dict[str, Any]]:
    """
    Fetch top news items for a given ticker using AlphaVantage API
    
    Args:
        ticker: Stock ticker symbol to fetch news for
        
    Returns:
        List of news items
    """
    print(f"DEBUG: Fetching news for ticker {ticker}")
    
    try:
        # Get API key from environment with no fallback
        api_key = os.getenv("ALPHAVANTAGE_API_KEY")
        
        if not api_key:
            print("ERROR: ALPHAVANTAGE_API_KEY environment variable not set or empty")
            return []
            
        if api_key.lower() == "demo":
            print("ERROR: Using demo API key which has limited functionality. Please use a real API key.")
            
        url = "https://www.alphavantage.co/query"
        
        params = {
            "function": "NEWS_SENTIMENT",
            "tickers": ticker,
            "limit": 2,  # Start with just 2 results
            "apikey": api_key
        }
        
        print(f"DEBUG: Making API request to {url} with params (apikey partially hidden): {params | {'apikey': f'{api_key[:4]}...'}}")
        
        # Make the async API call using aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    print(f"DEBUG: API returned status code {response.status}")
                    return []
                
                data = await response.json()
                print(f"DEBUG: API response keys: {data.keys()}")
                
                # Check for the typical error response
                if "Information" in data and "demo" in data["Information"]:
                    print(f"ERROR: Alpha Vantage is returning demo message. Full response: {data}")
                    return []
                
                # Extract the news feed
                if "feed" in data and isinstance(data["feed"], list):
                    if len(data["feed"]) > 0:
                        print(f"DEBUG: Found {len(data['feed'])} news items for {ticker}")
                        return data["feed"][:2]
                    else:
                        print(f"DEBUG: Feed exists but is empty for {ticker}")
                else:
                    print(f"DEBUG: No 'feed' key in response for {ticker}")
                    print(f"DEBUG: Response data preview: {json.dumps(data, indent=2)[:500]}...")
                
                return []
                
    except Exception as e:
        print(f"ERROR in fetch_stock_news for {ticker}: {str(e)}")
        traceback.print_exc()
        return []

async def generate_news_summary(news_items: List[Dict[str, Any]], tickers: List[str], client_profile_id: str = None) -> str:
    """
    Generate a personalized summary of investment news using Claude API
    
    Args:
        news_items: List of news items to summarize
        tickers: List of tickers the user owns
        client_profile_id: ID of the client profile to personalize the message
        
    Returns:
        Personalized news summary text
    """
    print(f"DEBUG: Generating news summary for {len(news_items)} news items")
    
    try:
        # Format news for Claude
        news_text = ""
        for i, item in enumerate(news_items[:5], start=1):
            # Format the date
            published_time = item.get("time_published", "")
            if len(published_time) >= 8:
                date = f"{published_time[0:4]}-{published_time[4:6]}-{published_time[6:8]}"
            else:
                date = "Unknown date"
                
            news_text += f"Article {i}:\n"
            news_text += f"Title: {item.get('title', 'No title')}\n"
            news_text += f"Date: {date}\n"
            news_text += f"Source: {item.get('source', 'Unknown source')}\n"
            news_text += f"Summary: {item.get('summary', 'No summary available')}\n"
            
            # Add sentiment if available
            sentiment = item.get('overall_sentiment_label', '')
            if sentiment:
                news_text += f"Overall sentiment: {sentiment}\n"
                
            # Add ticker-specific sentiment if available
            ticker_sentiments = []
            for ticker_sentiment in item.get('ticker_sentiment', []):
                if ticker_sentiment.get('ticker') in tickers:
                    ticker_sentiments.append(
                        f"{ticker_sentiment.get('ticker')}: {ticker_sentiment.get('ticker_sentiment_label', 'Neutral')}"
                    )
            
            if ticker_sentiments:
                news_text += f"Ticker sentiments: {', '.join(ticker_sentiments)}\n"
                
            news_text += "\n"
            
        # Get client profile information if available
        user_profile_info = ""
        if client_profile_id:
            try:
                client_profile_response = supabase_admin.table("client_profiles") \
                    .select("name, age, country_of_residence") \
                    .eq("id", client_profile_id) \
                    .limit(1) \
                    .execute()
                
                if client_profile_response.data and len(client_profile_response.data) > 0:
                    profile = client_profile_response.data[0]
                    user_name = profile.get("name", "")
                    user_age = profile.get("age", "")
                    user_country = profile.get("country_of_residence", "")
                    
                    if user_name or user_age or user_country:
                        user_profile_info = "User profile information:\n"
                        if user_name:
                            user_profile_info += f"Name: {user_name}\n"
                        if user_age:
                            user_profile_info += f"Age: {user_age}\n"
                        if user_country:
                            user_profile_info += f"Country: {user_country}\n"
            except Exception as e:
                print(f"Error fetching user profile: {str(e)}")
        
        # Create prompt for Claude
        prompt = f"""
        Summarize the recent news about stocks in a user's portfolio.

        My profile information is:
        {user_profile_info}

        I own the following ticker symbols: {', '.join(tickers)}

        These are recent news articles about these stocks:
        {news_text}

        Please write me a concise, personalized summary of this news. Be conversational and natural in tone. Do not include any disclaimers or introduce yourself.

        The summary should:
        1. Be 3-4 paragraphs maximum
        2. Highlight the most important developments
        3. Use proper sentence case (only first word capitalized in sentences)
        4. Write in first person as if you are directly addressing the user
        5.  Use only the information provided in the news articles above
        """
       
        # Use anthropic_client which should be already defined at the module level
        response = anthropic_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract the text from the response
        if response and hasattr(response, 'content') and len(response.content) > 0:
            summary = response.content[0].text
            return summary
        else:
            print("ERROR: Empty or invalid response from Claude API")
            return ""
            
    except Exception as e:
        print(f"ERROR generating news summary: {str(e)}")
        traceback.print_exc()
        return ""