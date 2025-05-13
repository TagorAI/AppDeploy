"""
Retirement Functions Module

This module provides comprehensive retirement planning and analysis functions,
handling calculations for retirement scenarios, health checks, and projections.

Functions:
- analyze_retirement_health(profile_data: dict) -> dict
- future_value(current_amount: Decimal, real_growth_rate: Decimal, years: int) -> Decimal
- calculate_future_savings(current_savings: Decimal, annual_savings: Decimal, 
    real_growth_rate: Decimal, years: int) -> Decimal
- calculate_after_tax_income(monthly_income: float) -> float
- calculate_current_retirement_plan(user_data: Dict) -> RetirementPlanResponse
- calculate_retirement_scenario(profile_data: Dict, financial_data: Dict, 
    scenario_params: RetirementScenarioRequest) -> RetirementScenarioResponse
- calculate_retirement_what_if(scenario: RetirementWhatIfRequest) -> RetirementWhatIfResponse

Financial Calculations:
- Future value projections with compound interest
- After-tax income calculations using Canadian tax brackets
- Retirement savings projections with multiple account types
- What-if scenario analysis with variable parameters

Key Parameters:
- Inflation rate: Annual inflation adjustment
- Investment returns: Expected annual investment growth
- Withdrawal rate: Annual retirement withdrawal percentage
- Life expectancy: Standard life expectancy projection
- CPP/OAS: Government benefit calculations

Data Processing:
- Handles both Decimal and float calculations
- Validates all numerical inputs
- Provides default values for missing data
- Maintains calculation precision

Error Handling:
- Returns structured error responses
- Handles invalid numerical inputs
- Provides meaningful error messages
- Maintains consistent return types

Dependencies:
- FastAPI for response models
- Supabase for data storage
- Custom configuration settings
"""

import math
import logging
import json
import os
from typing import Dict, Any, Optional
from fastapi import HTTPException
from dotenv import load_dotenv
from decimal import Decimal

# If needed, import your config and db here:
from ...config import get_settings
from ...db import supabase_admin, supabase_client
from ...models import (
    RetirementWhatIfRequest, 
    RetirementWhatIfResponse,
    RetirementScenarioRequest,
    RetirementScenarioResponse,
    RetirementPlanResponse
)

load_dotenv()
settings = get_settings()

# Set up a logger
logger = logging.getLogger("retirement_calculator")
logger.setLevel(logging.DEBUG)

def analyze_retirement_health(profile_data: dict) -> dict:
    """
    Analyze user's retirement planning health and generate a checklist.
    (Verbatim from functions.py)
    """
    required_fields = {
        'rrsp_savings': 'RRSP balance',
        'tfsa_savings': 'TFSA balance'
    }
    
    missing_fields = [
        field_name for field_key, field_name in required_fields.items()
        if profile_data.get(field_key) is None
    ]
    
    if missing_fields:
        return {
            "status": "incomplete",
            "missing_fields": missing_fields,
            "message": "Please complete your retirement profile to get a planning analysis",
            "checklist": {},
            "progress": 0
        }
    
    try:
        rrsp_savings = float(profile_data.get('rrsp_savings', 0) or 0)
        tfsa_savings = float(profile_data.get('tfsa_savings', 0) or 0)
        
        checklist = {
            "rrsp_setup": {
                "title": "Have you set up your RRSP?",
                "status": "completed" if rrsp_savings > 0 else "pending",
                "current": f"${rrsp_savings:,.2f}",
                "target": "Started",
                "message": (
                    "Great job starting your RRSP!"
                    if rrsp_savings > 0
                    else "Consider opening an RRSP to save for retirement tax-efficiently"
                )
            },
            "tfsa_setup": {
                "title": "Have you set up your TFSA?",
                "status": "completed" if tfsa_savings > 0 else "pending",
                "current": f"${tfsa_savings:,.2f}",
                "target": "Started",
                "message": (
                    "You're using your TFSA for tax-free growth!"
                    if tfsa_savings > 0
                    else "A TFSA can help your savings grow tax-free"
                )
            }
        }
        
        completed_items = sum(1 for item in checklist.values() if item["status"] == "completed")
        progress = (completed_items / len(checklist)) * 100
        
        return {
            "status": "complete",
            "checklist": checklist,
            "progress": progress,
            "total_retirement_savings": rrsp_savings + tfsa_savings
        }
        
    except Exception as e:
        print(f"Error calculating retirement health: {str(e)}")
        return {
            "status": "error",
            "message": "An error occurred while analyzing your retirement health. Please ensure all values are valid.",
            "checklist": {},
            "progress": 0
        }

