import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Info, 
  TrendingUp, 
  ArrowRight, 
  Lightbulb, 
  Clock, 
  DollarSign, 
  CalendarClock,
  PiggyBank,
  BarChart3,
  BadgePercent,
  RefreshCcw,
  Coins,
  HelpCircle
} from 'lucide-react'
import { 
  Tooltip as UITooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

interface WhatIfScenario {
  current_age: number
  retirement_age: number
  life_expectancy: number
  current_savings: number
  monthly_contribution: number
  expected_return_rate: number
  inflation_rate: number // We'll set this internally but not expose it to users
  desired_retirement_income: number
  include_cpp_oas: boolean
}

interface WhatIfResult {
  retirement_age: number
  total_savings_at_retirement: number
  monthly_retirement_income: number
  savings_gap: number
  monthly_contribution_needed: number
  years_until_retirement: number
  retirement_duration: number
  savings_by_year: Array<{ year: number; amount: number }>
  monthly_income_breakdown: {
    savings_income: number
    government_benefits: number
  }
}

interface UserProfile {
  name: string
  age: number
  // Other profile fields...
  financial_overview?: {
    monthly_income?: number
    monthly_expenses?: number
    cash_holdings?: number
    investment_holdings?: number
  }
  retirement_details?: {
    rrsp_savings?: number
    tfsa_savings?: number
    other_retirement_accounts?: number
    desired_retirement_lifestyle?: string
  }
}

// Format currency inputs with commas
const formatCurrency = (value: number | string): string => {
  if (!value && value !== 0) return '';
  // Convert to string, remove existing commas, and parse
  const numValue = typeof value === 'string' ? 
    parseFloat(value.replace(/,/g, '')) : 
    value;
  
  // Round to nearest integer and format with commas
  return Math.round(numValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Parse formatted currency back to number
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove commas and convert to number
  return parseFloat(value.replace(/,/g, '')) || 0;
};

export default function RetirementWhatIf() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("inputs")
  
  // Initialize with conservative default values
  const [scenario, setScenario] = useState<WhatIfScenario>({
    current_age: 35,
    retirement_age: 65,
    life_expectancy: 90,
    current_savings: 0,
    monthly_contribution: 0,
    expected_return_rate: 6.0,  // Store as percentage for UI
    inflation_rate: 2.5,       // Fixed at 2.5% and not exposed to users
    desired_retirement_income: 0, 
    include_cpp_oas: true
  })
  
  const [result, setResult] = useState<WhatIfResult | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Add tooltips content
  const tooltipContent = {
    currentSavings: "The total amount you've already saved for retirement across all accounts.",
    monthlySavings: "How much you're setting aside each month specifically for retirement.",
    expectedReturn: "The average annual return you expect from your investments, after inflation.",
    retirementAge: "The age at which you plan to retire and start withdrawing from your savings.",
    lifeExpectancy: "How long you expect to live. It's better to overestimate than underestimate.",
    yearlyIncome: "How much annual income you want to have during retirement.",
    govtBenefits: "Includes Canada Pension Plan (CPP) and Old Age Security (OAS) benefits."
  }
  
  // Always include government benefits
  useEffect(() => {
    if (!scenario.include_cpp_oas) {
      setScenario(prev => ({
        ...prev,
        include_cpp_oas: true
      }));
    }
  }, [scenario.include_cpp_oas]);
  
  // Fetch user profile and current retirement plan on component mount
  useEffect(() => {
    fetchUserProfile()
    fetchCurrentPlan()
  }, [])
  
  // Update chart data when result changes
  useEffect(() => {
    if (result?.savings_by_year) {
      const data = result.savings_by_year.map(item => ({
        year: item.year,
        amount: item.amount,
        age: item.year - (new Date()).getFullYear() + scenario.current_age
      }))
      setChartData(data)
    }
  }, [result, scenario.current_age])
  
  // Fetch user profile from the API
  const fetchUserProfile = async () => {
    setProfileLoading(true)
    try {
      const response = await apiRequest('/api/profile')
      
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data)
        
        // Initialize scenario with user's actual data
        const currentAge = data.age || 35
        let totalRetirementSavings = 0
        let monthlyContribution = 0
        
        // Calculate total retirement savings from all retirement accounts
        if (data.retirement_details) {
          const { rrsp_savings, tfsa_savings, other_retirement_accounts } = data.retirement_details
          if (rrsp_savings) totalRetirementSavings += Number(rrsp_savings)
          if (tfsa_savings) totalRetirementSavings += Number(tfsa_savings)
          if (other_retirement_accounts) totalRetirementSavings += Number(other_retirement_accounts)
        }
        
        // Estimate monthly contributions from monthly income
        if (data.financial_overview && data.financial_overview.monthly_income) {
          // Assuming roughly 10% of income goes to retirement savings
          monthlyContribution = Number(data.financial_overview.monthly_income) * 0.1
        }
        
        // Estimate desired retirement income based on current income
        let desiredRetirementIncome = 60000 // Default annual
        if (data.financial_overview && data.financial_overview.monthly_income) {
          // Typically people want ~70-80% of their pre-retirement income
          desiredRetirementIncome = Number(data.financial_overview.monthly_income) * 12 * 0.75
        }
        
        setScenario(prev => ({
          ...prev,
          current_age: currentAge,
          retirement_age: Math.max(65, currentAge + 10), // At least 10 years in the future
          life_expectancy: Math.max(90, currentAge + 30), // At least 30 years out
          current_savings: totalRetirementSavings || prev.current_savings,
          monthly_contribution: monthlyContribution || prev.monthly_contribution,
          desired_retirement_income: desiredRetirementIncome || prev.desired_retirement_income
        }))
      } else {
        console.error("Error fetching user profile")
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setProfileLoading(false)
    }
  }
  
  // Fetch user's current retirement plan
  const fetchCurrentPlan = async () => {
    try {
      const response = await apiRequest('/api/retirement/current-plan')
      
      if (response.ok) {
        const data = await response.json()
        setCurrentPlan(data)
        
        // Initialize scenario with current plan data if available
        if (data) {
          setScenario(prev => ({
            ...prev,
            retirement_age: data.retirement_age || prev.retirement_age,
            current_savings: data.current_savings || prev.current_savings,
            monthly_contribution: data.monthly_contribution || prev.monthly_contribution,
            desired_retirement_income: data.retirement_income * 12 || prev.desired_retirement_income, // Convert to annual
          }))
        }
      } else {
        console.error("Error fetching current plan")
        }
      } catch (error) {
      console.error("Error fetching current plan:", error)
      } finally {
        setLoading(false)
      }
    }

  // Calculate retirement scenario
  const calculateScenario = async () => {
    setCalculating(true)
    setError(null)
    
    try {
      // Create API payload with properly formatted percentages
      const apiPayload = {
        ...scenario,
        // Convert percentages to decimal format for backend (6% → 0.06)
        expected_return_rate: scenario.expected_return_rate / 100,
        inflation_rate: scenario.inflation_rate / 100
      };
      
      const response = await apiRequest('/api/retirement/what-if', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      })
      
      if (response.ok) {
      const data = await response.json()
      setResult(data)
        // Auto-switch to results tab after calculating
        setActiveTab("results")
      } else {
        const errorData = await response.json()
        setError(errorData.detail || "Failed to calculate retirement scenario")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setCalculating(false)
    }
  }

  // Update handling for input changes
  const handleInputChange = (updates: Partial<WhatIfScenario>) => {
    setScenario(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Add currency input handler for properly formatted inputs
  const handleCurrencyInput = (field: keyof WhatIfScenario) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCurrency(e.target.value);
    e.target.value = formattedValue;
    handleInputChange({ [field]: parseCurrency(formattedValue) });
  };
  
  // Reset to original parameters
  const resetToDefaults = () => {
    // First get user data
    const currentAge = userProfile?.age || 35;
    let totalRetirementSavings = 0;
    
    // Calculate total retirement savings
    if (userProfile?.retirement_details) {
      const { rrsp_savings, tfsa_savings, other_retirement_accounts } = userProfile.retirement_details;
      if (rrsp_savings) totalRetirementSavings += Number(rrsp_savings);
      if (tfsa_savings) totalRetirementSavings += Number(tfsa_savings);
      if (other_retirement_accounts) totalRetirementSavings += Number(other_retirement_accounts);
    }
    
    // Set reasonable defaults based on current profile
    setScenario({
      current_age: currentAge,
      retirement_age: Math.max(65, currentAge + 10),
      life_expectancy: Math.max(90, currentAge + 30),
      current_savings: totalRetirementSavings || 100000,
      monthly_contribution: 1000,
      expected_return_rate: 6.0,
      inflation_rate: 2.5,
      desired_retirement_income: 80000,
      include_cpp_oas: true
    });
  };
  
  // Calculate retirement readiness percentage
  const calculateReadiness = () => {
    if (!result) return 0;
    
    const currentIncome = result.monthly_retirement_income * 12;
    const targetIncome = scenario.desired_retirement_income;
    
    if (targetIncome <= 0) return 100;
    const readiness = (currentIncome / targetIncome) * 100;
    
    // Cap at 100%
    return Math.min(100, readiness);
  };
  
  // Get color for readiness indicator
  const getReadinessColor = (readiness: number) => {
    if (readiness >= 90) return "text-green-500";
    if (readiness >= 75) return "text-emerald-500";
    if (readiness >= 50) return "text-yellow-500";
    if (readiness >= 25) return "text-orange-500";
    return "text-red-500";
  };
  
  if (loading || profileLoading) {
    return <LoadingScreen message="Loading retirement planner..." />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header section with breadcrumb and navigation */}
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate('/retirement/checklist')} 
          className="flex items-center gap-1"
        >
          Retirement Overview <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Title section */}
      <div className="text-center mb-8">
        <Badge variant="outline" className="mb-3 font-medium px-3 py-1">
          <Clock className="h-4 w-4 mr-1 inline" /> Retirement Planning
        </Badge>
        <h1 className="text-3xl font-bold font-montserrat mb-2">Your Retirement What-If Scenario</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore different retirement scenarios to see how changes to your savings, investments, and retirement age affect your financial future.
        </p>
      </div>

      {/* Error message if present */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Main tabbed interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="inputs" className="text-sm">
            <Coins className="h-4 w-4 mr-2" /> Your Scenario
          </TabsTrigger>
          <TabsTrigger value="results" className="text-sm" disabled={!result}>
            <BarChart3 className="h-4 w-4 mr-2" /> Results & Analysis
          </TabsTrigger>
        </TabsList>
        
        {/* Inputs Tab */}
        <TabsContent value="inputs">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Situation Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  Current Situation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Label htmlFor="current_age" className="font-medium">Your age</Label>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Your current age, used as the starting point for calculations.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="current_age"
                    type="number"
                    value={scenario.current_age}
                    readOnly
                    className="w-24 text-right bg-muted"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Label htmlFor="current_savings" className="font-medium">Current retirement savings</Label>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{tooltipContent.currentSavings}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="current_savings"
                      type="text"
                      value={formatCurrency(scenario.current_savings)}
                      onChange={handleCurrencyInput('current_savings')}
                      className="pl-8 text-right"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Label htmlFor="monthly_contribution" className="font-medium">Monthly savings</Label>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{tooltipContent.monthlySavings}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="monthly_contribution"
                      type="text"
                      value={formatCurrency(scenario.monthly_contribution)}
                      onChange={handleCurrencyInput('monthly_contribution')}
                      className="pl-8 text-right"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Retirement Goals Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  Retirement Goals
                </CardTitle>
          </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <Label htmlFor="retirement_age" className="font-medium">Retire at age</Label>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{tooltipContent.retirementAge}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-lg font-medium">{scenario.retirement_age}</span>
                  </div>
              <Slider
                value={[scenario.retirement_age]}
                    min={Math.min(scenario.current_age + 1, 60)}
                max={75}
                step={1}
                onValueChange={([value]) => handleInputChange({ retirement_age: value })}
                    className="py-4"
              />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Early</span>
                    <span>Normal</span>
                    <span>Late</span>
                  </div>
            </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <Label htmlFor="life_expectancy" className="font-medium">Life expectancy</Label>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{tooltipContent.lifeExpectancy}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-lg font-medium">{scenario.life_expectancy}</span>
                  </div>
              <Slider
                    value={[scenario.life_expectancy]}
                    min={Math.max(scenario.retirement_age + 1, 70)}
                    max={100}
                    step={1}
                    onValueChange={([value]) => handleInputChange({ life_expectancy: value })}
                    className="py-4"
              />
            </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Label htmlFor="desired_retirement_income" className="font-medium">Yearly income needed</Label>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{tooltipContent.yearlyIncome}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="desired_retirement_income"
                      type="text"
                      value={formatCurrency(scenario.desired_retirement_income)}
                      onChange={handleCurrencyInput('desired_retirement_income')}
                      className="pl-8 text-right"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Investment Settings Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg flex items-center">
                  <BadgePercent className="h-5 w-5 mr-2 text-purple-500" />
                  Investment Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <Label htmlFor="expected_return_rate" className="font-medium">Expected return</Label>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{tooltipContent.expectedReturn}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-medium">{scenario.expected_return_rate.toFixed(1)}</span>
                      <span className="text-sm">%</span>
                    </div>
                  </div>
              <Slider
                    value={[scenario.expected_return_rate]}
                    min={1}
                max={12}
                    step={0.1}
                    onValueChange={([value]) => handleInputChange({ expected_return_rate: value })}
                    className="py-4"
              />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative</span>
                    <span>Balanced</span>
                    <span>Aggressive</span>
                  </div>
            </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Label htmlFor="include_cpp_oas" className="font-medium">Include government benefits</Label>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground ml-1.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{tooltipContent.govtBenefits}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
              <Switch
                      id="include_cpp_oas"
                checked={scenario.include_cpp_oas}
                onCheckedChange={(checked) => handleInputChange({ include_cpp_oas: checked })}
              />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Includes CPP and OAS (Canada Pension Plan and Old Age Security)</p>
                </div>
                
                <div className="pt-2">
                  <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1 mb-4">
                    <p className="flex items-center text-muted-foreground">
                      <Info className="h-4 w-4 mr-1.5 text-blue-500" />
                      Our calculator assumes a {scenario.inflation_rate}% inflation rate
                    </p>
                  </div>
            </div>

                <div className="flex gap-3 mt-2">
                  <Button
                    variant="outline"
                    onClick={resetToDefaults}
                    className="flex-1"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
            <Button 
              onClick={calculateScenario}
                    disabled={calculating}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {calculating ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        Calculating
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Calculate
                      </>
                    )}
            </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Quick tips section */}
          <div className="mt-8">
            <Card className="border-blue-100 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center text-blue-700 dark:text-blue-400">
                  <Lightbulb className="h-5 w-5 mr-2 text-blue-500" />
                  Quick tips for retirement planning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">1</div>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Most retirees need about 70-80% of their pre-retirement income to maintain their lifestyle.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">2</div>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Increasing your monthly contributions has a bigger impact than small changes to your retirement age.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">3</div>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      The CPP and OAS provide a foundation, but most Canadians need additional savings for a comfortable retirement.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Results Tab */}
        <TabsContent value="results">
          {result ? (
            <div className="space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary-foreground border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm text-muted-foreground">Total at retirement</h3>
                      <PiggyBank className="h-5 w-5 text-primary/70" />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrencyUtil(result.total_savings_at_retirement)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      At age {scenario.retirement_age}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary-foreground border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm text-muted-foreground">Monthly retirement income</h3>
                      <DollarSign className="h-5 w-5 text-primary/70" />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrencyUtil(result.monthly_retirement_income)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrencyUtil(result.monthly_retirement_income * 12)} per year
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-primary-foreground border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm text-muted-foreground">Years until retirement</h3>
                      <Clock className="h-5 w-5 text-primary/70" />
                    </div>
                    <p className="text-2xl font-bold">{result.years_until_retirement}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Retiring at age {scenario.retirement_age}
                    </p>
          </CardContent>
        </Card>

                <Card className="bg-primary-foreground border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm text-muted-foreground">Years in retirement</h3>
                      <CalendarClock className="h-5 w-5 text-primary/70" />
                    </div>
                    <p className="text-2xl font-bold">{result.retirement_duration}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      From age {scenario.retirement_age} to {scenario.life_expectancy}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Retirement Readiness */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Your retirement readiness</CardTitle>
                  <CardDescription>
                    How ready you are for your desired retirement
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
        <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Not ready</span>
                        <span className="text-sm text-muted-foreground">Ready for retirement</span>
                      </div>
                      <Progress value={calculateReadiness()} className="h-2.5" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <h4 className="font-medium mb-1">Your retirement income:</h4>
                        <p>${formatCurrencyUtil(result.monthly_retirement_income * 12)}/year</p>
                      </div>
                      <div className="text-right">
                        <h4 className="font-medium mb-1">Your target income:</h4>
                        <p>${formatCurrencyUtil(scenario.desired_retirement_income)}/year</p>
                      </div>
                    </div>
                    
                    {/* Gap/Surplus message */}
                    {result.savings_gap > 0 ? (
                      <div className="flex items-start gap-4 p-4 border-l-4 border-red-400 bg-red-50 rounded-r-lg dark:bg-red-900/20">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div className="space-y-2">
                          <h3 className="font-semibold text-red-700 dark:text-red-400">
                            Monthly shortfall: {formatCurrencyUtil(result.savings_gap)}
                          </h3>
                          <p className="text-sm">
                            To meet your goals, consider one or more of these changes:
                          </p>
                          <ul className="text-sm space-y-1 list-disc pl-4">
                            <li>Increase monthly savings to <strong>{formatCurrencyUtil(result.monthly_contribution_needed)}</strong></li>
                            <li>Delay retirement by a few years</li>
                            <li>Adjust your expected retirement income</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4 p-4 border-l-4 border-green-400 bg-green-50 rounded-r-lg dark:bg-green-900/20">
                        <Lightbulb className="h-5 w-5 text-green-500 mt-0.5" />
                        <div className="space-y-2">
                          <h3 className="font-semibold text-green-700 dark:text-green-400">
                            Monthly surplus: {formatCurrencyUtil(Math.abs(result.savings_gap))}
                          </h3>
                          <p className="text-sm">
                            You're on track to exceed your retirement income goals. Consider these options:
                          </p>
                          <ul className="text-sm space-y-1 list-disc pl-4">
                            <li>Retire earlier than planned</li>
                            <li>Increase your retirement income expectations</li>
                            <li>Redirect some savings to other financial goals</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Chart section */}
          <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Savings projection over time</CardTitle>
                  <CardDescription>
                    How your retirement savings grow and eventually get used in retirement
                  </CardDescription>
            </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-80 w-full bg-white dark:bg-gray-800 rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="year" 
                          tickFormatter={(year) => String(year)}
                          label={{ 
                            value: 'Year', 
                            position: 'bottom',
                            offset: 0
                          }}
                  />
                  <YAxis 
                          tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                          label={{ 
                            value: 'Savings', 
                            angle: -90, 
                            position: 'insideLeft',
                            offset: -10
                          }}
                  />
                  <Tooltip 
                          formatter={(value) => [`${formatCurrencyUtil(value as number)}`, 'Savings']}
                          labelFormatter={(year) => `Year: ${year} (Age: ${chartData.find(d => d.year === year)?.age})`}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Legend />
                        
                        {/* Current age reference line */}
                        <ReferenceLine 
                          x={(new Date()).getFullYear()} 
                          stroke="#6366f1" 
                          strokeDasharray="3 3" 
                          label={{ 
                            value: 'Now', 
                            position: 'top',
                            fill: '#6366f1',
                            fontSize: 12
                          }} 
                        />
                        
                        {/* Retirement age reference line */}
                        <ReferenceLine 
                          x={(new Date()).getFullYear() + (scenario.retirement_age - scenario.current_age)} 
                          stroke="#10b981" 
                          strokeDasharray="3 3" 
                          label={{ 
                            value: 'Retire', 
                            position: 'top',
                            fill: '#10b981',
                            fontSize: 12
                          }} 
                        />
                        
                  <Line 
                    type="monotone" 
                          name="Retirement Savings"
                    dataKey="amount" 
                          stroke="#8884d8"
                          strokeWidth={2.5}
                    dot={false} 
                          activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                      <CardContent className="p-4">
                        <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Accumulation phase
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          During the next {result.years_until_retirement} years, you'll build your savings from ${formatCurrency(scenario.current_savings)} to ${formatCurrency(result.total_savings_at_retirement)}.
                        </p>
            </CardContent>
          </Card>

                    <Card className="bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30">
                      <CardContent className="p-4">
                        <h3 className="font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Withdrawal phase
                        </h3>
                        <p className="text-sm text-green-600 dark:text-green-300">
                          For {result.retirement_duration} years of retirement, you'll gradually use your savings to support your lifestyle along with government benefits.
                        </p>
                      </CardContent>
                    </Card>
                </div>
              </CardContent>
            </Card>

              {/* Income breakdown */}
            <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Monthly retirement income breakdown</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-3">Income sources</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>From your savings</span>
                              <span className="font-medium">
                                {formatCurrencyUtil(result.monthly_income_breakdown.savings_income)}
                              </span>
                            </div>
                            <Progress 
                              value={(result.monthly_income_breakdown.savings_income / result.monthly_retirement_income) * 100} 
                              className="h-2 bg-blue-200" 
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Government benefits</span>
                              <span className="font-medium">
                                {formatCurrencyUtil(result.monthly_income_breakdown.government_benefits)}
                              </span>
                            </div>
                            <Progress 
                              value={(result.monthly_income_breakdown.government_benefits / result.monthly_retirement_income) * 100} 
                              className="h-2 bg-green-200" 
                            />
                          </div>
                          
                          <div className="pt-2 border-t">
                            <div className="flex justify-between text-sm font-medium">
                              <span>Total monthly income</span>
                              <span>{formatCurrencyUtil(result.monthly_retirement_income)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-3">Expected annual income</h3>
                        <p className="text-3xl font-bold">{formatCurrencyUtil(result.monthly_retirement_income * 12)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.monthly_retirement_income * 12 >= scenario.desired_retirement_income
                            ? "Meets or exceeds your target"
                            : `${((result.monthly_retirement_income * 12) / scenario.desired_retirement_income * 100).toFixed(0)}% of your target income`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-primary-foreground border rounded-lg">
                        <h3 className="font-medium mb-2">Recommendations</h3>
                        
                        {result.savings_gap > 0 ? (
                          <ul className="space-y-3">
                            <li className="flex gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs">1</div>
                              <div className="text-sm">
                                <strong>Increase savings:</strong> Consider increasing your monthly retirement savings by at least {formatCurrencyUtil(result.savings_gap)}.
                              </div>
                            </li>
                            <li className="flex gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs">2</div>
                              <div className="text-sm">
                                <strong>Adjust retirement age:</strong> Delaying retirement by {Math.ceil(result.savings_gap / (result.monthly_contribution * 0.05))} years could help close the gap.
                              </div>
                            </li>
                            <li className="flex gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs">3</div>
                              <div className="text-sm">
                                <strong>Review investment strategy:</strong> A slightly more aggressive investment approach might improve returns.
                              </div>
                            </li>
                          </ul>
                        ) : (
                          <ul className="space-y-3">
                            <li className="flex gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs">1</div>
                              <div className="text-sm">
                                <strong>Consider earlier retirement:</strong> You could potentially retire {Math.floor(Math.abs(result.savings_gap) / 500)} years earlier than planned.
                              </div>
                            </li>
                            <li className="flex gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs">2</div>
                              <div className="text-sm">
                                <strong>Increase retirement lifestyle:</strong> You could spend an additional {formatCurrencyUtil(Math.abs(result.savings_gap))} per month in retirement.
                              </div>
                            </li>
                            <li className="flex gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs">3</div>
                              <div className="text-sm">
                                <strong>Balance other goals:</strong> Consider allocating some savings to other financial priorities.
                              </div>
                            </li>
                          </ul>
                        )}
                      </div>
                      
                      <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900/30">
                        <div className="flex items-start gap-2 mb-2">
                          <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <h3 className="font-medium text-yellow-700 dark:text-yellow-400">Important considerations</h3>
                        </div>
                        <ul className="text-sm space-y-2 text-yellow-700 dark:text-yellow-400">
                          <li>• These projections are based on average returns and constant inflation.</li>
                          <li>• Actual market performance will vary and impact results.</li>
                          <li>• Healthcare costs often increase in later retirement years.</li>
                          <li>• Regularly review and adjust your plan as your situation changes.</li>
                        </ul>
                      </div>
                </div>
                </div>
              </CardContent>
                
                <CardFooter className="border-t pt-6 flex justify-between gap-4">
                  <Button variant="outline" onClick={() => setActiveTab("inputs")}>
                    Modify your scenario
                  </Button>
                  
                  <Button
                    onClick={calculateScenario}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Recalculate
                  </Button>
                </CardFooter>
            </Card>
          </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
              <h3 className="text-xl font-semibold mb-2">No results to display yet</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Please enter your retirement scenario information and click "Calculate" to see your personalized retirement projection.
              </p>
              <Button onClick={() => setActiveTab("inputs")}>
                Go to scenario inputs
              </Button>
      </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 