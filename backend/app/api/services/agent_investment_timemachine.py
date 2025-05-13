"""
Implementation of the Financial Decision Time Machine agent.
This agent allows users to visualize alternative financial timelines based on past decisions
and project multiple futures based on current decision points.

The agent is designed to work both independently and as part of a team with handoff support.
"""

from typing import Dict, Any, List, Optional, Union, TypedDict, Literal
from datetime import datetime, timedelta
import math
import json
import logging
import time
import uuid

from dataclasses import dataclass
from pydantic import BaseModel
from openai import OpenAI

from agents import Agent, Runner, WebSearchTool, function_tool, RunContextWrapper, RunConfig
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX

from .agent_investment_analyst import UserProfileContext

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("investment_timemachine")

# Time Machine Analysis Models
class TimelineScenario(BaseModel):
    """
    Represents a single financial timeline scenario with projected values.
    
    This model captures the details of one possible timeline scenario including
    starting amount, returns, and projected yearly values for visualization.
    
    Attributes:
        name: Name of the scenario (e.g., "Invested in S&P 500")
        description: Brief description of the scenario
        starting_amount: Initial amount in the scenario
        current_value: Current/final value after projected growth/decline
        returns_percentage: Overall percentage return over the timeline
        yearly_values: Array of yearly values for graphing
        probability: For future scenarios, probability of this outcome (0-1)
    """
    name: str  # Name of the scenario (e.g., "Invested in S&P 500")
    description: str  # Brief description of the scenario
    starting_amount: float  # Initial amount
    current_value: float  # Current/final value
    returns_percentage: float  # Overall percentage return
    yearly_values: List[Dict[str, Union[str, float]]]  # Array of yearly values for graphing
    probability: Optional[float] = None  # For future scenarios, probability of this outcome

class AlternateTimeline(BaseModel):
    """
    Results of a past decision time machine analysis.
    
    This model represents the complete analysis of a past financial decision,
    comparing the actual outcome with alternative scenarios that could have
    happened if different choices were made.
    
    Attributes:
        original_decision: Details of the original decision made
        alternative_scenarios: List of alternative scenarios that could have happened
        analysis: Text analysis comparing the original decision with alternatives
        regrets_rating: Scale 1-10 of how much the decision should be regretted
        lessons_learned: Key financial lessons derived from this analysis
        opportunity_cost: Total opportunity cost of the original decision
    """
    original_decision: Dict[str, Any]  # Details of original decision
    alternative_scenarios: List[TimelineScenario]  # Alternative scenarios
    analysis: str  # Text analysis of the comparison
    regrets_rating: int  # Scale 1-10 of how much the decision should be regretted
    lessons_learned: List[str]  # Key financial lessons from this analysis
    opportunity_cost: float  # Total opportunity cost of the original decision

class FutureProjection(BaseModel):
    """
    Results of a future decision time machine analysis.
    
    This model represents projections of different potential financial outcomes
    based on decisions that could be made now, including risk assessments and
    confidence ratings.
    
    Attributes:
        decision_options: Details of the decision being considered
        projected_scenarios: List of projected scenarios based on different choices
        analysis: Text analysis comparing the different projected scenarios
        risk_assessment: Assessment of risks associated with each option
        confidence_rating: Scale 1-10 of confidence in the projections
        decision_framework: Framework suggested for making the decision
        time_sensitivity: Assessment of how time-sensitive the decision is
    """
    decision_options: Dict[str, Any]  # Details of the decision being considered
    projected_scenarios: List[TimelineScenario]  # Projected scenarios
    analysis: str  # Text analysis of the comparison
    risk_assessment: str  # Assessment of risks for each option
    confidence_rating: int  # Scale 1-10 of confidence in projections
    decision_framework: str  # Framework for making the decision
    time_sensitivity: str  # How time-sensitive the decision is

class TimeMachineResponse(BaseModel):
    """
    Complete response from the time machine agent.
    
    This model represents the full response from the financial decision time
    machine agent, containing either past analysis or future projections
    along with visualization data and insights.
    
    Attributes:
        analysis_type: Either "past" or "future" timeline analysis
        query: The original query that prompted this analysis
        decision_date: The date associated with the decision
        decision_amount: The financial amount involved in the decision
        decision_description: Description of the decision being analyzed
        currency: The currency used in the analysis
        past_analysis: Analysis of a past decision (if applicable)
        future_analysis: Analysis of potential future decisions (if applicable)
        visualization_data: Data formatted for visualization purposes
        insights: List of key insights derived from the analysis
        next_steps: Recommended next steps based on the analysis
    """
    analysis_type: Literal["past", "future"]
    query: str
    decision_date: str
    decision_amount: float
    decision_description: str
    currency: str
    past_analysis: Optional[AlternateTimeline] = None
    future_analysis: Optional[FutureProjection] = None
    visualization_data: Dict[str, Any]
    insights: List[str]
    next_steps: List[str]

