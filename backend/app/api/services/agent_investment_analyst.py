import os
import json
from typing import Dict, Any, List, TypedDict, Optional
from dataclasses import dataclass
import logging
import time
from pydantic import BaseModel, Field
from typing import Optional

from agents import Agent, Runner, WebSearchTool, FileSearchTool, function_tool, RunContextWrapper, RunConfig, ModelSettings
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
from .investments_functions import analyze_scenario

# Configure logging for better visibility
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("investment_agent")

# Define the output type for the agent
class InvestmentAnalysisOutput(BaseModel):
    market_overview: str = Field(description="Overview of current market conditions relevant to user's portfolio")
    portfolio_impact: str = Field(description="Analysis of how market conditions affect user's specific holdings")
    risk_assessment: str = Field(description="Assessment of the overall portfolio risk level in current market")
    recommended_investment_product_symbol: str = Field(description="Ticker symbol of the recommended investment product")
    recommended_investment_product_name: str = Field(description="Full name of the recommended investment product")
    recommended_investment_product_rationale: str = Field(description="Clear explanation of why this product is recommended for the user")

# Context class to hold user profile data for the agent
@dataclass
class UserProfileContext:
    """Class to hold user profile data and investment holdings"""
    profile_data: Dict[str, Any]
    holdings_data: Dict[str, Any]
    
    def get_profile_summary(self) -> str:
        """Returns a summary of the user profile for the agent"""
        logger.info("Generating profile summary")
        profile = self.profile_data
        
        # Basic user info
        summary = f"User Profile:\n"
        summary += f"- Name: {profile.get('name', 'Unknown')}\n"
        summary += f"- Age: {profile.get('age', 'Unknown')}\n"
        summary += f"- Risk Profile: {profile.get('investor_type', 'Unknown')}\n"
        summary += f"- Country: {profile.get('country_of_residence', 'Unknown')}\n"
        
        # Financial overview
        if 'financial_overview' in profile:
            fin = profile['financial_overview']
            summary += f"- Monthly Income: ${fin.get('monthly_income', 'Unknown')}\n"
            summary += f"- Cash Holdings: ${fin.get('cash_holdings', 'Unknown')}\n"
            summary += f"- Investment Holdings: ${fin.get('investment_holdings', 'Unknown')}\n"
            summary += f"- Current Debt: ${fin.get('current_debt', 'Unknown')}\n"
        else:
            summary += f"- Monthly Income: ${profile.get('monthly_income', 'Unknown')}\n"
            summary += f"- Cash Balance: ${profile.get('cash_balance', 'Unknown')}\n"
            summary += f"- Investment Holdings: ${profile.get('investments', 'Unknown')}\n"
            summary += f"- Current Debt: ${profile.get('debt', 'Unknown')}\n"
        
        # Investment preferences
        summary += f"- Investor Type: {profile.get('investor_type', 'Unknown')}\n"
        summary += f"- Investment Interests: {', '.join(profile.get('investing_interests', []))}\n"
        summary += f"- Thematic Interests: {', '.join(profile.get('investing_interests_thematic', []))}\n"
        
        # Holdings summary
        holdings = self.holdings_data.get("holdings", [])
        summary += f"\nCurrent Holdings ({len(holdings)} investments):\n"
        for holding in holdings[:5]:  # Limit to first 5 for brevity
            summary += f"- {holding.get('holding_name', 'Unknown')} ({holding.get('holding_symbol', 'Unknown')}): "
            summary += f"{holding.get('number_of_units', 0)} units at ${holding.get('average_cost_per_unit', 0)}\n"
        
        if len(holdings) > 5:
            summary += f"- And {len(holdings) - 5} more investments...\n"
        
        logger.info(f"Generated profile summary with {len(holdings)} holdings")
        return summary

    def get_ticker_symbols(self) -> List[str]:
        """Returns a list of ticker symbols from the user's holdings"""
        logger.info("Extracting ticker symbols from holdings")
        holdings = self.holdings_data.get("holdings", [])
        tickers = []
        
        for holding in holdings:
            symbol = holding.get('holding_symbol')
            if symbol and symbol not in tickers:
                tickers.append(symbol)
        
        logger.info(f"Extracted {len(tickers)} unique ticker symbols")
        return tickers
    
    @classmethod
    def from_team_context(cls, team_context):
        """Create analyst context from team context during handoffs"""
        logger.info("Creating UserProfileContext from team context")
        return cls(
            profile_data=team_context.profile_data,
            holdings_data={"holdings": team_context.holdings_data}
        )

