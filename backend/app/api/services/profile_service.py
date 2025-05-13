from typing import Dict, Any
from fastapi import HTTPException
from supabase import Client
from app.api.services.profile_functions import get_profile
from app.models import ProfileUpdate

async def update_profile(
    user_id: str,
    profile_data: ProfileUpdate,
    supabase_client: Client
) -> Dict[str, Any]:
    """
    Update a user's complete profile with all related information
    """
    try:
        # Get the user's client profile ID
        profile_response = supabase_client.table('client_profiles').select('id').eq('user_id', user_id).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile_id = profile_response.data[0]['id']
        
        # Format decimal values for Supabase
        financial_data = {
            'monthly_income': float(profile_data.monthly_income) if profile_data.monthly_income is not None else None,
            'monthly_expenses': float(profile_data.monthly_expenses) if profile_data.monthly_expenses is not None else None,
            'cash_holdings': float(profile_data.cash_balance) if profile_data.cash_balance is not None else None,
            'investment_holdings': float(profile_data.investments) if profile_data.investments is not None else None,
            'current_debt': float(profile_data.debt) if profile_data.debt is not None else None,
        }
        
        # Update basic client profile
        supabase_client.table('client_profiles').update({
            'name': profile_data.name,
            'age': profile_data.age,
            'country_of_residence': profile_data.country_of_residence,
            'marital_status': profile_data.marital_status,
            'number_of_dependents': profile_data.number_of_dependents,
            'postal_code': profile_data.postal_code,
            'has_advisor': profile_data.has_advisor,
            'advisor_name': profile_data.advisor_name,
            'advisor_email_address': profile_data.advisor_email_address,
            'advisor_company_name': profile_data.advisor_company_name,
        }).eq('id', profile_id).execute()
        
        # Update financial details
        financial_response = supabase_client.table('financial_overviews').select('id').eq('client_profile_id', profile_id).execute()
        
        if financial_response.data:
            financial_id = financial_response.data[0]['id']
            supabase_client.table('financial_overviews').update(financial_data).eq('id', financial_id).execute()
        else:
            financial_data['client_profile_id'] = profile_id
            supabase_client.table('financial_overviews').insert(financial_data).execute()
        
        # Update investment preferences
        invest_response = supabase_client.table('investment_preferences').select('id').eq('client_profile_id', profile_id).execute()
        
        # Prepare investment preferences data with the new JSONB arrays
        invest_data = {
            'investor_type': profile_data.investor_type,
            'advisor_preference': profile_data.advisor_preference,
            'investing_interests': profile_data.investing_interests or [],
            'investing_interests_thematic': profile_data.investing_interests_thematic or [],
            'investing_interests_geographies': profile_data.investing_interests_geographies or [],
            'product_preferences': profile_data.product_preferences,
        }
        
        if invest_response.data:
            invest_id = invest_response.data[0]['id']
            supabase_client.table('investment_preferences').update(invest_data).eq('id', invest_id).execute()
        else:
            invest_data['client_profile_id'] = profile_id
            supabase_client.table('investment_preferences').insert(invest_data).execute()
        
        # Update retirement details
        retirement_data = {
            'rrsp_savings': float(profile_data.rrsp_savings) if profile_data.rrsp_savings is not None else None,
            'tfsa_savings': float(profile_data.tfsa_savings) if profile_data.tfsa_savings is not None else None,
            'other_retirement_accounts': float(profile_data.other_retirement_accounts) if profile_data.other_retirement_accounts is not None else None,
            'desired_retirement_lifestyle': profile_data.desired_retirement_lifestyle,
        }
        
        retire_response = supabase_client.table('retirement_details').select('id').eq('client_profile_id', profile_id).execute()
        
        if retire_response.data:
            retire_id = retire_response.data[0]['id']
            supabase_client.table('retirement_details').update(retirement_data).eq('id', retire_id).execute()
        else:
            retirement_data['client_profile_id'] = profile_id
            supabase_client.table('retirement_details').insert(retirement_data).execute()
        
        # Fetch the updated profile
        return await get_profile(user_id, supabase_client)
    
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}") 