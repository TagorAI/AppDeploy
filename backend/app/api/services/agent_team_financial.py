"""
Financial Team Agent that triages user queries and delegates to specialized agents.

This agent serves as the front-line for financial inquiries, determining whether to:
1. Hand off to the Investment Analyst for portfolio analysis
2. Hand off to the Investment Time Machine for decision analysis
3. Inform the user when neither specialized agent can address their query
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass

from agents import Agent, Runner, handoff, RunConfig, function_tool, RunContextWrapper
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX

# Import the specialized agents
from .agent_investment_analyst import (
    create_investment_analyst_agent, 
    run_investment_analyst_agent,
    UserProfileContext
)
from .agent_investment_timemachine import (
    run_investment_timemachine_agent,
    TimeMachineContext
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("financial_team_agent")

@dataclass
class FinancialTeamContext:
    """Context for the financial team agent system, containing all necessary user data."""
    profile_data: Dict[str, Any]
    holdings_data: Dict[str, Any]
    decision_details: Optional[Dict[str, Any]] = None
    
    def get_analyst_context(self) -> UserProfileContext:
        """Create context for the Investment Analyst agent."""
        return UserProfileContext(
            profile_data=self.profile_data,
            holdings_data={"holdings": self.holdings_data}
        )
    
    def get_timemachine_context(self) -> TimeMachineContext:
        """Create context for the Investment Time Machine agent."""
        return TimeMachineContext(
            profile_data=self.profile_data,
            holdings_data=self.holdings_data,
            decision_details=self.decision_details or {}
        )

@function_tool
async def extract_decision_details(
    ctx: RunContextWrapper[FinancialTeamContext], 
    decision_description: str,
    decision_amount: float,
    timeframe_years: int
) -> str:
    """
    Extract and store financial decision details from the user query.
    
    Args:
        decision_description: Description of the financial decision
        decision_amount: Dollar amount of the decision
        timeframe_years: Number of years to analyze
        
    Returns:
        Confirmation of the extracted decision details
    """
    logger.info(f"Extracting decision details: {decision_description}, ${decision_amount}, {timeframe_years} years")
    
    # Store the decision details in the context
    ctx.context.decision_details = {
        "decision_description": decision_description,
        "decision_amount": decision_amount,
        "timeframe_years": timeframe_years
    }
    
    return json.dumps({
        "status": "success",
        "message": "Decision details extracted successfully",
        "details": {
            "decision_description": decision_description,
            "decision_amount": decision_amount,
            "timeframe_years": timeframe_years
        }
    })

def create_financial_team_agent():
    """Create the financial team triage agent with handoffs to specialized agents."""
    logger.info("Creating Financial Team Triage Agent")
    
    # Create the specialized agents
    investment_analyst_agent = create_investment_analyst_agent()
    
    # Create a time machine agent (simpler version for handoff purposes)
    investment_timemachine_agent = Agent(
        name="Investment Time Machine",
        instructions="You analyze financial decisions by comparing what could happen if the money was invested differently.",
        model="o3-mini"
    )
    
    # Define handoff behavior for specialized agents
    analyst_handoff = handoff(
        agent=investment_analyst_agent,
        tool_description_override="Transfer to the Investment Analyst agent for portfolio analysis and investment recommendations.",
        on_handoff=lambda ctx: logger.info(f"Handing off to Investment Analyst agent")
    )
    
    timemachine_handoff = handoff(
        agent=investment_timemachine_agent,
        tool_description_override="Transfer to the Investment Time Machine agent to analyze financial decisions and their alternatives.",
        on_handoff=lambda ctx: logger.info(f"Handing off to Investment Time Machine agent")
    )
    
    # Create the triage agent
    triage_agent = Agent(
        name="Financial Team Triage",
        model="o3-mini",
        instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
        You are the front-line agent for a financial advisory team. Your job is to:
        
        1. Identify the user's financial query and determine which specialized agent can best help them.
        
        2. FOR INVESTMENT PORTFOLIO ANALYSIS:
           - If the user wants analysis of their current investments
           - If they're asking about market conditions affecting their portfolio
           - If they want investment recommendations based on their current holdings
           - If they're asking about specific stocks or funds in their portfolio
           THEN hand off to the Investment Analyst agent.
        
        3. FOR FINANCIAL DECISION ANALYSIS:
           - If the user is asking about a specific financial decision (like buying something expensive)
           - If they want to compare a financial choice with investing the money instead
           - If they want to analyze opportunity costs of past financial decisions
           - If they're asking "what if" scenarios about financial choices
           THEN use the extract_decision_details tool to collect decision information, THEN hand off to the Investment Time Machine agent.
        
        4. If neither agent can help, clearly explain that the request is outside your team's expertise.
        
        5. NEVER try to answer specialized financial questions yourself - always hand off to the appropriate expert agent.
        
        6. Be friendly, professional, and helpful in your interactions.
        """,
        handoffs=[analyst_handoff, timemachine_handoff],
        tools=[extract_decision_details]
    )
    
    logger.info(f"Financial Team Triage agent created with {len(triage_agent.handoffs)} handoffs")
    return triage_agent


async def run_financial_team_agent(
    user_query: str,
    profile_data: Dict[str, Any],
    holdings_data: List[Dict[str, Any]],
    decision_details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Run the financial team agent to triage the user query and delegate to specialized agents.
    
    Args:
        user_query: The user's financial question or request
        profile_data: User profile information
        holdings_data: User's investment holdings
        decision_details: Optional details about a financial decision being considered
        
    Returns:
        Dict containing the response from the appropriate agent or triage agent
    """
    logger.info(f"Running Financial Team Agent with query: {user_query[:50]}...")
    
    try:
        # Create the team context with decision details if provided
        context = FinancialTeamContext(
            profile_data=profile_data,
            holdings_data=holdings_data,
            decision_details=decision_details
        )
        
        # Configure tracing
        run_config = RunConfig(
            workflow_name="Financial Team Workflow",
            trace_metadata={
                "user_id": profile_data.get("id", "unknown"),
                "query_type": "financial_team"
            }
        )
        
        # Create the triage agent
        triage_agent = create_financial_team_agent()
        
        # Start with the triage agent
        result = await Runner.run(
            triage_agent,
            user_query,
            context=context,
            run_config=run_config
        )
        
        # Check if there was a handoff
        if result.last_agent.name == "Investment Analyst":
            logger.info("Query was handled by the Investment Analyst agent")
            # For a real implementation, you might want to call run_investment_analyst_agent directly
            # with the appropriate context for more control
        elif result.last_agent.name == "Investment Time Machine":
            logger.info("Query was handled by the Investment Time Machine agent")
            # Similarly, for a real implementation, you might want to directly call
            # run_investment_timemachine_agent with the full context
        else:
            logger.info("Query was handled by the Triage agent (no handoff)")
        
        # Return the result
        return {
            "status": "success",
            "agent": result.last_agent.name,
            "response": result.final_output,
            "handoff_occurred": result.last_agent.name != "Financial Team Triage"
        }
        
    except Exception as e:
        logger.error(f"Error in financial team agent: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        return {
            "status": "error",
            "message": f"An error occurred: {str(e)}",
            "agent": "Financial Team Triage",
            "handoff_occurred": False
        }