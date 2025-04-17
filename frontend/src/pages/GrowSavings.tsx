import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useAuth } from '@/contexts/AuthContext'

interface ChecklistItem {
  title: string
  status: 'completed' | 'pending'
  current: string
  target: string
  message: string
}

interface SavingsHealth {
  status: 'complete' | 'incomplete' | 'error'
  message?: string
  missing_fields?: string[]
  checklist: {
    [key: string]: ChecklistItem
  }
  progress: number
  monthly_savings: number
  savings_rate: number
  debt_to_worth_ratio: number
}

export default function GrowSavings() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const [savingsHealth, setSavingsHealth] = useState<SavingsHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSavingsHealth = async () => {
      try {
        const response = await apiRequest('/api/savings-health')
        
        if (!response.ok) throw new Error('Failed to fetch savings health')
        const data = await response.json()
        setSavingsHealth(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSavingsHealth()
  }, [apiRequest])

  const getStatusIcon = (item: ChecklistItem) => {
    if (item.status === 'completed') {
      return <ThumbsUp className="h-5 w-5 text-green-500" />
    }
    return <ThumbsDown className="h-5 w-5 text-red-500" />
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <LoadingScreen message="Analyzing your savings growth potential..." />
      </div>
    )
  }

  if (!savingsHealth) {
    return (
      <div className="container mx-auto py-8 px-4">Error loading savings health</div>
    )
  }

  if (savingsHealth.status === 'incomplete') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Complete your profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>To analyze your savings health, we need some additional information:</p>
            <ul className="list-disc pl-6 space-y-2">
              {savingsHealth.missing_fields?.map((field, index) => (
                <li key={index}>{field}</li>
              ))}
            </ul>
            <div className="flex justify-center mt-6">
              <Button onClick={() => navigate('/profile/edit')}>
                Update profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (savingsHealth.status === 'error') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{savingsHealth.message}</p>
            <div className="flex justify-center mt-6">
              <Button onClick={() => navigate('/profile/edit')}>
                Review profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => navigate('/grow-savings/recommendations')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Recommendations
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Grow your savings
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Your savings checklist</h1>
      </div>
      
      <div className="flex justify-center">
        {/* Checklist Card - Centered */}
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="sr-only">Your savings checklist</span>
              <span className="text-sm font-normal">
                {Math.round(savingsHealth.progress)}% complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={savingsHealth.progress} className="mb-6" />
            
            <div className="space-y-6">
              {Object.entries(savingsHealth.checklist).map(([key, item]) => (
                <div key={key} className="flex items-start gap-4">
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Current: {item.current} / Target: {item.target}
                    </p>
                    <p className="text-sm">{item.message}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/grow-savings/recommendations')}
                    className="flex-shrink-0"
                  >
                    {getStatusIcon(item)}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 