import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle, Wallet, LineChart, Sunrise, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Profile {
  name: string
  age: number
  country_of_residence: string
  marital_status: string
  number_of_dependents: number
  email: string
  postal_code: string
  // Financial details
  monthly_income?: number
  monthly_expenses?: number
  cash_balance?: number
  investments?: number
  debt?: number
  // Investment details
  investor_type?: string
  advisor_preference?: string
  investing_interests?: string[] | any[]
  investing_interests_thematic?: string[] | any[]
  investing_interests_geographies?: string[] | any[]
  product_preferences?: string[] | any[]
  // Retirement details
  rrsp_savings?: number
  tfsa_savings?: number
  other_retirement_accounts?: number
  desired_retirement_lifestyle?: string
  // Advisor details
  has_advisor?: boolean
  advisor_id?: string
  advisor_name?: string
  advisor_email_address?: string
  advisor_company_name?: string
}

export default function ViewProfile() {
  const navigate = useNavigate()
  const { isAuthenticated, apiRequest } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      if (!isAuthenticated) {
        navigate('/login')
        return
      }
      
      const response = await apiRequest('/api/profile')
      
      if (!response.ok) throw new Error('Failed to fetch profile')
      const data = await response.json()
      console.log("Fetched profile data:", data)
      
      // Handle the flat response structure from the get_complete_profile function
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Not set'
    // Handle zero explicitly to show $0
    if (value === 0) return '$0'
    return `$${value.toLocaleString()}`
  }

  const formatValue = (value: any, prefix: string = '') => {
    if (value === undefined || value === null || value === '') return 'Not set'
    return `${prefix}${value}`
  }

  // New helper function to format arrays from JSONB
  const formatArrayValue = (array: any[] | undefined, separator: string = ', ') => {
    if (!array || array.length === 0) return 'Not set'
    return array.join(separator)
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  if (!profile) return (
    <div className="container mx-auto py-8 px-4 text-center">
      <h2 className="text-2xl font-semibold mb-4">Profile Not Found</h2>
      <p className="text-muted-foreground mb-4">Let's get started by completing your profile</p>
      <Button onClick={() => navigate('/profile/edit')}>Complete Profile</Button>
    </div>
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => navigate('/profile/edit')} 
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Update profile
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Your profile
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Your profile at a glance</h1>
      </div>
      
      {!profile.name && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-md">
          <p className="text-yellow-700">
            Your profile is incomplete. Complete your profile to get personalized financial advice.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* About You Section */}
        <Card className="bg-card shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <UserCircle className="h-5 w-5 text-primary" />
              About you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="space-y-2">
              {[
                { label: "Name", value: profile.name },
                { label: "Age", value: profile.age },
                { label: "Country", value: profile.country_of_residence },
                { label: "Marital status", value: profile.marital_status },
                { label: "Dependents", value: profile.number_of_dependents },
                { label: "Email", value: profile.email },
                { label: "Postal code", value: profile.postal_code }
              ].map((item, index) => (
                <p key={index} className="flex justify-between text-sm">
                  <span className="font-medium text-muted-foreground">{item.label}:</span> 
                  <span className="text-foreground">{formatValue(item.value)}</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Your Finances Section */}
        <Card className="bg-card shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="h-5 w-5 text-primary" />
              Finances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "Monthly income", value: formatCurrency(profile.monthly_income) },
              { label: "Monthly expenses", value: formatCurrency(profile.monthly_expenses) },
              { label: "Cash balance", value: formatCurrency(profile.cash_balance) },
              { label: "Investments", value: formatCurrency(profile.investments) },
              { label: "Debt", value: formatCurrency(profile.debt) }
            ].map((item, index) => (
              <p key={index} className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">{item.label}:</span> 
                <span className="text-foreground">{item.value}</span>
              </p>
            ))}
          </CardContent>
        </Card>

        {/* Investments Section */}
        <Card className="bg-card shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LineChart className="h-5 w-5 text-primary" />
              Your investments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="space-y-2">
              <p className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">Investor type:</span> 
                <span className="text-foreground">{formatValue(profile.investor_type)}</span>
              </p>
              <p className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">Advisor preference:</span> 
                <span className="text-foreground">{formatValue(profile.advisor_preference)}</span>
              </p>
              
              {/* Investment interests section with new fields */}
              <div className="pt-1 pb-1">
                <p className="font-medium text-sm text-muted-foreground mb-1">Investment interests:</p>
                <div className="bg-muted/30 p-2 rounded text-sm space-y-2">
                  <p className="flex flex-col">
                    <span className="font-medium text-xs text-muted-foreground">General interests:</span>
                    <span className="text-foreground">
                      {formatArrayValue(profile.investing_interests)}
                    </span>
                  </p>
                  <p className="flex flex-col">
                    <span className="font-medium text-xs text-muted-foreground">Thematic interests:</span>
                    <span className="text-foreground">
                      {formatArrayValue(profile.investing_interests_thematic)}
                    </span>
                  </p>
                  <p className="flex flex-col">
                    <span className="font-medium text-xs text-muted-foreground">Geographic interests:</span>
                    <span className="text-foreground">
                      {formatArrayValue(profile.investing_interests_geographies)}
                    </span>
                  </p>
                </div>
              </div>
              
              <p className="flex flex-col">
                <span className="font-medium text-sm text-muted-foreground">Product preferences:</span> 
                <span className="text-foreground">{formatArrayValue(profile.product_preferences)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retirement Section */}
        <Card className="bg-card shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sunrise className="h-5 w-5 text-primary" />
              Your retirement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "RRSP savings", value: formatCurrency(profile.rrsp_savings) },
              { label: "TFSA savings", value: formatCurrency(profile.tfsa_savings) },
              { label: "Other accounts", value: formatCurrency(profile.other_retirement_accounts) },
              { label: "Desired lifestyle", value: formatValue(profile.desired_retirement_lifestyle) }
            ].map((item, index) => (
              <p key={index} className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">{item.label}:</span> 
                <span className="text-foreground">{item.value}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Advisor Information Section - Show only if client has an advisor */}
      {profile.has_advisor && (
        <div className="mt-8">
          <Card className="bg-card shadow-sm border-border hover:shadow-md transition-shadow mx-auto max-w-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <UserPlus className="h-5 w-5 text-primary" />
                Financial advisor details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Advisor name:</span>
                  <span className="font-semibold text-foreground">{formatValue(profile.advisor_name)}</span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Company:</span>
                  <span className="font-semibold text-foreground">{formatValue(profile.advisor_company_name)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Email address:</span>
                  <span className="font-semibold text-foreground break-all">
                    {profile.advisor_email_address ? (
                      <a href={`mailto:${profile.advisor_email_address}`} className="text-primary hover:underline">
                        {profile.advisor_email_address}
                      </a>
                    ) : (
                      'Not set'
                    )}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">Contact your advisor:</span>
                  {profile.advisor_email_address ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-1 w-fit"
                      onClick={() => window.location.href = `mailto:${profile.advisor_email_address}`}
                    >
                      Send email
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">No contact information available</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}