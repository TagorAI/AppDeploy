import os
import json
import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

# Imports for the agent functions
from pydantic import BaseModel
from agents import Agent, Runner, WebSearchTool, function_tool, RunContextWrapper, RunConfig, trace

from .retirement_functions import (
    calculate_current_retirement_plan
)

# Define Pydantic models for structured output
class RetirementSummary(BaseModel):
    """Summary of the retirement plan analysis"""
    headline: str
    current_age: int
    retirement_age: int
    years_until_retirement: int
    years_in_retirement: int
    key_points: List[str]

class FinancialProjections(BaseModel):
    """Detailed financial projections for retirement"""
    current_savings: float
    projected_savings_at_retirement: float
    required_savings: float
    savings_gap: float
    monthly_contribution_current: float
    monthly_contribution_recommended: float
    retirement_income_monthly: float
    government_benefits: float
    savings_income: float
    
class LifestyleDescription(BaseModel):
    """Description of expected lifestyle in retirement"""
    housing: str
    travel: str
    leisure: str
    healthcare: str
    overall_lifestyle: str

class RetirementImage(BaseModel):
    """Information about the generated retirement visualization image"""
    image_url: str
    description: str
    milestones_represented: List[str]
    
class RetirementPlanOutputs(BaseModel):
    """Complete structured output for retirement planning analysis"""
    query: str
    user_age: int
    user_income: float
    user_country: str
    currency: str  # Usually 'USD' or 'CAD'
    summary: RetirementSummary
    financial_projections: FinancialProjections
    lifestyle_description: LifestyleDescription
    insights: List[str]
    visualization: Optional[RetirementImage] = None

# Add this context class for the retirement advisor
@dataclass
class RetirementProfileContext:
    """Class to hold user profile data for retirement planning"""
    profile_data: Dict[str, Any]
    plan_data: Dict[str, Any] = None
    feedback: str = None
    image_url: str = None
    image_description: str = None