# New Pydantic models that match the frontend's expected structure
class Summary(BaseModel):
    headline: str
    key_points: List[str]
    financial_impact: str
    recommendation: str

class DetailedAnalysis(BaseModel):
    investment_alternative: str
    financial_calculations: str
    opportunity_cost: str
    sensitivity_analysis: str

class ContextFactors(BaseModel):
    quality_of_life: str
    timeline_considerations: str
    personal_values: str
    alternatives: str

class ActionItems(BaseModel):
    immediate_steps: List[str]
    long_term: List[str]
    resources: List[str]

class StructuredOutput(BaseModel):
    """
    Structured output format that matches the frontend expectations.
    
    This model ensures that the agent responses are consistent and 
    can be properly handled by the frontend components.
    """
    query: str
    decision_description: str
    decision_amount: float
    timeframe_years: int
    currency: str  # Removed default value to avoid JSON schema validation error
    summary: Summary
    detailed_analysis: DetailedAnalysis
    context_factors: ContextFactors
    action_items: ActionItems


@dataclass
class TimeMachineContext:
    """
    Context for the Financial Decision Time Machine agent.
    
    This dataclass maintains the necessary context for the time machine agent,
    including user profile, holdings, and decision details to enable accurate
    financial projections.
    
    Attributes:
        profile_data: User profile information including demographics and preferences
        holdings_data: User's current investment holdings
        decision_details: Details about the financial decision being analyzed
    """
    profile_data: Dict[str, Any]
    holdings_data: Dict[str, Any]
    decision_details: Dict[str, Any]
    
    @classmethod
    def from_team_context(cls, team_context):
        """Create time machine context from team context during handoffs"""
        logger.info("Creating TimeMachineContext from team context")
        return cls(
            profile_data=team_context.profile_data,
            holdings_data=team_context.holdings_data,
            decision_details=getattr(team_context, 'decision_details', {})
        )

# ********* Define the Tools
# 

@function_tool(strict_mode=False)
async def fetch_historical_market_data(
    ctx: RunContextWrapper[TimeMachineContext], 
    asset_class: str,
    start_date: str,
    end_date: Optional[str] = None
) -> str:
    """
    Fetch historical performance data for different asset classes.
    
    This function retrieves historical market performance data for a specified
    asset class over a given time period. It calculates yearly returns and
    cumulative performance, returning the data in a structured JSON format.
    
    Args:
        ctx: Context wrapper containing user profile and decision information.
        asset_class: The asset class to fetch data for (e.g., "S&P500", "NASDAQ", 
                    "Real_Estate", "Bonds", "TSX", "Gold")
        start_date: The start date in YYYY-MM-DD format
        end_date: Optional end date in YYYY-MM-DD format (defaults to current date)
        
    Returns:
        str: JSON string containing yearly returns for the specified asset class,
             including individual yearly returns, cumulative return, and annualized return.
    """
    try:
        logger.info(f"Fetching historical market data for {asset_class} from {start_date} to {end_date or 'present'}")
        # This would typically call an API to get real data
        # For now, we'll use simplified historical data
        
        # Convert dates to datetime objects for comparison
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.now()
        
        # Sample historical returns for different asset classes
        # In a production environment, this would be replaced with actual API calls
        annual_returns = {
            "S&P500": {
                "2015": 1.38, "2016": 11.96, "2017": 21.83, "2018": -4.38, 
                "2019": 31.49, "2020": 18.40, "2021": 28.71, "2022": -18.11, 
                "2023": 24.23, "2024": 6.25
            },
            "NASDAQ": {
                "2015": 7.11, "2016": 8.87, "2017": 29.64, "2018": -2.84, 
                "2019": 36.69, "2020": 43.64, "2021": 22.21, "2022": -32.54, 
                "2023": 43.42, "2024": 9.53
            },
            "TSX": {
                "2015": -8.32, "2016": 21.08, "2017": 9.10, "2018": -8.89, 
                "2019": 22.88, "2020": 5.60, "2021": 25.09, "2022": -5.84, 
                "2023": 8.12, "2024": 6.38
            },
            "Real_Estate": {
                "2015": 2.29, "2016": 8.63, "2017": 10.36, "2018": -3.87, 
                "2019": 28.87, "2020": -2.17, "2021": 40.12, "2022": -26.21, 
                "2023": 9.32, "2024": 2.48
            },
            "Bonds": {
                "2015": 0.55, "2016": 2.65, "2017": 3.54, "2018": 0.01, 
                "2019": 8.72, "2020": 7.51, "2021": -1.54, "2022": -13.01, 
                "2023": 5.53, "2024": 2.16
            },
            "Gold": {
                "2015": -10.42, "2016": 8.63, "2017": 13.09, "2018": -1.15, 
                "2019": 18.31, "2020": 24.42, "2021": -3.64, "2022": -0.28, 
                "2023": 13.10, "2024": 15.82
            }
        }
        
        if asset_class not in annual_returns:
            logger.warning(f"Unknown asset class: {asset_class}")
            return json.dumps({
                "error": f"Unknown asset class: {asset_class}",
                "available_classes": list(annual_returns.keys())
            })
        
        # Filter data between start and end years
        start_year = start.year
        end_year = end.year if end.year <= datetime.now().year else datetime.now().year
        
        result_data = {
            "asset_class": asset_class,
            "start_date": start_date,
            "end_date": end_date or datetime.now().strftime("%Y-%m-%d"),
            "yearly_returns": {},
            "cumulative_return": 0.0
        }
        
        # Add yearly returns within the date range
        filtered_returns = {}
        for year in range(start_year, end_year + 1):
            year_str = str(year)
            if year_str in annual_returns[asset_class]:
                filtered_returns[year_str] = annual_returns[asset_class][year_str]
            else:
                # For years not in our data, assume average return
                average = sum(annual_returns[asset_class].values()) / len(annual_returns[asset_class])
                filtered_returns[year_str] = average
        
        result_data["yearly_returns"] = filtered_returns
        
        # Calculate cumulative return
        cumulative = 1.0
        for year, return_pct in filtered_returns.items():
            cumulative *= (1 + return_pct / 100)
        
        result_data["cumulative_return"] = (cumulative - 1) * 100
        result_data["annualized_return"] = ((cumulative ** (1 / len(filtered_returns))) - 1) * 100 if filtered_returns else 0
        
        logger.info(f"Successfully retrieved historical data for {asset_class}, cumulative return: {result_data['cumulative_return']:.2f}%")
        return json.dumps(result_data)
        
    except Exception as e:
        logger.error(f"Failed to fetch historical market data: {str(e)}")
        return json.dumps({
            "error": f"Failed to fetch historical market data: {str(e)}"
        })