def future_value(current_amount: Decimal, real_growth_rate: Decimal, years: int) -> Decimal:
    """
    Calculate future value with consistent Decimal types.
    (Verbatim from functions.py)
    """
    if years <= 0:
        return current_amount
    return current_amount * (Decimal('1') + real_growth_rate) ** years

def calculate_future_savings(
    current_savings: Decimal, 
    annual_savings: Decimal,
    real_growth_rate: Decimal, 
    years: int
) -> Decimal:
    """
    Calculate future savings with consistent Decimal types.
    (Verbatim from functions.py)
    """
    projected = current_savings
    for _ in range(years):
        projected = (projected * (Decimal('1') + real_growth_rate)) + annual_savings
    return projected

def calculate_after_tax_income(monthly_income: float) -> float:
    """
    Calculate after-tax monthly income based on Canadian federal tax brackets.
    (Verbatim from functions.py)
    """
    tax_brackets = [
        (0, 55867, 0.15),
        (55867, 111733, 0.205),
        (111733, 173205, 0.26),
        (173205, 246752, 0.29),
        (246752, float('inf'), 0.33)
    ]
    
    annual_income = monthly_income * 12
    tax_payable = 0.0
    
    for lower, upper, rate in tax_brackets:
        if annual_income > lower:
            taxable_amount = min(annual_income - lower, upper - lower)
            tax_payable += taxable_amount * rate
        else:
            break
    
    after_tax_annual = annual_income - tax_payable
    return after_tax_annual / 12

def calculate_current_retirement_plan(user_data: Dict) -> RetirementPlanResponse:
    """
    Calculate retirement plan with refined investment and savings growth logic.
    """
    print("\n=== STARTING RETIREMENT PLAN CALCULATION ===")
    
    inflation_rate = Decimal(str(settings.ANNUAL_INFLATION_RATE)) / Decimal('100')
    expected_return = Decimal(str(settings.EXPECTED_ANNUAL_INVESTMENT_RETURN)) / Decimal('100')
    withdrawal_rate = Decimal(str(settings.WITHDRAWAL_RATE))
    life_expectancy = settings.LIFE_EXPECTANCY
    default_lifestyle_factor = Decimal(str(settings.RETIREMENT_LIFESTYLE_FACTOR))
    cpp_income = Decimal(str(settings.RETIREMENT_INCOME_CPP))
    oas_income = Decimal(str(settings.RETIREMENT_INCOME_OAS))

    print(f"Input data: {json.dumps(user_data, indent=2)}")

    monthly_income = Decimal(str(user_data["financial"]["monthly_income"]))
    monthly_expenses = Decimal(str(user_data["financial"]["monthly_expenses"]))
    monthly_savings = Decimal(str(user_data["financial"]["monthly_savings"]))
    
    after_tax_monthly_savings = Decimal(str(calculate_after_tax_income(float(monthly_savings))))
    annual_savings = after_tax_monthly_savings * Decimal('12')

    current_cash = Decimal(str(user_data["financial"]["cash_holdings"]))
    current_investments = (
        Decimal(str(user_data["retirement"]["rrsp_savings"])) +
        Decimal(str(user_data["retirement"]["tfsa_savings"])) +
        Decimal(str(user_data["financial"]["investment_holdings"]))
    )

    current_age = int(user_data["profile"]["age"])

    desired_lifestyle = user_data["retirement"].get("desired_retirement_lifestyle", "moderate")
    lifestyle_map = {
        "frugal": Decimal('0.6'),
        "moderate": Decimal('0.7'),
        "comfortable": Decimal('0.8'),
        "lavish": Decimal('0.9'),
    }
    lifestyle_factor = lifestyle_map.get(desired_lifestyle, default_lifestyle_factor)

    retirement_age = current_age
    found_retirement_age = False
    feasible_projected_savings = current_cash + current_investments
    feasible_required_savings = Decimal('0')

    while retirement_age <= 90:
        years_until_retirement = retirement_age - current_age
        if years_until_retirement < 0:
            break

        projected_cash = future_value(
            current_cash,
            inflation_rate,
            years_until_retirement
        )
        projected_investments = calculate_future_savings(
            current_investments,
            annual_savings,
            expected_return,
            years_until_retirement
        )
        total_projected_assets = projected_cash + projected_investments

        future_cpp_income = future_value(cpp_income, inflation_rate, years_until_retirement)
        future_oas_income = future_value(oas_income, inflation_rate, years_until_retirement)
        total_government_benefits = future_cpp_income + future_oas_income

        annual_expenses_future = (monthly_expenses * Decimal('12')) * ((Decimal('1') + inflation_rate) ** years_until_retirement)
        annual_retirement_income_needed = annual_expenses_future * lifestyle_factor
        required_savings = annual_retirement_income_needed / withdrawal_rate

        if total_projected_assets >= required_savings:
            found_retirement_age = True
            feasible_projected_savings = total_projected_assets
            feasible_required_savings = required_savings
            break

        retirement_age += 1

    if not found_retirement_age:
        retirement_age = 90
        years_until_retirement = retirement_age - current_age

    years_in_retirement = max(0, life_expectancy - retirement_age)
    annual_government_income = total_government_benefits
    annual_savings_income = (feasible_projected_savings * withdrawal_rate)
    total_annual_retirement_income = annual_government_income + annual_savings_income
    
    monthly_retirement_income = total_annual_retirement_income / Decimal('12')
    monthly_government_income = annual_government_income / Decimal('12')
    monthly_savings_income = annual_savings_income / Decimal('12')

    return RetirementPlanResponse(
        retirement_age=retirement_age,
        current_age=current_age,
        years_until_retirement=years_until_retirement,
        years_in_retirement=years_in_retirement,
        monthly_income=float(monthly_income),
        monthly_expenses=float(monthly_expenses),
        current_savings=float(current_cash + current_investments),
        monthly_contribution=float(after_tax_monthly_savings),
        projected_savings=float(feasible_projected_savings),
        required_savings=float(feasible_required_savings),
        savings_gap=float(max(Decimal('0'), feasible_required_savings - feasible_projected_savings)),
        retirement_income=float(monthly_retirement_income),
        retirement_expenses=float(monthly_expenses * ((Decimal('1') + inflation_rate) ** years_until_retirement)),
        government_benefits=float(monthly_government_income),
        savings_income=float(monthly_savings_income)
    )

