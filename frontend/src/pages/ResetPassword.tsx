import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronLeft } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(1) // Step 1: Enter email, Step 2: Enter verification code, Step 3: Reset password
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwords, setPasswords] = useState({
    password: '',
    confirmPassword: ''
  })

  // Check for email passed from the login page
  useEffect(() => {
    const storedEmail = localStorage.getItem('resetEmail')
    if (storedEmail) {
      setEmail(storedEmail)
      // Clear it to avoid issues if user navigates away and back
      localStorage.removeItem('resetEmail')
    }
  }, [])

  const handleRequestCode = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to send verification code')
      }

      setStep(2)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          code: verificationCode 
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Invalid verification code')
      }

      setStep(3)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Code verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    // Validate passwords match
    if (passwords.password !== passwords.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (passwords.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          password: passwords.password 
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Password reset failed')
      }
      
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000) // Redirect to login after 3 seconds
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Password reset failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-montserrat">Reset Password</CardTitle>
          <CardDescription>
            {step === 1 && "Enter your email to reset your password"}
            {step === 2 && "Enter the verification code sent to your email"}
            {step === 3 && "Enter your new password"}
          </CardDescription>
        </CardHeader>

        {error && (
          <div className="mx-6 p-3 mb-4 text-sm bg-red-50 text-red-500 rounded-md">
            {error}
          </div>
        )}

        {success ? (
          <div className="mx-6 p-6 text-center">
            <div className="mb-4 text-green-600 font-semibold">
              Password successfully reset!
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting to login page...
            </p>
          </div>
        ) : (
          <CardContent className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleRequestCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">
                    Enter the code sent to {email}
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleVerifyCode}
                  disabled={isLoading}
                >
                  Verify Code
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your new password"
                    value={passwords.password}
                    onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
} 