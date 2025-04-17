import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DollarSign, 
  PiggyBank, 
  TrendingUp, 
  Clock, 
  Shield, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Wallet,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  BarChart3,
  Lightbulb,
  Info,
  ExternalLink,
  Layers
} from 'lucide-react'

interface FinancialPlan {
  profile_summary: {
    name: string
    age: number
    investor_type: string
    monthly_income: number
    monthly_expenses: number
    monthly_savings: number
    savings_rate: number
  }
  financial_health: {
    emergency_fund: {
      cash_balance: number
      monthly_expenses: number
      months_coverage: number
      status: string
      target_months: number
      progress_percentage: number
    }
    debt_overview: {
      total_debt: number
      debt_to_income: number
      status: string
      monthly_payment_estimate: number
    }
    net_worth: {
      total_assets: number
      total_liabilities: number
      net_worth: number
    }
  }
  investment_health: any
  retirement_health: any
  savings_health: any
  retirement_projection: {
    current_retirement_savings: number
    breakdown: {
      rrsp: number
      tfsa: number
      other: number
    }
    monthly_contribution: number
    estimated_retirement_age: number
    years_until_retirement: number
  }
  recommendations: {
    investment: any
    retirement: any
    emergency_fund: {
      recommendation: string
      action: string
    }
    debt: {
      recommendation: string
      action: string
    }
  }
}

// Define status types to help TypeScript
type StatusType = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';

const STATUS_COLORS: Record<StatusType, string> = {
  Excellent: 'bg-green-500',
  Good: 'bg-blue-500',
  Fair: 'bg-yellow-500',
  Poor: 'bg-orange-500',
  Critical: 'bg-red-500'
};