def calculate_retirement_scenario(
    profile_data: Dict[str, Any],
    financial_data: Dict[str, Any],
    scenario_params: RetirementScenarioRequest
) -> RetirementScenarioResponse:
    """
    Calculate retirement scenario based on user inputs.
    (Verbatim from functions.py)
    """
    try:
        current_age = int(profile_data.get('age', 0))
        years_to_retirement = scenario_params.retirement_age - current_age
        
        return_rates = {
            'conservative': 0.05,
            'moderate': 0.07,
            'aggressive': 0.09
        }
        annual_return_rate = return_rates[scenario_params.risk_level]
        
        from ...api.services.profile_functions import get_retirement_details  # if needed
        retirement_data = get_retirement_details(profile_data['id'])  # original code calls this, though it was an async function in practice

        current_savings = Decimal('0')
        if retirement_data:
            current_savings = sum([
                Decimal(str(retirement_data.get('rrsp_savings', 0))),
                Decimal(str(retirement_data.get('tfsa_savings', 0))),
                Decimal(str(retirement_data.get('other_retirement_accounts', 0)))
            ])
        
        monthly_contribution = scenario_params.monthly_contribution
        from .utils_calculation_functions import calculate_projected_savings, calculate_success_probability  # if it existed
        projected_savings = calculate_projected_savings(
            current_savings,
            monthly_contribution,
            Decimal(str(annual_return_rate)),
            years_to_retirement
        )
        
        from ...config import get_settings
        s = get_settings()
        monthly_income = (projected_savings * Decimal(str(s.WITHDRAWAL_RATE)) / Decimal('12')) + \
            (Decimal(str(s.RETIREMENT_INCOME_CPP + s.RETIREMENT_INCOME_OAS)) / Decimal('12'))
        
        success_probability = calculate_success_probability(
            projected_savings,
            monthly_income,
            scenario_params.risk_level,
            years_to_retirement
        )
        
        return RetirementScenarioResponse(
            projected_savings=projected_savings,
            monthly_income=monthly_income,
            annual_return_rate=float(annual_return_rate * 100),
            retirement_duration=s.LIFE_EXPECTANCY - scenario_params.retirement_age,
            success_probability=success_probability
        )
        
    except Exception as e:
        print(f"Error calculating retirement scenario: {str(e)}")
        raise

