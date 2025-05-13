"""
Savings Functions Module

This module provides functions for analyzing and assessing user savings health,
generating financial recommendations, and calculating key financial metrics.

Functions:
- analyze_savings_health(profile_data: dict) -> dict: Generate savings health analysis
- calculate_savings_metrics(profile_data: dict) -> dict: Calculate key savings metrics
- generate_savings_recommendations(metrics: dict) -> list: Generate savings recommendations

Financial Metrics:
- Monthly savings rate
- Emergency fund coverage
- Debt-to-worth ratio
- Overall savings health score

Data Processing:
- Handles missing or incomplete profile data
- Converts string values to float
- Validates financial inputs
- Provides default values when needed

Error Handling:
- Returns structured error responses
- Handles invalid numerical inputs
- Provides meaningful error messages
- Maintains consistent return structure
"""

import logging
from typing import Dict, Any

def analyze_savings_health(profile_data: dict) -> dict:
    """
    Analyze user's savings health and generate a checklist of financial goals.

    Processes user financial profile data to assess savings health across multiple
    dimensions and provides structured recommendations.

    Args:
        profile_data (dict): User financial data containing:
            - monthly_income (float|str): Monthly income
            - monthly_expenses (float|str): Monthly expenses
            - cash_balance (float|str): Current cash holdings
            - investments (float|str): Total investment holdings
            - debt (float|str): Current total debt

    Returns:
        dict: Savings health analysis containing:
            - status (str): 'complete', 'incomplete', or 'error'
            - missing_fields (list): Required fields that are missing
            - message (str): User-friendly status message
            - checklist (dict): Financial goals checklist with:
                - savings_rate (dict): Monthly savings assessment
                - emergency_fund (dict): Emergency fund status
                - debt_level (dict): Debt management assessment
            - progress (float): Overall completion percentage
            - monthly_savings (float): Calculated monthly savings
            - savings_rate (float): Savings as percentage of income
            - debt_to_worth_ratio (float): Debt to net worth ratio

    Notes:
        - All monetary values are converted to float type
        - Missing or invalid values default to 0
        - Savings rate target is 20% of monthly income
        - Emergency fund target is 6 months of expenses
        - Debt-to-worth ratio target is 30% or less
    """
    required_fields = {
        'monthly_income': 'Monthly income',
        'monthly_expenses': 'Monthly expenses',
        'cash_balance': 'Cash balance',
        'investments': 'Investment holdings',
        'debt': 'Current debt'
    }
    
    missing_fields = [
        field_name for field_key, field_name in required_fields.items()
        if profile_data.get(field_key) is None
    ]
    
    if missing_fields:
        return {
            "status": "incomplete",
            "missing_fields": missing_fields,
            "message": "Please complete your financial profile to get a savings health analysis",
            "checklist": {},
            "progress": 0,
            "monthly_savings": 0,
            "savings_rate": 0,
            "debt_to_worth_ratio": 0
        }
    
    try:
        monthly_income = float(profile_data.get('monthly_income', 0) or 0)
        monthly_expenses = float(profile_data.get('monthly_expenses', 0) or 0)
        cash_balance = float(profile_data.get('cash_balance', 0) or 0)
        investments = float(profile_data.get('investments', 0) or 0)
        debt = float(profile_data.get('debt', 0) or 0)
        
        monthly_savings = monthly_income - monthly_expenses
        savings_rate = (monthly_savings / monthly_income * 100) if monthly_income > 0 else 0
        net_worth = (cash_balance + investments) - debt
        debt_to_worth_ratio = (debt / net_worth * 100) if net_worth > 0 else 100
        
        checklist = {
            "savings_rate": {
                "title": "Monthly savings rate",
                "status": "completed" if savings_rate >= 20 else "pending",
                "current": f"{savings_rate:.1f}%",
                "target": "20% or more of monthly income",
                "message": (
                    "Great job maintaining a healthy savings rate!"
                    if savings_rate >= 20
                    else "Aim to save at least 20% of your monthly income"
                )
            },
            "emergency_fund": {
                "title": "Emergency fund",
                "status": "completed" if cash_balance >= (monthly_expenses * 6) else "pending",
                "current": f"{cash_balance / monthly_expenses:.1f} months" if monthly_expenses > 0 else "N/A",
                "target": "6 months of expenses",
                "message": (
                    "You have a solid emergency fund!"
                    if cash_balance >= (monthly_expenses * 6)
                    else "Build an emergency fund to cover 6 months of expenses"
                )
            },
            "debt_level": {
                "title": "Debt level",
                "status": "completed" if debt_to_worth_ratio <= 30 else "pending",
                "current": f"{debt_to_worth_ratio:.1f}% of net worth",
                "target": "30% or less of net worth",
                "message": (
                    "Your debt level is well-managed!"
                    if debt_to_worth_ratio <= 30
                    else "Work on reducing debt to below 30% of your net worth"
                )
            }
        }
        
        completed_items = sum(1 for item in checklist.values() if item["status"] == "completed")
        progress = (completed_items / len(checklist)) * 100
        
        return {
            "status": "complete",
            "checklist": checklist,
            "progress": progress,
            "monthly_savings": monthly_savings,
            "savings_rate": savings_rate,
            "debt_to_worth_ratio": debt_to_worth_ratio
        }
        
    except Exception as e:
        print(f"Error calculating savings health: {str(e)}")
        return {
            "status": "error",
            "message": "An error occurred while analyzing your savings health. Please ensure all financial values are valid numbers.",
            "checklist": {},
            "progress": 0,
            "monthly_savings": 0,
            "savings_rate": 0,
            "debt_to_worth_ratio": 0
        }
