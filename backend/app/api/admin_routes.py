"""
Admin Routes Module

This module provides FastAPI endpoints for administrative operations related to
investment product management and user administration.

Endpoints:
- POST /upload-investment-products: Upload and replace investment product data
- GET /check-admin: Verify admin status of authenticated user
- GET /investment-products: Retrieve paginated list of investment products
- POST /extract-asset-allocation: Extract asset allocation data from a fund factsheet PDF
- POST /save-asset-allocation: Save asset allocation data to the database

Authentication:
- All endpoints require Bearer token authentication via Supabase
- Most endpoints require admin role verification
- Admin status checked against users table role field

Data Storage:
- Investment products stored in investment_products table
- User roles stored in users table
- All operations performed via Supabase admin client

Error Handling:
- 401 for authentication failures
- 403 for non-admin access attempts
- 500 for processing errors

Dependencies:
- FastAPI for API routing
- Supabase for authentication and data storage
- Pandas for Excel file processing
"""

# routers/admin_routes.py
from fastapi import APIRouter, HTTPException, Header, Depends, Query, UploadFile, File
from fastapi.responses import JSONResponse
import pandas as pd
from io import BytesIO

from app.db import supabase_admin, supabase_client

from .services.admin_functions import (
    extract_asset_allocation_from_pdf, 
    find_investment_product_by_symbol, 
    save_asset_allocation
)

from ..models import AssetAllocationExtract, AssetAllocationSave

router = APIRouter()

