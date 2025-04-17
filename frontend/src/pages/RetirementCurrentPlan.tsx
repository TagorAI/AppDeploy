import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { Clock, PiggyBank, DollarSign, TrendingUp } from 'lucide-react'
import { LoadingScreen } from "@/components/ui/loading-screen"

interface RetirementPlan {
  retirement_age: number
  current_age: number
  years_until_retirement: number
  years_in_retirement: number
  monthly_income: number
  monthly_expenses: number
  current_savings: number
  monthly_contribution: number
  projected_savings: number
  required_savings: number
  savings_gap: number
  retirement_income: number
  retirement_expenses: number
  government_benefits: number
  savings_income: number
}

export default function RetirementCurrentPlan() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const [planData, setPlanData] = useState<RetirementPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRetirementPlan = async () => {
      try {
        const response = await apiRequest('/api/retirement/current-plan')
        
        if (!response.ok) throw new Error('Failed to fetch retirement plan')
        const data = await response.json()
        setPlanData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchRetirementPlan()
  }, [apiRequest])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <LoadingScreen message="Calculating your retirement projections..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
        <Button 
          onClick={() => navigate('/retirement/recommendations')}
          className="bg-primary"
        >
          Recommendations
        </Button>
      </div>

      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Plan retirement
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Your current retirement trajectory</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timeline Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your retirement timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Your current age</span>
              <span className="font-semibold bg-blue-100 px-3 py-1 rounded-full">
                {planData?.current_age}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Years until retirement</span>
              <span className="font-semibold bg-blue-100 px-3 py-1 rounded-full">
                {planData?.years_until_retirement}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Years in retirement</span>
              <span className="font-semibold bg-blue-100 px-3 py-1 rounded-full">
                {planData?.years_in_retirement}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Savings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Your savings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Current savings</span>
              <span className="font-semibold bg-green-100 px-3 py-1 rounded-full">
                {formatCurrency(planData?.current_savings || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Annual savings</span>
              <span className="font-semibold bg-green-100 px-3 py-1 rounded-full">
                {formatCurrency((planData?.monthly_contribution || 0) * 12)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Money You'll Have Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Money you'll have when retired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Your total savings</span>
              <span className="font-semibold bg-blue-100 px-3 py-1 rounded-full">
                {formatCurrency(planData?.projected_savings || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Your yearly income</span>
              <span className="font-semibold bg-blue-100 px-3 py-1 rounded-full">
                {formatCurrency((planData?.retirement_income || 0) * 12)}/year
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="pl-4">- From CPP & OAS</span>
              <span className="font-semibold bg-blue-100 px-3 py-1 rounded-full">
                {formatCurrency((planData?.government_benefits || 0) * 12)}/year
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="pl-4">- From your savings</span>
              <span className="font-semibold bg-blue-100 px-3 py-1 rounded-full">
                {formatCurrency((planData?.savings_income || 0) * 12)}/year
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Money You'll Need Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Money you'll need when retired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total savings needed</span>
              <span className="font-semibold bg-yellow-100 px-3 py-1 rounded-full">
                {formatCurrency(planData?.required_savings || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Your yearly expenses</span>
              <span className="font-semibold bg-yellow-100 px-3 py-1 rounded-full">
                {formatCurrency((planData?.retirement_expenses || 0) * 12)}/year
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
