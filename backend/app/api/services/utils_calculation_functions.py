"""
Calculation Helpers Module.

This module provides precise and consistent financial calculations using both Decimal and float types. It includes functions to calculate future values, savings, after-tax income, projected savings, retirement age and income, inflation adjustments, retirement success probability, and comprehensive financial metrics. The module supports both Decimal-based precise computations and float-based approximate calculations, ensuring proper financial analysis and planning.

Functions:
    future_value_dec(current_amount: Decimal, real_growth_rate: Decimal, years: int) -> Decimal
    calculate_future_savings_dec(current_savings: Decimal, annual_savings: Decimal, real_growth_rate: Decimal, years: int) -> Decimal
    calculate_after_tax_income(monthly_income: float) -> float
    calculate_projected_savings(current_savings: Decimal, monthly_contribution: Decimal, annual_return_rate: Decimal, years: int) -> Decimal
    calculate_success_probability(projected_savings: Decimal, monthly_income: Decimal, risk_level: str, years_to_retirement: int) -> float
    calculate_inflation_adjusted_amount(current_amount: Decimal, years: int, inflation_rate: float) -> Decimal
    calculate_retirement_age(current_age: int, current_savings: float, monthly_income: float, monthly_expenses: float, expected_return: float) -> int
    calculate_retirement_income(current_savings: float, monthly_contribution: float, years_until_retirement: int, expected_return: float) -> dict
    calculate_future_savings_float(current_savings: float, annual_savings: float, real_growth_rate: float, years: int) -> float
    calculate_retirement_what_if(scenario: Any) -> Any
    calculate_financial_metrics(profile_data: dict, investment_holdings: list) -> dict
    get_net_worth_benchmark(age)
    get_retirement_benchmark(age)

Dependencies:
    Decimal from the decimal module.
    Type hints from the typing module.
"""

from decimal import Decimal
from typing import Dict, Any

def future_value_dec(current_amount: Decimal, real_growth_rate: Decimal, years: int) -> Decimal:
    """
    Calculate the future value of a current amount using a compound growth model with Decimal precision.

    Args:
        current_amount (Decimal): The initial monetary amount.
        real_growth_rate (Decimal): The annual growth rate as a decimal (e.g. Decimal('0.05') for 5%).
        years (int): The number of years over which the amount grows.

    Returns:
        Decimal: The future value after applying compound growth. If years is less than or equal to 0, returns current_amount.

    Notes:
        The calculation is based on the compound interest formula: FV = current_amount * (1 + real_growth_rate) ** years.
    """
    if years <= 0:
        return current_amount
    return current_amount * (Decimal('1') + real_growth_rate) ** years

def calculate_future_savings_dec(
    current_savings: Decimal,
    annual_savings: Decimal,
    real_growth_rate: Decimal,
    years: int
) -> Decimal:
    """
    Calculate the future savings by compounding the current savings and adding annual contributions with Decimal precision.

    Args:
        current_savings (Decimal): The current amount of savings.
        annual_savings (Decimal): The annual contribution added to the savings.
        real_growth_rate (Decimal): The annual growth rate as a decimal (e.g. Decimal('0.05') for 5%).
        years (int): The number of years over which the savings grow.

    Returns:
        Decimal: The projected future savings after the specified number of years.

    Notes:
        The function iteratively applies compound growth and adds the annual savings for each year.
    """
    projected = current_savings
    for _ in range(years):
        projected = (projected * (Decimal('1') + real_growth_rate)) + annual_savings
    return projected

