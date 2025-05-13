"""
#### Implementation of the Microlearning agent.
## This agent allows users to get a quick explanation of financial topics in simple terms.
## It generates questions that are related to context 
"""

import os
import json
from typing import Dict, Any, List, TypedDict, Optional
from dataclasses import dataclass
import logging
import time
from pydantic import BaseModel, Field
from typing import Optional

from pydantic import BaseModel
from agents import Agent, Runner, WebSearchTool, function_tool, RunContextWrapper, RunConfig

async def run_microlearning_agent(query: str, context: str = "", profile_data: dict = None) -> str:
    """
    Run a microlearning agent that explains financial topics in simple terms.
    
    This function creates and executes an OpenAI agent that generates brief,
    personalized financial education content based on the user's query. The
    content is tailored to the user's profile, kept extremely concise (50-75 words),
    and written in a warm, conversational tone.
    
    Args:
        query: The user's question about a financial topic.
        context: Optional context about the user's current situation or the page
                they're viewing.
        profile_data: Optional user profile information for personalization.
    
    Returns:
        str: A brief, personalized explanation of the financial topic.
    """
    print(f"\n=== RUNNING MICROLEARNING AGENT ===")
    print(f"Query: '{query}'")
    print(f"Context: '{context}'")
    print(f"Profile data present: {profile_data is not None}")
    
    # Extract key user information for personalization
    user_info = {
        "name": "there",  # Default greeting
        "age": None,
        "risk_profile": None,
        "has_investments": False,
        "life_stage": "working adult", # default
        "country": "Canada",
        "retirement_info": {}
    }
    
    if profile_data:
        # Extract relevant profile information
        user_info["name"] = profile_data.get("name", "there").split()[0]  # First name only
        user_info["age"] = profile_data.get("age")
        user_info["country"] = profile_data.get("country_of_residence", "Canada")
        
        # Determine risk profile from investment preferences
        if "investment_preferences" in profile_data and profile_data["investment_preferences"]:
            user_info["risk_profile"] = profile_data["investment_preferences"].get("investor_type")
        
        # Check if user has investments
        if "financial_overview" in profile_data and profile_data["financial_overview"]:
            fin = profile_data["financial_overview"]
            investments = fin.get("investment_holdings", 0)
            user_info["has_investments"] = investments > 0
            user_info["has_debt"] = fin.get("current_debt", 0) > 0
            user_info["monthly_income"] = fin.get("monthly_income")
        
        # Get retirement information
        if "retirement_details" in profile_data and profile_data["retirement_details"]:
            user_info["retirement_info"] = profile_data["retirement_details"]
        
        # Determine life stage based on age
        if user_info["age"]:
            if user_info["age"] < 25:
                user_info["life_stage"] = "early career"
            elif user_info["age"] < 40:
                user_info["life_stage"] = "career building"
            elif user_info["age"] < 55:
                user_info["life_stage"] = "peak earning years"
            elif user_info["age"] < 65:
                user_info["life_stage"] = "pre-retirement"
            else:
                user_info["life_stage"] = "retirement"
    
    print(f"User info extracted: {user_info}")
    
    # Create a personalized instruction for the agent
    personalization = ""
    if profile_data:
        personalization = f"""
        Personalize your explanation for {user_info["name"]} who has these characteristics:
        - Age: {user_info["age"] or "Not specified"}
        - Life stage: {user_info["life_stage"]}
        - Country: {user_info["country"]}
        - Investment experience: {"Has some investments" if user_info["has_investments"] else "Beginner investor"}
        - Risk profile: {user_info["risk_profile"] or "Not specified"}
        - Has debt: {"Yes" if user_info.get("has_debt") else "No"}
        
        Be warmly conversational and address {user_info["name"]} directly.
        Begin your response with a brief personalized greeting that acknowledges their life stage or situation.
        Make your explanation relatable to their current life stage and financial situation.
        When giving examples, make them relevant to {user_info["name"]}'s age and circumstances.
        """
    
    instructions = f"""
    You are a friendly, approachable financial education assistant creating personalized,
    bite-sized learning content. Your tone is warm, encouraging, and conversational.
    
    Your audience is regular consumers in Canada who are NOT investment savvy or financial professionals.
    They find finances, investments, and retirement planning somewhat intimidating.
    
    Additional context for this session: {context}
    
    {personalization}
    
    IMPORTANT CONSTRAINTS:
    1. Keep your explanation EXTREMELY brief (50-75 words maximum)
    2. Use only 3-4 short sentences total - be concise and to the point
    3. Avoid all unnecessary background information
    4. Focus only on the direct answer to their question
    
    Your explanation should be:
    1. Conversational and warm - use "you" and "your"
    2. In plain, accessible English without financial jargon
    3. Using everyday analogies where helpful
    4. End with a single, practical next step if appropriate
    
    Remember: Users need quick, simple explanations they can understand at a glance.
    Don't overwhelm them with information - less is more.
    """
    
    print(f"Creating microlearning agent with model: gpt-4o")
    print(f"Instructions summary length: {len(instructions)} characters")
    
    agent = Agent(
        name="MicroLearningAgent",
        model="gpt-4o",
        instructions=instructions,
        tools=[WebSearchTool()]
    )

    print(f"Running agent with query: '{query}'")
    result = await Runner.run(agent, query)
    print(f"Agent response received - length: {len(result.final_output)} characters")
    
    return result.final_output


