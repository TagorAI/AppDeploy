import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from '@/contexts/AuthContext'

/**
 * Signup component that handles new user registration.
 * Collects user information and profile details then submits data to the backend API.
 */
export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Define the structure the backend expects
      const userData = {
        user_data: {
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          name: formData.name
        },
        // Add screening answers (these are default "passing" values)
        screening_answers: {
          financial_stability: "A",  // "No, I am financially stable"
          investment_objective: "A", // "To build long-term wealth"
          product_preference: "A",   // "Simple, affordable, diversified investment options"
          financial_literacy: "A"    // "I have a basic understanding of finance..."
        }
      }

      // 1. Create account
      const signupResponse = await fetch('http://localhost:8000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      if (!signupResponse.ok) {
        const data = await signupResponse.json()
        throw new Error(data.detail || 'Failed to create account')
      }

      // 2. Auto-login after signup
      const loginResponse = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        })
      })

      const loginData = await loginResponse.json()
      
      if (!loginResponse.ok) {
        throw new Error(loginData.detail || 'Login failed')
      }

      // Use AuthContext's login method to store the token
      login(loginData.access_token)
      
      // Still store user in localStorage as before
      if (loginData.user) {
        localStorage.setItem('user', JSON.stringify(loginData.user))
      }

      // Navigate to dashboard with welcome message
      navigate('/dashboard', { 
        state: { 
          message: 'Welcome! Please complete your profile to get personalized recommendations.',
          showProfilePrompt: true
        }
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-montserrat">Create your account</CardTitle>
            <CardDescription>Get started with your financial journey</CardDescription>
          </CardHeader>

          {error && (
            <div className="mx-6 p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Must be at least 6 characters long</p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
