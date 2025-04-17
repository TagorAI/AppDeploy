import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, RefreshCcw, AlertCircle, Loader2, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Recommendation {
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  timeframe: 'short' | 'medium' | 'long'
  action_items: string[]
}

interface RecommendationsResponse {
  recommendations: Recommendation[]
  priority_focus: string
  next_steps: string[]
}

interface GICProductDetails {
  company: string
  product: string
  term_years: number
  rate_return_percent: number
}

interface GICRecommendation {
  recommended_product_details: GICProductDetails
  rationale: string
  excess_cash: number
  potential_returns: string
}

interface GICResponse {
  has_recommendation: boolean
  message?: string
  recommendation?: GICRecommendation
}

interface UserRecommendation {
  id: number
  user_id: string
  product_type: string
  product_id: number
  recommended_symbol: string
  recommended_rationale: string
  created_at: string
  updated_at: string
}

interface RecommendationResponse {
  has_recommendation: boolean
  recommendations: UserRecommendation[]
  is_existing: boolean
}

export default function GrowSavingsRecommendations() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  const fetchExistingRecommendation = async () => {
    try {
      setLoading(true)
      const response = await apiRequest('/api/savings/gic-recommendation')
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched recommendation data:', data)
        
        // Handle nested recommendation structure
        const transformedData = {
          has_recommendation: data.has_recommendation,
          recommendations: data.recommendations || 
                          (data.recommendation?.recommendations || [data.recommendation]),
          is_existing: data.is_existing
        }
        
        console.log('Transformed data:', transformedData)
        setRecommendation(transformedData)
        return true
      }
      setError('Failed to fetch recommendation')
      return false
    } catch (error) {
      console.error('Error in fetchExistingRecommendation:', error)
      setError('An error occurred while fetching recommendation')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiRequest('/api/savings/gic-recommendation?force_new=true')
      
      console.log('Refresh response status:', response.status)
      
      if (!response.ok) throw new Error('Failed to refresh recommendation')
      
      const data = await response.json()
      console.log('New recommendation data:', data)
      
      // Handle nested recommendation structure
      const transformedData = {
        has_recommendation: data.has_recommendation,
        recommendations: data.recommendations || 
                        (data.recommendation?.recommendations || [data.recommendation]),
        is_existing: data.is_existing
      }
      
      console.log('Transformed data:', transformedData)
      setRecommendation(transformedData)
    } catch (error) {
      console.error('Error refreshing recommendation:', error)
      setError('Failed to refresh recommendation')
    } finally {
      setLoading(false)
    }
  }

  // Placeholder for email functionality
  const handleEmailRecommendation = () => {
    setSendingEmail(true)
    // Simulate email sending
    setTimeout(() => {
      setSendingEmail(false)
    }, 1500)
  }

  useEffect(() => {
    const initializeRecommendation = async () => {
      console.log('Starting GIC recommendation initialization')
      const hasExisting = await fetchExistingRecommendation()
      console.log('Has existing recommendation:', hasExisting)
      
      if (!hasExisting) {
        console.log('No existing recommendation, generating new one')
        await handleRefresh()
      }
    }

    initializeRecommendation()
  }, [apiRequest])

  // Parse the rationale to extract potential returns
  const parseRationale = (rationale: string) => {
    const parts = rationale.split('\n\nPotential Returns: ')
    return {
      rationale: parts[0],
      potentialReturns: parts[1] || ''
    }
  }

  // Get the most recent recommendation
  const currentRecommendation = recommendation?.recommendations?.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0]

  // Parse the rationale if we have a recommendation
  const parsedRationale = currentRecommendation ? 
    parseRationale(currentRecommendation.recommended_rationale) : 
    { rationale: '', potentialReturns: '' }

  // Helper function to format the date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => navigate('/dashboard')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Dashboard
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Title - Centered and styled */}
      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Grow savings
        </span>
        <h1 className="text-3xl font-montserrat font-bold">GIC recommendation</h1>
      </div>

      {/* Refresh button - Centered below title */}
      <div className="flex justify-center mb-6">
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCcw className="mr-2 h-4 w-4" /> 
          {loading ? 'Refreshing...' : 'Refresh recommendation'}
        </Button>
      </div>

      {/* GIC Recommendation Card */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">
                {recommendation ? 'Refreshing recommendation...' : 'Generating your recommendation...'}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : recommendation && recommendation.has_recommendation && currentRecommendation ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Recommended GIC: {currentRecommendation.recommended_symbol}
              </CardTitle>
              <Button
                onClick={handleEmailRecommendation}
                disabled={sendingEmail}
                variant="outline"
                className="ml-4"
              >
                {sendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {sendingEmail ? 'Sending...' : 'Email this to me'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Why this works for you</h3>
                <p className="text-sm">{parsedRationale.rationale}</p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Potential returns</h3>
                <p className="text-sm">{parsedRationale.potentialReturns}</p>
              </div>
            </div>

            {/* Add last updated timestamp */}
            {currentRecommendation.updated_at && (
              <p className="text-xs text-muted-foreground mt-4">
                Last updated: {formatDateTime(currentRecommendation.updated_at)}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No GIC recommendation available at this time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 