@function_tool(strict_mode=False)
async def calculate_investment_growth(
    ctx: RunContextWrapper[TimeMachineContext],
    principal: float,
    yearly_returns: List[float],
    additional_contributions: Optional[Dict[str, float]] = None,
    fees_percentage: Optional[float] = None
) -> str:
    """
    Calculate the growth of an investment over time with varying returns.
    
    This function computes how an investment would grow based on initial principal,
    yearly returns, additional contributions, and management fees. It performs a
    year-by-year calculation to provide detailed growth information.
    
    Args:
        ctx: Context wrapper containing user profile and decision information.
        principal: Initial investment amount
        yearly_returns: List of yearly percentage returns (e.g., [7.2, 8.1, -2.3, 15.7])
        additional_contributions: Optional dictionary mapping years to additional contribution amounts
        fees_percentage: Annual fee percentage
        
    Returns:
        str: JSON string containing year-by-year growth calculations, including:
            - initial_investment: Starting amount
            - contributions_total: Total additional contributions
            - final_value: Final investment value
            - total_return_amount: Total returns in absolute terms
            - total_return_percentage: Total returns as a percentage
            - yearly_values: List of yearly values with growth and fee details
    """
    try:
        logger.info(f"Calculating investment growth for ${principal:,.2f} over {len(yearly_returns)} years")
        
        if not yearly_returns:
            logger.warning("No yearly returns provided")
            return json.dumps({
                "error": "No yearly returns provided"
            })
            
        # Initialize values
        current_value = principal
        yearly_values = []
        contributions_total = 0
        
        # Use 0.0 as default if fees_percentage is None
        fees_percentage = 0.0 if fees_percentage is None else fees_percentage
        
        # Handle additional contributions
        contributions = additional_contributions or {}
        
        # Calculate growth for each year
        for i, annual_return in enumerate(yearly_returns):
            year = datetime.now().year - len(yearly_returns) + i
            
            # Add any contributions for this year
            year_str = str(year)
            if year_str in contributions:
                contribution = float(contributions[year_str])
                current_value += contribution
                contributions_total += contribution
            
            # Calculate annual growth
            growth_amount = current_value * (annual_return / 100)
            
            # Subtract fees
            fee_amount = current_value * (fees_percentage / 100)
            
            # Update current value
            current_value = current_value + growth_amount - fee_amount
            
            # Record this year's value
            yearly_values.append({
                "year": year,
                "value": round(current_value, 2),
                "growth_percentage": annual_return,
                "growth_amount": round(growth_amount, 2),
                "fee_amount": round(fee_amount, 2)
            })
        
        # Calculate overall return statistics
        total_return_amount = current_value - principal - contributions_total
        total_return_percentage = ((current_value / (principal + contributions_total)) - 1) * 100 if (principal + contributions_total) > 0 else 0
        
        result = {
            "initial_investment": principal,
            "contributions_total": contributions_total,
            "final_value": round(current_value, 2),
            "total_return_amount": round(total_return_amount, 2),
            "total_return_percentage": round(total_return_percentage, 2),
            "yearly_values": yearly_values
        }
        
        logger.info(f"Investment calculation complete. Final value: ${result['final_value']:,.2f}, Total return: {result['total_return_percentage']}%")
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Failed to calculate investment growth: {str(e)}")
        return json.dumps({
            "error": f"Failed to calculate investment growth: {str(e)}"
        })


