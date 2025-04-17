import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  Loader2, AlertCircle, Wallet, PiggyBank, LineChart, 
  BarChart, Clock, ChevronLeft, ChevronRight 
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface FinancialMetrics {
  // Overall financial position
  net_worth: number | null;
  net_worth_status: string;
  net_worth_message: string;
  net_worth_benchmark: string;
  
  monthly_cash_flow: number | null;
  
  debt_to_income_ratio: number | null;
  debt_status: string;
  debt_message: string;
  debt_benchmark: string;
  
  // Savings
  emergency_fund_ratio: number | null;
  emergency_fund_status: string;
  emergency_fund_message: string;
  emergency_fund_benchmark: string;
  
  savings_rate: number | null;
  savings_status: string;
  savings_message: string;
  savings_benchmark: string;
  
  monthly_savings: number | null;
  
  // Investments
  total_investments: number | null;
  investment_growth: number | null;
  investment_diversity_score: number | null;
  
  // Retirement
  retirement_savings_ratio: number | null;
  retirement_status: string;
  retirement_message: string;
  retirement_benchmark: string;
  
  retirement_readiness_score: number | null;
  years_until_retirement: number | null;
}

export default function FinancialSnapshot() {
  const navigate = useNavigate()
  const { apiRequest, isAuthenticated } = useAuth()
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    
    const fetchMetrics = async () => {
      try {
        const response = await apiRequest('/api/financial-snapshot')
        if (!response.ok) {
          throw new Error('Failed to fetch financial metrics')
        }
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [apiRequest, isAuthenticated, navigate])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Below Target': 'bg-amber-100 text-amber-800',
      'On Track': 'bg-green-100 text-green-800',
      'Above Target': 'bg-blue-100 text-blue-800',
      'Not Available': 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles['Not Available']}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Button onClick={() => navigate('/dashboard/financial-plan')}>
          Full Financial Plan
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Title */}
      <div className="mb-8 text-center">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full mb-2">
          Financial health
        </span>
        <h1 className="text-3xl font-bold">Your financial snapshot</h1>
      </div>

      {/* Overall Financial Health */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Overall financial health</h2>
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Net Worth */}
          <Card className="border-b-2 border-b-gray-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <BarChart className="h-5 w-5 mr-2 text-gray-500" />
                  Net Worth
                </CardTitle>
                {metrics?.net_worth_status && getStatusBadge(metrics.net_worth_status)}
              </div>
              <CardDescription>
                Assets minus debts • Benchmark: {metrics?.net_worth_benchmark || "Not available"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.net_worth !== null && metrics?.net_worth !== undefined ? (
                <>
                  <div className="text-3xl font-bold mb-3">
                    ${metrics.net_worth.toLocaleString()}
                  </div>
                  <div className="text-sm bg-gray-50 p-3 rounded border-l-4 border-gray-200">
                    {metrics.net_worth_message}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your assets and debts to see this metric
                </p>
              )}
            </CardContent>
          </Card>

          {/* Emergency Fund */}
          <Card className="border-b-2 border-b-gray-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <Wallet className="h-5 w-5 mr-2 text-gray-500" />
                  Emergency Fund
                </CardTitle>
                {metrics?.emergency_fund_status && getStatusBadge(metrics.emergency_fund_status)}
              </div>
              <CardDescription>
                Months of expenses covered • Benchmark: {metrics?.emergency_fund_benchmark || "Not available"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.emergency_fund_ratio !== null && metrics?.emergency_fund_ratio !== undefined ? (
                <>
                  <div className="text-3xl font-bold mb-2">
                    {metrics.emergency_fund_ratio} months
                  </div>
                  <Progress 
                    value={Math.min((metrics.emergency_fund_ratio / 6) * 100, 100)} 
                    className="h-2 mb-3"
                  />
                  <div className="text-sm bg-gray-50 p-3 rounded border-l-4 border-gray-200">
                    {metrics.emergency_fund_message}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your income and expenses to see this metric
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Debt & Savings */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Debt & savings</h2>
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Debt Load */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <LineChart className="h-5 w-5 mr-2 text-gray-500" />
                  Debt Load
                </CardTitle>
                {metrics?.debt_status && getStatusBadge(metrics.debt_status)}
              </div>
              <CardDescription>
                Monthly debt vs income • Benchmark: {metrics?.debt_benchmark || "Not available"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.debt_to_income_ratio !== null && metrics?.debt_to_income_ratio !== undefined ? (
                <>
                  <div className="text-2xl font-bold mb-2">
                    {metrics.debt_to_income_ratio}%
                  </div>
                  <Progress 
                    value={Math.min((metrics.debt_to_income_ratio / 40) * 100, 100)}
                    className="h-2 mb-2"
                  />
                  <div className="text-sm bg-gray-50 p-3 rounded border-l-4 border-gray-200">
                    {metrics.debt_message}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your debt and income to see this metric
                </p>
              )}
            </CardContent>
          </Card>

          {/* Savings Rate */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <PiggyBank className="h-5 w-5 mr-2 text-gray-500" />
                  Savings Rate
                </CardTitle>
                {metrics?.savings_status && getStatusBadge(metrics.savings_status)}
              </div>
              <CardDescription>
                Percentage of income saved monthly • Benchmark: {metrics?.savings_benchmark || "Not available"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.savings_rate !== null && metrics?.savings_rate !== undefined ? (
                <>
                  <div className="text-2xl font-bold mb-2">
                    {metrics.savings_rate}%
                  </div>
                  <Progress 
                    value={Math.min((metrics.savings_rate / 20) * 100, 100)}
                    className="h-2 mb-2"
                  />
                  <div className="text-sm bg-gray-50 p-3 rounded border-l-4 border-gray-200">
                    {metrics.savings_message}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your income and expenses to see this metric
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Retirement */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Retirement</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Retirement Savings */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <PiggyBank className="h-5 w-5 mr-2 text-gray-500" />
                  Retirement Savings
                </CardTitle>
                {metrics?.retirement_status && getStatusBadge(metrics.retirement_status)}
              </div>
              <CardDescription>
                Times annual income saved • Benchmark: {metrics?.retirement_benchmark || "Not available"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.retirement_savings_ratio !== null && metrics?.retirement_savings_ratio !== undefined ? (
                <>
                  <div className="text-2xl font-bold mb-2">
                    {metrics.retirement_savings_ratio}x
                  </div>
                  <Progress 
                    value={Math.min((metrics.retirement_savings_ratio / 10) * 100, 100)}
                    className="h-2 mb-2"
                  />
                  <div className="text-sm bg-gray-50 p-3 rounded border-l-4 border-gray-200">
                    {metrics.retirement_message}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your retirement accounts to see this metric
                </p>
              )}
            </CardContent>
          </Card>

          {/* Retirement Readiness */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <Clock className="h-5 w-5 mr-2 text-gray-500" />
                  Retirement Readiness
                </CardTitle>
              </div>
              <CardDescription>
                Overall retirement preparation score
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.retirement_readiness_score !== null && metrics?.retirement_readiness_score !== undefined ? (
                <>
                  <div className="text-2xl font-bold mb-2">
                    {metrics.retirement_readiness_score}/10
                  </div>
                  <Progress 
                    value={metrics.retirement_readiness_score * 10}
                    className="h-2 mb-2"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    {metrics?.years_until_retirement 
                      ? `${metrics.years_until_retirement} years until retirement age` 
                      : "Add your age to see years until retirement"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your retirement accounts and age to see this metric
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      
      <div className="disclaimer-footnote">
        I'm your AI coach — I do my best but I can make mistakes. Please check important information.
      </div>
    </div>
  )
}
