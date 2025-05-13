"""
Admin Functions Module

This module provides utility functions for administrative operations:
- Asset allocation extraction from fund factsheets
- Data processing for investment products

Dependencies:
- Anthropic Claude for PDF extraction
- OpenAI GPT for structured data formatting
- Supabase for database operations
"""

import base64
from typing import Dict, Any, Optional
import json
from fastapi import HTTPException
from anthropic import Anthropic
from openai import OpenAI
from pydantic import BaseModel, Field

from ...db import supabase_admin
from ...models import AssetAllocationExtract

# API clients
anthropic_client = Anthropic()
openai_client = OpenAI()

# Model constants
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
GPT_MODEL = "gpt-4o-mini"

# Simplified model for GPT that doesn't include validation constraints
class SimpleAllocationModel(BaseModel):
    product_symbol: str
    equity_us: float
    equity_europe: float
    equity_canada: float
    equity_emerging_markets: float
    commodity_gold: float
    commodity_other: float
    bonds_investmentgrade_us: float
    bonds_investmentgrade_canada: float
    bonds_international_ex_us: float
    bonds_emerging_markets: float
    real_estate: float
    alternatives: float

async def extract_asset_allocation_from_pdf(pdf_bytes: bytes) -> AssetAllocationExtract:
    """
    Extract asset allocation information from a fund factsheet PDF.
    
    Uses Anthropic Claude for initial extraction and GPT for structured formatting.
    
    Args:
        pdf_bytes: Raw PDF binary data
        
    Returns:
        AssetAllocationExtract: Structured asset allocation data
        
    Raises:
        HTTPException: If extraction fails
    """
    try:
        # Convert PDF to base64 for Anthropic
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        # Anthropic prompt for PDF extraction
        anthropic_prompt = """
        Please extract the asset allocation details from this fund factsheet PDF.
        Focus on finding the following allocation percentages:
        
        1. Equity allocations by region:
        - US equity (%)
        - European equity (%)
        - Canadian equity (%)
        - Emerging markets equity (%)
        
        2. Fixed Income allocations:
        - US investment grade bonds (%)
        - Canadian investment grade bonds (%)
        - International bonds excluding US (%)
        - Emerging markets bonds (%)
        
        3. Other investments:
        - Gold commodity (%)
        - Other commodities (%)
        - Real estate (%)
        - Alternatives (%)
        
        Also extract:
        - Fund symbol/ticker
        
        Output as JSON with the following structure:
        {
            "product_symbol": "string",
            "equity_us": number,
            "equity_europe": number,
            "equity_canada": number,
            "equity_emerging_markets": number,
            "commodity_gold": number,
            "commodity_other": number,
            "bonds_investmentgrade_us": number,
            "bonds_investmentgrade_canada": number,
            "bonds_international_ex_us": number,
            "bonds_emerging_markets": number,
            "real_estate": number,
            "alternatives": number
        }
        
        For any categories not found in the document, use 0.0.
        Ensure all numbers are percentages between 0 and 100.
        """
        
        # Call Anthropic for initial extraction
        print("Calling Anthropic for PDF extraction...")
        anthropic_response = anthropic_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2048,
            messages=[{
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
                        "text": anthropic_prompt
                    }
                ]
            }]
        )
        
        extracted_text = anthropic_response.content[0].text
        print(f"Anthropic extraction result: {extracted_text}")
        
        # Option 1: Use the simplified model for GPT
        print("Calling GPT for structured data formatting...")
        completion = openai_client.beta.chat.completions.parse(
            model=GPT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Format the extracted asset allocation data into a standardized structure. "
                        "Ensure all percentage values are numbers between 0 and 100. "
                        "Missing values should be set to 0. "
                        "Verify all fields match exactly with the expected schema."
                    )
                },
                {
                    "role": "user",
                    "content": extracted_text
                }
            ],
            response_format=SimpleAllocationModel
        )
        
        # Get the parsed structured data from the model
        parsed_data = completion.choices[0].message.parsed
        
        # Convert to our actual model with validation
        allocation_data = AssetAllocationExtract(
            product_symbol=parsed_data.product_symbol,
            equity_us=parsed_data.equity_us,
            equity_europe=parsed_data.equity_europe,
            equity_canada=parsed_data.equity_canada,
            equity_emerging_markets=parsed_data.equity_emerging_markets,
            commodity_gold=parsed_data.commodity_gold,
            commodity_other=parsed_data.commodity_other,
            bonds_investmentgrade_us=parsed_data.bonds_investmentgrade_us,
            bonds_investmentgrade_canada=parsed_data.bonds_investmentgrade_canada,
            bonds_international_ex_us=parsed_data.bonds_international_ex_us,
            bonds_emerging_markets=parsed_data.bonds_emerging_markets,
            real_estate=parsed_data.real_estate,
            alternatives=parsed_data.alternatives
        )
        
        print(f"Structured data: {allocation_data}")
        
        return allocation_data
        
    except Exception as e:
        print(f"Error extracting asset allocations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Asset allocation extraction failed: {str(e)}")

async def find_investment_product_by_symbol(symbol: str) -> Optional[Dict[str, Any]]:
    """
    Find an investment product by its symbol in the database.
    
    Args:
        symbol: Product symbol to search for
        
    Returns:
        Optional[Dict]: Investment product data or None if not found
    """
    try:
        response = supabase_admin.table("investment_products") \
            .select("*") \
            .eq("fund_symbol", symbol) \
            .execute()
            
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
        
    except Exception as e:
        print(f"Error finding investment product: {str(e)}")
        return None

async def save_asset_allocation(product_id: int, allocation_data: AssetAllocationExtract) -> Dict[str, Any]:
    """
    Save asset allocation data to the database.
    
    Args:
        product_id: ID of the investment product
        allocation_data: Asset allocation percentages
        
    Returns:
        Dict: Result of the database operation
        
    Raises:
        HTTPException: If database operation fails
    """
    try:
        # Check if allocation already exists for this product
        existing = supabase_admin.table("investment_products_asset_allocations") \
            .select("id") \
            .eq("investment_product_id", product_id) \
            .execute()
            
        allocation_dict = allocation_data.model_dump()
        # Remove product_symbol as it's not in the DB schema
        if "product_symbol" in allocation_dict:
            del allocation_dict["product_symbol"]
            
        allocation_dict["investment_product_id"] = product_id
        
        # Update or insert based on whether allocation already exists
        if existing.data and len(existing.data) > 0:
            print(f"Updating existing allocation for product ID {product_id}")
            response = supabase_admin.table("investment_products_asset_allocations") \
                .update(allocation_dict) \
                .eq("investment_product_id", product_id) \
                .execute()
        else:
            print(f"Inserting new allocation for product ID {product_id}")
            response = supabase_admin.table("investment_products_asset_allocations") \
                .insert(allocation_dict) \
                .execute()
                
        return response.data[0] if response.data else {}
        
    except Exception as e:
        print(f"Error saving asset allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save asset allocation: {str(e)}") 