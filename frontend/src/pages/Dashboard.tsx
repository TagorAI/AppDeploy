import { useNavigate, Navigate, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  UserCircle, CheckSquare, Lightbulb, MessageCircle, Shield, AlertCircle, 
  Heart
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Dashboard component that serves as the main interface for logged-in users
 * Provides access to different features like profile management, financial checks,
 * guidance, and AI assistance
 */
export default function Dashboard() {
  const navigate = useNavigate()
  const { isAuthenticated, apiRequest } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profileStatus, setProfileStatus] = useState<'complete' | 'incomplete' | 'loading'>('loading')
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    
    const fetchUserProfile = async () => {
      try {
        const response = await apiRequest('/api/profile')
        
        if (!response.ok) throw new Error('Failed to fetch profile')
        
        const profileData = await response.json()
        setUserName(profileData.name || '')
        setProfileStatus(
          profileData.name && profileData.age && profileData.country_of_residence 
            ? 'complete' 
            : 'incomplete'
        )
      } catch (error) {
        console.error('Error fetching profile:', error)
        setProfileStatus('incomplete')
      }
    }

    fetchUserProfile()

    const checkAdminStatus = async () => {
      try {
        setIsLoading(true)
        const response = await apiRequest('/api/admin/check-admin')
        
        if (!response.ok) {
          throw new Error('Failed to check admin status')
        }
        const data = await response.json()
        setIsAdmin(data.is_admin)
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [isAuthenticated, apiRequest])

  if (!isLoading && isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <h1 className="text-3xl font-montserrat mb-6 text-foreground">
          {userName ? `Hello, ${userName}! What can I help you with today?` : 'Hello! What can I help you with today?'}
        </h1>

        {profileStatus === 'incomplete' && (
          <Alert className="mb-8 max-w-2xl mx-auto bg-primary/10 border-primary/50">
            <Heart className="h-5 w-5 text-primary" />
            <AlertDescription className="mt-2 flex items-center justify-between">
              <span className="text-foreground">
                Complete your profile to get personalized financial guidance
              </span>
              <Button 
                variant="outline" 
                className="ml-4 border-primary text-primary hover:bg-primary/90 hover:text-primary-foreground"
                onClick={() => navigate('/profile/edit')}
              >
                Complete now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <UserCircle className="h-6 w-6" />
                Your profile
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Let's get to know you better so we can support your goals.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-2">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/profile')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                size="lg"
              >
                View profile
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/profile/edit')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Update profile
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CheckSquare className="h-6 w-6" />
                Financial fitness
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                See how you're doing financially—quickly and easily.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-2">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/checkup')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                size="lg"
              >
                Quick checkup
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/dashboard/snapshot')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                See snapshot
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/dashboard/financial-plan')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Financial plan
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Lightbulb className="h-6 w-6" />
                Guidance
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Simple tips and guidance tailored for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-2">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/grow-savings')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                size="lg"
              >
                Save more
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/grow-investments')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Grow investments
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/retirement')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Plan retirement
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <MessageCircle className="h-6 w-6" />
                AI Assistant
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Questions?
                <br />
                Your AI assistant can help!
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-2">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/assistant')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                size="lg"
              >
                Ask now
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/chat-products')}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Explore products
              </Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="bg-card text-card-foreground border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Shield className="h-6 w-6" />
                  Admin controls
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage system settings and data
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => navigate('/admin')}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  Upload investment products
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center">
          <p className="text-sm text-muted-foreground text-center">
            I'm your AI helper — I do my best but I can make mistakes. Please check important information.
          </p>
          <Link 
            to="/feedback" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Feedback
          </Link>
        </div>
      </div>
    </div>
  )
} 