async def run_retirement_advisor_agent(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the Retirement Advisor Agent to analyze user's retirement prospects.
    
    This function creates and executes an OpenAI agent that reviews the user's
    financial situation, calculates a detailed retirement plan, searches for
    relevant retirement planning information, and provides a personalized
    description of the expected retirement lifestyle with recommendations.
    
    Args:
        profile_data: User profile information including demographic details,
                     financial information, and retirement savings data.
        
    Returns:
        Dict containing:
            - status: Success indicator
            - message: Status message
            - analysis: Detailed retirement analysis and recommendations
            - plan_data: Calculated retirement plan data
            - image_url: URL of the generated retirement milestone visualization (if created)
    """
    # Create context object with user data
    context = RetirementProfileContext(
        profile_data=profile_data
    )
    
    # Generate trace IDs for tracking
    thread_id = str(uuid.uuid4())
    trace_id = str(uuid.uuid4())
    
    # Define function tool for calculating retirement plan
    @function_tool
    async def calculate_retirement_plan(ctx: RunContextWrapper[RetirementProfileContext]) -> str:
        """
        Calculate a detailed retirement plan for the user based on their profile data.
        
        Returns:
            Structured analysis of the user's retirement plan including projected retirement age,
            monthly income in retirement, savings gap, and recommended actions.
        """
        user_context = ctx.context
        profile = user_context.profile_data
        
        # Transform profile data into the expected format for the calculation function
        user_data = {
            "profile": {
                "age": profile.get("age", 0),
            },
            "financial": {
                "monthly_income": profile.get("monthly_income", 0),
                "monthly_expenses": profile.get("monthly_expenses", 0),
                "monthly_savings": max(0, profile.get("monthly_income", 0) - profile.get("monthly_expenses", 0)),
                "cash_holdings": profile.get("cash_balance", 0),
                "investment_holdings": profile.get("investments", 0)
            },
            "retirement": {
                "rrsp_savings": profile.get("rrsp_savings", 0),
                "tfsa_savings": profile.get("tfsa_savings", 0),
                "other_retirement_accounts": profile.get("other_retirement_accounts", 0),
                "desired_retirement_lifestyle": profile.get("desired_retirement_lifestyle", "moderate")
            }
        }
        
        # Calculate the retirement plan
        plan = calculate_current_retirement_plan(user_data)
        
        # Store the plan in the context for future reference
        user_context.plan_data = plan.model_dump() if hasattr(plan, 'model_dump') else plan
        
        # Format the result for the agent
        formatted_result = f"""
        ### Retirement Plan Summary
        
        **Current Age:** {plan.current_age}
        **Projected Retirement Age:** {plan.retirement_age}
        **Years Until Retirement:** {plan.years_until_retirement}
        **Years in Retirement:** {plan.years_in_retirement}
        
        **Monthly Income During Retirement:** ${plan.retirement_income:.2f}
        - From Government Benefits: ${plan.government_benefits:.2f}
        - From Savings: ${plan.savings_income:.2f}
        
        **Current Savings:** ${plan.current_savings:.2f}
        **Projected Savings at Retirement:** ${plan.projected_savings:.2f}
        **Required Savings for Desired Lifestyle:** ${plan.required_savings:.2f}
        **Savings Gap:** ${plan.savings_gap:.2f}
        
        **Current Monthly Contribution:** ${plan.monthly_contribution:.2f}
        """
        
        return formatted_result
    
    # Add new function tool for creating retirement milestone visualization
    @function_tool
    async def create_retirement_milestone_image(
        ctx: RunContextWrapper[RetirementProfileContext],
        milestones: List[str],
        style: str
    ) -> str:
        """
        Create an image visualizing the user's retirement milestones and journey.
        
        Args:
            milestones: List of key retirement milestones to visualize
            style: The art style to use (e.g., digital art, watercolor, realistic)
            
        Returns:
            Description of the generated image and its URL
        """
        try:
            user_context = ctx.context
            plan = user_context.plan_data
            profile = user_context.profile_data
            
            current_age = plan.get("current_age", profile.get("age", 30))
            retirement_age = plan.get("retirement_age", 65)
            
            # Craft a detailed prompt for the image generation
            prompt = f"""
            Create a visual timeline showing {profile.get('name', 'a person')}'s retirement journey from age {current_age} to {retirement_age} and beyond.
            Show these milestone events along the journey: {', '.join(milestones)}.
            
            Style: {style}. 
            Make this a positive, aspirational visualization that helps someone see their retirement journey.
            Do not include any text labels in the image itself.
            """
            
            # Make an actual call to the OpenAI API
            from openai import OpenAI
            client = OpenAI()
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="hd",
                n=1,
            )
            image_url = response.data[0].url
            
            # Store the image URL in the context for later reference
            user_context.image_url = image_url
            user_context.image_description = f"Retirement journey visualization from age {current_age} to {retirement_age} and beyond"
            
            result = f"""
            Successfully created a visualization of your retirement milestones.
            
            The image shows your journey from age {current_age} to retirement at {retirement_age} and beyond,
            highlighting key milestones: {', '.join(milestones)}.
            
            Image is available at: {image_url}
            """
            
            return result
            
        except Exception as e:
            return f"Error creating retirement milestone image: {str(e)}"
    
    # Create agent with web search tool, retirement plan tool, and image generation tool
    agent = Agent(
        name="Retirement Advisor",
        model="gpt-4o",
        output_type=RetirementPlanOutputs,  # Use our structured output model
        instructions="""
        You are a Retirement Advisor. 
        Your task:
        1. Read the user's profile information, including their age, income, expenses, and retirement savings.
        2. Use the calculate_retirement_plan tool to generate a detailed retirement plan for the user.
        3. Search the web for current information about retirement planning in Canada, cost of living, and typical expenses for retirees with the user's profile data.
        4. Prepare a personalized description of the likely lifestyle the user can expect in retirement based on their projected retirement income.
        5. Identify 4-5 key retirement milestones for the user based on their current age, retirement age, and financial goals
        --  At what age will the user be able to retire?
        --  At what age will they pass away?
        --  Estimated annual income at retirement
        6. Create a Retirement Infographic using the create_retirement_milestone_image tool
        Be specific, factual, and provide practical recommendations. Use a conversational, helpful tone.
        
        Your lifestyle descriptions should be:
        - Realistic given the projected retirement income
        - Specific about what daily life might look like
        - Including: housing, travel, leisure activities, dining, healthcare considerations
        - Both positives and potential challenges
        
        When creating the Retirement Plan Infographic:
        Create a clean, modern infographic of a personalized retirement plan
        Include the following key sections:
        - Executive Summary: 3-5 bullet points summarizing goals and financial status
        - Savings & Investment Targets: include nest egg milestones and annual savings goals
        - Housing Strategy: rent vs buy comparison using clear layout and housing icons
        - Visual and stylistic instructions:
          - Layout: Vertical (ideal for mobile or print)
          - Design: Minimalist, white or light background, soft accent colors (e.g., blue, green, gray)
          - Typography: Clean sans-serif fonts, good spacing, hierarchy
          - Icons: Use intuitive icons — e.g. 💰 (savings), 🏠 (home), 🎓 (education), 🩺 (healthcare), 📊 (tax)
          - Density: Use ~5–7 distinct, well-spaced sections to avoid visual clutter

            Tone: Modern, positive, informative. This should visually guide someone through their retirement journey with clarity and confidence.
        
        Please write all copy in proper sentence case. Not In Title Case. Not in lower case. For example:
        DO NOT WRITE like this: Legal and Compliance Considerations
        DO NOT WRITE like this: legal and compliance considerations
        Write like this: Legal and compliance considerations
        
        Return your analysis in the required structured format (RetirementPlanOutputs)
        This will be rendered in a user interface that expects this specific structure.
        
        The user's profile information is available in your context.
        """,
        tools=[
            WebSearchTool(),
            calculate_retirement_plan,
            create_retirement_milestone_image
        ]
    )
    
    # Extract profile info for agent's prompt
    profile_info = f"""
    User Profile:
    - Name: {profile_data.get('name')}
    - Age: {profile_data.get('age')}
    - Country: {profile_data.get('country_of_residence')}
    - Retirement Lifestyle Preference: {profile_data.get('desired_retirement_lifestyle', 'Not specified')}
    
    Financial Details:
    - Monthly Income: ${profile_data.get('monthly_income', 0):,.2f}
    - Monthly Expenses: ${profile_data.get('monthly_expenses', 0):,.2f}
    - Current Savings: ${profile_data.get('cash_balance', 0):,.2f} (cash)
    - Current Investments: ${profile_data.get('investments', 0):,.2f}
    
    Retirement Savings:
    - RRSP Balance: ${profile_data.get('rrsp_savings', 0):,.2f}
    - TFSA Balance: ${profile_data.get('tfsa_savings', 0):,.2f}
    - Other Retirement Accounts: ${profile_data.get('other_retirement_accounts', 0):,.2f}
    """
    
    # Set up tracing configuration
    run_config = RunConfig(
        workflow_name="Retirement Planning Analysis",
        trace_id=trace_id,
        group_id=thread_id,
        trace_metadata={
            "user_age": profile_data.get("age", 0),
            "user_country": profile_data.get("country_of_residence", ""),
            "analysis_type": "retirement_planning"
        }
    )
    
    # Run the agent with tracing
    with trace(workflow_name="Retirement Planning", group_id=thread_id):
        result = await Runner.run(
            agent,
            f"""
            My name is {profile_data.get('name')} and I am {profile_data.get('age')} years old.
            My profile information is as follows:
            {profile_info}
            Please help me plan for retirement and understand what kind of lifestyle I might have.
            """,
            context=context,
            run_config=run_config
        )
    
    # Process and return the result, including the image URL if available
    return {
        "status": "success",
        "message": "Retirement advisor completed analysis successfully",
        "analysis": result.final_output.model_dump() if hasattr(result.final_output, 'model_dump') else result.final_output,
        "plan_data": context.plan_data,
        "image_url": context.image_url,
        "image_description": context.image_description
    }


async def update_retirement_advisor_with_feedback(profile_data: Dict[str, Any], feedback: str, plan_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update the retirement advisor analysis based on user feedback.
    
    This function creates and executes an OpenAI agent that reviews the user's
    feedback on an initial retirement plan, considers the existing plan data,
    and provides updated recommendations that address the user's concerns.
    
    Args:
        profile_data: User profile information including demographic details,
                     financial information, and retirement savings data.
        feedback: User's feedback on the initial retirement plan as free-form text.
        plan_data: The previously calculated retirement plan data to iterate upon.
        
    Returns:
        Dict containing:
            - status: Success indicator
            - message: Status message
            - analysis: Updated retirement analysis and recommendations
            - plan_data: The retirement plan data (possibly unchanged)
            - image_url: URL of the generated retirement milestone visualization (if created)
    """
    # Create context object with user data including feedback and previous plan
    context = RetirementProfileContext(
        profile_data=profile_data,
        plan_data=plan_data,
        feedback=feedback
    )
    
    # Generate trace IDs for tracking - use the same format as the original function
    thread_id = str(uuid.uuid4())
    trace_id = str(uuid.uuid4())
    
    # Define the same function tool as before
    @function_tool
    async def calculate_retirement_plan(ctx: RunContextWrapper[RetirementProfileContext]) -> str:
        """
        Calculate a detailed retirement plan for the user based on their profile data.
        
        Returns:
            Structured analysis of the user's retirement plan.
        """
        # Return the previously calculated plan since we're just iterating on the feedback
        user_context = ctx.context
        plan = user_context.plan_data
        
        formatted_result = f"""
        ### Current Retirement Plan Summary
        
        **Current Age:** {plan.get('current_age')}
        **Projected Retirement Age:** {plan.get('retirement_age')}
        **Years Until Retirement:** {plan.get('years_until_retirement')}
        **Years in Retirement:** {plan.get('years_in_retirement')}
        
        **Monthly Income During Retirement:** ${plan.get('retirement_income'):.2f}
        - From Government Benefits: ${plan.get('government_benefits'):.2f}
        - From Savings: ${plan.get('savings_income'):.2f}
        
        **Current Savings:** ${plan.get('current_savings'):.2f}
        **Projected Savings at Retirement:** ${plan.get('projected_savings'):.2f}
        **Required Savings for Desired Lifestyle:** ${plan.get('required_savings'):.2f}
        **Savings Gap:** ${plan.get('savings_gap'):.2f}
        
        **Current Monthly Contribution:** ${plan.get('monthly_contribution'):.2f}
        """
        
        return formatted_result
    
    # Add the image generation tool to the feedback loop as well
    @function_tool
    async def create_retirement_milestone_image(
        ctx: RunContextWrapper[RetirementProfileContext],
        milestones: List[str],
        style: str
    ) -> str:
        """
        Create an image visualizing the user's retirement milestones and journey.
        
        Args:
            milestones: List of key retirement milestones to visualize
            style: The art style to use (e.g., digital art, watercolor, realistic)
            
        Returns:
            Description of the generated image and its URL
        """
        try:
            user_context = ctx.context
            plan = user_context.plan_data
            profile = user_context.profile_data
            
            current_age = plan.get("current_age", profile.get("age", 30))
            retirement_age = plan.get("retirement_age", 65)
            
            # Craft a detailed prompt for the image generation
            prompt = f""" Create a clean, modern infographic of a personalized retirement plan for {profile.get('name', 'a person')}.

            Include the following key sections:
            Executive Summary: 3-5 bullet points summarizing goals and financial status
            Savings & Investment Targets: include nest egg milestones and annual savings goals
            Recommended Retirement Age: highlight timeline from current age {current_age} to retirement age {retirement_age}, with milestone markers
            Housing Strategy: rent vs buy comparison using clear layout and housing icons
            RESP & Education Funding: visual breakdown for two children, including target amount and timeline
            Healthcare Budget: estimate annual healthcare costs now and in retirement
            Tax Strategy: tax-efficient withdrawal and income-splitting summary
            Visual and stylistic instructions:
            Layout: Vertical (ideal for mobile or print)
            Design: Minimalist, white or light background, soft accent colors (e.g., blue, green, gray)
            Typography: Clean sans-serif fonts, good spacing, hierarchy
            Icons: Use intuitive icons — e.g. 💰 (savings), 🏠 (home), 🎓 (education), 🩺 (healthcare), 📊 (tax)
            Density: Use ~5–7 distinct, well-spaced sections to avoid visual clutter

            Tone: Modern, positive, informative. This should visually guide someone through their retirement journey with clarity and confidence.

            Retirement Plan Data: {plan} Preferred Style Keywords: {style} """           
            
            print(prompt)

            # Make an actual call to the OpenAI API
            from openai import OpenAI
            client = OpenAI()
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1792",
                quality="hd",
                n=1,
            )
            image_url = response.data[0].url
            
            # Store the image URL in the context for later reference
            user_context.image_url = image_url
            user_context.image_description = f"Updated retirement plan infographic"
            
            result = f"""
            Successfully created an updated visualization of your retirement plan.
            
            The image shows your journey from age {current_age} to retirement at {retirement_age} and beyond,
            highlighting key milestones: {', '.join(milestones)}.
            
            Image is available at: {image_url}
            """
            
            return result
            
        except Exception as e:
            return f"Error creating retirement milestone image: {str(e)}"
    
    # Create agent with web search tool and retirement plan tool
    agent = Agent(
        name="Retirement Advisor",
        model="gpt-4o",
        output_type=RetirementPlanOutputs,  # Add output_type for structured output
        instructions="""
        You are a knowledgeable retirement advisor assistant responding to user feedback about their retirement plan.
        
        The user has provided feedback on the retirement plan you previously presented. Your task now is to:
        
        1. Review the user's feedback carefully.
        2. Consider the existing retirement plan data.
        3. Use the calculate_retirement_plan tool to reference the current plan.
        4. Search the web for specific information related to the user's feedback if needed.
        5. Provide an updated and refined retirement plan that addresses the user's feedback.
        6. Be specific about any changes or adjustments you recommend based on their feedback.
        7. Explain the implications of these changes on their retirement lifestyle.
        8. If the user's feedback impacts retirement milestones, create a new visualization using 
           the create_retirement_milestone_image tool with updated milestones. Always use "digital art" 
           as the style parameter unless the user specifically requests another style.
        
        You MUST return your analysis in the required structured format (RetirementPlanOutputs) with all fields properly filled out.
        This will be rendered in a user interface that expects this specific structure.
        
        The user's profile, previous retirement plan, and feedback are available in your context.
        """,
        tools=[
            WebSearchTool(),
            calculate_retirement_plan,
            create_retirement_milestone_image
        ]
    )
    
    # Extract profile info as before
    profile_info = f"""
    User Profile:
    - Name: {profile_data.get('name')}
    - Age: {profile_data.get('age')}
    - Country: {profile_data.get('country_of_residence')}
    - Retirement Lifestyle Preference: {profile_data.get('desired_retirement_lifestyle', 'Not specified')}
    
    Financial Details:
    - Monthly Income: ${profile_data.get('monthly_income', 0):,.2f}
    - Monthly Expenses: ${profile_data.get('monthly_expenses', 0):,.2f}
    - Current Savings: ${profile_data.get('cash_balance', 0):,.2f} (cash)
    - Current Investments: ${profile_data.get('investments', 0):,.2f}
    
    Retirement Savings:
    - RRSP Balance: ${profile_data.get('rrsp_savings', 0):,.2f}
    - TFSA Balance: ${profile_data.get('tfsa_savings', 0):,.2f}
    - Other Retirement Accounts: ${profile_data.get('other_retirement_accounts', 0):,.2f}
    """
    
    # Set up tracing configuration - consistent with original function
    run_config = RunConfig(
        workflow_name="Retirement Plan Feedback",
        trace_id=trace_id,
        group_id=thread_id,
        trace_metadata={
            "user_age": profile_data.get("age", 0),
            "user_country": profile_data.get("country_of_residence", ""),
            "analysis_type": "retirement_feedback",
            "feedback_provided": True
        }
    )
    
    try:
        # Run the agent with the feedback and proper tracing
        with trace(workflow_name="Retirement Feedback", group_id=thread_id):
            result = await Runner.run(
                agent,
                f"""
                I've reviewed your retirement plan and here's my feedback:
                
                {feedback}
                
                Please update your analysis and recommendations based on this feedback.
                If needed, provide an updated visualization of my retirement milestones.
                
                {profile_info}
                """,
                context=context,
                run_config=run_config
            )
        
        # Process and return the result
        return {
            "status": "success",
            "message": "Retirement advisor updated analysis successfully",
            "analysis": result.final_output.model_dump() if hasattr(result.final_output, 'model_dump') else result.final_output,
            "plan_data": context.plan_data,
            "image_url": context.image_url,
            "image_description": context.image_description
        }
    except Exception as e:
        # Add error handling for robustness
        return {
            "status": "error",
            "message": f"Failed to update retirement plan: {str(e)}",
            "analysis": None,
            "plan_data": plan_data,  # Return original plan data on error
            "image_url": None,
            "image_description": None
        }