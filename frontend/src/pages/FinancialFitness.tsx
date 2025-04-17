import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNavigate } from 'react-router-dom'
import { LoadingScreen } from "@/components/ui/loading-screen"
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DiagnosticDimension {
  status: string
  strengths: string[]
  areas_for_improvement: string[]
}

interface FinancialAssessment {
  introduction: string
  everyday_money: DiagnosticDimension
  investments: DiagnosticDimension
  retirement: DiagnosticDimension
  created_at?: string
}

export default function FinancialFitness() {
  const navigate = useNavigate()
  const { isAuthenticated, apiRequest } = useAuth()
  const [assessment, setAssessment] = useState<FinancialAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    
    let mounted = true;

    const fetchAssessment = async () => {
      try {
        const response = await apiRequest('/api/financial-assessment')
        
        if (!mounted) return;

        const data = await response.json()
        console.log('Assessment data received:', data)

        if (!response.ok) {
          if (response.status === 400) {
            if (data.introduction && data.everyday_money) {
              setAssessment(data)
              return
            }
            setError('Please complete your profile to get an assessment')
            return
          }
          setError(data.detail || 'Failed to fetch assessment')
          return
        }

        if (!data.introduction || !data.everyday_money || !data.investments || !data.retirement) {
          setError('Invalid assessment data received')
          return
        }

        setAssessment(data)
      } catch (err) {
        if (mounted) {
          console.error('Assessment error:', err)
          setError(err instanceof Error ? err.message : 'Failed to load assessment')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchAssessment()

    // Cleanup function
    return () => {
      mounted = false
    }
  }, [isAuthenticated, apiRequest, navigate])

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Good': 'bg-green-100 text-green-800',
      'Needs Attention': 'bg-yellow-100 text-yellow-800',
      'Critical': 'bg-red-100 text-red-800',
      'Error': 'bg-red-100 text-red-800' // Added Error status
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleRefreshAssessment = async () => {
    setRefreshing(true)
    try {
      const response = await apiRequest('/api/financial-assessment?force_refresh=true')
      const data = await response.json()
      setAssessment(data)
    } catch (err) {
      console.error('Error refreshing assessment:', err)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return (
    <div className="container mx-auto py-8 px-4">
      <LoadingScreen message="Analyzing your financial health..." />
    </div>
  )

  if (error) return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="text-red-500 text-center">{error}</div>
        <Button onClick={() => navigate('/profile/edit')}>
          Complete your profile
        </Button>
      </div>
    </div>
  )

  if (!assessment) return null

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => navigate('/dashboard/snapshot')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Your financial snapshot
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Financial health
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Your financial fitness check</h1>
      </div>

      <p className="text-muted-foreground mb-8 text-center">{assessment.introduction}</p>

      <div className="flex flex-col items-center justify-center mb-6">
        {assessment.created_at && (
          <div className="text-sm text-muted-foreground mb-2">
            Last updated: {new Date(assessment.created_at).toLocaleString()}
          </div>
        )}
        <Button 
          onClick={handleRefreshAssessment} 
          disabled={refreshing}
          variant="outline" 
          size="sm"
        >
          {refreshing ? 'Refreshing...' : 'Refresh assessment'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {['everyday_money', 'investments', 'retirement'].map((section) => {
          const data = assessment[section as keyof typeof assessment] as DiagnosticDimension
          return (
            <Card key={section}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {section.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  <Badge className={getStatusColor(data.status)}>{data.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Strengths</h3>
                  <ul className="list-disc pl-4">
                    {data.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Areas for improvement</h3>
                  <ul className="list-disc pl-4">
                    {data.areas_for_improvement.map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <div className="disclaimer-footnote">
        I'm your AI coach — I do my best but I can make mistakes. Please check important information.
      </div>
    </div>
  )
} 