# Create the all-in-one InvestmentPortfolioAnalyst agent
def create_investment_analyst_agent():
    """Create the investment analysis agent with handoff awareness"""
    logger.info("Creating Investment Portfolio Analyst agent")

    @function_tool
    async def analyze_portfolio_scenario(ctx: RunContextWrapper[UserProfileContext], scenario_description: str) -> str:
        """
        Analyze how a market scenario would impact the user's portfolio.
        
        Args:
            scenario_description: Detailed description of the market scenario to analyze
            
        Returns:
            Structured analysis of the scenario's impact on the portfolio
        """
        logger.info("Analyzing portfolio scenario")
        logger.info(f"Scenario description length: {len(scenario_description)} characters")
        
        user_context = ctx.context
        holdings = user_context.holdings_data.get("holdings", [])
        
        # Calculate total portfolio value
        total_value = sum(
            float(holding.get("number_of_units", 0) or 0) * float(holding.get("average_cost_per_unit", 0) or 0)
            for holding in holdings
        )
        
        logger.info(f"Portfolio total value: ${total_value:,.2f}")
        logger.info(f"User risk profile: {user_context.profile_data.get('investor_type', 'Moderate')}")
        
        portfolio_data = {
            "total_value": total_value,
            "risk_profile": user_context.profile_data.get("investor_type", "Moderate"),
            "holdings": holdings
        }
        
        try:
            analysis_result = await analyze_scenario(portfolio_data, scenario_description)
            logger.info("Received scenario analysis result")
            
            impact_analysis = getattr(analysis_result, 'impact_analysis', "No impact analysis available")
            portfolio_impact = getattr(analysis_result, 'portfolio_impact', impact_analysis)
            risk_assessment = getattr(analysis_result, 'risk_assessment', "Risk assessment not available")
            
            result = f"""
            ## Portfolio Analysis Results
            
            ### Impact Analysis
            {impact_analysis}
            
            ### Portfolio Impact
            {portfolio_impact}
            
            ### Risk Assessment
            {risk_assessment}
            """
            
            logger.info(f"Analysis result length: {len(result)} characters")
            return result
            
        except Exception as e:
            logger.error(f"Error in analyze_scenario: {str(e)}")
            return f"Error analyzing portfolio: {str(e)}"
    
    # Initialize tools
    logger.info("Initializing tools for Investment Analyst agent")
    web_search_tool = WebSearchTool()
    
    file_search_tool = FileSearchTool(
        vector_store_ids=["vs_67d0f48c1898819189c878eb2d6d5ee8"],
        max_num_results=5
    )
    logger.info("Tools initialized successfully")
    
    current_date = time.strftime("%B %d, %Y", time.localtime())
    current_time = time.strftime("%H:%M:%S", time.localtime())
    
    # Create the all-in-one investment analyst agent with all tools
    agent = Agent(
        name="InvestmentPortfolioAnalyst",
        model="gpt-4o",
        output_type=InvestmentAnalysisOutput,
        instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
        Today's date: {current_date}
        Current time: {current_time}

        You are an Investment Portfolio Analyst AI specialized in market analysis, portfolio evaluation, and product recommendations.
        
        Your task is to provide a comprehensive investment analysis and recommendation in a single response:
        
        1. FIRST: Carefully review the user's investment holdings and profile information
        
        2. SECOND: Use the WebSearchTool to search for the LATEST market news specifically related to the user's holdings. 
           - Focus on news from the LAST WEEK ONLY (limit your search to the most recent 7 days)
           - Include search terms like "latest", "recent", "this week", "last 7 days" in your searches
           - Search for current market trends that may affect their specific investment holdings
           - Search for recent performance of sectors relevant to their holdings
           - Search for any major economic or financial news that could impact their portfolio
        ** Do NOT user the websearch tool for the product recommendation, that is the FileSearchTool's job. **

        3. THIRD: Based on the web search results, construct a detailed market conditions description that synthesizes the latest market information.
        
        4. FOURTH: Use the analyze_portfolio_scenario tool to evaluate how these market conditions affect the user's portfolio.
           - Pass in a detailed scenario description based on the market news you found
           - Make sure to capture key trends and developments that might impact the holdings
        
        5. FIFTH: Use the FileSearchTool to search through investment fund factsheets in the vector store.
           - Search for products that align with the user's risk profile (conservative, moderate, aggressive)
           - Include the user's investment interests in your search queries
           - Consider relevant sectors based on the current market conditions from your analysis
           - Search for products that would complement the existing portfolio given market conditions
        ** Again, Do NOT user the websearch tool for the product recommendation, ONLY use FileSearchTool FOR THE RECOMMENDATION. **

        6. FINALLY: Based on all your research and analysis, formulate a complete response with:
           - market_overview: A detailed overview of current market conditions relevant to the user's portfolio
           - portfolio_impact: Analysis of how market conditions affect the user's specific holdings
           - risk_assessment: A clear assessment of the portfolio's risk level in current market conditions
           - recommended_investment_product_symbol: Ticker symbol of ONE recommended investment product
           - recommended_investment_product_name: Full name of the recommended product
           - recommended_investment_product_rationale: A clear explanation of why this product is recommended
        
        Your output must conform to the InvestmentAnalysisOutput structure with all fields completed.
        IMPORTANT: You MUST provide a specific investment recommendation with all the required details.
        
        # HANDOFF BEHAVIOR
        If you were handed off to from the Financial Team Triage agent:
        1. Pay close attention to the user's specific portfolio analysis request
        2. Provide a comprehensive investment analysis as requested, focusing on their current holdings
        3. Make sure to complete all required output fields with detailed, specific information
        4. If the user is asking about a specific stock or sector, prioritize that in your analysis
        """,
        tools=[
            web_search_tool,
            analyze_portfolio_scenario,
            file_search_tool
        ]
    )
    
    logger.info(f"Created Investment Analyst agent with {len(agent.tools)} tools")
    return agent

# Main function to run the investment analyst agent
async def run_investment_analyst_agent(
    profile_data: Dict[str, Any], 
    holdings_data: Dict[str, Any], 
    from_handoff: bool = False,
    handoff_query: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run the Investment Analyst Agent for portfolio analysis.
    
    Args:
        profile_data: User profile information including preferences
        holdings_data: User's investment holdings
        from_handoff: Whether this is being called from a handoff
        handoff_query: Original query from the user if coming from a handoff
        
    Returns:
        Dict containing analysis results and recommendations
    """
    logger.info("Starting Investment Analyst Agent run")
    logger.info(f"From handoff: {from_handoff}")
    if from_handoff:
        logger.info(f"Handoff query: {handoff_query}")
    
    try:
        # Create context object with user data
        logger.info("Creating UserProfileContext")
        context = UserProfileContext(
            profile_data=profile_data,
            holdings_data=holdings_data
        )
        
        # Create the analyst agent
        investment_analyst_agent = create_investment_analyst_agent()
        
        # Extract ticker symbols
        ticker_list = context.get_ticker_symbols()
        tickers_formatted = ", ".join(ticker_list)
        
        # Extract holdings info for the prompt
        holdings = holdings_data.get("holdings", [])
        holdings_info = "\n".join([
            f"- {holding.get('holding_name', 'Unknown')} ({holding.get('holding_symbol', 'Unknown')}): "
            f"{holding.get('number_of_units', 0)} units at ${holding.get('average_cost_per_unit', 0)} per unit"
            for holding in holdings[:10]  # Limit to first 10 holdings for readability
        ])
        
        # If there are more than 10 holdings, add a note
        if len(holdings) > 10:
            holdings_info += f"\n- And {len(holdings) - 10} more investments..."
        
        # Prepare profile information
        profile_info = f"""
        # User Profile Information
        
        ## Basic Details
        - Name: {profile_data.get('name', 'Unknown')}
        - Age: {profile_data.get('age', 'Unknown')}
        - Risk Profile: {profile_data.get('investor_type', 'Not specified')}
        - Country: {profile_data.get('country_of_residence', 'Unknown')}
        
        ## Financial Profile
        - Monthly Income: ${profile_data.get('monthly_income', 'Unknown')}
        - Cash Balance: ${profile_data.get('cash_balance', 'Unknown')}
        - Current Investments Value: ${profile_data.get('investments', 'Unknown')}
        
        ## Investment Holdings
        {holdings_info}
        
        ## Investment Ticker Symbols to Research
        {tickers_formatted}
        """
        
        # Generate a unique trace ID for this analysis
        trace_id = f"trace_investment_{profile_data.get('id', 'unknown')}_{int(time.time())}"
        
        # Configure run with tracing metadata
        run_config = RunConfig(
            trace_id=trace_id,
            workflow_name="Investment Portfolio Analysis",
            group_id=f"user_{profile_data.get('id', 'unknown')}",
            trace_metadata={
                "user_id": profile_data.get("id", "unknown"),
                "holdings_count": str(len(holdings)),
                "risk_profile": profile_data.get("investor_type", "Unknown"),
                "from_handoff": str(from_handoff),
                "timestamp": str(time.time())
            }
        )
        
        # Prepare the user input
        if from_handoff and handoff_query:
            # If this is from a handoff, include the original query and indicate it's a handoff
            user_input = f"""
            [This request was handed off to you by the Financial Team Triage agent]
            
            Original query: {handoff_query}
            
            {profile_info}
            
            Please provide a comprehensive analysis based on this request and my investment portfolio.
            """
        else:
            # Standard input for direct calls
            user_input = f"""
            I need a comprehensive analysis of my investment portfolio based on current market conditions and a specific investment recommendation.
            
            {profile_info}
            
            Please analyze how the latest market conditions affect my portfolio, and provide a specific investment recommendation based on my profile and holdings.
            """
        
        logger.info("Starting agent run with prepared context")
        start_time = time.time()
        
        # Run the agent
        result = await Runner.run(
            investment_analyst_agent,
            user_input,
            context=context,
            max_turns=2,
            run_config=run_config
        )
        
        end_time = time.time()
        logger.info(f"Agent run completed in {end_time - start_time:.2f} seconds")
        
        # Process the result
        # Check if the output is a Pydantic model and convert to dict
        if hasattr(result.final_output, 'dict'):
            analysis_result = result.final_output.dict()
            logger.info("Converted Pydantic model output to dict")
        else:
            analysis_result = result.final_output
            logger.info("Using output as-is (not a Pydantic model)")
        
        # Return the formatted result
        formatted_result = {
            "status": "success",
            "message": "Portfolio analysis completed successfully",
            "analysis": analysis_result,
            "trace_id": trace_id.replace("trace_", "", 1),  # Remove prefix for client-facing IDs
            "from_handoff": from_handoff
        }
        
        logger.info(f"Returning result with status: {formatted_result['status']}")
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error in investment analyst agent: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        return {
            "status": "error",
            "message": f"Error during portfolio analysis: {str(e)}",
            "analysis": None,
            "trace_id": trace_id.replace("trace_", "", 1) if 'trace_id' in locals() else None,
            "from_handoff": from_handoff
        }