def calculate_after_tax_income(monthly_income: float) -> float:
    """
    Calculate the after-tax monthly income based on Canadian federal tax brackets.

    Args:
        monthly_income (float): The gross monthly income.

    Returns:
        float: The net monthly income after subtracting the estimated federal taxes.

    Notes:
        The calculation assumes annualization of the monthly income, applies progressive tax brackets, and then returns the monthly equivalent of the after-tax annual income.
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

def calculate_projected_savings(
    current_savings: Decimal,
    monthly_contribution: Decimal,
    annual_return_rate: Decimal,
    years: int
) -> Decimal:
    """
    Calculate the projected savings with monthly contributions using Decimal arithmetic.

    Args:
        current_savings (Decimal): The current amount of savings.
        monthly_contribution (Decimal): The amount contributed each month.
        annual_return_rate (Decimal): The annual return rate as a decimal (e.g. Decimal('0.05') for 5%).
        years (int): The number of years for the projection.

    Returns:
        Decimal: The total projected savings after applying compound growth and contributions.

    Notes:
        The function calculates the future value of the current savings and the future value of the series of monthly contributions, then sums both.
    """
    monthly_rate = annual_return_rate / Decimal('12')
    months = years * 12
    
    # Future value of current savings
    future_savings = current_savings * (Decimal('1') + annual_return_rate) ** years
    
    # Future value of monthly contributions
    if monthly_rate > 0:
        contribution_future = monthly_contribution * ((Decimal('1') + monthly_rate) ** months - 1) / monthly_rate
    else:
        contribution_future = monthly_contribution * months
    
    return future_savings + contribution_future

def calculate_success_probability(
    projected_savings: Decimal,
    monthly_income: Decimal,
    risk_level: str,
    years_to_retirement: int
) -> float:
    """
    Estimate the probability of retirement success based on projected savings, income, risk tolerance, and time to retirement.

    Args:
        projected_savings (Decimal): The estimated savings at retirement.
        monthly_income (Decimal): The monthly income at retirement.
        risk_level (str): The risk tolerance level (e.g. 'conservative', 'moderate', 'aggressive').
        years_to_retirement (int): The number of years remaining until retirement.

    Returns:
        float: The estimated probability of retirement success expressed as a percentage.

    Notes:
        The probability is computed by adjusting a base probability using risk level, savings, and time factors, and then clamped between 0% and 100%.
    """
    base_probability = 0.7  # 70% base probability
    risk_adjustments = {
        'conservative': 0.1,
        'moderate': 0.0,
        'aggressive': -0.1
    }
    savings_factor = min(float(projected_savings) / 1000000, 1) * 0.2
    time_factor = min(years_to_retirement / 30, 1) * 0.1
    final_probability = base_probability + risk_adjustments.get(risk_level, 0) + savings_factor + time_factor
    return min(max(final_probability, 0), 1) * 100  # Return as percentage

def calculate_inflation_adjusted_amount(
    current_amount: Decimal,
    years: int,
    inflation_rate: float
) -> Decimal:
    """
    Calculate the future value of a monetary amount adjusted for inflation.

    Args:
        current_amount (Decimal): The current amount of money.
        years (int): The number of years over which inflation is applied.
        inflation_rate (float): The annual inflation rate expressed as a decimal (e.g. 0.02 for 2%).

    Returns:
        Decimal: The inflation-adjusted future value of the current amount.

    Notes:
        The function applies the formula: adjusted_amount = current_amount * (1 + inflation_rate) ** years.
    """
    return current_amount * (Decimal('1') + Decimal(str(inflation_rate))) ** Decimal(str(years))

def calculate_retirement_age(
    current_age: int,
    current_savings: float,
    monthly_income: float,
    monthly_expenses: float,
    expected_return: float
) -> int:
    """
    Estimate the retirement age based on current savings, income, expenses, and expected investment return.

    Args:
        current_age (int): The current age of the individual.
        current_savings (float): The current amount of savings.
        monthly_income (float): The current gross monthly income.
        monthly_expenses (float): The current monthly expenses.
        expected_return (float): The expected annual return rate on investments (as a decimal).

    Returns:
        int: The estimated age at which the individual can retire. The retirement age is capped at 90.

    Notes:
        The function computes annual savings from the difference between monthly income and expenses and iteratively applies compound growth until a target retirement savings (25 times annual expenses) is reached, or a maximum of 50 years is simulated.
    """
    annual_savings = (monthly_income - monthly_expenses) * 12
    target_retirement_savings = monthly_expenses * 12 * 25  # 25x annual expenses as rough estimate
    
    years_to_retirement = 0
    projected_savings = current_savings
    
    while projected_savings < target_retirement_savings and years_to_retirement < 50:
        projected_savings = projected_savings * (1 + expected_return) + annual_savings
        years_to_retirement += 1
    
    retirement_age = current_age + years_to_retirement
    return min(retirement_age, 90)  # Cap at 90

def calculate_retirement_income(
    current_savings: float,
    monthly_contribution: float,
    years_until_retirement: int,
    expected_return: float
) -> dict:
    """
    Calculate the projected retirement income and required savings based on current savings and contributions.

    Args:
        current_savings (float): The current retirement savings.
        monthly_contribution (float): The monthly contribution towards retirement savings.
        years_until_retirement (int): The number of years remaining until retirement.
        expected_return (float): The expected annual return rate on investments (as a decimal).

    Returns:
        dict: A dictionary containing:
            - "projected_savings": The estimated total savings at retirement.
            - "monthly_income": The monthly income derived from retirement savings using the 4% rule.
            - "required_savings": The target retirement savings based on a 25x annual expenses benchmark.
            - "savings_gap": The shortfall between the required savings and projected savings, or 0 if none.

    Notes:
        The calculation uses the 4% rule to estimate retirement income and a benchmark of 25 times annual expenses to determine required savings.
    """
    annual_contribution = monthly_contribution * 12
    projected_savings = current_savings
    for _ in range(years_until_retirement):
        projected_savings = projected_savings * (1 + expected_return) + annual_contribution
    
    monthly_income = (projected_savings * 0.04) / 12  # Using 4% rule
    target_monthly_income = monthly_contribution * 2  # Example target: double current savings rate
    required_savings = target_monthly_income * 12 * 25  # 25x annual expenses
    
    return {
        "projected_savings": projected_savings,
        "monthly_income": monthly_income,
        "required_savings": required_savings,
        "savings_gap": max(0, required_savings - projected_savings)
    }

def calculate_future_savings_float(
    current_savings: float,
    annual_savings: float,
    real_growth_rate: float,
    years: int
) -> float:
    """
    Calculate the future savings using float arithmetic with annual contributions.

    Args:
        current_savings (float): The current amount of savings.
        annual_savings (float): The amount saved annually.
        real_growth_rate (float): The annual growth rate as a decimal (e.g. 0.05 for 5%).
        years (int): The number of years over which the savings grow.

    Returns:
        float: The projected savings amount after applying compound growth and annual contributions.
    
    Notes:
        The function applies an iterative compound interest calculation with annual additions.
    """
    projected = current_savings
    for _ in range(years):
        projected = projected * (1 + real_growth_rate) + annual_savings
    return projected

def calculate_retirement_what_if(scenario: Any) -> Any:
    """
    Calculate retirement scenario outcomes based on various user inputs and assumptions.

    Args:
        scenario (Any): An object with attributes that include:
            - current_age (int)
            - retirement_age (int)
            - life_expectancy (int)
            - current_savings (numeric, convertible to Decimal)
            - monthly_contribution (numeric, convertible to Decimal)
            - expected_return_rate (numeric, convertible to Decimal)
            - inflation_rate (numeric, convertible to Decimal)
            - desired_retirement_income (numeric, convertible to Decimal)
            and possibly other attributes related to retirement planning.

    Returns:
        Any: A dictionary containing retirement planning details including:
            - "retirement_age": The planned retirement age.
            - "total_savings_at_retirement": The projected savings at retirement.
            - "monthly_retirement_income": The expected monthly income from savings and benefits.
            - "savings_gap": The shortfall in savings required to meet the desired retirement income.
            - "monthly_contribution_needed": The adjusted monthly contribution including any additional needed.
            - "years_until_retirement": The number of years remaining until retirement.
            - "retirement_duration": The expected duration of retirement.
            - "savings_by_year": A list of yearly savings amounts.
            - "monthly_income_breakdown": A breakdown of income sources in retirement.

    Notes:
        This function simulates the accumulation of savings until retirement and calculates the additional contributions needed if there is a gap in meeting the desired retirement income. It uses Decimal arithmetic for precision.
    """
    years_until_retirement = scenario.retirement_age - scenario.current_age
    retirement_duration = scenario.life_expectancy - scenario.retirement_age
    
    current_savings = Decimal(str(scenario.current_savings))
    monthly_contribution = Decimal(str(scenario.monthly_contribution))
    expected_return_rate = Decimal(str(scenario.expected_return_rate))
    inflation_rate = Decimal(str(scenario.inflation_rate))
    
    savings_by_year = []
    projected_savings = current_savings
    
    for year in range(years_until_retirement + 1):
        savings_by_year.append({
            "year": scenario.current_age + year,
            "amount": float(projected_savings)
        })
        annual_contribution = monthly_contribution * Decimal('12')
        projected_savings = projected_savings * (Decimal('1') + expected_return_rate) + annual_contribution

    total_savings_at_retirement = projected_savings
    
    # For simplicity, assume government benefits are zero unless specified
    cpp_oas_monthly = Decimal('0')
    safe_withdrawal_rate = Decimal('0.04') - inflation_rate
    monthly_savings_income = (total_savings_at_retirement * safe_withdrawal_rate) / Decimal('12')
    
    total_monthly_income = monthly_savings_income + cpp_oas_monthly
    monthly_income_gap = Decimal(str(scenario.desired_retirement_income)) - total_monthly_income
    additional_savings_needed = (monthly_income_gap * Decimal('12')) / safe_withdrawal_rate
    
    if years_until_retirement > 0:
        if expected_return_rate > Decimal('0'):
            monthly_contribution_needed = (
                (additional_savings_needed /
                 ((Decimal('1') + expected_return_rate) ** Decimal(str(years_until_retirement)) - Decimal('1')) *
                 expected_return_rate) / Decimal('12')
            )
        else:
            monthly_contribution_needed = additional_savings_needed / Decimal(str(years_until_retirement * 12))
    else:
        monthly_contribution_needed = Decimal('0')
    
    return {
        "retirement_age": scenario.retirement_age,
        "total_savings_at_retirement": float(total_savings_at_retirement),
        "monthly_retirement_income": float(total_monthly_income),
        "savings_gap": float(additional_savings_needed),
        "monthly_contribution_needed": float(monthly_contribution + monthly_contribution_needed),
        "years_until_retirement": years_until_retirement,
        "retirement_duration": retirement_duration,
        "savings_by_year": savings_by_year,
        "monthly_income_breakdown": {
            "savings_income": float(monthly_savings_income),
            "government_benefits": float(cpp_oas_monthly)
        }
    }

def calculate_financial_metrics(
    profile_data: dict, 
    investment_holdings: list
) -> dict:
    """
    Calculate comprehensive financial metrics based on user profile data and investment holdings.

    Args:
        profile_data (dict): A dictionary containing user financial data, including monthly income, expenses, cash balance, investments, debt, age, retirement accounts, and investor type.
        investment_holdings (list): A list of dictionaries representing the user's investment holdings, each containing details such as number of units, average cost per unit, and holding name.

    Returns:
        dict: A dictionary containing multiple financial metrics and assessments, including:
            - Overall financial position metrics such as net worth, monthly cash flow, and debt-to-income ratio.
            - Savings metrics such as emergency fund ratio, savings rate, and monthly savings.
            - Investment metrics such as total investments, estimated investment growth, and investment diversity score.
            - Retirement metrics including retirement savings ratio, retirement readiness score, and years until retirement.
            - Benchmark comparisons and guidance messages for each metric.

    Notes:
        The function uses various helper calculations and prints intermediate steps to the console for debugging purposes. It also utilizes helper functions get_net_worth_benchmark and get_retirement_benchmark for benchmark information.
    """
    print("\n=== CALCULATING FINANCIAL METRICS ===")
    
    # Default retirement age in Canada is typically 65
    DEFAULT_RETIREMENT_AGE = 65
    
    # Extract basic values with safe defaults
    monthly_income = float(profile_data.get("monthly_income") or 0)
    monthly_expenses = float(profile_data.get("monthly_expenses") or 0)
    cash_holdings = float(profile_data.get("cash_balance") or 0)
    investment_holdings_value = float(profile_data.get("investments") or 0)
    current_debt = float(profile_data.get("debt") or 0)
    age = profile_data.get("age")
    
    print(f"Basic values: income={monthly_income}, expenses={monthly_expenses}, cash={cash_holdings}, investments={investment_holdings_value}, debt={current_debt}, age={age}")
    
    # Extract retirement values
    rrsp_savings = float(profile_data.get("rrsp_savings") or 0)
    tfsa_savings = float(profile_data.get("tfsa_savings") or 0)
    other_retirement = float(profile_data.get("other_retirement_accounts") or 0)
    
    print(f"Retirement values: rrsp={rrsp_savings}, tfsa={tfsa_savings}, other={other_retirement}")
    
    # Get investment preferences
    investor_type = profile_data.get("investor_type", "").lower()
    print(f"Investor type: {investor_type}")
    
    # Annual income calculation for benchmarking
    annual_income = monthly_income * 12 if monthly_income else 0
    
    # OVERALL FINANCIAL POSITION METRICS
    
    # Calculate net worth
    total_assets = cash_holdings + investment_holdings_value + rrsp_savings + tfsa_savings + other_retirement
    net_worth = total_assets - current_debt
    print(f"Net worth calculation: total_assets={total_assets}, net_worth={net_worth}")
    
    # Net worth benchmark assessment
    net_worth_ratio = net_worth / annual_income if annual_income else 0
    net_worth_status = "Not Available"
    net_worth_message = "Add your income details to see how your net worth compares to benchmarks."
    
    if annual_income > 0 and age is not None:
        if age <= 35:
            if net_worth_ratio < 0.5:
                net_worth_status = "Below Target"
                net_worth_message = "Building your net worth takes time. Focus on reducing debt and increasing savings."
            elif net_worth_ratio <= 1.5:
                net_worth_status = "On Track"
                net_worth_message = "You're on the right path. Continue building your assets and managing liabilities."
            else:
                net_worth_status = "Above Target"
                net_worth_message = "Excellent start! Your net worth is growing robustly."
        elif age <= 50:
            if net_worth_ratio < 2:
                net_worth_status = "Below Target"
                net_worth_message = "Consider strategies to boost your net worth, such as increasing savings and prudent investing."
            elif net_worth_ratio <= 5:
                net_worth_status = "On Track"
                net_worth_message = "Good progress! Keep focusing on asset growth and long-term investments."
            else:
                net_worth_status = "Above Target"
                net_worth_message = "You're ahead of the curve. Consider diversifying investments to sustain growth."
        else:  # age > 50
            if net_worth_ratio < 6:
                net_worth_status = "Below Target"
                net_worth_message = "It's important to enhance your net worth before retirement. Seek advice to optimize your financial plan."
            elif net_worth_ratio <= 10:
                net_worth_status = "On Track"
                net_worth_message = "You're well-prepared for retirement. Maintain your financial strategies to preserve wealth."
            else:
                net_worth_status = "Above Target"
                net_worth_message = "Outstanding! Your strong net worth provides substantial retirement security."
    
    # Calculate monthly cash flow
    monthly_cash_flow = monthly_income - monthly_expenses if monthly_income and monthly_expenses else None
    print(f"Monthly cash flow: {monthly_cash_flow}")
    
    # Calculate debt-to-income ratio (using estimated monthly payments)
    # Assume average interest rate of 5% and 5-year term for simplicity
    monthly_debt_payment = (current_debt * 0.05 / 12) / (1 - (1 + 0.05 / 12) ** -60) if current_debt > 0 else 0
    debt_to_income_ratio = round((monthly_debt_payment / monthly_income) * 100, 1) if monthly_income else None
    print(f"Debt-to-income ratio: {debt_to_income_ratio}% (monthly payment: {monthly_debt_payment})")
    
    # Debt load assessment
    debt_status = "Not Available"
    debt_message = "Add your income and debt details to see how your debt load compares to recommendations."
    
    if debt_to_income_ratio is not None:
        if debt_to_income_ratio > 36:
            debt_status = "Below Target"
            debt_message = "High debt levels can strain your finances. Focus on reducing debt to improve financial flexibility."
        elif debt_to_income_ratio >= 20:
            debt_status = "On Track"
            debt_message = "Your debt is manageable. Continue making timely payments to maintain stability."
        else:
            debt_status = "Above Target"
            debt_message = "Great job! Low debt enhances your financial freedom and ability to invest."
    
    # SAVINGS METRICS
    
    # Calculate emergency fund ratio (months of expenses covered)
    emergency_fund_ratio = round(cash_holdings / monthly_expenses, 1) if monthly_expenses else None
    print(f"Emergency fund ratio: {emergency_fund_ratio} months")
    
    # Emergency fund assessment
    ef_status = "Not Available"
    ef_message = "Add your expenses and cash balance to see how your emergency fund compares to recommendations."
    
    if emergency_fund_ratio is not None:
        if emergency_fund_ratio < 3:
            ef_status = "Below Target"
            ef_message = "Your emergency fund is below the recommended level. Prioritize increasing your savings to cover unexpected expenses."
        elif emergency_fund_ratio <= 6:
            ef_status = "On Track"
            ef_message = "You're well-prepared for unforeseen events. Continue maintaining this safety net."
        else:
            ef_status = "Above Target"
            ef_message = "Excellent! Consider allocating excess funds to investments for potential growth."
    
    # Calculate savings rate
    monthly_savings = monthly_income - monthly_expenses if monthly_income and monthly_expenses else None
    savings_rate = round((monthly_savings / monthly_income) * 100, 1) if monthly_savings and monthly_income else None
    print(f"Savings rate: {savings_rate}%")
    
    # Savings rate assessment
    savings_status = "Not Available"
    savings_message = "Add your income and expenses to see how your savings rate compares to recommendations."
    
    if savings_rate is not None:
        if savings_rate < 10:
            savings_status = "Below Target"
            savings_message = "Increasing your savings rate is crucial. Start with small, consistent contributions to build the habit."
        elif savings_rate < 20:
            savings_status = "On Track"
            savings_message = "You're on the right track. Aim to gradually increase your savings to reach the recommended level."
        else:
            savings_status = "Above Target"
            savings_message = "Excellent! A high savings rate positions you well for future financial goals."
    
    # INVESTMENT METRICS
    
    # Total investments (including investment holdings from the database)
    portfolio_value = sum(float(holding.get("number_of_units", 0) or 0) * float(holding.get("average_cost_per_unit", 0) or 0) 
                        for holding in investment_holdings) if investment_holdings else 0
    total_investments = max(investment_holdings_value, portfolio_value) if investment_holdings_value or portfolio_value else None
    print(f"Investments: holdings_value={investment_holdings_value}, portfolio_value={portfolio_value}, total={total_investments}")
    
    # Estimated investment growth based on investor type
    investment_growth = None
    if investor_type:
        if "conservative" in investor_type:
            investment_growth = 4.0
        elif "balanced" in investor_type or "moderate" in investor_type:
            investment_growth = 6.0
        elif "growth" in investor_type or "aggressive" in investor_type:
            investment_growth = 8.0
    print(f"Investment growth rate: {investment_growth}%")
    
    # Portfolio diversity score (0-10)
    investment_diversity_score = None
    if investment_holdings:
        # Count unique asset classes/types
        unique_holdings = len(set(holding.get("holding_name", "").lower() for holding in investment_holdings))
        if unique_holdings >= 10:
            investment_diversity_score = 10
        elif unique_holdings > 0:
            investment_diversity_score = min(unique_holdings, 10)
    print(f"Investment diversity score: {investment_diversity_score}")
    
    # RETIREMENT METRICS
    
    # Total retirement savings
    total_retirement_savings = rrsp_savings + tfsa_savings + other_retirement
    
    # Retirement savings ratio (relative to annual income)
    retirement_savings_ratio = round(total_retirement_savings / (monthly_income * 12), 1) if monthly_income else None
    print(f"Retirement savings ratio: {retirement_savings_ratio}x annual income")
    
    # Retirement savings assessment
    retirement_status = "Not Available"
    retirement_message = "Add your income and retirement account details to see how your retirement savings compare to age-based targets."
    
    if retirement_savings_ratio is not None and age is not None:
        target_ratio = 0
        if age < 30:
            target_ratio = 1
        elif age < 40:
            target_ratio = 3
        elif age < 50:
            target_ratio = 6
        elif age < 60:
            target_ratio = 8
        else:
            target_ratio = 10
            
        if retirement_savings_ratio < target_ratio:
            retirement_status = "Below Target"
            retirement_message = f"It's important to boost your retirement savings. Consider increasing contributions and reviewing your investment strategy to reach the target of {target_ratio}x annual income by age {age}."
        elif retirement_savings_ratio <= target_ratio * 1.2:
            retirement_status = "On Track"
            retirement_message = "You're on track for a comfortable retirement. Maintain your current savings and investment approach."
        else:
            retirement_status = "Above Target"
            retirement_message = "Outstanding! Your diligent saving provides a strong foundation for retirement."
    
    # Retirement readiness score (0-10)
    retirement_readiness_score = None
    if age and retirement_savings_ratio is not None:
        # Basic formula: score based on age and savings ratio
        if age < 30:
            target_ratio = 1
        elif age < 40:
            target_ratio = 3
        elif age < 50:
            target_ratio = 6
        else:
            target_ratio = 8
            
        # Score based on how close they are to target
        ratio_score = min(retirement_savings_ratio / target_ratio, 1) * 10
        retirement_readiness_score = round(ratio_score, 1)
    print(f"Retirement readiness score: {retirement_readiness_score}/10")
    
    # Years until retirement
    years_until_retirement = DEFAULT_RETIREMENT_AGE - age if age else None
    print(f"Years until retirement: {years_until_retirement}")
    
    metrics = {
        # Overall financial position
        "net_worth": round(net_worth, 2) if net_worth is not None else None,
        "net_worth_status": net_worth_status,
        "net_worth_message": net_worth_message,
        "net_worth_benchmark": get_net_worth_benchmark(age) if age else "Not available",
        
        "monthly_cash_flow": round(monthly_cash_flow, 2) if monthly_cash_flow is not None else None,
        
        "debt_to_income_ratio": debt_to_income_ratio,
        "debt_status": debt_status,
        "debt_message": debt_message,
        "debt_benchmark": "Below 36% of monthly income",
        
        # Savings
        "emergency_fund_ratio": emergency_fund_ratio,
        "emergency_fund_status": ef_status,
        "emergency_fund_message": ef_message,
        "emergency_fund_benchmark": "3-6 months of expenses",
        
        "savings_rate": savings_rate,
        "savings_status": savings_status,
        "savings_message": savings_message,
        "savings_benchmark": "At least 20% of income",
        
        "monthly_savings": round(monthly_savings, 2) if monthly_savings is not None else None,
        
        # Investments
        "total_investments": round(total_investments, 2) if total_investments is not None else None,
        "investment_growth": investment_growth,
        "investment_diversity_score": investment_diversity_score,
        
        # Retirement
        "retirement_savings_ratio": retirement_savings_ratio,
        "retirement_status": retirement_status,
        "retirement_message": retirement_message,
        "retirement_benchmark": get_retirement_benchmark(age) if age else "Not available",
        
        "retirement_readiness_score": retirement_readiness_score,
        "years_until_retirement": years_until_retirement
    }
    
    print("\n=== FINANCIAL METRICS CALCULATED ===")
    return metrics

def get_net_worth_benchmark(age):
    """
    Get the net worth benchmark for a given age group.

    Args:
        age (int): The age of the individual.

    Returns:
        str: A string representing the expected net worth benchmark, expressed as a multiple of annual salary.
    """
    if age <= 35:
        return "0.5-1.5× annual salary"
    elif age <= 50:
        return "2-5× annual salary"
    else:
        return "6-10× annual salary"

def get_retirement_benchmark(age):
    """
    Get the retirement savings benchmark for a given age group.

    Args:
        age (int): The age of the individual.

    Returns:
        str: A string representing the recommended retirement savings benchmark, expressed as a multiple of annual income.
    """
    if age < 30:
        return "1× annual income"
    elif age < 40:
        return "3× annual income"
    elif age < 50:
        return "6× annual income"
    elif age < 60:
        return "8× annual income"
    else:
        return "10× annual income"