async def generate_related_questions(query: str, context: str = "", profile_data: dict = None) -> List[str]:
    """
    Generate related follow-up questions based on a user's current query.
    
    This function creates and executes an OpenAI agent that generates exactly
    two related questions that a user might want to ask next, based on their
    current query and contextual information.
    
    Args:
        query: The user's current question.
        context: Optional page-specific context (e.g., "investment recommendations page").
        profile_data: Optional user profile data for personalization.
    
    Returns:
        List[str]: A list containing exactly 2 related follow-up questions.
    """
    user_info = extract_user_info(profile_data)
    
    instructions = f"""
    You are a financial education assistant helping users learn about investments.
    
    Your task is to generate EXACTLY 2 RELATED questions that the user might want to ask next,
    based on their current question. These should be the MOST RELEVANT follow-up questions that
    would naturally complement their current inquiry.
    
    Current user question: "{query}"
    Page context: {context}
    
    Make the questions:
    1. Directly related to the current topic
    2. Address the most likely next concerns
    3. Brief and conversational
    4. Practical and action-oriented
    
    User profile: {json.dumps(user_info, indent=2)}
    
    Return ONLY a JSON array of 2 strings, each containing a question.
    """
    
    agent = Agent(
        name="RelatedQuestionsAgent",
        model="gpt-4o-mini",
        instructions=instructions
    )

    result = await Runner.run(agent, "Generate related questions")
    
    try:
        # Parse the JSON array from the response
        questions = json.loads(result.final_output)
        return questions[:2]  # Limit to 2 questions max
    except:
        # Fallback if JSON parsing fails
        return [
            "How does this relate to my overall financial goals?",
            "What's the next step I should take?"
        ]


def extract_user_info(profile_data: dict = None) -> dict:
    """
    Extract relevant user information for content personalization.
    
    This helper function processes a user profile to extract key information
    that can be used to personalize agent responses, such as name, age,
    life stage, investment status, risk profile, and country.
    
    Args:
        profile_data: Optional user profile data containing demographic and
                     financial information.
    
    Returns:
        dict: A dictionary containing extracted user information with these keys:
            - name: User's first name or default
            - age: User's age or None
            - life_stage: Determined life stage based on age
            - has_investments: Boolean indicating investment status
            - risk_profile: User's risk profile or None
            - country: User's country of residence
    """
    user_info = {
        "name": "there",
        "age": None,
        "life_stage": "working adult",
        "has_investments": False,
        "risk_profile": None,
        "country": "Canada"
    }
    
    if profile_data:
        user_info["name"] = profile_data.get("name", "there").split()[0]
        user_info["age"] = profile_data.get("age")
        user_info["country"] = profile_data.get("country_of_residence", "Canada")
        
        if "investment_preferences" in profile_data and profile_data["investment_preferences"]:
            user_info["risk_profile"] = profile_data["investment_preferences"].get("investor_type")
        
        if "financial_overview" in profile_data and profile_data["financial_overview"]:
            fin = profile_data["financial_overview"]
            investments = fin.get("investment_holdings", 0)
            user_info["has_investments"] = investments > 0
        
        if user_info["age"]:
            if user_info["age"] < 25: user_info["life_stage"] = "early career"
            elif user_info["age"] < 40: user_info["life_stage"] = "career building"
            elif user_info["age"] < 55: user_info["life_stage"] = "peak earning years"
            elif user_info["age"] < 65: user_info["life_stage"] = "pre-retirement"
            else: user_info["life_stage"] = "retirement"
    
    return user_info
