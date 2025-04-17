import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserCircle, Wallet, LineChart, Sunrise, Loader2, ChevronLeft } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from '@/contexts/AuthContext'

interface Profile {
  name: string
  age: number
  country_of_residence: string
  marital_status: string
  number_of_dependents: number
  email: string
  postal_code: string
  monthly_income?: number
  monthly_expenses?: number
  cash_balance?: number
  investments?: number
  debt?: number
  investor_type?: string
  advisor_preference?: string
  investing_interests?: string[] | any[]
  investing_interests_thematic?: string[] | any[]
  investing_interests_geographies?: string[] | any[]
  product_preferences?: string[] | any[]
  rrsp_savings?: number
  tfsa_savings?: number
  other_retirement_accounts?: number
  desired_retirement_lifestyle?: string
  has_advisor?: boolean
  advisor_id?: string
  advisor_name?: string
  advisor_email_address?: string
  advisor_company_name?: string
}

const PRODUCT_PREFERENCES = [
  { id: "etfs", label: "ETFs" },
  { id: "mutual_funds", label: "Mutual Funds" },
  { id: "stocks", label: "Stocks" },
] as const;

const ASSET_CLASS_INTERESTS = [
  { id: "equity_us", label: "Equity US" },
  { id: "equity_europe", label: "Equity Europe" },
  { id: "equity_canada", label: "Equity Canada" },
  { id: "equity_emerging_markets", label: "Equity Emerging Markets" },
  { id: "commodity_gold", label: "Commodity Gold" },
  { id: "commodity_other", label: "Commodity Other" },
  { id: "bonds_investment_grade_us", label: "Bonds Investment Grade US" },
  { id: "bonds_investment_grade_canada", label: "Bonds Investment Grade Canada" },
  { id: "bonds_emerging_markets", label: "Bonds Emerging Markets" },
  { id: "real_estate", label: "Real Estate" },
  { id: "alternatives", label: "Alternatives" },
] as const;

