import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, ThumbsUp, ThumbsDown, CheckCircle2, Circle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useAuth } from '@/contexts/AuthContext'
import { Progress } from "@/components/ui/progress"

interface RetirementHealth {
  status: 'complete' | 'incomplete' | 'error'
  checklist: {
    rrsp: {
      title: string
      status: 'completed' | 'pending'
      current: string
      target: string
      message: string
    }
    tfsa: {
      title: string
      status: 'completed' | 'pending'
      current: string
      target: string
      message: string
    }
  }
  progress: number
  total_retirement_savings: number
}

export default function RetirementLanding() {
  const navigate = useNavigate()
  const [retirementHealth, setRetirementHealth] = useState<RetirementHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const { apiRequest } = useAuth()

  useEffect(() => {
    const fetchRetirementHealth = async () => {
      try {
        const response = await apiRequest('/api/retirement/health')
        
        if (!response.ok) throw new Error('Failed to fetch retirement health')
        const data = await response.json()
        setRetirementHealth(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRetirementHealth()
  }, [apiRequest])

  if (loading || !retirementHealth) {
    return (
      <div className="container mx-auto py-8 px-4">
        <LoadingScreen message="Analyzing your retirement readiness..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
        <Button 
          onClick={() => navigate('/retirement/current-plan')}
        >
          Current plan
        </Button>
      </div>

      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Plan retirement
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Your retirement checklist</h1>
      </div>
      
      <div className="flex justify-center">
        {/* Checklist Card - Centered */}
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="sr-only">Your retirement checklist</span>
              <span className="text-sm font-normal">
                {Math.round(retirementHealth.progress)}% complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={retirementHealth.progress} className="mb-6" />
            
            <div className="space-y-6">
              {Object.entries(retirementHealth.checklist).map(([key, item]) => (
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
                    className="flex-shrink-0"
                  >
                    {item.status === 'completed' ? (
                      <ThumbsUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <ThumbsDown className="h-5 w-5 text-red-500" />
                    )}
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