@function_tool(strict_mode=False)
async def generate_alternative_timelines(
    ctx: RunContextWrapper[TimeMachineContext],
    decision_amount: float,
    decision_date: str,
    decision_type: str,
    alternative_assets: List[str]
) -> str:
    """
    Generate alternative timelines based on different investment choices.
    
    This function creates multiple timeline scenarios showing how a past financial
    decision might have turned out if the money had been invested in different
    asset classes instead. It compares the actual outcome with potential alternatives
    to calculate opportunity costs.
    
    Args:
        ctx: Context wrapper containing user profile and decision information.
        decision_amount: The amount of money involved in the decision
        decision_date: Date of the original decision in YYYY-MM-DD format
        decision_type: Type of decision (e.g., "purchase", "investment", "expense")
        alternative_assets: List of asset classes to model as alternatives
        
    Returns:
        str: JSON string containing:
            - Multiple alternative timeline scenarios
            - The original decision outcome
            - Opportunity cost calculations
            - Best alternative identification
    """
    try:
        logger.info(f"Generating alternative timelines for ${decision_amount:,.2f} {decision_type} from {decision_date}")
        logger.info(f"Alternative assets to evaluate: {alternative_assets}")
        
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        # Get historical returns for each alternative asset
        alternative_scenarios = []
        for asset in alternative_assets:
            logger.info(f"Processing alternative scenario for {asset}")
            # Fetch historical data for this asset class
            market_data_json = await fetch_historical_market_data(
                ctx,
                asset_class=asset,
                start_date=decision_date,
                end_date=end_date
            )
            
            market_data = json.loads(market_data_json)
            
            if "error" in market_data:
                logger.warning(f"Error fetching market data for {asset}: {market_data['error']}")
                continue
                
            # Extract yearly returns
            yearly_returns = [float(return_val) for return_val in market_data["yearly_returns"].values()]
            
            # Calculate investment growth
            growth_json = await calculate_investment_growth(
                ctx,
                principal=decision_amount,
                yearly_returns=yearly_returns,
                fees_percentage=0.5  # Assume 0.5% annual fees
            )
            
            growth_data = json.loads(growth_json)
            
            if "error" in growth_data:
                logger.warning(f"Error calculating growth for {asset}: {growth_data['error']}")
                continue
                
            # Create a scenario for this asset class
            scenario = {
                "name": f"{asset} Investment",
                "description": f"If you had invested ${decision_amount:,.2f} in {asset} in {decision_date[:4]}",
                "asset_class": asset,
                "starting_amount": decision_amount,
                "current_value": growth_data["final_value"],
                "returns_percentage": growth_data["total_return_percentage"],
                "annualized_return": market_data["annualized_return"],
                "yearly_values": growth_data["yearly_values"]
            }
            
            alternative_scenarios.append(scenario)
            logger.info(f"Added {asset} scenario with current value: ${growth_data['final_value']:,.2f}")
        
        # Add the original decision scenario (typically flat or depreciated value)
        original_scenario = {
            "name": "Original Decision",
            "description": f"Your actual choice: {decision_type} for ${decision_amount:,.2f}",
            "asset_class": decision_type,
            "starting_amount": decision_amount,
            "current_value": decision_amount * 0.5 if decision_type.lower() in ["purchase", "expense"] else decision_amount * 1.1,
            "returns_percentage": -50 if decision_type.lower() in ["purchase", "expense"] else 10,
            "yearly_values": []
        }
        
        # For original decision, create simplified yearly values
        start_year = int(decision_date[:4])
        end_year = datetime.now().year
        years = end_year - start_year + 1
        
        # Linear depreciation for purchases/expenses, minimal growth for others
        if decision_type.lower() in ["purchase", "expense"]:
            yearly_depreciation = (decision_amount * 0.5) / years
            current = decision_amount
            for i in range(years):
                year = start_year + i
                current -= yearly_depreciation
                original_scenario["yearly_values"].append({
                    "year": year,
                    "value": max(0, round(current, 2)),
                    "growth_percentage": -50 / years,
                    "growth_amount": -round(yearly_depreciation, 2),
                    "fee_amount": 0
                })
        else:
            current = decision_amount
            for i in range(years):
                year = start_year + i
                growth = current * 0.02  # 2% annual growth
                current += growth
                original_scenario["yearly_values"].append({
                    "year": year,
                    "value": round(current, 2),
                    "growth_percentage": 2,
                    "growth_amount": round(growth, 2),
                    "fee_amount": 0
                })
        
        all_scenarios = [original_scenario] + alternative_scenarios
        
        # Calculate opportunity cost
        original_value = original_scenario["current_value"]
        best_alternative = max(alternative_scenarios, key=lambda x: x["current_value"]) if alternative_scenarios else {"current_value": original_value}
        opportunity_cost = best_alternative["current_value"] - original_value
        
        result = {
            "decision_date": decision_date,
            "decision_amount": decision_amount,
            "decision_type": decision_type,
            "scenarios": all_scenarios,
            "best_alternative": best_alternative["name"] if alternative_scenarios else "None",
            "opportunity_cost": round(opportunity_cost, 2),
            "opportunity_cost_percentage": round((opportunity_cost / decision_amount) * 100, 2)
        }
        
        logger.info(f"Generated {len(alternative_scenarios)} alternative scenarios with best alternative: {result['best_alternative']}")
        logger.info(f"Opportunity cost: ${result['opportunity_cost']:,.2f} ({result['opportunity_cost_percentage']}%)")
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Failed to generate alternative timelines: {str(e)}")
        return json.dumps({
            "error": f"Failed to generate alternative timelines: {str(e)}"
        })