async def verify_admin(authorization: str = Header(None)):
    """
    Verify that the authenticated user has admin privileges.

    Args:
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: User object if admin verification succeeds

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 403: User does not have admin role
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Check if user is admin
        user_data = supabase_client.table("users").select("role").eq("id", user.id).single().execute()
        if user_data.data["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication")

@router.post("/upload-investment-products")
async def upload_investment_products(
    file: UploadFile = File(...),
    admin_user: dict = Depends(verify_admin)
):
    """
    Upload and replace investment products data from an Excel file.

    Processes an Excel file containing investment product information and replaces
    all existing products in the database with the new data.

    Args:
        file (UploadFile): Excel file (.xlsx or .xls) containing product data
        admin_user (dict): Admin user object from verify_admin dependency

    Returns:
        dict: Upload result containing:
            - message (str): Success message
            - details (dict):
                - records_added (int): Number of records added
                - data (list): Inserted record details

    Raises:
        HTTPException:
            - 400: Invalid file format or missing required columns
            - 401: Authentication failure
            - 403: Non-admin access attempt
            - 500: Database or processing errors

    Notes:
        - Required columns: fund_name, fund_company, short_description,
          suitable_for, returns_1_year, returns_3_year
        - Optional columns defaulted if missing
        - Numeric columns converted to float type
    """
    try:
        print(f"Processing file upload...")
        
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files are allowed")
        
        print(f"Reading file: {file.filename}")    
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        required_columns = [
            'fund_name',
            'fund_company',
            'short_description',
            'suitable_for',
            'returns_1_year',
            'returns_3_year'
        ]
        
        optional_columns = {
            'returns_since_inception': 0.0,
            'expense_ratio': 0.0,
            'fund_nav': 0.0,
            'assetclass_primary': 'Not specified',
            'product_type': 'Not specified',
            'assetclass_secondary': 'Not specified',
            'fund_symbol': 'Not specified',
            'fund_type': 'Not specified',
            'assetclass_theme': 'Not specified'
        }
        
        missing_required = [col for col in required_columns if col not in df.columns]
        if missing_required:
            print(f"Missing required columns: {missing_required}")
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_required)}"
            )
            
        for col, default_value in optional_columns.items():
            if col not in df.columns:
                df[col] = default_value
        
        numeric_columns = [
            'returns_1_year',
            'returns_3_year',
            'returns_since_inception',
            'expense_ratio',
            'fund_nav'
        ]
        
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        
        records = df.to_dict('records')
        print(f"Converted {len(records)} records from Excel")
        
        if records:
            print("Sample record:", records[0])
        
        try:
            print("Deleting existing records...")
            delete_response = supabase_admin.table("investment_products").delete().neq("id", 0).execute()
            print(f"Delete response: {delete_response}")
            
            print(f"Inserting {len(records)} new records...")
            insert_response = supabase_admin.table("investment_products").insert(records).execute()
            print(f"Insert response: {insert_response}")
            
            return {
                "message": f"Successfully replaced all investment products with {len(records)} new records",
                "details": {
                    "records_added": len(records),
                    "data": insert_response.data
                }
            }
            
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Database operation failed: {str(db_error)}"
            )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-admin")
async def check_admin(authorization: str = Header(None)):
    """
    Check if the authenticated user has admin privileges.

    Args:
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Response containing:
            - is_admin (bool): Whether user has admin role

    Notes:
        - Returns False for any authentication or processing errors
        - Does not raise exceptions for non-admin users
    """
    if not authorization:
        return JSONResponse(content={"is_admin": False}, status_code=200)

    token = authorization.replace("Bearer ", "")
    
    try:
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            return JSONResponse(content={"is_admin": False}, status_code=200)

        user_data = supabase_admin.table("users")\
            .select("role")\
            .eq("id", str(user.id))\
            .execute()

        is_admin = user_data.data[0].get('role') == 'admin' if user_data.data else False
        return {"is_admin": is_admin}

    except Exception as e:
        print(f"Error checking admin status: {str(e)}")
        return JSONResponse(content={"is_admin": False}, status_code=200)

@router.get("/investment-products")
async def get_investment_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_user: dict = Depends(verify_admin)
):
    """
    Retrieve a paginated list of investment products.

    Args:
        page (int): Page number, starting from 1
        page_size (int): Number of items per page (1-100)
        admin_user (dict): Admin user object from verify_admin dependency

    Returns:
        dict: Paginated product list containing:
            - data (list): List of investment products
            - total (int): Total number of products
            - page (int): Current page number
            - page_size (int): Items per page
            - total_pages (int): Total number of pages

    Raises:
        HTTPException:
            - 401: Authentication failure
            - 403: Non-admin access attempt
            - 500: Database or processing errors
    """
    try:
        offset = (page - 1) * page_size
        count_response = supabase_admin.table("investment_products").select("*", count="exact").execute()
        total_count = count_response.count if count_response.count is not None else 0
        
        response = supabase_admin.table("investment_products")\
            .select("*")\
            .range(offset, offset + page_size - 1)\
            .execute()
            
        return {
            "data": response.data,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": -(-total_count // page_size)
        }
        
    except Exception as e:
        print(f"Error fetching investment products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-asset-allocation")
async def extract_asset_allocation(
    file: UploadFile = File(...),
    admin_user: dict = Depends(verify_admin)
):
    """
    Extract asset allocation data from a fund factsheet PDF.
    
    Processes a PDF fund factsheet to extract asset allocation percentages
    and attempts to match with existing investment products.
    
    Args:
        file (UploadFile): PDF fund factsheet
        admin_user (dict): Admin user object from verify_admin dependency
        
    Returns:
        dict: Extraction result containing:
            - allocation_data: Extracted allocation percentages
            - product_match: Matching investment product if found
            
    Raises:
        HTTPException:
            - 400: Invalid file format
            - 401: Authentication failure
            - 403: Non-admin access attempt
            - 500: Extraction or processing errors
    """
    try:
        print(f"Processing factsheet: {file.filename}")
        
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
            
        # Read file contents
        contents = await file.read()
        
        # Extract allocation data
        allocation_data = await extract_asset_allocation_from_pdf(contents)
        
        # Find matching product if possible
        product_match = None
        if allocation_data.product_symbol:
            product_match = await find_investment_product_by_symbol(allocation_data.product_symbol)
            
        return {
            "allocation_data": allocation_data.model_dump(),
            "product_match": product_match
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-asset-allocation")
async def save_asset_allocation_endpoint(
    data: AssetAllocationSave,
    admin_user: dict = Depends(verify_admin)
):
    """
    Save asset allocation data to the database.
    
    Args:
        data (AssetAllocationSave): Investment product ID and allocation data
        admin_user (dict): Admin user object from verify_admin dependency
        
    Returns:
        dict: Result of save operation
        
    Raises:
        HTTPException:
            - 400: Invalid data
            - 401: Authentication failure
            - 403: Non-admin access attempt
            - 500: Database errors
    """
    try:
        # Verify product ID exists
        product = supabase_admin.table("investment_products") \
            .select("id, fund_name, fund_symbol") \
            .eq("id", data.investment_product_id) \
            .execute()
            
        if not product.data or len(product.data) == 0:
            raise HTTPException(status_code=400, detail=f"Investment product with ID {data.investment_product_id} not found")
            
        # Save allocation data
        result = await save_asset_allocation(data.investment_product_id, data.allocations)
        
        return {
            "message": "Asset allocation saved successfully",
            "product": product.data[0],
            "allocation": result
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Save error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))