def calculate_retirement_what_if(scenario: RetirementWhatIfRequest) -> RetirementWhatIfResponse:
    """Calculate retirement what-if scenarios with detailed debug logging."""
    
    # Log input parameters
    logger.debug(f"=== RETIREMENT WHAT-IF CALCULATION STARTED ===")
    logger.debug(f"Input parameters:")
    logger.debug(f"  Current age: {scenario.current_age}")
    logger.debug(f"  Retirement age: {scenario.retirement_age}")
    logger.debug(f"  Life expectancy: {scenario.life_expectancy}")
    logger.debug(f"  Current savings: ${scenario.current_savings}")
    logger.debug(f"  Monthly contribution: ${scenario.monthly_contribution}")
    logger.debug(f"  Expected return rate (raw): {scenario.expected_return_rate}")
    logger.debug(f"  Inflation rate (raw): {scenario.inflation_rate}")
    logger.debug(f"  Desired retirement income: ${scenario.desired_retirement_income}")
    logger.debug(f"  Include CPP/OAS: {scenario.include_cpp_oas}")
    
    try:
        # Convert percentage values - THIS IS CRITICAL
        # If frontend sends 6.0 for 6%, we need to convert to 0.06
        # Check if values look like percentages (>1.0) and adjust accordingly
        expected_return_rate_raw = Decimal(str(scenario.expected_return_rate))
        inflation_rate_raw = Decimal(str(scenario.inflation_rate))
        
        # Auto-detect if we're getting percentages as whole numbers
        expected_return_rate = expected_return_rate_raw / Decimal('100') if expected_return_rate_raw > Decimal('1') else expected_return_rate_raw
        inflation_rate = inflation_rate_raw / Decimal('100') if inflation_rate_raw > Decimal('1') else inflation_rate_raw
        
        logger.debug(f"  Processed expected return rate: {float(expected_return_rate):.4f} ({float(expected_return_rate)*100:.2f}%)")
        logger.debug(f"  Processed inflation rate: {float(inflation_rate):.4f} ({float(inflation_rate)*100:.2f}%)")
        
        # Calculate basic timeline parameters
        years_until_retirement = scenario.retirement_age - scenario.current_age
        retirement_duration = scenario.life_expectancy - scenario.retirement_age
        
        logger.debug(f"Timeline parameters:")
        logger.debug(f"  Years until retirement: {years_until_retirement}")
        logger.debug(f"  Retirement duration: {retirement_duration}")
        
        # Convert values to Decimal for precision
        current_savings = Decimal(str(scenario.current_savings))
        monthly_contribution = Decimal(str(scenario.monthly_contribution))
        annual_contribution = monthly_contribution * Decimal('12')
        
        logger.debug(f"Contribution parameters:")
        logger.debug(f"  Current savings: ${float(current_savings):.2f}")
        logger.debug(f"  Monthly contribution: ${float(monthly_contribution):.2f}")
        logger.debug(f"  Annual contribution: ${float(annual_contribution):.2f}")
        
        # Calculate real return rate (adjusted for inflation)
        real_return_rate = (Decimal('1') + expected_return_rate) / (Decimal('1') + inflation_rate) - Decimal('1')
        logger.debug(f"  Real return rate (inflation-adjusted): {float(real_return_rate):.4f} ({float(real_return_rate)*100:.2f}%)")
        
        # Calculate projected savings at retirement
        projected_savings = current_savings
        savings_by_year = []
        current_year = 2023  # Use actual current year or from request
        
        logger.debug(f"Projecting savings growth year by year:")
        
        for year in range(years_until_retirement):
            # Add this year's savings to the tracking array
            savings_by_year.append({
                "year": current_year + year,
                "amount": float(projected_savings)
            })
            
            # Calculate growth: principal * (1 + r) + annual_contribution
            interest = projected_savings * real_return_rate
            projected_savings = projected_savings + interest + annual_contribution
            
            logger.debug(f"  Year {current_year + year}: ${float(projected_savings):.2f} " 
                         f"(interest: ${float(interest):.2f}, contribution: ${float(annual_contribution):.2f})")
        
        # Add final year (retirement year)
        savings_by_year.append({
            "year": current_year + years_until_retirement,
            "amount": float(projected_savings)
        })
        
        logger.debug(f"Total savings at retirement: ${float(projected_savings):.2f}")
        
        # Calculate monthly retirement income using the 4% rule (or your preferred withdrawal rate)
        # Typically 4% of portfolio per year, divided by 12 for monthly
        withdrawal_rate = Decimal('0.04')  # 4% annual withdrawal
        savings_monthly_income = (projected_savings * withdrawal_rate) / Decimal('12')
        
        logger.debug(f"Monthly income calculation:")
        logger.debug(f"  Using withdrawal rate: {float(withdrawal_rate)*100:.2f}%")
        logger.debug(f"  Monthly income from savings: ${float(savings_monthly_income):.2f}")
        
        # Add government benefits if requested
        govt_monthly_income = Decimal('0')
        if scenario.include_cpp_oas:
            # Simplified estimation - replace with actual CPP/OAS calculation
            cpp_monthly = Decimal('1200')  # Example CPP amount
            oas_monthly = Decimal('615')   # Example OAS amount
            govt_monthly_income = cpp_monthly + oas_monthly
            logger.debug(f"  Monthly income from govt benefits: ${float(govt_monthly_income):.2f} "
                         f"(CPP: ${float(cpp_monthly):.2f}, OAS: ${float(oas_monthly):.2f})")
        
        # Calculate total monthly income
        total_monthly_income = savings_monthly_income + govt_monthly_income
        logger.debug(f"  Total monthly income: ${float(total_monthly_income):.2f}")
        
        # Calculate monthly income needed from desired annual income
        desired_monthly_income = Decimal(str(scenario.desired_retirement_income)) / Decimal('12')
        logger.debug(f"  Desired monthly income: ${float(desired_monthly_income):.2f}")
        
        # Calculate savings gap
        savings_gap = desired_monthly_income - total_monthly_income
        logger.debug(f"  Monthly savings gap: ${float(savings_gap):.2f}")
        
        # Calculate additional monthly contribution needed
        monthly_contribution_needed = Decimal('0')
        if savings_gap > Decimal('0'):
            # This is a simplified calculation - should use time value of money
            # Using FV = PMT * ((1+r)^n - 1) / r, solving for PMT
            if real_return_rate > Decimal('0'):
                factor = (((Decimal('1') + real_return_rate) ** Decimal(str(years_until_retirement))) - Decimal('1')) / real_return_rate
                additional_savings_needed = (savings_gap * Decimal('12') / withdrawal_rate)
                monthly_contribution_needed = additional_savings_needed / (Decimal('12') * factor)
                
                logger.debug(f"Additional contribution calculation:")
                logger.debug(f"  Additional savings needed: ${float(additional_savings_needed):.2f}")
                logger.debug(f"  Growth factor: {float(factor):.4f}")
                logger.debug(f"  Additional monthly contribution needed: ${float(monthly_contribution_needed):.2f}")
            else:
                # Without growth, just divide by months
                additional_savings_needed = (savings_gap * Decimal('12') / withdrawal_rate)
                monthly_contribution_needed = additional_savings_needed / (Decimal('12') * Decimal(str(years_until_retirement)))
                logger.debug(f"  Additional monthly contribution (no growth): ${float(monthly_contribution_needed):.2f}")
                
        # Combine with existing contribution
        total_monthly_needed = monthly_contribution + monthly_contribution_needed
        logger.debug(f"  Total monthly contribution needed: ${float(total_monthly_needed):.2f}")
        
        # Prepare the response
        result = RetirementWhatIfResponse(
            retirement_age=scenario.retirement_age,
            total_savings_at_retirement=float(projected_savings),
            monthly_retirement_income=float(total_monthly_income),
            savings_gap=float(savings_gap),
            monthly_contribution_needed=float(total_monthly_needed),
            years_until_retirement=years_until_retirement,
            retirement_duration=retirement_duration,
            savings_by_year=savings_by_year,
            monthly_income_breakdown={
                "savings_income": float(savings_monthly_income),
                "government_benefits": float(govt_monthly_income)
            }
        )
        
        logger.debug("=== RETIREMENT CALCULATION COMPLETED SUCCESSFULLY ===")
        return result
        
    except Exception as e:
        logger.error(f"Error in retirement calculation: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to calculate retirement scenario: {str(e)}"
        )

# ------------------------------------------------------
# Verbatim code from retirement_calculator.py below:
# ------------------------------------------------------

def future_value(current_amount: float, real_growth_rate: float, years: int) -> float:
    """
    Calculate the future value of an amount after a certain number of years,
    given a real growth rate (e.g., 0.04 for 4%).
    (Verbatim from retirement_calculator.py)
    """
    if years <= 0:
        return current_amount
    return current_amount * ((1 + real_growth_rate) ** years)

def calculate_future_savings(
    current_savings: float,
    annual_savings: float,
    real_growth_rate: float,
    years: int
) -> float:
    """
    Iteratively calculate the future value of current savings, adding
    annual_savings each year and applying growth at real_growth_rate.
    (Verbatim from retirement_calculator.py)
    """
    projected = current_savings
    for _ in range(years):
        projected = (projected * (1 + real_growth_rate)) + annual_savings
    return projected