@function_tool(strict_mode=False)
async def project_future_scenarios(
    ctx: RunContextWrapper[TimeMachineContext],
    decision_amount: float,
    projection_years: int,
    risk_tolerance: str,
    decision_options: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Project multiple future scenarios for different financial decisions.
    
    This function creates projections for various financial decisions based on
    historical returns, generating optimistic, expected, and pessimistic scenarios
    for each option. It adjusts volatility based on the user's risk tolerance.
    
    Args:
        ctx: Context wrapper containing user profile and decision information.
        decision_amount: The amount of money involved in the decision
        projection_years: Number of years to project into the future
        risk_tolerance: User's risk tolerance level (low, medium, high)
        decision_options: List of potential options, each with a name and asset_class
        
    Returns:
        str: JSON string containing:
            - Multiple projected future scenarios for each decision option
            - Probability estimates for each scenario
            - Year-by-year growth projections
            - Comparative statistics across scenarios
    """
    try:
        logger.info(f"Projecting future scenarios for ${decision_amount:,.2f} over {projection_years} years with {risk_tolerance} risk tolerance")
        
        # Set default decision options if not provided
        if not decision_options:
            decision_options = [
                {
                    "name": "S&P 500 Investment",
                    "asset_class": "S&P500"
                }
            ]
            logger.info("Using default decision option (S&P 500) since none were provided")
        
        # Set up risk-based parameters
        volatility_multipliers = {
            "low": 0.7,
            "medium": 1.0,
            "high": 1.3
        }
        
        risk_multiplier = volatility_multipliers.get(risk_tolerance.lower(), 1.0)
        
        # Set up scenario projections
        future_scenarios = []
        current_year = datetime.now().year
        
        for option in decision_options:
            option_name = option.get("name", "Unknown Option")
            asset_class = option.get("asset_class", "S&P500")
            
            logger.info(f"Analyzing future option: {option_name} ({asset_class})")
            
            # Get historical data to calculate baseline return and volatility
            last_5_years_start = (datetime.now() - timedelta(days=5*365)).strftime("%Y-%m-%d")
            
            market_data_json = await fetch_historical_market_data(
                ctx,
                asset_class=asset_class,
                start_date=last_5_years_start
            )
            
            market_data = json.loads(market_data_json)
            
            if "error" in market_data:
                logger.warning(f"Error fetching market data for {asset_class}: {market_data['error']}")
                continue
                
            # Calculate expected return and volatility based on historical data
            yearly_returns = [float(return_val) for return_val in market_data["yearly_returns"].values()]
            avg_return = sum(yearly_returns) / len(yearly_returns)
            volatility = math.sqrt(sum((r - avg_return)**2 for r in yearly_returns) / len(yearly_returns)) * risk_multiplier
            
            logger.info(f"For {option_name}: avg return = {avg_return:.2f}%, volatility = {volatility:.2f}%")
            
            # Generate three scenarios: pessimistic, expected, optimistic
            scenarios = [
                {
                    "name": f"{option_name} (Pessimistic)",
                    "description": f"Lower-than-expected returns for {option_name}",
                    "projected_returns": [max(avg_return - volatility, -15) for _ in range(projection_years)],
                    "probability": 0.25
                },
                {
                    "name": f"{option_name} (Expected)",
                    "description": f"Expected average returns for {option_name}",
                    "projected_returns": [avg_return for _ in range(projection_years)],
                    "probability": 0.5
                },
                {
                    "name": f"{option_name} (Optimistic)",
                    "description": f"Higher-than-expected returns for {option_name}",
                    "projected_returns": [min(avg_return + volatility, 30) for _ in range(projection_years)],
                    "probability": 0.25
                }
            ]
            
            # Calculate growth for each scenario
            for scenario in scenarios:
                logger.info(f"Calculating growth for scenario: {scenario['name']}")
                growth_json = await calculate_investment_growth(
                    ctx,
                    principal=decision_amount,
                    yearly_returns=scenario["projected_returns"],
                    fees_percentage=0.5
                )
                
                growth_data = json.loads(growth_json)
                
                if "error" in growth_data:
                    logger.warning(f"Error calculating growth for {scenario['name']}: {growth_data['error']}")
                    continue
                    
                # Add growth data to scenario
                scenario["starting_amount"] = decision_amount
                scenario["projected_value"] = growth_data["final_value"]
                scenario["returns_percentage"] = growth_data["total_return_percentage"]
                scenario["yearly_values"] = growth_data["yearly_values"]
                
                future_scenarios.append(scenario)
                logger.info(f"Added scenario {scenario['name']} with projected value: ${growth_data['final_value']:,.2f}")
        
        result = {
            "decision_amount": decision_amount,
            "projection_years": projection_years,
            "risk_tolerance": risk_tolerance,
            "projection_start": current_year,
            "projection_end": current_year + projection_years,
            "scenarios": future_scenarios
        }
        
        logger.info(f"Generated {len(future_scenarios)} future scenarios for {len(decision_options)} options")
        return json.dumps(result)
        
    except Exception as e:
        logger.error(f"Failed to project future scenarios: {str(e)}")
        return json.dumps({
            "error": f"Failed to project future scenarios: {str(e)}"
        })


# Modified image generation function that will work within the agent
@function_tool(strict_mode=False)
async def generate_investment_comparison_image(
    ctx: RunContextWrapper[TimeMachineContext], 
    decision_description: str,
    decision_amount: float,
    timeframe_years: int,
    investment_alternative: str,
    original_future_value: float,
    investment_future_value: float,
    returns_percentage: float,
    currency: str
) -> str:
    """
    Generate a visual comparison between a financial decision and an investment alternative.
    """
    try:
        logger.info("Generating investment comparison image")
        
        # Handle empty currency value inside the function
        if not currency:
            currency = "USD"
            
        # Format monetary values for better readability
        formatted_decision_amount = f"{currency} {decision_amount:,.2f}"
        formatted_original_value = f"{currency} {original_future_value:,.2f}"
        formatted_investment_value = f"{currency} {investment_future_value:,.2f}"
        difference = investment_future_value - original_future_value
        formatted_difference = f"{currency} {abs(difference):,.2f}"
        
        # Calculate opportunity cost percentage
        opportunity_cost_pct = (difference / decision_amount) * 100
        
        # Determine if this is a good or bad financial decision (simplified)
        financial_assessment = "financially advantageous" if original_future_value >= investment_future_value else "represents an opportunity cost"
        
        # Craft a detailed prompt for the image generation
        prompt = f"""
        Create a clean, professional financial comparison visualization showing two paths for {formatted_decision_amount}: 
        
        LEFT SIDE: {decision_description} worth {formatted_original_value} after {timeframe_years} years
        
        RIGHT SIDE: Investing in {investment_alternative} growing to {formatted_investment_value} after {timeframe_years} years (a {returns_percentage:.1f}% total return)
        
        The difference of {formatted_difference} ({abs(opportunity_cost_pct):.1f}% of the original amount) {financial_assessment}.
        
        Use a split-screen design with clear monetary values, growth arrows, and timeline indicators. Include small icons representing the decision (e.g., house, car, education) and investment (charts/graphs). Use a professional color scheme with blue and green tones. Create a visualization that would be helpful in a financial advisor's presentation, with clear labels and a visual indication of which option accumulates more value over time.
        
        Do not include explanatory text beyond basic labels and numbers. Keep it simple, clean, and visually intuitive.
        """
        
        logger.info("Calling image generation API")
        
        # Access OpenAI client
        client = OpenAI()
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="hd",
            n=1,
        )
        
        # Return the URL of the generated image - IMPORTANT: Return only JSON
        image_url = response.data[0].url
        logger.info(f"Generated image URL: {image_url}")
        
        # Return a proper JSON string
        return json.dumps({"status": "success", "image_url": image_url})
        
    except Exception as e:
        logger.error(f"Failed to generate comparison image: {str(e)}")
        return json.dumps({
            "status": "error",
            "message": f"Failed to generate comparison image: {str(e)}"
        })

# Function to create the time machine agent
def create_investment_timemachine_agent():
    """Create the Financial Decision Time Machine agent with handoff capabilities"""
    logger.info("Creating Investment Time Machine agent")
    
    # Create the time machine agent
    agent = Agent(
        name="Investment Time Machine",
        model="o3-mini",
        output_type=StructuredOutput,
        instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
        You are a Financial Decision Time Machine agent that helps users understand the financial 
        impact of their decisions over time.
        
        Your specialties are:
        1. Analyzing financial decisions like major purchases or investments
        2. Comparing decisions to alternative investment strategies (especially investing in the S&P 500)
        3. Calculating opportunity costs and projected returns
        4. Visualizing the difference between financial choices
        5. Providing structured analysis that considers both financial and quality-of-life factors
        
        When analyzing a financial decision, you:
        - Calculate how the money would grow if invested in the S&P 500 over the same time period
        - Consider both financial and non-financial benefits of the decision
        - Provide practical advice on balancing financial optimization with real-world needs
        - Explain financial concepts in simple, clear language
        - Structure your analysis to help the user understand both the numbers and the context
        
        Your output must conform to the StructuredOutput format with all fields completed.
        Always use "USD" for the currency field unless specifically instructed otherwise.
        
        # HANDOFF BEHAVIOR
        If you were handed off from the Financial Team Triage agent:
        1. Pay close attention to the decision details provided in the user's query
        2. If decision_details like the amount, timeframe, or description are missing, ask for clarification
        3. Focus your analysis on comparing the specific decision to investing that same amount
        4. Make sure to complete all required output fields with detailed, specific information
        """,
        tools=[
            fetch_historical_market_data,
            calculate_investment_growth,
            generate_alternative_timelines, 
            project_future_scenarios,
            generate_investment_comparison_image
        ]
    )
    
    logger.info(f"Created Time Machine agent with {len(agent.tools)} tools")
    return agent

