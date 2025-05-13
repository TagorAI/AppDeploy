"""
Email Service Module

This module provides email functionality using Resend API, including:
- Email template formatting for different types of financial communications
- Standardized email sending with error handling
- Reusable email templates for various financial reports

Dependencies:
- Resend for email delivery
- Pydantic for data validation
- Environment configuration for API keys
"""

import os
from typing import Dict, Any, Optional
from fastapi import HTTPException
from pydantic import BaseModel
import resend
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Resend with API key from environment
resend.api_key = os.getenv("RESEND_API_KEY")

# Update these constants
RESEND_TEST_EMAIL = "delivered@resend.dev"
RESEND_FROM_EMAIL = "onboarding@resend.dev"

class EmailTemplate(BaseModel):
    """Base model for email templates."""
    subject: str
    html_content: str
    to_email: str
    from_email: Optional[str] = RESEND_FROM_EMAIL

def format_financial_assessment(assessment_data: Dict[str, Any], to_email: str) -> EmailTemplate:
    """Format financial assessment data into an email template."""
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            h1 {{ color: #2563eb; }}
            h2 {{ color: #1e40af; margin-top: 20px; }}
            .status {{ font-weight: bold; }}
            ul {{ margin-bottom: 20px; }}
        </style>
    </head>
    <body>
        <h1>Your Financial Assessment</h1>
        
        <h2>Introduction</h2>
        <p>{assessment_data['introduction']}</p>
        
        <h2>Everyday Money Management</h2>
        <p class="status">Status: {assessment_data['everyday_money']['status']}</p>
        <h3>Strengths:</h3>
        <ul>
            {''.join(f'<li>{strength}</li>' for strength in assessment_data['everyday_money']['strengths'])}
        </ul>
        
        <h2>Investment Overview</h2>
        <p class="status">Status: {assessment_data['investments']['status']}</p>
        <h3>Recommendations:</h3>
        <ul>
            {''.join(f'<li>{rec}</li>' for rec in assessment_data['investments']['recommendations'])}
        </ul>
        
        <h2>Next Steps</h2>
        <ul>
            {''.join(f'<li>{step}</li>' for step in assessment_data['next_steps'])}
        </ul>
    </body>
    </html>
    """
    
    return EmailTemplate(
        subject="Your Financial Assessment Results",
        html_content=html_content,
        to_email=to_email
    )

def format_investment_recommendation(recommendation_data: Dict[str, Any], to_email: str) -> EmailTemplate:
    """Format investment recommendation data into an email template."""
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            h1 {{ color: #2563eb; }}
            h2 {{ color: #1e40af; margin-top: 20px; }}
            .symbol {{ font-weight: bold; color: #2563eb; }}
        </style>
    </head>
    <body>
        <h1>Your Investment Recommendation</h1>
        
        <h2>Recommended Investment</h2>
        <p><span class="symbol">Symbol: {recommendation_data['recommended_symbol']}</span></p>
        
        <h2>Rationale</h2>
        <p>{recommendation_data['recommended_rationale']}</p>
    </body>
    </html>
    """
    
    return EmailTemplate(
        subject="Your Investment Recommendations",
        html_content=html_content,
        to_email=to_email
    )

async def send_email(template: EmailTemplate) -> Dict[str, Any]:
    """
    Send an email using Resend's test email service.
    
    Args:
        template (EmailTemplate): Email template containing subject and HTML content
        
    Returns:
        Dict[str, Any]: Response containing success status and message
        
    Raises:
        HTTPException: If email sending fails
    """
    print("\n=== Starting send_email function ===")
    try:
        if not resend.api_key:
            print("Error: Resend API key not configured")
            raise ValueError("Resend API key not configured")
            
        # Construct email params according to Resend's API
        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [RESEND_TEST_EMAIL],
            "subject": template.subject,
            "html": template.html_content,
        }
        
        print(f"Sending email with params: {params}")
        
        # Send email using Resend's recommended pattern
        email_response = resend.Emails.send(params)
        print(f"Raw Resend API response: {email_response}")
        
        # Resend returns the email ID directly in the response
        return {
            "success": True,
            "message": "Email sent successfully to test inbox",
            "email_id": email_response.get('id') if isinstance(email_response, dict) else None
        }
        
    except ValueError as ve:
        print(f"Configuration error: {str(ve)}")
        raise HTTPException(
            status_code=500,
            detail=f"Configuration error: {str(ve)}"
        )
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        ) 