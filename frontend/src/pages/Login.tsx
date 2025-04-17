import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from '@/contexts/AuthContext'
import { ChevronLeft, Loader2 } from 'lucide-react'

/**
 * Login component that handles user authentication.
 * Allows existing users to sign in with their email and password.
 */
export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      if (data.access_token) {
        login(data.access_token)
        
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
        }

        navigate('/dashboard')
      } else {
        throw new Error('No access token received')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    // Store the email in localStorage so the reset password page can use it
    if (formData.email) {
      localStorage.setItem('resetEmail', formData.email.toLowerCase().trim())
    }
    // Navigate directly to the reset password page
    navigate('/reset-password')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4"
          onClick={() => navigate('/')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-montserrat">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        {error && (
          <div className="mx-6 p-3 mb-4 text-sm bg-red-50 text-red-500 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
            <div className="text-sm text-gray-500 flex justify-center gap-2">
              <span>Don't have an account?</span>
              <Link to="/screening" className="text-primary hover:underline">
                Sign up
              </Link>
              <span>|</span>
              <Link 
                to="/reset-password" 
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  handleForgotPassword();
                }}
              >
                Forgot password?
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}