# Updated main function with handoff support
async def run_investment_timemachine_agent(
    profile_data: Dict[str, Any], 
    holdings_data: Dict[str, Any], 
    decision_details: Dict[str, Any],
    from_handoff: bool = False,
    handoff_query: Optional[str] = None
) -> Dict[str, Any]:
    """
    Run the Financial Decision Time Machine agent to analyze financial decisions.
    
    Args:
        profile_data: User profile information including preferences and risk tolerance
        holdings_data: User's investment holdings for context
        decision_details: Details about the financial decision to analyze
        from_handoff: Whether this is being called from a handoff
        handoff_query: Original query from the user if coming from a handoff
        
    Returns:
        Dict containing analysis results and visualization
    """
    logger.info("Starting Investment Time Machine Agent run")
    logger.info(f"From handoff: {from_handoff}")
    if from_handoff:
        logger.info(f"Handoff query: {handoff_query}")
    
    try:
        # Extract decision details
        decision_description = decision_details.get("decision_description", "")
        decision_amount = float(decision_details.get("decision_amount", 0))
        timeframe_years = int(decision_details.get("timeframe_years", 10))
        
        logger.info(f"Decision description: {decision_description}")
        logger.info(f"Decision amount: ${decision_amount:,.2f}")
        logger.info(f"Timeframe: {timeframe_years} years")
        
        # Create context with user data
        context = TimeMachineContext(
            profile_data=profile_data,
            holdings_data=holdings_data,
            decision_details=decision_details
        )
        
        # Calculate investment future value for image generation
        annual_return_rate = 0.08  # 8% annual return for S&P 500 (conservative estimate)
        investment_future_value = decision_amount * ((1 + annual_return_rate) ** timeframe_years)
        original_future_value = decision_amount * 0.5  # Default assumption: 50% depreciation
        returns_percentage = ((investment_future_value / decision_amount) - 1) * 100
        
        # Create the time machine agent
        time_machine_agent = create_investment_timemachine_agent()
        
        # Generate a unique trace ID for this analysis
        short_uuid = uuid.uuid4().hex  # This generates a 32-character hex string
        trace_id = f"trace_{short_uuid}"  # Format: trace_<32_alphanumeric>
        
        # Configure run with tracing metadata
        run_config = RunConfig(
            trace_id=trace_id,
            workflow_name="Investment Decision Analysis",
            group_id=f"user_{profile_data.get('id', 'unknown')}",
            trace_metadata={
                "user_id": profile_data.get("id", "unknown"),
                "decision_type": decision_details.get("type", "purchase"),
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
            
            I'm considering {decision_description} which would cost me ${decision_amount:,.2f}.
            
            Please analyze this financial decision over {timeframe_years} years compared to 
            investing in the S&P 500. Help me understand if this is a good financial move.
            """
        else:
            # Standard input for direct calls
            user_input = f"""
            I'm considering {decision_description} which would cost me ${decision_amount:,.2f}.
            
            I'd like to understand if this makes financial sense. How would this compare to 
            simply investing this money in the S&P 500 index fund over the next {timeframe_years} years?
            
            Please explain in simple terms and help me decide if this is a good financial move.
            """
        
        logger.info("Starting agent run with prepared context")
        start_time = time.time()
        
        # Run the main analysis agent
        analysis_result = await Runner.run(
            time_machine_agent,
            user_input,
            context=context,
            run_config=run_config
        )
        
        end_time = time.time()
        logger.info(f"Analysis agent run completed in {end_time - start_time:.2f} seconds")
        
        # Get the structured output
        if analysis_result and analysis_result.final_output:
            structured_output = analysis_result.final_output
            
            # Make sure currency is set to USD if not specified
            if hasattr(structured_output, "currency") and not structured_output.currency:
                structured_output.currency = "USD"
            
            # Extract opportunity cost if available to refine original future value
            try:
                detailed_analysis = structured_output.detailed_analysis
                if hasattr(detailed_analysis, "opportunity_cost") and detailed_analysis.opportunity_cost:
                    # Try to parse a dollar amount from the opportunity cost text
                    import re
                    opportunity_cost_text = detailed_analysis.opportunity_cost
                    match = re.search(r'\$(\d+(?:,\d+)*(?:\.\d+)?)', opportunity_cost_text)
                    if match:
                        opportunity_cost = float(match.group(1).replace(',', ''))
                        # Adjust the original future value based on the opportunity cost
                        original_future_value = investment_future_value - opportunity_cost
                        logger.info(f"Extracted opportunity cost: ${opportunity_cost:,.2f}")
            except Exception as e:
                logger.error(f"Error extracting detailed values from analysis: {str(e)}")
            
            # Create an image generation agent for visualization
            image_agent = Agent(
                name="Investment Visualization Generator",
                model="o3-mini",
                instructions="""
                You are a financial visualization expert. Your task is to create a visual comparison
                of a financial decision versus investing in the stock market.
                """,
                tools=[
                    generate_investment_comparison_image
                ]
            )
            
            # Run the image generation agent
            logger.info("Running image generation agent")
            image_result = await Runner.run(
                image_agent,
                f"""
                Please generate an investment comparison image with these parameters:
                - Decision description: {decision_description}
                - Decision amount: {decision_amount}
                - Timeframe years: {timeframe_years}
                - Investment alternative: S&P 500 Index Fund
                - Original future value: {original_future_value}
                - Investment future value: {investment_future_value}
                - Returns percentage: {returns_percentage}
                - Currency: USD
                """,
                context=context
            )
            
            # Process image generation result
            visualization_url = None
            if image_result and image_result.final_output:
                try:
                    # Get the response as text
                    response_text = image_result.final_output
                    logger.info("Received image generation result")
                    
                    # Try to extract the URL
                    try:
                        visualization_data = json.loads(response_text)
                        visualization_url = visualization_data.get("image_url")
                        logger.info("Successfully extracted image URL from JSON response")
                    except json.JSONDecodeError:
                        # If JSON parsing fails, use regex to extract the URL
                        import re
                        url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
                        matches = re.findall(url_pattern, response_text)
                        if matches:
                            # Get the longest URL (likely the complete one)
                            visualization_url = max(matches, key=len)
                            logger.info(f"Extracted URL using regex")
                except Exception as e:
                    logger.error(f"Error extracting visualization URL: {str(e)}")
            
            # Return the formatted result
            formatted_result = {
                "status": "success",
                "analysis_type": "future",
                "decision_description": decision_description,
                "decision_amount": decision_amount,
                "analysis": "See structured_output for detailed analysis",
                "structured_output": structured_output.dict() if hasattr(structured_output, "dict") else structured_output,
                "visualization": visualization_url,
                "image_url": visualization_url,
                "trace_id": trace_id.replace("trace_", "", 1),
                "from_handoff": from_handoff
            }
            
            logger.info(f"Returning result with status: {formatted_result['status']}")
            return formatted_result

        else:
            logger.error("No output from analysis agent")
            return {
                "status": "error",
                "message": "Failed to analyze financial decision",
                "error": "No output from analysis agent",
                "trace_id": trace_id.replace("trace_", "", 1),
                "from_handoff": from_handoff
            }
    
    except Exception as e:
        logger.error(f"Error in investment time machine agent: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Make sure to include trace_id in the error response if it exists
        trace_id_value = trace_id.replace("trace_", "", 1) if 'trace_id' in locals() else None
        
        return {
            "status": "error",
            "message": "Analysis failed: An error occurred while processing your request",
            "error": str(e),
            "trace_id": trace_id_value,
            "from_handoff": from_handoff
        }