export default function EditProfile() {
  const navigate = useNavigate()
  const { isAuthenticated, apiRequest } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchProfile = async () => {
    try {
      if (!isAuthenticated) {
        navigate('/login')
        return
      }
      
      const response = await apiRequest('/api/profile')
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      console.log("Fetched profile data:", data)
      setProfile(data)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const updateProfile = (field: keyof Profile, value: any) => {
    if (!profile) return;
    
    setProfile(prev => {
      if (!prev) return prev;
      
      // Handle array fields for investing interests and product preferences
      if (field === 'investing_interests' || field === 'investing_interests_thematic' || 
          field === 'investing_interests_geographies' || field === 'product_preferences') {
        // For array fields, we need to toggle values in the array
        const currentArray = Array.isArray(prev[field]) ? [...prev[field] as any[]] : [];
        const valueIndex = currentArray.indexOf(value);
        
        if (valueIndex === -1) {
          // Add value if not present
          return { ...prev, [field]: [...currentArray, value] };
        } else {
          // Remove value if already present
          return { 
            ...prev, 
            [field]: currentArray.filter((_, index) => index !== valueIndex) 
          };
        }
      }
      
      // Handle other fields as before
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) {
      setError('No profile data available');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSaving(true);
    
    try {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      const response = await apiRequest('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(data);
      setSuccessMessage('Profile updated successfully');
      
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>
  
  if (!loading && !profile) return <div className="flex justify-center items-center min-h-screen">No profile found</div>

  return (
    <>
      <div className="container mx-auto py-8 px-4">
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
            type="submit" 
            form="profile-form" 
            className="bg-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>

        <div className="text-center mb-6">
          <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
            Your profile
          </span>
          <h1 className="text-3xl font-montserrat font-bold">Edit your profile</h1>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-md">
          <p className="text-blue-700 text-sm">
            <span className="font-medium">💡 Tip:</span> Accurate, complete information helps us give you better financial guidance.
          </p>
        </div>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        <form id="profile-form" onSubmit={handleSubmit} data-saving={saving.toString()}>
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="investment">Investment</TabsTrigger>
              <TabsTrigger value="retirement">Retirement</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={profile?.name || ''}
                        onChange={(e) => updateProfile('name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={profile?.age || ''}
                        onChange={(e) => updateProfile('age', Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country of Residence</Label>
                      <Input
                        id="country"
                        value={profile?.country_of_residence || ''}
                        onChange={(e) => updateProfile('country_of_residence', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marital_status">Marital Status</Label>
                      <Select 
                        value={profile?.marital_status || ''}
                        onValueChange={(value) => updateProfile('marital_status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dependents">Number of Dependents</Label>
                      <Input
                        id="dependents"
                        type="number"
                        min="0"
                        value={profile?.number_of_dependents || ''}
                        onChange={(e) => updateProfile('number_of_dependents', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={profile?.postal_code || ''}
                        onChange={(e) => updateProfile('postal_code', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_income">Monthly Income</Label>
                      <Input
                        id="monthly_income"
                        type="number"
                        value={profile.monthly_income || ''}
                        onChange={(e) => updateProfile('monthly_income', Number(e.target.value))}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_expenses">Monthly Expenses</Label>
                      <Input
                        id="monthly_expenses"
                        type="number"
                        value={profile.monthly_expenses || ''}
                        onChange={(e) => updateProfile('monthly_expenses', Number(e.target.value))}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cash_balance">Cash Balance</Label>
                      <Input
                        id="cash_balance"
                        type="number"
                        value={profile.cash_balance || ''}
                        onChange={(e) => updateProfile('cash_balance', Number(e.target.value))}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="investments">Investments</Label>
                      <Input
                        id="investments"
                        type="number"
                        value={profile.investments || ''}
                        onChange={(e) => updateProfile('investments', Number(e.target.value))}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debt">Debt</Label>
                      <Input
                        id="debt"
                        type="number"
                        min="0"
                        value={profile.debt ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string to be converted to 0
                          updateProfile('debt', value === '' ? 0 : Number(value));
                        }}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="investment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Investment Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="investor_type">Investor Type</Label>
                      <Select
                        value={profile?.investor_type || ''}
                        onValueChange={(value) => updateProfile('investor_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select investor type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advisor_preference">Advisor Preference</Label>
                      <Select
                        value={profile?.advisor_preference || ''}
                        onValueChange={(value) => updateProfile('advisor_preference', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select advisor preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self_directed">Self-Directed</SelectItem>
                          <SelectItem value="robo_advisor">Robo-Advisor</SelectItem>
                          <SelectItem value="human_advisor">Human Advisor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Product preferences</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {PRODUCT_PREFERENCES.map((preference) => (
                          <div key={preference.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`product_${preference.id}`}
                              checked={Array.isArray(profile?.product_preferences) && profile?.product_preferences.includes(preference.id)}
                              onCheckedChange={(checked) => {
                                updateProfile('product_preferences', preference.id);
                              }}
                            />
                            <Label htmlFor={`product_${preference.id}`}>{preference.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Investment interests</Label>
                      <div className="space-y-4">
                        {/* Asset Class Interests */}
                        <div className="space-y-2">
                          <Label className="text-sm">Asset class interests</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ASSET_CLASS_INTERESTS.map((interest) => (
                              <div key={interest.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`interest_${interest.id}`}
                                  checked={Array.isArray(profile?.investing_interests) && profile?.investing_interests.includes(interest.id)}
                                  onCheckedChange={(checked) => {
                                    updateProfile('investing_interests', interest.id);
                                  }}
                                />
                                <Label htmlFor={`interest_${interest.id}`} className="text-sm font-normal">
                                  {interest.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Thematic Interests */}
                        <div className="space-y-2">
                          <Label className="text-sm">Thematic interests</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { id: 'technology', label: 'Technology' },
                              { id: 'healthcare', label: 'Healthcare' },
                              { id: 'renewable_energy', label: 'Renewable Energy' },
                              { id: 'esg', label: 'ESG Investments' },
                              { id: 'ai', label: 'Artificial Intelligence' },
                              { id: 'cybersecurity', label: 'Cybersecurity' }
                            ].map((interest) => (
                              <div key={interest.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`thematic_${interest.id}`}
                                  checked={Array.isArray(profile?.investing_interests_thematic) && profile?.investing_interests_thematic.includes(interest.id)}
                                  onCheckedChange={(checked) => {
                                    updateProfile('investing_interests_thematic', interest.id);
                                  }}
                                />
                                <Label htmlFor={`thematic_${interest.id}`} className="text-sm font-normal">
                                  {interest.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Geographic Interests */}
                        <div className="space-y-2">
                          <Label className="text-sm">Geographic interests</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { id: 'north_america', label: 'North America' },
                              { id: 'europe', label: 'Europe' },
                              { id: 'asia_pacific', label: 'Asia Pacific' },
                              { id: 'emerging_markets', label: 'Emerging Markets' },
                              { id: 'global', label: 'Global' },
                              { id: 'canada', label: 'Canada' }
                            ].map((interest) => (
                              <div key={interest.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`geo_${interest.id}`}
                                  checked={Array.isArray(profile?.investing_interests_geographies) && profile?.investing_interests_geographies.includes(interest.id)}
                                  onCheckedChange={(checked) => {
                                    updateProfile('investing_interests_geographies', interest.id);
                                  }}
                                />
                                <Label htmlFor={`geo_${interest.id}`} className="text-sm font-normal">
                                  {interest.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retirement" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sunrise className="h-5 w-5" />
                    Retirement Planning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rrsp_savings">RRSP Savings</Label>
                      <Input
                        id="rrsp_savings"
                        type="number"
                        min="0"
                        value={profile?.rrsp_savings ?? ''}
                        onChange={(e) => updateProfile('rrsp_savings', e.target.value)}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tfsa_savings">TFSA Savings</Label>
                      <Input
                        id="tfsa_savings"
                        type="number"
                        min="0"
                        value={profile?.tfsa_savings ?? ''}
                        onChange={(e) => updateProfile('tfsa_savings', e.target.value)}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="other_retirement_accounts">Other Retirement Accounts</Label>
                      <Input
                        id="other_retirement_accounts"
                        type="number"
                        min="0"
                        value={profile?.other_retirement_accounts ?? ''}
                        onChange={(e) => updateProfile('other_retirement_accounts', e.target.value)}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desired_retirement_lifestyle">Desired Retirement Lifestyle</Label>
                      <Select
                        value={profile.desired_retirement_lifestyle || ''}
                        onValueChange={(value) => updateProfile('desired_retirement_lifestyle', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lifestyle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modest">Modest</SelectItem>
                          <SelectItem value="comfortable">Comfortable</SelectItem>
                          <SelectItem value="luxurious">Luxurious</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </>
  )
} 