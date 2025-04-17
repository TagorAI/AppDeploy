from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "AI Financial Advisor"
    APP_VERSION: str = "1.0.0"
    
    # Economic parameters
    ANNUAL_INFLATION_RATE: float = 3.0
    EXPENSE_GROWTH_RATE: float = 2.0
    EXPECTED_ANNUAL_INVESTMENT_RETURN: float = 7.0
    RETIREMENT_LIFESTYLE_FACTOR: float = 0.7
    LIFE_EXPECTANCY: int = 90
    WITHDRAWAL_RATE: float = 0.04
    TARGET_RETIREMENT_AGE: int = 65
    
    # Canadian retirement benefits (annual amounts)
    RETIREMENT_INCOME_OAS: float = 8400.00  # Old Age Security
    RETIREMENT_INCOME_CPP: float = 15043.00  # Canada Pension Plan maximum
    
    # Investment thresholds
    MIN_EMERGENCY_FUND_MONTHS: int = 3
    MAX_EMERGENCY_FUND_MONTHS: int = 6
    
    '''
    # Database settings (from environment variables)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    '''
    
    class Config:
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings() 