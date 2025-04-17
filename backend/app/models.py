"""
This module contains all the Pydantic models used for data validation and serialization in the financial advisory application.
It defines models for user management, client profiles, financial overviews, investment preferences, retirement details,
financial assessments, product recommendations, and additional functionalities such as password reset and asset allocation.
All models inherit from Pydantic's BaseModel and include type hints, field validations, and ORM compatibility where required.

Module Functions:
    - UserWithProfile.to_display_dict(self) -> dict
          Return a dictionary representation of the user profile for frontend display.
    - ProfileUpdate.handle_zero_values(cls, v: Any) -> Optional[Decimal]
          Convert empty strings and zero values to an appropriate Decimal representation for numeric fields.
    - ProfileUpdate.handle_empty_arrays(cls, v: Any) -> list
          Convert None or empty string values to an empty list for list fields.
    - RetirementDetailsCreate.handle_zero_values(cls, v: Any) -> Optional[Decimal]
          Convert zero values (numeric or string) for retirement details fields to a Decimal('0') when applicable.
    - AssetAllocationExtract.round_to_two_decimals(cls, v: Any) -> Any
          Round float values to two decimal places for asset allocation percentages.

Models:
    User Related:
        - UserBase: Base user model with email and role.
        - UserCreate: Model for user creation including password.
        - User: Complete user model with system fields.
        - UserWithProfile: Extended user model with profile information and helper methods.
        - ForgotPasswordRequest: Model for initiating a password reset.
        - ResetPasswordRequest: Model for resetting the password.

    Profile Related:
        - ClientProfileBase: Base client profile information.
        - ClientProfileCreate: Model for creating client profiles.
        - ClientProfile: Complete client profile model.
        - ProfileUpdate: Model for updating client profiles with personal, financial, investment, and retirement details.

    Financial Related:
        - FinancialOverview: Model representing a client's financial overview.
        - FinancialOverviewCreate: Model for creating financial overview records.
        - InvestmentPreferencesData: Model for investment preferences data.
        - RetirementData: Model for retirement-related data.
        - InvestmentPreferencesCreate: Model for creating investment preferences.
        - RetirementDetailsCreate: Model for creating retirement details with validations.

    Signup and Assessment Related:
        - SignupRequest: Model for handling signup requests with nested user, profile, and financial data.
        - DiagnosticDimension: Model representing a dimension in the financial assessment.
        - FinancialAssessment: Comprehensive financial assessment model.

    Product Recommendation Related:
        - GICProductDetails: Model for GIC product information.
        - GICRecommendation: Model for recommending a GIC product.
        - RecommendedProduct: Model for generic investment product recommendations.
        - RetirementRecommendation: Model for retirement planning recommendations.
        - InvestmentRecommendation: Model for investment strategy recommendations.
        - RecommendationRequest: Simple model for product recommendation requests.
        - UserRecommendation: Full model for user-specific recommendations.
        - RecommendationResponse: Response model for product recommendations.
        - GICRecommendationRequest: Simple model for GIC recommendation requests.

    Investment Holding and Asset Allocation:
        - ScreeningAnswers: Model for validating screening question answers during signup.
        - InvestmentHolding: Model for an individual investment holding.
        - InvestmentHoldingCreate: Model for creating a new investment holding.
        - ExtractedInvestmentHolding: Model for investment holding data extracted from statements.
        - InvestmentExtractResponse: Response model for investment extraction.
        - SaveInvestmentHoldingsRequest: Request model for saving extracted investment holdings.
        - AssetAllocationExtract: Model for extracted asset allocation data from fund fact sheets.
        - AssetAllocationSave: Model for saving asset allocation data.
        - ScenarioAnalysis: Model for scenario analysis of a portfolio.
        - VerifyCodeRequest: Model for verifying a code (e.g., during password reset).

All models follow Pydantic's BaseModel structure with field validations and appropriate configurations.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, EmailStr, UUID4, Field
from decimal import Decimal
from pydantic import field_validator

class UserBase(BaseModel):
    email: EmailStr
    role: str = "client"  # Default role is client, can be "admin" or "client"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str  # Add name as required field

class User(UserBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime
    hashed_password: str

    class Config:
        from_attributes = True

# Add new models for password reset
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    password: str
    
class ClientProfileBase(BaseModel):
    name: str
    age: int
    country_of_residence: Optional[str] = None
    marital_status: Optional[str] = None
    number_of_dependents: Optional[int] = None
    client_interests: Optional[str] = None
    postal_code: Optional[str] = None

class ClientProfileCreate(BaseModel):
    # Only required fields
    name: str
    country_of_residence: str
    # Optional fields
    age: Optional[int] = None
    marital_status: Optional[str] = None
    number_of_dependents: Optional[int] = None
    client_interests: Optional[str] = None
    postal_code: Optional[str] = None

class ClientProfile(ClientProfileBase):
    id: int
    user_id: UUID4

    class Config:
        from_attributes = True

class FinancialOverview(BaseModel):
    id: int
    client_profile_id: int
    monthly_income: Optional[Decimal] = None
    monthly_expenses: Optional[Decimal] = None
    cash_holdings: Optional[Decimal] = None
    investment_holdings: Optional[Decimal] = None
    current_debt: Optional[Decimal] = None

    class Config:
        from_attributes = True

class FinancialOverviewCreate(BaseModel):
    monthly_income: Optional[Decimal] = None
    monthly_expenses: Optional[Decimal] = None
    cash_holdings: Optional[Decimal] = None
    investment_holdings: Optional[Decimal] = None
    current_debt: Optional[Decimal] = None

class UserWithProfile(User):
    client_profile: Optional[ClientProfile] = None
    financial_overview: Optional[FinancialOverview] = None

    def to_display_dict(self):
        """Return a dictionary representation of the user profile for frontend display.

        This method converts the user and associated profile and financial overview data into a dictionary.
        It ensures that UUIDs are converted to strings and numerical values are converted to floats. If
        profile or financial overview data is missing, the corresponding fields are set to None.

        Returns:
            dict: A dictionary containing the formatted user profile information.
        """
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.client_profile.name if self.client_profile else None,
            "age": self.client_profile.age if self.client_profile else None,
            "country_of_residence": self.client_profile.country_of_residence,
            "marital_status": self.client_profile.marital_status,
            "number_of_dependents": self.client_profile.number_of_dependents,
            "client_interests": self.client_profile.client_interests,
            "postal_code": self.client_profile.postal_code,
            "monthly_income": float(self.financial_overview.monthly_income) if self.financial_overview and self.financial_overview.monthly_income else None,
            "monthly_expenses": float(self.financial_overview.monthly_expenses) if self.financial_overview and self.financial_overview.monthly_expenses else None,
            "cash_balance": float(self.financial_overview.cash_holdings) if self.financial_overview and self.financial_overview.cash_holdings else None,
            "investments": float(self.financial_overview.investment_holdings) if self.financial_overview and self.financial_overview.investment_holdings else None,
            "debt": float(self.financial_overview.current_debt) if self.financial_overview and self.financial_overview.current_debt else None
        }

class ProfileUpdate(BaseModel):
    # Personal Info
    name: str
    age: int
    country_of_residence: Optional[str] = None
    marital_status: Optional[str] = None
    number_of_dependents: Optional[int] = None
    postal_code: Optional[str] = None
    
    # Financial Details
    monthly_income: Optional[Decimal] = Field(default=None)
    monthly_expenses: Optional[Decimal] = Field(default=None)
    cash_balance: Optional[Decimal] = Field(default=None)
    investments: Optional[Decimal] = Field(default=None)
    debt: Optional[Decimal] = Field(default=None)
    
    # Investment Details
    investor_type: Optional[str] = None
    advisor_preference: Optional[str] = None
    investing_interests: Optional[List[str]] = Field(default=None)
    investing_interests_thematic: Optional[List[str]] = Field(default=None)
    investing_interests_geographies: Optional[List[str]] = Field(default=None)
    product_preferences: Optional[List[str]] = Field(default=None)
    
    # Retirement details
    rrsp_savings: Optional[Decimal] = Field(default=None)
    tfsa_savings: Optional[Decimal] = Field(default=None)
    other_retirement_accounts: Optional[Decimal] = Field(default=None)
    desired_retirement_lifestyle: Optional[str] = None
    
    # Advisor Details
    has_advisor: Optional[bool] = Field(default=False)
    advisor_name: Optional[str] = None
    advisor_email_address: Optional[str] = None
    advisor_company_name: Optional[str] = None

    @field_validator('monthly_income', 'monthly_expenses', 'cash_balance', 'investments', 'debt',
                     'rrsp_savings', 'tfsa_savings', 'other_retirement_accounts', mode='before')
    def handle_zero_values(cls, v):
        """Convert empty strings and zero values to an appropriate Decimal representation.

        This validator checks if the input value is an empty string or a zero (as a string or number)
        and converts it to Decimal('0'). If the value is an empty string, it returns None.

        Parameters:
            v (Any): The value to validate and possibly convert.

        Returns:
            Optional[Decimal]: A Decimal('0') if the value represents zero; otherwise, the original value or None.
        """
        if v == "":
            return None
        if v == 0 or v == "0":
            return Decimal('0')
        return v if v is not None else None

    @field_validator('investing_interests', 'investing_interests_thematic', 'investing_interests_geographies', 'product_preferences', mode='before')
    def handle_empty_arrays(cls, v):
        """Convert None or empty string values to an empty list for list fields.

        This validator ensures that if a field intended to be a list is provided as None or an empty string,
        it is converted to an empty list. If the input value is already a list, it is returned unchanged.

        Parameters:
            v (Any): The value to validate and possibly convert.

        Returns:
            list: The original list if provided, or an empty list if the input is None or an empty string.
        """
        if v is None or v == "":
            return []
        return v

class InvestmentPreferencesData(BaseModel):
    investor_type: Optional[str] = None
    advisor_preference: Optional[str] = None
    investing_interests: Optional[str] = None
    product_preferences: Optional[str] = None

class RetirementData(BaseModel):
    rrsp_savings: Optional[Decimal] = None
    tfsa_savings: Optional[Decimal] = None
    other_retirement_accounts: Optional[Decimal] = None
    desired_retirement_lifestyle: Optional[str] = None

class InvestmentPreferencesCreate(BaseModel):
    investor_type: Optional[str] = None
    advisor_preference: Optional[str] = None
    investing_interests: Optional[List[str]] = Field(default_factory=list)
    investing_interests_thematic: Optional[List[str]] = Field(default_factory=list)
    investing_interests_geographies: Optional[List[str]] = Field(default_factory=list)
    product_preferences: Optional[List[str]] = Field(default_factory=list)

class RetirementDetailsCreate(BaseModel):
    rrsp_savings: Optional[Decimal] = Field(default=None)
    tfsa_savings: Optional[Decimal] = Field(default=None)
    other_retirement_accounts: Optional[Decimal] = Field(default=None)
    desired_retirement_lifestyle: Optional[str] = None

    @field_validator('rrsp_savings', 'tfsa_savings', 'other_retirement_accounts', mode='before')
    def handle_zero_values(cls, v):
        """Convert zero values to a Decimal('0') for retirement details fields.

        This validator checks if the provided value is zero (as a number or string) and returns Decimal('0').
        If the input value is not provided, it returns None.

        Parameters:
            v (Any): The value to validate and convert.

        Returns:
            Optional[Decimal]: A Decimal('0') if the value is zero; otherwise, the original value or None.
        """
        if v == 0 or v == "0":
            return Decimal('0')
        return v if v is not None else None

class SignupRequest(BaseModel):
    user_data: UserCreate
    profile_data: ClientProfileCreate
    financial_data: Optional[FinancialOverviewCreate] = None
    investment_preferences: Optional[InvestmentPreferencesCreate] = None
    retirement_data: Optional[RetirementDetailsCreate] = None

class DiagnosticDimension(BaseModel):
    status: str = Field(..., description="Current status assessment (e.g., 'Good', 'Needs Attention', 'Critical')")
    strengths: list[str] = Field(..., description="List of identified financial strengths")
    areas_for_improvement: list[str] = Field(..., description="List of areas that need improvement")

class FinancialAssessment(BaseModel):
    introduction: str = Field(..., description="Personalized introduction summarizing the client's overall financial situation")
    everyday_money: DiagnosticDimension = Field(..., description="Assessment of daily financial management")
    investments: DiagnosticDimension = Field(..., description="Assessment of investment strategy and portfolio")
    retirement: DiagnosticDimension = Field(..., description="Assessment of retirement planning and readiness")
    created_at: Optional[str] = Field(None, description="Timestamp when this assessment was created")
    schema_version: Optional[str] = Field(None, description="Version of the assessment schema")

class GICProductDetails(BaseModel):
    company: str = Field(..., description="GIC provider company name")
    product: str = Field(..., description="GIC product name")
    term_years: float = Field(..., description="Term length in years")
    rate_return_percent: float = Field(..., description="Annual interest rate percentage")

class GICRecommendation(BaseModel):
    recommended_product_details: GICProductDetails = Field(..., description="Details of the recommended GIC product")
    rationale: str = Field(..., description="Clear explanation of why this GIC is recommended")
    excess_cash: float = Field(..., description="Amount available above emergency fund")
    potential_returns: str = Field(..., description="Calculation showing potential returns")

class RecommendedProduct(BaseModel):
    product_id: int = Field(..., description="Product ID from respective product table")
    recommended_symbol: str = Field(..., description="Product symbol or identifier")
    recommended_rationale: str = Field(..., description="Recommendation rationale")

class RetirementRecommendation(BaseModel):
    recommended_products: list[RecommendedProduct] = Field(..., description="List of recommended ETF products")
    investment_strategy: str = Field(..., description="Overall investment strategy explanation")
    risk_assessment: str = Field(..., description="Risk level and considerations")
    potential_returns: str = Field(..., description="Explanation of potential returns")
    key_considerations: list[str] = Field(..., description="Key points to consider")
    next_steps: list[str] = Field(..., description="Action items for the client")

class InvestmentRecommendation(BaseModel):
    recommended_products: list[RecommendedProduct]
    investment_strategy: str
    risk_assessment: str
    potential_returns: str
    key_considerations: list[str]
    next_steps: list[str]

class InvestmentPreferences(BaseModel):
    id: UUID4
    client_profile_id: UUID4  # Changed from user_id
    investor_type: Optional[str] = None
    advisor_preference: Optional[str] = None
    investing_interests: Optional[str] = None
    product_preferences: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RetirementDetails(BaseModel):
    id: UUID4
    client_profile_id: UUID4  # Changed from user_id
    rrsp_savings: Optional[Decimal] = None
    tfsa_savings: Optional[Decimal] = None
    other_retirement_accounts: Optional[Decimal] = None
    desired_retirement_lifestyle: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RetirementPlanResponse(BaseModel):
    retirement_age: int
    current_age: int
    years_until_retirement: int
    years_in_retirement: int
    monthly_income: float
    monthly_expenses: float
    current_savings: float
    monthly_contribution: float
    projected_savings: float
    required_savings: float
    savings_gap: float
    retirement_income: float
    retirement_expenses: float
    government_benefits: float  # Monthly income from CPP & OAS
    savings_income: float      # Monthly income from savings

class RetirementScenarioRequest(BaseModel):
    retirement_age: int = Field(..., ge=55, le=75)
    monthly_contribution: Decimal = Field(..., ge=0, le=10000)
    risk_level: str = Field(..., pattern='^(conservative|moderate|aggressive)$')

class RetirementScenarioResponse(BaseModel):
    projected_savings: Decimal
    monthly_income: Decimal
    annual_return_rate: float
    retirement_duration: int
    success_probability: float

class RetirementWhatIfRequest(BaseModel):
    current_age: int
    retirement_age: int
    life_expectancy: int
    current_savings: float
    monthly_contribution: float
    expected_return_rate: float
    inflation_rate: float
    desired_retirement_income: float
    include_cpp_oas: bool = True

class RetirementWhatIfResponse(BaseModel):
    retirement_age: int
    total_savings_at_retirement: float
    monthly_retirement_income: float
    savings_gap: float
    monthly_contribution_needed: float
    years_until_retirement: int
    retirement_duration: int
    savings_by_year: List[Dict[str, float]]
    monthly_income_breakdown: Dict[str, float]

# Simple model for GPT-4o response
class RecommendationRequest(BaseModel):
    product_id: int = Field(..., description="Product ID from investment products")
    recommended_symbol: str = Field(..., description="Product symbol or identifier")
    recommended_rationale: str = Field(..., description="Detailed explanation of why this product is recommended")

# Full model for database and API responses
class UserRecommendation(BaseModel):
    id: Optional[int] = None
    user_id: UUID4
    product_type: Literal["investment", "gic", "retirement"]
    product_id: int
    recommended_symbol: str
    recommended_rationale: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Response model for recommendations
class RecommendationResponse(BaseModel):
    has_recommendation: bool
    recommendations: List[UserRecommendation]
    is_existing: bool

# Simple model for GPT-4o response for GIC
class GICRecommendationRequest(BaseModel):
    product_id: int = Field(..., description="Product ID from GIC products")
    recommended_product: str = Field(..., description="GIC product name")
    recommended_rationale: str = Field(..., description="Detailed explanation of why this GIC is recommended")
    potential_returns: str = Field(..., description="Description of potential returns calculation")
    excess_cash: float = Field(..., description="Amount available to invest in GIC")

class ScreeningAnswers(BaseModel):
    """Model for validating screening question answers during signup."""
    financial_stability: str = Field(..., description="Response to financial stability question")
    investment_objective: str = Field(..., description="Response to investment objective question")
    product_preference: str = Field(..., description="Response to investment product preference question")
    financial_literacy: str = Field(..., description="Response to financial literacy self-assessment")

class InvestmentHolding(BaseModel):
    """Model for an individual investment holding."""
    id: Optional[UUID4] = None
    client_profile_id: Optional[UUID4] = None
    holding_name: str
    holding_symbol: Optional[str] = None
    number_of_units: Optional[Decimal] = None
    average_cost_per_unit: Optional[Decimal] = None
    currency: str = "CAD"
    institution: Optional[str] = None
    account_type: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InvestmentHoldingCreate(BaseModel):
    """Model for creating a new investment holding."""
    holding_name: str
    holding_symbol: Optional[str] = None
    number_of_units: Optional[Decimal] = None
    average_cost_per_unit: Optional[Decimal] = None
    currency: str = "CAD"
    institution: Optional[str] = None
    account_type: Optional[str] = None

class ExtractedInvestmentHolding(BaseModel):
    """Model for investment holding extracted from a statement."""
    holding_name: str
    holding_symbol: Optional[str] = None
    number_of_units: Optional[float] = None
    average_cost_per_unit: Optional[float] = None
    currency: str = "CAD"
    institution: Optional[str] = None
    account_type: Optional[str] = None

class InvestmentExtractResponse(BaseModel):
    """Response model for the investment extraction endpoint."""
    success: bool
    holdings: List[ExtractedInvestmentHolding]
    message: Optional[str] = None

class SaveInvestmentHoldingsRequest(BaseModel):
    """Request model for saving investment holdings."""
    holdings: List[ExtractedInvestmentHolding]
    save_mode: Literal["overwrite", "append"] = "append"

class AssetAllocationExtract(BaseModel):
    """Model for extracted asset allocation data from fund fact sheets."""
    product_symbol: str = Field(..., description="Fund symbol or ticker")
    equity_us: float = Field(0.0, ge=0.0, le=100.0, description="US equity percentage")
    equity_europe: float = Field(0.0, ge=0.0, le=100.0, description="European equity percentage")
    equity_canada: float = Field(0.0, ge=0.0, le=100.0, description="Canadian equity percentage")
    equity_emerging_markets: float = Field(0.0, ge=0.0, le=100.0, description="Emerging markets equity percentage")
    commodity_gold: float = Field(0.0, ge=0.0, le=100.0, description="Gold commodity percentage")
    commodity_other: float = Field(0.0, ge=0.0, le=100.0, description="Other commodities percentage")
    bonds_investmentgrade_us: float = Field(0.0, ge=0.0, le=100.0, description="US investment grade bonds percentage")
    bonds_investmentgrade_canada: float = Field(0.0, ge=0.0, le=100.0, description="Canadian investment grade bonds percentage")
    bonds_international_ex_us: float = Field(0.0, ge=0.0, le=100.0, description="International bonds ex-US percentage")
    bonds_emerging_markets: float = Field(0.0, ge=0.0, le=100.0, description="Emerging markets bonds percentage")
    real_estate: float = Field(0.0, ge=0.0, le=100.0, description="Real estate percentage")
    alternatives: float = Field(0.0, ge=0.0, le=100.0, description="Alternative investments percentage")

    @field_validator('*')
    def round_to_two_decimals(cls, v):
        """Round float values to two decimal places for asset allocation percentages.

        This validator rounds any float value in the asset allocation data to two decimal places.
        If the input value is not a float, it is returned unchanged.

        Parameters:
            v (Any): The value to potentially round.

        Returns:
            Any: The rounded float value if applicable, otherwise the original value.
        """
        if isinstance(v, float):
            return round(v, 2)
        return v

class AssetAllocationSave(BaseModel):
    """Model for saving asset allocation data to the database."""
    investment_product_id: int
    allocations: AssetAllocationExtract

class ScenarioAnalysis(BaseModel):
    impact_analysis: str = Field(
        ...,
        description="A detailed analysis of how the scenario impacts the portfolio."
    )
    risk_assessment: str = Field(
        ...,
        description="An evaluation of the risks associated with the scenario."
    )
    recommended_actions: str = Field(
        ...,
        description="Specific recommended actions based on the analysis."
    )

class VerifyCodeRequest(BaseModel):
    email: str
    code: str
