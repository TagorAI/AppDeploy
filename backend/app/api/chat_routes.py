"""
Chat Routes Module

This module provides FastAPI endpoints for handling chat interactions with AI assistants.
It processes user queries and returns AI-generated responses for both general advice
and product-specific information.

Functions:
    chat(message: str, authorization: str) -> dict:
        Process general chat queries and return AI responses.
    
    chat_products(query: dict, authorization: str) -> dict:
        Process product-specific queries and return product recommendations.
    
    voice_chat_products_route(file: UploadFile, authorization: str) -> dict:
        Process voice-based product queries from audio files.
    
    voice_chat_route(file: UploadFile, authorization: str) -> dict:
        Process voice-based general chat queries from audio files.

Endpoints:
    POST /chat: Process general chat queries and return AI responses
    POST /chat/products: Process product-specific queries and return recommendations
    POST /voice-chat/products: Process voice-based product queries via audio file
    POST /voice-chat: Process voice-based general chat queries via audio file

Authentication:
    All endpoints require Bearer token authentication via Supabase
    Tokens must be passed in the Authorization header

Data Flow:
    Queries processed through Claude or OpenAI APIs
    User context retrieved from Supabase profile data
    Product information retrieved from product database
    Voice queries transcribed using OpenAI's transcription API

Error Handling:
    401 for authentication failures
    400 for invalid request data
    500 for processing errors or AI service failures

Dependencies:
    FastAPI for API routing
    Supabase for authentication and data storage
    Claude/OpenAI for AI processing and audio transcription
"""

from fastapi import APIRouter, HTTPException, Header, Body, UploadFile, File
from typing import Dict, Any
import os
import traceback
import io
import tempfile

# Import from services instead of functions.py
from .services.adviceassistants_functions import (
    process_chat_query
)
from .services.profile_functions import get_profile

from .services.product_functions import process_product_query, process_voice_product_query

from .services.utils_voice import process_audio_file, transcribe_audio

# Import database client
from ..db import supabase_client

# Import OpenAI client
from openai import OpenAI

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter()

@router.post("/chat")
async def chat(
    message: str = Body(..., embed=True),
    authorization: str = Header(None)
):
    """
    Process general chat queries and return AI-generated responses.

    Takes a user message and generates a contextually relevant response using
    AI processing. Incorporates user profile data for personalized responses.

    Args:
        message (str): User's chat message or query
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Response containing:
            - response (str): AI-generated response to the user's query

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 500: AI processing errors or server failures

    Notes:
        - Responses are generated using Claude or OpenAI
        - User context is incorporated from profile data
        - Response format is natural language text
    """
    try:
        print("\n=== ENTERING /chat endpoint ===")
        if not authorization:
            raise HTTPException(status_code=401, detail="No authorization token provided")

        token = authorization.replace("Bearer ", "")
        
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        print("Getting user profile...")
        profile_data = await get_profile(authorization)
        print(f"Profile data received for user: {user.id}")
        
        print(f"Processing chat query: {message}")
        response = await process_chat_query(message, profile_data)
        print("Chat response generated")
        
        return {"response": response}

    except Exception as e:
        print(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/products")
async def chat_products(
    query: dict = Body(...),
    authorization: str = Header(None)
):
    """
    Process product-specific queries and return relevant product information.

    Analyzes user queries about specific products and returns detailed product
    information, recommendations, and comparisons.

    Args:
        query (dict): Query parameters containing:
            - message (str): User's product-related query
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Product information containing:
            - products (list): Relevant product details and recommendations
            - comparisons (dict, optional): Product comparisons if requested
            - features (list): Key product features
            - recommendations (list): Personalized recommendations

    Raises:
        HTTPException:
            - 401: Missing or invalid authorization token
            - 500: Processing errors or database failures

    Notes:
        - Product data is retrieved from product database
        - Responses include personalized recommendations
        - Comparisons are generated when multiple products are relevant
    """
    try:
        print("\n=== ENTERING /chat/products endpoint ===")
        if not authorization:
            raise HTTPException(status_code=401, detail="No authorization token provided")
            
        token = authorization.replace("Bearer ", "")
        
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"Processing product query: {query.get('message', '')}")
        result = await process_product_query(query.get("message", ""))
        print("Product query response generated")
        
        return result
        
    except Exception as e:
        print(f"Product chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice-chat/products")
async def voice_chat_products_route(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Process voice-based product queries and return product recommendations.

    Accepts an audio file from the client, transcribes it using OpenAI's transcription API,
    and processes the transcribed text to generate product recommendations.

    Args:
        file (UploadFile): Audio file containing the user's voice query
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Contains:
            - transcription (str): Transcribed text from the audio file
            - product information (dict): Relevant product details and recommendations

    Raises:
        HTTPException:
            - 400: Empty or invalid audio file
            - 401: Missing or invalid authorization token
            - 500: Transcription errors or processing failures
    """
    return await process_voice_product_query(file, authorization)

@router.post("/voice-chat")
async def voice_chat_route(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Process voice-based general chat queries and return AI-generated responses.

    Accepts an audio file from the client, transcribes it using OpenAI's transcription API,
    and processes the transcribed text to generate a contextual response.

    Args:
        file (UploadFile): Audio file containing the user's voice query
        authorization (str): Bearer token for authentication (format: "Bearer <token>")

    Returns:
        dict: Contains:
            - transcription (str): Transcribed text from the audio file
            - response (str): AI-generated response to the transcribed query

    Raises:
        HTTPException:
            - 400: Empty or invalid audio file
            - 401: Missing or invalid authorization token
            - 500: Transcription errors or AI processing failures

    Notes:
        - Temporary files are created for audio processing and cleaned up afterward
        - Empty transcriptions return a friendly error message
        - User profile data is incorporated for personalized responses
    """
    try:
        print("\n=== ENTERING /voice-chat endpoint ===")
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
            # Transcribe audio to text using our utility function
            transcription = await transcribe_audio(audio_file)
            
        if not transcription or transcription.strip() == "":
            return {
                "transcription": "",
                "response": "I couldn't understand what you said. Could you please try again?"
            }
            
        print(f"Processing transcribed query: {transcription}")
        profile_data = await get_profile(authorization)
        response = await process_chat_query(transcription, profile_data)
        
        # Clean up temporary audio file
        try:
            os.remove(temp_audio_path)
        except Exception as cleanup_error:
            print(f"Error during cleanup: {cleanup_error}")
            
        return {
            "transcription": transcription,
            "response": response
        }

    except Exception as e:
        print(f"Voice chat error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))