// Custom color palette with more vibrant colors
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function FinancialPlan() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const [planData, setPlanData] = useState<FinancialPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const fetchInProgress = useRef(false)
  const requestComplete = useRef(false)

  const fetchFinancialPlan = useCallback(async () => {
    // Skip if already completed or in progress
    if (requestComplete.current || fetchInProgress.current) {
      return;
    }

    try {
      fetchInProgress.current = true;
      console.log("Fetching financial plan...")
      const response = await apiRequest('/api/financial-plan')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch financial plan')
      }
      
      const data = await response.json()
      setPlanData(data)
      setLoading(false)
      // Mark request as complete
      requestComplete.current = true;
    } catch (err) {
      console.error("Error fetching financial plan:", err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    } finally {
      fetchInProgress.current = false;
    }
  }, [apiRequest])

  useEffect(() => {
    // Only fetch if not already completed
    if (!requestComplete.current) {
      fetchFinancialPlan();
    }
  }, [fetchFinancialPlan]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  const getSavingsRateMessage = (rate: number) => {
    if (rate >= 20) return " - Excellent job!";
    if (rate >= 10) return " - You're on the right track.";
    return " - There's room to improve here.";
  };

  // Helper function to get status color with type safety
  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status as StatusType] || 'bg-gray-500';
  };

  if (loading) return <LoadingScreen message="Creating your personalized financial plan..." />
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
  if (!planData) return null

  // Prepare net worth breakdown chart data
  const netWorthData = [
    { name: 'Assets', value: planData.financial_health.net_worth.total_assets, color: '#10b981' },
    { name: 'Liabilities', value: -planData.financial_health.net_worth.total_liabilities, color: '#ef4444' }
  ].filter(item => item.value !== 0);

  // Get absolute net worth value for display
  const netWorthValue = planData.financial_health.net_worth.net_worth;
  const isNetWorthPositive = netWorthValue >= 0;

  // Prepare retirement savings breakdown chart data
  const retirementData = [
    { name: 'RRSP', value: planData.retirement_projection.breakdown.rrsp },
    { name: 'TFSA', value: planData.retirement_projection.breakdown.tfsa },
    { name: 'Other', value: planData.retirement_projection.breakdown.other }
  ].filter(item => item.value > 0);

  // Prepare monthly budget breakdown
  const budgetData = [
    { name: 'Expenses', value: planData.profile_summary.monthly_expenses },
    { name: 'Savings', value: planData.profile_summary.monthly_savings }
  ];

  // Determine if user has high priority actions needed
  const hasEmergencyFundIssue = planData.financial_health.emergency_fund.months_coverage < 3;
  const hasDebtIssue = planData.financial_health.debt_overview.debt_to_income > 30;
  const hasLowSavingsRate = planData.profile_summary.savings_rate < 10;
  const hasPriorityActions = hasEmergencyFundIssue || hasDebtIssue || hasLowSavingsRate;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6 max-w-6xl">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => navigate('/dashboard')}
          className="bg-primary hover:bg-primary/90"
          size="sm"
        >
          Dashboard
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Page Header with Summary Badge */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-2">
          <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
            Financial plan
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-montserrat font-bold">{planData.profile_summary.name}'s financial plan</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          A personalized overview of your financial health and ideas to help you reach your goals
        </p>
      </div>

      {/* Priority Actions Alert - Only shown if there are priority actions needed */}
      {hasPriorityActions && (
        <Alert className="bg-amber-50 border-amber-200 mb-6">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-800 font-medium">Your priority actions</AlertTitle>
          <AlertDescription className="text-amber-700">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
              {hasEmergencyFundIssue && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-amber-300 bg-amber-100/50 text-amber-800 hover:bg-amber-100"
                  onClick={() => navigate('/grow-savings')}
                >
                  <Shield className="h-3.5 w-3.5 mr-1.5" /> 
                  Build emergency fund
                </Button>
              )}
              {hasDebtIssue && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-amber-300 bg-amber-100/50 text-amber-800 hover:bg-amber-100"
                  onClick={() => navigate('/budget')}
                >
                  <TrendingDown className="h-3.5 w-3.5 mr-1.5" /> 
                  Manage debt
                </Button>
              )}
              {hasLowSavingsRate && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-amber-300 bg-amber-100/50 text-amber-800 hover:bg-amber-100"
                  onClick={() => navigate('/grow-savings')}
                >
                  <PiggyBank className="h-3.5 w-3.5 mr-1.5" /> 
                  Boost savings
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Navigation Tabs */}
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <div className="flex justify-center mb-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="overview" className="data-[state=active]:font-medium">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              <span className="sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="savings" className="data-[state=active]:font-medium">
              <Wallet className="h-4 w-4 mr-1.5" />
              <span className="sm:inline">Savings</span>
            </TabsTrigger>
            <TabsTrigger value="investments" className="data-[state=active]:font-medium">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              <span className="sm:inline">Investments</span>
            </TabsTrigger>
            <TabsTrigger value="retirement" className="data-[state=active]:font-medium">
              <Clock className="h-4 w-4 mr-1.5" />
              <span className="sm:inline">Retirement</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 slide-in-from-left-4 duration-300">
          {/* Net Worth Card */}
          <Card className="overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <DollarSign className="h-5 w-5 text-primary" />
                Your Net Worth
              </CardTitle>
              <CardDescription>
                Your overall financial picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col justify-center">
                  <div className="mb-4">
                    <span className="text-sm text-muted-foreground">Total Net Worth</span>
                    <h3 className="text-3xl font-bold flex items-center gap-2">
                      {formatCurrency(Math.abs(netWorthValue))}
                      {isNetWorthPositive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Positive</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>
                      )}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/40 rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Assets</span>
                      <p className="text-lg font-medium">{formatCurrency(planData.financial_health.net_worth.total_assets)}</p>
                      <span className="text-xs text-muted-foreground">What you own</span>
                    </div>
                    <div className="p-4 bg-muted/40 rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Liabilities</span>
                      <p className="text-lg font-medium">{formatCurrency(planData.financial_health.net_worth.total_liabilities)}</p>
                      <span className="text-xs text-muted-foreground">What you owe</span>
                    </div>
                  </div>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={netWorthData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" domain={['auto', 'auto']} tickFormatter={(value) => `$${Math.abs(value / 1000)}k`} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => formatCurrency(Math.abs(Number(value)))} />
                      <Bar dataKey="value">
                        {netWorthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Money Flow Card */}
      <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Wallet className="h-5 w-5 text-primary" />
                Monthly Money Flow
              </CardTitle>
              <CardDescription>
                Your income, expenses and savings
              </CardDescription>
        </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
            <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Income</span>
                        <span className="font-medium">{formatCurrency(planData.profile_summary.monthly_income)}</span>
                      </div>
                      <Progress value={100} className="h-2 bg-muted" />
            </div>
            <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Expenses</span>
                        <span className="font-medium">{formatCurrency(planData.profile_summary.monthly_expenses)}</span>
                      </div>
                      <Progress 
                        value={(planData.profile_summary.monthly_expenses / planData.profile_summary.monthly_income) * 100} 
                        className="h-2 bg-muted" 
                      />
            </div>
            <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Savings</span>
                        <span className="font-medium">{formatCurrency(planData.profile_summary.monthly_savings)}</span>
                      </div>
                      <Progress 
                        value={(planData.profile_summary.monthly_savings / planData.profile_summary.monthly_income) * 100} 
                        className={`h-2 bg-muted ${planData.profile_summary.savings_rate >= 20 ? 'text-green-500' : 'text-amber-500'}`}
                      />
                    </div>
                  </div>
                  
                  <div className={`mt-4 p-4 rounded-lg ${
                    planData.profile_summary.savings_rate >= 20 ? 'bg-green-50 border border-green-100' : 
                    planData.profile_summary.savings_rate >= 10 ? 'bg-blue-50 border border-blue-100' : 
                    'bg-amber-50 border border-amber-100'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        planData.profile_summary.savings_rate >= 20 ? 'bg-green-100' : 
                        planData.profile_summary.savings_rate >= 10 ? 'bg-blue-100' : 
                        'bg-amber-100'
                      }`}>
                        <PiggyBank className={`h-5 w-5 ${
                          planData.profile_summary.savings_rate >= 20 ? 'text-green-600' : 
                          planData.profile_summary.savings_rate >= 10 ? 'text-blue-600' : 
                          'text-amber-600'
                        }`} />
            </div>
            <div>
                        <p className="font-medium">You're saving <span className="font-bold">{planData.profile_summary.savings_rate}%</span> of your income</p>
                        <p className="text-sm mt-1">
                          {planData.profile_summary.savings_rate >= 20 
                            ? 'Excellent! You\'re saving more than the recommended 20%.'
                            : planData.profile_summary.savings_rate >= 10
                            ? 'Good start, but aim for 20% for long-term financial security.'
                            : 'Consider increasing your savings rate to at least 20% for long-term financial health.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="h-[250px] flex flex-col justify-center">
                  <h3 className="text-lg font-medium mb-2 text-center">Monthly budget breakdown</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={budgetData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => {
                          return `${name} (${(percent * 100).toFixed(0)}%)`;
                        }}
                        labelLine={false}
                      >
                        <Cell fill="#ef4444" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings Tab */}
        <TabsContent value="savings" className="space-y-6 animate-in fade-in-50 slide-in-from-left-4 duration-300">
          {/* Emergency Fund Card */}
          <Card className={`border border-l-4 ${
            planData.financial_health.emergency_fund.status === 'Excellent' ? 'border-l-green-500' :
            planData.financial_health.emergency_fund.status === 'Good' ? 'border-l-blue-500' :
            planData.financial_health.emergency_fund.status === 'Fair' ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Shield className="h-5 w-5 text-primary" />
                  Emergency fund
                </CardTitle>
                <Badge className={getStatusColor(planData.financial_health.emergency_fund.status)}>
                  {planData.financial_health.emergency_fund.status}
                </Badge>
              </div>
              <CardDescription>
                Your safety net for unexpected expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-sm">
                    {planData.financial_health.emergency_fund.status === 'Excellent' 
                      ? 'Great job! Your emergency fund is fully funded and will cover you for unexpected expenses.'
                      : planData.financial_health.emergency_fund.status === 'Good'
                      ? 'You have a good start on your emergency fund, but consider building it further for more security.'
                      : 'Building a strong emergency fund should be one of your top financial priorities.'}
                  </p>
                  
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Current emergency fund</span>
                      <span className="font-medium">{formatCurrency(planData.financial_health.emergency_fund.cash_balance)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Monthly expenses</span>
                      <span className="font-medium">{formatCurrency(planData.financial_health.emergency_fund.monthly_expenses)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Current coverage</span>
                      <span className="font-medium">{planData.financial_health.emergency_fund.months_coverage} months</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Target coverage</span>
                      <span className="font-medium">{planData.financial_health.emergency_fund.target_months} months</span>
            </div>
          </div>
                  
                  <Button 
                    onClick={() => navigate('/grow-savings')}
                    className="w-full"
                  >
                    <PiggyBank className="mr-2 h-4 w-4" />
                    Build Your Emergency Fund
                  </Button>
                </div>
                
          <div>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress towards {planData.financial_health.emergency_fund.target_months}-month emergency fund</span>
                      <span>{planData.financial_health.emergency_fund.progress_percentage.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={planData.financial_health.emergency_fund.progress_percentage} 
                      className="h-3" 
                    />
                  </div>
                  
                  <div className={`p-4 rounded-lg ${getStatusColor(planData.financial_health.emergency_fund.status)}`}>
                    <h4 className="font-medium mb-2">Suggested action</h4>
                    <p className="text-sm">{planData.recommendations.emergency_fund.recommendation}</p>
                    {planData.financial_health.emergency_fund.progress_percentage < 100 && (
                      <div className="mt-3 p-3 bg-white/50 rounded border border-gray-200">
                        <p className="text-sm font-medium">Target amount needed:</p>
                        <p className="text-xl font-bold">{formatCurrency(planData.financial_health.emergency_fund.monthly_expenses * planData.financial_health.emergency_fund.target_months)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          You need {formatCurrency(planData.financial_health.emergency_fund.monthly_expenses * planData.financial_health.emergency_fund.target_months - planData.financial_health.emergency_fund.cash_balance)} more to reach your target
                        </p>
                      </div>
                    )}
                  </div>
          </div>
          </div>
        </CardContent>
      </Card>

          {/* Debt Status Card - Only shown if user has debt */}
          {planData.financial_health.debt_overview.total_debt > 0 && (
            <Card className={`border border-l-4 ${
              planData.financial_health.debt_overview.status === 'Excellent' ? 'border-l-green-500' :
              planData.financial_health.debt_overview.status === 'Good' ? 'border-l-blue-500' :
              planData.financial_health.debt_overview.status === 'Fair' ? 'border-l-yellow-500' :
              'border-l-red-500'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingDown className="h-5 w-5 text-primary" />
                    Debt overview
                  </CardTitle>
                  <Badge className={getStatusColor(planData.financial_health.debt_overview.status)}>
                    {planData.financial_health.debt_overview.status}
                  </Badge>
                </div>
                <CardDescription>
                  Your current debt management status
                </CardDescription>
          </CardHeader>
          <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-sm">
                      {planData.financial_health.debt_overview.status === 'Excellent' || planData.financial_health.debt_overview.status === 'Good'
                        ? 'Your debt level is well-managed relative to your income. Keep up the good work!'
                        : 'Your debt-to-income ratio suggests you may be carrying too much debt relative to your income.'}
                    </p>
                    
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Total debt</span>
                        <span className="font-medium">{formatCurrency(planData.financial_health.debt_overview.total_debt)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Monthly payment</span>
                        <span className="font-medium">{formatCurrency(planData.financial_health.debt_overview.monthly_payment_estimate)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Debt-to-income ratio</span>
                        <span className="font-medium">{planData.financial_health.debt_overview.debt_to_income}%</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Target ratio</span>
                        <span className="font-medium">Less than 36%</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => navigate('/budget')}
                      className="w-full"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      View Debt Management Plan
                    </Button>
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Debt-to-income ratio</span>
                        <span>{planData.financial_health.debt_overview.debt_to_income}%</span>
                      </div>
                      <Progress 
                        value={Math.min((planData.financial_health.debt_overview.debt_to_income / 50) * 100, 100)} 
                        className="h-3" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Recommended: Below 36% of monthly income</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800`}>
                      <h4 className="font-medium mb-2">Suggested action</h4>
                      <p className="text-sm">{planData.recommendations.debt.recommendation}</p>
                      
                      <div className="flex items-center gap-2 mt-4">
                        <Info className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-blue-700">
                          The debt-to-income ratio is your monthly debt payments divided by your monthly income.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Investments Tab */}
        <TabsContent value="investments" className="space-y-6 animate-in fade-in-50 slide-in-from-left-4 duration-300">
          <Card className={`border border-l-4 ${
            planData.investment_health.status === 'Excellent' ? 'border-l-green-500' :
            planData.investment_health.status === 'Good' ? 'border-l-blue-500' :
            planData.investment_health.status === 'Fair' ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Investment health
                </CardTitle>
              <Badge className={getStatusColor(planData.investment_health.status)}>
                {planData.investment_health.status}
              </Badge>
              </div>
              <CardDescription>
                Your investment performance and strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-sm">
                    {planData.investment_health.summary}
                  </p>
                  
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Investment style</span>
                      <span className="font-medium">{planData.profile_summary.investor_type || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Investment score</span>
                      <span className="font-medium">{planData.investment_health.score || 'N/A'}/100</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/grow-investments')}
                    className="w-full"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Your Investment Dashboard
                  </Button>
                </div>
                
                <div>
                  {planData.recommendations.investment ? (
                    <div className={`p-4 rounded-lg ${getStatusColor(planData.investment_health.status)} space-y-3`}>
                      <div className="mb-1">
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none">Investment idea</Badge>
                      </div>
                      <h3 className="font-bold text-lg">{planData.recommendations.investment.recommended_symbol}</h3>
                      <p className="text-sm">{planData.recommendations.investment.recommended_rationale}</p>
                      <div className="pt-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/grow-investments/recommendations')}
                          className="text-xs"
                        >
                          <ExternalLink className="mr-1.5 h-3 w-3" />
                          View detailed analysis
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-muted/20 p-6 rounded-lg text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="font-medium mb-2">No investment ideas yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Complete your investment profile to get personalized suggestions.</p>
                      <Button 
                        onClick={() => navigate('/invest-risk-profiling')}
                        size="sm"
                      >
                        Complete profile
                      </Button>
                    </div>
                  )}
                </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* Retirement Tab */}
        <TabsContent value="retirement" className="space-y-6 animate-in fade-in-50 slide-in-from-left-4 duration-300">
          <Card className={`border border-l-4 ${
            planData.retirement_health.status === 'Excellent' ? 'border-l-green-500' :
            planData.retirement_health.status === 'Good' ? 'border-l-blue-500' :
            planData.retirement_health.status === 'Fair' ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="h-5 w-5 text-primary" />
                  Retirement planning
                </CardTitle>
              <Badge className={getStatusColor(planData.retirement_health.status)}>
                {planData.retirement_health.status}
              </Badge>
              </div>
              <CardDescription>
                Your progress toward retirement goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-sm">
                    {planData.retirement_health.summary}
                  </p>
                  
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Current age</span>
                      <span className="font-medium">{planData.profile_summary.age}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Planned retirement age</span>
                      <span className="font-medium">{planData.retirement_projection.estimated_retirement_age}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Years until retirement</span>
                      <span className="font-medium">{planData.retirement_projection.years_until_retirement}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Monthly contribution</span>
                      <span className="font-medium">{formatCurrency(planData.retirement_projection.monthly_contribution)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => navigate('/retirement/current-plan')}
                      className="flex-1"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      View Retirement Plan
                    </Button>
                    <Button 
                      onClick={() => navigate('/retirement/what-if')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Explore Scenarios
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Retirement Savings: {formatCurrency(planData.retirement_projection.current_retirement_savings)}</h3>
                  
                  {retirementData.length > 0 ? (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={retirementData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {retirementData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[250px] bg-muted/20 rounded-lg">
                      <PiggyBank className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No retirement savings yet</p>
                      <p className="text-sm text-muted-foreground">Start contributing to build your future</p>
                    </div>
                  )}
                  
                  {planData.recommendations.retirement && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs font-medium text-blue-800">Suggested retirement strategy</p>
                      <p className="text-sm mt-1">{planData.recommendations.retirement.recommended_symbol}</p>
                    </div>
                  )}
                </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Action Plan Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Your action plan
          </CardTitle>
          <CardDescription>
            Suggested steps to improve your financial health
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Emergency Fund Action */}
            <div className={`p-4 rounded-lg border ${
              planData.financial_health.emergency_fund.status === 'Excellent' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-full ${
                  planData.financial_health.emergency_fund.status === 'Excellent' 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  <Shield className={`h-5 w-5 ${
                    planData.financial_health.emergency_fund.status === 'Excellent' 
                      ? 'text-green-600' 
                      : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-medium">Emergency fund</h3>
                  <p className="text-xs text-muted-foreground">Financial safety net</p>
                </div>
              </div>
              
              <p className="text-sm mb-3">
                {planData.financial_health.emergency_fund.status === 'Excellent' 
                  ? 'Your emergency fund is fully funded. Maintain it and consider investing any additional savings.'
                  : planData.recommendations.emergency_fund.recommendation}
              </p>
              
              <Button 
                onClick={() => navigate('/grow-savings')}
                variant={planData.financial_health.emergency_fund.status === 'Excellent' ? "outline" : "default"}
                size="sm"
                className="w-full"
              >
                {planData.financial_health.emergency_fund.status === 'Excellent' 
                  ? 'View Your Fund' 
                  : 'Build Your Fund'}
              </Button>
      </div>

            {/* Debt Management Action */}
            <div className={`p-4 rounded-lg border ${
              planData.financial_health.debt_overview.status === 'Excellent' || planData.financial_health.debt_overview.total_debt === 0
                ? 'bg-green-50 border-green-200' 
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-full ${
                  planData.financial_health.debt_overview.status === 'Excellent' || planData.financial_health.debt_overview.total_debt === 0
                    ? 'bg-green-100' 
                    : 'bg-amber-100'
                }`}>
                  <Wallet className={`h-5 w-5 ${
                    planData.financial_health.debt_overview.status === 'Excellent' || planData.financial_health.debt_overview.total_debt === 0
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`} />
                </div>
              <div>
                  <h3 className="font-medium">Debt management</h3>
                  <p className="text-xs text-muted-foreground">Reduce your liabilities</p>
                </div>
              </div>
              
              <p className="text-sm mb-3">
                {planData.financial_health.debt_overview.total_debt === 0 
                  ? 'You have no debt. Great job staying debt-free!' 
                  : planData.financial_health.debt_overview.status === 'Excellent' || planData.financial_health.debt_overview.status === 'Good'
                  ? 'Your debt is well-managed. Continue making payments on time.'
                  : planData.recommendations.debt.recommendation}
              </p>
              
              <Button 
                onClick={() => navigate('/budget')}
                variant={planData.financial_health.debt_overview.status === 'Excellent' || planData.financial_health.debt_overview.total_debt === 0 ? "outline" : "default"}
                size="sm"
                className="w-full"
              >
                {planData.financial_health.debt_overview.total_debt === 0 
                  ? 'Stay Debt-Free' 
                  : 'Manage Your Debt'}
              </Button>
            </div>
            
            {/* Investment Action */}
            <div className={`p-4 rounded-lg border ${
              planData.investment_health.status === 'Excellent' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-full ${
                  planData.investment_health.status === 'Excellent' 
                    ? 'bg-green-100' 
                    : 'bg-purple-100'
                }`}>
                  <TrendingUp className={`h-5 w-5 ${
                    planData.investment_health.status === 'Excellent' 
                      ? 'text-green-600' 
                      : 'text-purple-600'
                  }`} />
                </div>
              <div>
                  <h3 className="font-medium">Investments</h3>
                  <p className="text-xs text-muted-foreground">Grow your money</p>
                </div>
              </div>
              
              <p className="text-sm mb-3">
                {planData.recommendations.investment 
                  ? `Consider ${planData.recommendations.investment.recommended_symbol} for your portfolio.`
                  : 'Complete your investment profile to get personalized recommendations.'}
              </p>
              
              <Button 
                onClick={() => navigate(planData.recommendations.investment ? '/grow-investments/recommendations' : '/invest-risk-profiling')}
                size="sm"
                className="w-full"
              >
                {planData.recommendations.investment 
                  ? 'Read more' 
                  : 'Complete Profile'}
              </Button>
            </div>
          </div>
          </CardContent>
        <CardFooter className="pt-0">
          <div className="w-full flex justify-center">
            <Button 
              onClick={() => navigate('/assistant')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              Ask our AI assistant for help with your plan
            </Button>
          </div>
        </CardFooter>
        </Card>
      
      {/* Navigation Footer */}
      <div className="flex justify-center gap-4 pt-2">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>
        <Button
          onClick={() => navigate('/profile/edit')}
        >
          Update your profile
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      {/* Disclaimer Footnote */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        I'm your AI coach — I do my best but I can make mistakes. Please check important information.
      </div>
    </div>
  )
}