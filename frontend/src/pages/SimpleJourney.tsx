import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Loader2, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  UserCircle, 
  LineChart, 
  Clock, 
  Wallet, 
  Sunrise, 
  UserPlus,
  Info,
  DollarSign,
  Calendar,
  HelpCircle,
  ArrowRight,
  BarChart4,
  Search,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Lightbulb,
  PlusCircle,
  Eye,
  ArrowUpRight,
  Percent,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Steps in the journey
type Step = 'profile' | 'agent-selection' | 'loading' | 'results' | 'complete';

// Agent types
type AgentType = 'investment-analyst' | 'investment-timemachine' | null;

// Enhanced Profile interface matching the full schema
interface Profile {
  name: string;
  age: number;
  country_of_residence: string;
  email: string;
  marital_status: string;
  number_of_dependents: number;
  postal_code: string;
  
  // Financial details
  monthly_income?: number;
  monthly_expenses?: number;
  cash_balance?: number;
  investments?: number;
  debt?: number;
  
  // Investment details
  investor_type?: string;
  advisor_preference?: string;
  investing_interests?: string[] | any[];
  investing_interests_thematic?: string[] | any[];
  investing_interests_geographies?: string[] | any[];
  product_preferences?: string[] | any[];
  
  // Retirement details
  rrsp_savings?: number;
  tfsa_savings?: number;
  other_retirement_accounts?: number;
  desired_retirement_lifestyle?: string;
  
  // Advisor details
  has_advisor?: boolean;
  advisor_id?: string;
  advisor_name?: string;
  advisor_email_address?: string;
  advisor_company_name?: string;
}

// Recommended product interface matching the backend structure
interface RecommendedProduct {
  symbol: string;
  name: string;
  type: string;
  expense_ratio?: string;
  returns?: string;
}

// Portfolio analysis output structure matching the multi-agent backend structure
interface PortfolioAnalysisOutput {
  market_overview: string;
  portfolio_impact: string;
  risk_assessment: string;
  recommended_actions: string;
  recommended_product: RecommendedProduct;
  portfolio_fit_explanation: string;
}

// Loading steps for the dynamic loading state
interface LoadingStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// Define product preference options
const PRODUCT_PREFERENCES = [
  { id: "etfs", label: "ETFs" },
  { id: "mutual_funds", label: "Mutual funds" },
  { id: "stocks", label: "Stocks" },
];

// Define asset class interest options
const ASSET_CLASS_INTERESTS = [
  { id: "equity_us", label: "Equity US" },
  { id: "equity_europe", label: "Equity Europe" },
  { id: "equity_canada", label: "Equity Canada" },
  { id: "equity_emerging_markets", label: "Equity emerging markets" },
  { id: "commodity_gold", label: "Commodity gold" },
  { id: "commodity_other", label: "Other commodities" },
  { id: "bonds_investment_grade_us", label: "Investment grade US bonds" },
  { id: "bonds_investment_grade_canada", label: "Investment grade Canada bonds" },
  { id: "bonds_emerging_markets", label: "Emerging market bonds" },
  { id: "real_estate", label: "Real estate" },
  { id: "alternatives", label: "Alternatives" },
];

// Define thematic interest options
const THEMATIC_INTERESTS = [
  { id: 'technology', label: 'Technology' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'renewable_energy', label: 'Renewable energy' },
  { id: 'esg', label: 'ESG investments' },
  { id: 'ai', label: 'Artificial intelligence' },
  { id: 'cybersecurity', label: 'Cybersecurity' }
];

// Define geographic interest options
const GEOGRAPHIC_INTERESTS = [
  { id: 'north_america', label: 'North America' },
  { id: 'europe', label: 'Europe' },
  { id: 'asia_pacific', label: 'Asia Pacific' },
  { id: 'emerging_markets', label: 'Emerging markets' },
  { id: 'global', label: 'Global' },
  { id: 'canada', label: 'Canada' }
];

export default function SimpleJourney() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [parsedAnalysis, setParsedAnalysis] = useState<PortfolioAnalysisOutput | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('market');
  const [decisionDetails, setDecisionDetails] = useState({
    decision_description: '',
    decision_amount: 0,
    timeframe_years: 10
  });
  
  // New state for dynamic loading
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Function to get dynamic loading steps based on agent type
  const getLoadingSteps = (): LoadingStep[] => {
    if (selectedAgent === 'investment-analyst') {
      return [
        { 
          key: 'market', 
          label: 'Market research', 
          icon: <Search className="h-5 w-5 text-primary" />,
          description: 'Finding the latest market news relevant to your portfolio holdings...'
        },
        { 
          key: 'portfolio', 
          label: 'Portfolio analysis', 
          icon: <LineChart className="h-5 w-5 text-primary" />,
          description: 'Evaluating how market conditions affect your specific investments...'
        },
        { 
          key: 'handoff', 
          label: 'Recommendation agent', 
          icon: <ArrowRightLeft className="h-5 w-5 text-primary" />,
          description: 'Handing off to specialized agent for personalized investment recommendations...'
        },
        { 
          key: 'report', 
          label: 'Finalizing analysis', 
          icon: <BarChart4 className="h-5 w-5 text-primary" />,
          description: 'Compiling your complete portfolio analysis and recommendations...'
        }
      ];
    } else if (selectedAgent === 'investment-timemachine') {
      return [
        { 
          key: 'scenarios', 
          label: 'Creating scenarios', 
          icon: <Clock className="h-5 w-5 text-primary" />,
          description: 'Projecting alternative financial scenarios based on your decision...'
        },
        { 
          key: 'analysis', 
          label: 'Financial analysis', 
          icon: <LineChart className="h-5 w-5 text-primary" />,
          description: 'Calculating long-term financial impacts of different options...'
        },
        { 
          key: 'comparison', 
          label: 'Comparing outcomes', 
          icon: <BarChart4 className="h-5 w-5 text-primary" />,
          description: 'Comparing investment returns against your decision...'
        },
        { 
          key: 'report', 
          label: 'Finalizing insights', 
          icon: <Lightbulb className="h-5 w-5 text-primary" />,
          description: 'Compiling the decision analysis with actionable insights...'
        }
      ];
    }
    
    // Generic fallback steps
    return [
      { 
        key: 'gather', 
        label: 'Gathering information', 
        icon: <Search className="h-5 w-5 text-primary" />,
        description: 'Collecting relevant data for your analysis...'
      },
      { 
        key: 'process', 
        label: 'Processing data', 
        icon: <LineChart className="h-5 w-5 text-primary" />,
        description: 'Analyzing the information to generate insights...'
      },
      { 
        key: 'generate', 
        label: 'Creating recommendations', 
        icon: <Lightbulb className="h-5 w-5 text-primary" />,
        description: 'Developing personalized recommendations for you...'
      },
      { 
        key: 'finalize', 
        label: 'Finalizing results', 
        icon: <BarChart4 className="h-5 w-5 text-primary" />,
        description: 'Preparing your complete analysis results...'
      }
    ];
  };

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile();
  }, []);
  
  // Dynamic loading progress effect
  useEffect(() => {
    if (agentLoading) {
      // Reset progress when loading starts
      setLoadingStep(0);
      setLoadingProgress(0);
      
      // Progress through the steps
      const loadingSteps = getLoadingSteps();
      const totalSteps = loadingSteps.length;
      const totalTime = 45000; // 45 seconds total estimated time
      const baseStepTime = totalTime / totalSteps;
      
      // Function to advance to next step
      const advanceStep = (step: number, isLast = false) => {
        // For last step, we'll wait longer (waiting for actual response)
        const stepTime = isLast ? baseStepTime * 1.5 : baseStepTime;
        
        let timeElapsed = 0;
        const interval = 100; // Update every 100ms
        const stepInterval = setInterval(() => {
          timeElapsed += interval;
          const stepProgress = Math.min(100, (timeElapsed / stepTime) * 100);
          
          setLoadingProgress(stepProgress);
          
          // Move to next step when complete
          if (timeElapsed >= stepTime && !isLast) {
            clearInterval(stepInterval);
            setLoadingStep(step + 1);
          }
        }, interval);
        
        return stepInterval;
      };
      
      // Start the first step
      const interval1 = advanceStep(0);
      
      // Schedule subsequent steps
      const timers: NodeJS.Timeout[] = [];
      for (let i = 1; i < totalSteps; i++) {
        const timer = setTimeout(() => {
          if (i === 1) clearInterval(interval1);
          const isLast = i === totalSteps - 1;
          advanceStep(i, isLast);
        }, baseStepTime * i);
        timers.push(timer);
      }
      
      // Cleanup intervals and timers
      return () => {
        clearInterval(interval1);
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [agentLoading, selectedAgent]); // Add selectedAgent as a dependency
  
  // Try to parse the agent result into structured format when result changes
  useEffect(() => {
    if (agentResult?.analysis) {
      try {
        // First try to parse as JSON if it's a string that contains JSON
        if (typeof agentResult.analysis === 'string' && 
            (agentResult.analysis.trim().startsWith('{') || agentResult.analysis.includes('```json'))) {
          
          let jsonStr = agentResult.analysis;
          
          // Extract JSON if wrapped in code blocks
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
          }
          
          const parsed = JSON.parse(jsonStr);
          setParsedAnalysis(parsed);
        } 
        // If already an object, use directly
        else if (typeof agentResult.analysis === 'object') {
          setParsedAnalysis(agentResult.analysis);
        }
        // Otherwise, try to parse markdown headings into sections
        else if (typeof agentResult.analysis === 'string') {
          // This is a fallback for unstructured text - try to identify sections
          const recommendedProduct = {
            symbol: extractProductDetail(agentResult.analysis, ["Symbol", "Ticker"]),
            name: extractProductDetail(agentResult.analysis, ["Product", "Fund", "Investment", "Name"]),
            type: extractProductDetail(agentResult.analysis, ["Type"]),
            expense_ratio: extractProductDetail(agentResult.analysis, ["Expense Ratio", "Fees"]),
            returns: extractProductDetail(agentResult.analysis, ["Return", "Performance"])
          };
          
          const sections = {
            market_overview: extractSection(agentResult.analysis, ["Market Overview", "Market Conditions", "Current Market"]),
            portfolio_impact: extractSection(agentResult.analysis, ["Portfolio Impact", "Impact Analysis"]),
            risk_assessment: extractSection(agentResult.analysis, ["Risk Assessment", "Risk Analysis"]),
            recommended_actions: extractSection(agentResult.analysis, ["Recommended Actions", "Recommendations"]),
            recommended_product: recommendedProduct,
            portfolio_fit_explanation: extractSection(agentResult.analysis, ["Portfolio Fit", "Why This Product"])
          };
          
          setParsedAnalysis(sections as PortfolioAnalysisOutput);
        }
      } catch (e) {
        console.error("Error parsing analysis:", e);
        // Keep the original format if parsing fails
        setParsedAnalysis(null);
      }
    }
  }, [agentResult]);

  // Helper function to extract sections from text
  const extractSection = (text: string, possibleHeadings: string[]): string => {
    if (typeof text !== 'string') return "";
    
    for (const heading of possibleHeadings) {
      const regex = new RegExp(`(?:##?\\s*${heading}|\\*\\*${heading}\\*\\*)[:\\s]*(.*?)(?:##|$)`, 'is');
      const match = text.match(regex);
      if (match && match[1]) return match[1].trim();
    }
    return "";
  };
  
  // Helper to extract product details
  const extractProductDetail = (text: string, possibleLabels: string[]): string => {
    if (typeof text !== 'string') return "";
    
    for (const label of possibleLabels) {
      const regex = new RegExp(`${label}[:\\s]+([^\\n]+)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) return match[1].trim();
    }
    return "";
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/api/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError('Failed to load profile. Please try again.');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updatedProfile: Profile) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProfile)
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      
      const data = await response.json();
      setProfile(data);
      return true;
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Error updating profile:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    const success = await updateProfile(profile);
    if (success) {
      setCurrentStep('agent-selection');
    }
  };

  const handleProfileInputChange = (field: keyof Profile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  // Handler for array fields like investing_interests
  const updateArrayField = (field: keyof Profile, item: string) => {
    if (!profile) return;
    
    const currentArray = Array.isArray(profile[field]) ? [...(profile[field] as any[])] : [];
    const valueIndex = currentArray.indexOf(item);
    
    if (valueIndex === -1) {
      // Add item if not present
      handleProfileInputChange(field, [...currentArray, item]);
    } else {
      // Remove item if already present
      handleProfileInputChange(field, currentArray.filter((_, index) => index !== valueIndex));
    }
  };

  const runAgent = async () => {
    if (!selectedAgent) return;
    
    setAgentLoading(true);
    setError(null);
    setParsedAnalysis(null);
    
    // Change to loading state immediately
    setCurrentStep('loading');
    
    try {
      let response;
      
      if (selectedAgent === 'investment-analyst') {
        response = await apiRequest('/api/investments/analyst-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
      } else {
        response = await apiRequest('/api/investments/timemachine', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(decisionDetails)
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const data = await response.json();
      setAgentResult(data);
      setCurrentStep('results');
    } catch (err) {
      setError('Failed to run agent. Please try again.');
      console.error('Error running agent:', err);
      // Return to agent selection on error
      setCurrentStep('agent-selection');
    } finally {
      setAgentLoading(false);
    }
  };

  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAgent();
  };

  // Format currency for display
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '';
    return value.toString();
  };

  // Format currency for display with dollar sign and commas
  const formatCurrencyDisplay = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Determines risk level color
  const getRiskColor = (riskLevel: string) => {
    const level = riskLevel.toLowerCase();
    if (level.includes('high') || level.includes('severe')) return 'text-red-500';
    if (level.includes('moderate') || level.includes('medium')) return 'text-amber-500';
    if (level.includes('low') || level.includes('minimal')) return 'text-green-500';
    return 'text-blue-500'; // Default
  };

  // Safe method to handle string operations with type checking
  const safeFormatMarkdown = (text: any): string => {
    if (typeof text !== 'string') return '';
    
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/<p><\/p>/g, '<br/>');
  };

  // Render the profile step with all fields organized in sections
  const renderProfileStep = () => (
    <div>
      <Card className="w-full max-w-4xl mx-auto shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserCircle className="h-6 w-6 text-primary" />
            Step 1: Review your profile
          </CardTitle>
          <CardDescription className="text-base">
            Confirm or update your information to get personalized financial insights
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileSubmit}>
          <CardContent className="space-y-6 pt-6">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-10 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading your profile...</p>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
                <Info className="h-5 w-5 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            ) : profile ? (
              <div className="space-y-10">
                {/* About You Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <UserCircle className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">About you</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                      <Input
                        id="name"
                        value={profile.name || ''}
                        onChange={(e) => handleProfileInputChange('name', e.target.value)}
                        required
                        className="focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age" className="text-sm font-medium">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={profile.age || ''}
                        onChange={(e) => handleProfileInputChange('age', Number(e.target.value))}
                        required
                        className="focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm font-medium">Country of residence</Label>
                      <Input
                        id="country"
                        value={profile.country_of_residence || ''}
                        onChange={(e) => handleProfileInputChange('country_of_residence', e.target.value)}
                        className="focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marital_status" className="text-sm font-medium">Marital status</Label>
                      <Select 
                        value={profile.marital_status || ''}
                        onValueChange={(value) => handleProfileInputChange('marital_status', value)}
                      >
                        <SelectTrigger className="focus:ring-primary">
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
                      <Label htmlFor="dependents" className="text-sm font-medium">Number of dependents</Label>
                      <Input
                        id="dependents"
                        type="number"
                        min="0"
                        value={profile.number_of_dependents || ''}
                        onChange={(e) => handleProfileInputChange('number_of_dependents', Number(e.target.value))}
                        className="focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code" className="text-sm font-medium">Postal code</Label>
                      <Input
                        id="postal_code"
                        value={profile.postal_code || ''}
                        onChange={(e) => handleProfileInputChange('postal_code', e.target.value)}
                        className="focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email || ''}
                        readOnly
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be edited</p>
                    </div>
                  </div>
                </div>

                {/* Finances Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Your finances</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_income" className="text-sm font-medium flex items-center gap-1">
                        Monthly income
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Your total monthly income before taxes</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="monthly_income"
                          type="number"
                          value={formatCurrency(profile.monthly_income)}
                          onChange={(e) => handleProfileInputChange('monthly_income', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_expenses" className="text-sm font-medium flex items-center gap-1">
                        Monthly expenses
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Your average monthly expenses including bills, rent/mortgage, etc.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="monthly_expenses"
                          type="number"
                          value={formatCurrency(profile.monthly_expenses)}
                          onChange={(e) => handleProfileInputChange('monthly_expenses', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cash_balance" className="text-sm font-medium">Cash balance</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="cash_balance"
                          type="number"
                          value={formatCurrency(profile.cash_balance)}
                          onChange={(e) => handleProfileInputChange('cash_balance', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="investments" className="text-sm font-medium">Investments</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="investments"
                          type="number"
                          value={formatCurrency(profile.investments)}
                          onChange={(e) => handleProfileInputChange('investments', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debt" className="text-sm font-medium">Debt</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="debt"
                          type="number"
                          min="0"
                          value={formatCurrency(profile.debt)}
                          onChange={(e) => handleProfileInputChange('debt', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Investments Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <LineChart className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Your investments</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="investor_type" className="text-sm font-medium flex items-center gap-1">
                          Investor type
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Your risk tolerance for investments</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Select
                          value={profile.investor_type || ''}
                          onValueChange={(value) => handleProfileInputChange('investor_type', value)}
                        >
                          <SelectTrigger className="focus:ring-primary">
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
                        <Label htmlFor="advisor_preference" className="text-sm font-medium">Advisor preference</Label>
                        <Select
                          value={profile.advisor_preference || ''}
                          onValueChange={(value) => handleProfileInputChange('advisor_preference', value)}
                        >
                          <SelectTrigger className="focus:ring-primary">
                            <SelectValue placeholder="Select advisor preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self_directed">Self-directed</SelectItem>
                            <SelectItem value="robo_advisor">Robo-advisor</SelectItem>
                            <SelectItem value="human_advisor">Human advisor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Investment Interests */}
                    <div className="space-y-6 bg-muted/30 p-4 rounded-lg">
                      <h4 className="font-medium">Investment interests</h4>

                      {/* Asset Class Interests */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Asset class interests</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ASSET_CLASS_INTERESTS.map((interest) => (
                            <div key={interest.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`interest_${interest.id}`}
                                checked={Array.isArray(profile.investing_interests) && 
                                  profile.investing_interests.includes(interest.id)}
                                onCheckedChange={() => updateArrayField('investing_interests', interest.id)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
                        <Label className="text-sm font-medium">Thematic interests</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {THEMATIC_INTERESTS.map((interest) => (
                            <div key={interest.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`thematic_${interest.id}`}
                                checked={Array.isArray(profile.investing_interests_thematic) && 
                                  profile.investing_interests_thematic.includes(interest.id)}
                                onCheckedChange={() => updateArrayField('investing_interests_thematic', interest.id)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
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
                        <Label className="text-sm font-medium">Geographic interests</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {GEOGRAPHIC_INTERESTS.map((interest) => (
                            <div key={interest.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`geo_${interest.id}`}
                                checked={Array.isArray(profile.investing_interests_geographies) && 
                                  profile.investing_interests_geographies.includes(interest.id)}
                                onCheckedChange={() => updateArrayField('investing_interests_geographies', interest.id)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <Label htmlFor={`geo_${interest.id}`} className="text-sm font-normal">
                                {interest.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Product Preferences */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Product preferences</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {PRODUCT_PREFERENCES.map((preference) => (
                          <div key={preference.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`product_${preference.id}`}
                              checked={Array.isArray(profile.product_preferences) && 
                                profile.product_preferences.includes(preference.id)}
                              onCheckedChange={() => updateArrayField('product_preferences', preference.id)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`product_${preference.id}`} className="text-sm font-normal">{preference.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retirement Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Sunrise className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Your retirement</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="rrsp_savings" className="text-sm font-medium">RRSP savings</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="rrsp_savings"
                          type="number"
                          min="0"
                          value={formatCurrency(profile.rrsp_savings)}
                          onChange={(e) => handleProfileInputChange('rrsp_savings', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tfsa_savings" className="text-sm font-medium">TFSA savings</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="tfsa_savings"
                          type="number"
                          min="0"
                          value={formatCurrency(profile.tfsa_savings)}
                          onChange={(e) => handleProfileInputChange('tfsa_savings', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="other_retirement_accounts" className="text-sm font-medium">Other retirement accounts</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="other_retirement_accounts"
                          type="number"
                          min="0"
                          value={formatCurrency(profile.other_retirement_accounts)}
                          onChange={(e) => handleProfileInputChange('other_retirement_accounts', Number(e.target.value))}
                          className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desired_retirement_lifestyle" className="text-sm font-medium flex items-center gap-1">
                        Desired retirement lifestyle
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">The quality of lifestyle you hope to maintain during retirement</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Select
                        value={profile.desired_retirement_lifestyle || ''}
                        onValueChange={(value) => handleProfileInputChange('desired_retirement_lifestyle', value)}
                      >
                        <SelectTrigger className="focus:ring-primary">
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
                </div>

                {/* Advisor Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Financial advisor details</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_advisor"
                        checked={profile.has_advisor}
                        onCheckedChange={(checked) => handleProfileInputChange('has_advisor', checked)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label htmlFor="has_advisor" className="text-sm">I have a financial advisor</Label>
                    </div>
                  </div>
                  
                  {profile.has_advisor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="advisor_name" className="text-sm font-medium">Advisor name</Label>
                        <Input
                          id="advisor_name"
                          value={profile.advisor_name || ''}
                          onChange={(e) => handleProfileInputChange('advisor_name', e.target.value)}
                          className="focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="advisor_company_name" className="text-sm font-medium">Advisor company</Label>
                        <Input
                          id="advisor_company_name"
                          value={profile.advisor_company_name || ''}
                          onChange={(e) => handleProfileInputChange('advisor_company_name', e.target.value)}
                          className="focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="advisor_email_address" className="text-sm font-medium">Advisor email</Label>
                        <Input
                          id="advisor_email_address"
                          type="email"
                          value={profile.advisor_email_address || ''}
                          onChange={(e) => handleProfileInputChange('advisor_email_address', e.target.value)}
                          className="focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-muted/50 rounded-lg p-8">
                  <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No profile found</p>
                  <p className="text-muted-foreground">Please create a profile to continue.</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between py-6 border-t">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to dashboard
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !profile}
              className="gap-2"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );

  // Render the agent selection step
  const renderAgentSelectionStep = () => (
    <div>
      <Card className="w-full max-w-2xl mx-auto shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-xl">
            <LineChart className="h-6 w-6 text-primary" />
            Step 2: Choose your AI advisor
          </CardTitle>
          <CardDescription className="text-base">
            Select which financial analysis you need today
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAgentSubmit}>
          <CardContent className="space-y-6 pt-6">
            <RadioGroup 
              defaultValue={selectedAgent || undefined} 
              onValueChange={(value) => setSelectedAgent(value as AgentType)}
              className="space-y-4"
            >
              <div className={`flex flex-col space-y-3 border rounded-lg p-5 hover:bg-accent/50 cursor-pointer transition-colors ${selectedAgent === 'investment-analyst' ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="investment-analyst" id="analyst" className="mt-1 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                  <div className="flex-1">
                    <Label htmlFor="analyst" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                      Investment portfolio analysis
                      <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">Recommended</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Analyze your current investment portfolio based on market conditions and get personalized recommendations
                    </p>
                  </div>
                </div>
                {selectedAgent === 'investment-analyst' && (
                  <div className="mt-2 pl-7 text-sm bg-muted/40 p-3 rounded-md border border-muted">
                    <div className="flex items-start space-x-2 mb-2">
                      <Search className="h-4 w-4 text-primary mt-0.5" />
                      <p className="text-foreground flex-1">Our AI will search for the latest market news relevant to your holdings</p>
                    </div>
                    <div className="flex items-start space-x-2 mb-2">
                      <LineChart className="h-4 w-4 text-primary mt-0.5" />
                      <p className="text-foreground flex-1">Assess your portfolio health based on current market conditions</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                      <p className="text-foreground flex-1">Provide tailored investment recommendations</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className={`flex flex-col space-y-3 border rounded-lg p-5 hover:bg-accent/50 cursor-pointer transition-colors ${selectedAgent === 'investment-timemachine' ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="investment-timemachine" id="timemachine" className="mt-1 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                  <div className="flex-1">
                    <Label htmlFor="timemachine" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                      Financial decision time machine
                      <Clock className="h-4 w-4 text-primary" />
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Project how a financial decision might turn out compared to other investment options
                    </p>
                  </div>
                </div>
                {selectedAgent === 'investment-timemachine' && (
                  <div className="mt-2 pl-7">
                    <div className="space-y-4 bg-muted/40 p-3 rounded-md border border-muted">
                      <h3 className="text-sm font-medium">Decision details</h3>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="decision_description" className="text-xs">What are you considering purchasing?</Label>
                          <Input
                            id="decision_description"
                            placeholder="E.g., a new car, vacation, home renovation"
                            value={decisionDetails.decision_description}
                            onChange={(e) => setDecisionDetails({
                              ...decisionDetails,
                              decision_description: e.target.value
                            })}
                            required
                            className="h-9 text-sm focus-visible:ring-primary"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="decision_amount" className="text-xs">How much will it cost?</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="decision_amount"
                              type="number"
                              placeholder="Enter amount"
                              value={decisionDetails.decision_amount || ''}
                              onChange={(e) => setDecisionDetails({
                                ...decisionDetails,
                                decision_amount: Number(e.target.value)
                              })}
                              required
                              className="pl-8 h-9 text-sm focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="timeframe_years" className="text-xs flex items-center gap-1">
                            Time horizon (years)
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">How many years to project this financial decision into the future</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="timeframe_years"
                              type="number"
                              placeholder="10"
                              value={decisionDetails.timeframe_years || ''}
                              onChange={(e) => setDecisionDetails({
                                ...decisionDetails,
                                timeframe_years: Number(e.target.value)
                              })}
                              required
                              className="pl-8 h-9 text-sm focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between py-6 border-t">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setCurrentStep('profile')}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to profile
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedAgent}
              className="gap-2"
            >
              Get insights
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );

  // Render the loading step
  const renderLoadingStep = () => (
    <div className="w-full max-w-3xl mx-auto mt-10">
      <Card className="shadow-md border border-primary/10">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              {selectedAgent === 'investment-analyst' 
                ? "Analyzing your investment portfolio" 
                : selectedAgent === 'investment-timemachine'
                  ? "Analyzing your financial decision"
                  : "Processing your request"}
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              In progress
            </Badge>
          </div>
          <CardDescription>
            This may take up to a minute to complete
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-6">
            {getLoadingSteps().map((step, index) => (
              <div key={step.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {index < loadingStep ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : index === loadingStep ? (
                      <div className="flex items-center">
                        {step.icon}
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted flex items-center justify-center">
                        <span className="text-xs">{index + 1}</span>
                      </div>
                    )}
                    <span className={`font-medium ${index <= loadingStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < loadingStep && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Completed
                    </Badge>
                  )}
                  {index === loadingStep && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(loadingProgress)}%
                    </span>
                  )}
                </div>
                
                {index === loadingStep && (
                  <>
                    <Progress value={loadingProgress} className="h-1.5" />
                    <p className="text-sm text-muted-foreground py-1">
                      {step.description}
                    </p>
                  </>
                )}
                
                {/* Divider between steps */}
                {index < getLoadingSteps().length - 1 && (
                  <div className="h-5 border-l-2 border-dashed border-muted ml-2.5"></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render the results step with enhanced UI for portfolio analysis
  const renderResultsStep = () => (
    <div>
      <Card className="w-full max-w-4xl mx-auto shadow-md">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Step 3: Your personalized analysis
            </CardTitle>
            <Badge className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Complete
            </Badge>
          </div>
          <CardDescription className="text-base">
            {selectedAgent === 'investment-analyst' 
              ? 'Portfolio recommendations based on current market conditions' 
              : `Analysis of your ${decisionDetails.decision_description} decision (${formatCurrencyDisplay(decisionDetails.decision_amount)})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error ? (
            <div className="flex items-start gap-3 text-destructive p-4 border border-destructive/30 rounded-md bg-destructive/10">
              <Info className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Error generating insights</h4>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : agentResult ? (
            selectedAgent === 'investment-analyst' && parsedAnalysis ? (
              // Enhanced structured output for investment analyst
              <div className="space-y-6">
                {/* Tabs for sections */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="market" className="flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      <span className="hidden md:inline">Market</span>
                    </TabsTrigger>
                    <TabsTrigger value="portfolio" className="flex items-center gap-1">
                      <BarChart4 className="h-4 w-4" />
                      <span className="hidden md:inline">Portfolio</span>
                    </TabsTrigger>
                    <TabsTrigger value="recommendation" className="flex items-center gap-1">
                      <Lightbulb className="h-4 w-4" />
                      <span className="hidden md:inline">Recommendation</span>
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="hidden md:inline">Actions</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="market" className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 p-4 border-b">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Market Overview
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="prose prose-sm max-w-none">
                          {parsedAnalysis.market_overview?.split('\n').map((paragraph, i) => (
                            <p key={i} className={i === 0 ? "mb-4" : "mb-2"}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="portfolio" className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 p-4 border-b">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <LineChart className="h-5 w-5 text-primary" />
                          Portfolio Impact
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="prose prose-sm max-w-none">
                          {parsedAnalysis.portfolio_impact?.split('\n').map((paragraph, i) => (
                            <p key={i} className="mb-2">{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 p-4 border-b">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Risk Assessment
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="prose prose-sm max-w-none">
                          {parsedAnalysis.risk_assessment?.split('\n').map((paragraph, i) => (
                            <p key={i} className="mb-2">{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="recommendation" className="space-y-4">
                    <div className="border rounded-lg bg-primary/5 overflow-hidden">
                      <div className="bg-primary p-4 text-primary-foreground">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Recommended Investment
                        </h3>
                      </div>
                      <div className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="min-w-[120px] h-[120px] flex items-center justify-center rounded-lg bg-muted/80 border">
                            <div className="text-center">
                              <span className="text-2xl font-bold text-primary block">
                                {parsedAnalysis.recommended_product?.symbol || "ETF"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {parsedAnalysis.recommended_product?.type || "Investment"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold mb-2">{parsedAnalysis.recommended_product?.name || "Recommended Product"}</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 mb-3">
                              {parsedAnalysis.recommended_product?.expense_ratio && (
                                <div className="flex items-center text-sm">
                                  <Percent className="h-4 w-4 text-muted-foreground mr-2" />
                                  <span className="text-muted-foreground mr-1">Expense Ratio:</span>
                                  <span className="font-semibold">{parsedAnalysis.recommended_product.expense_ratio}</span>
                                </div>
                              )}
                              
                              {parsedAnalysis.recommended_product?.returns && (
                                <div className="flex items-center text-sm">
                                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-2" />
                                  <span className="text-muted-foreground mr-1">Returns:</span>
                                  <span className="font-semibold">{parsedAnalysis.recommended_product.returns}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-4">
                              <h5 className="font-medium flex items-center gap-1 mb-2">
                                <PlusCircle className="h-4 w-4 text-primary" />
                                Portfolio Fit
                              </h5>
                              <div className="text-sm">
                                {parsedAnalysis.portfolio_fit_explanation?.split('\n').map((paragraph, i) => (
                                  <p key={i} className="mb-2">{paragraph}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                          <Button className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Investment Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="actions" className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/30 p-4 border-b">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                          Recommended Actions
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="space-y-4">
                          {parsedAnalysis.recommended_actions?.split('\n').map((actionItem, i) => {
                            // Skip empty lines
                            if (!actionItem.trim()) return null;
                            
                            // Format as action items
                            return (
                              <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                                <div className="bg-primary/10 p-2 rounded-full">
                                  <ArrowUpRight className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm">{actionItem}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : selectedAgent === 'investment-timemachine' ? (
              // Use safe handling for timemachine content
              <div className="space-y-4">
                {typeof agentResult.analysis === 'string' && agentResult.analysis.includes("Scenario Analysis:") ? (
                  <>
                    <div className="bg-muted/30 p-3 rounded-md border border-muted mb-6">
                      <h3 className="text-base font-semibold text-primary mb-2">Decision Impact Summary</h3>
                      <p className="text-sm">
                        Analysis of {decisionDetails.decision_description} (${decisionDetails.decision_amount.toLocaleString()}) 
                        over {decisionDetails.timeframe_years} years
                      </p>
                    </div>
                    
                    {typeof agentResult.analysis === 'string' && agentResult.analysis.split('\n\n').map((paragraph, index) => {
                      if (paragraph.startsWith("Scenario Analysis:") || 
                          paragraph.startsWith("Impact:") || 
                          paragraph.startsWith("Risk:") || 
                          paragraph.startsWith("Recommendations:")) {
                        
                        const [title, ...content] = paragraph.split('\n');
                        return (
                          <div key={index} className="mb-4">
                            <h3 className="text-base font-semibold text-primary">{title.split(':')[0]}</h3>
                            <div className="mt-2 pl-0">
                              {content.map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                            </div>
                          </div>
                        );
                      }
                      return <p key={index} className="mb-3">{paragraph}</p>;
                    })}
                  </>
                ) : (
                  <div dangerouslySetInnerHTML={{ 
                    __html: typeof agentResult.analysis === 'string' ? 
                      safeFormatMarkdown(agentResult.analysis) : 
                      "Analysis results not available in the expected format."
                  }} />
                )}
              </div>
            ) : (
              // Fallback for raw output with safe handling
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/30 p-4 border-b">
                  <h3 className="text-lg font-semibold">Analysis Results</h3>
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="prose prose-sm max-w-none">
                    {typeof agentResult.analysis === 'string' ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: safeFormatMarkdown(agentResult.analysis)
                      }} />
                    ) : (
                      <p>Analysis results are available but not in the expected text format.</p>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Processing your insights...</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between py-6 border-t">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setCurrentStep('agent-selection')}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to agent selection
          </Button>
          <Button 
            type="button"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            Complete journey
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  // Main render logic
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto mb-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold font-montserrat text-foreground mb-2">Financial planning assistant</h1>
          <p className="text-muted-foreground text-lg">
            Get personalized analysis and recommendations in minutes
          </p>
        </div>
        
        <div className="flex justify-between mb-10 relative">
          {/* Progress bar - improved connection between dots */}
          <div className="absolute top-1/2 w-[95%] h-1 bg-muted -translate-y-1/2 z-0 mx-auto left-0 right-0"></div>
          <div 
            className="absolute top-1/2 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500 left-0"
            style={{ 
              width: currentStep === 'profile' ? '0%' : 
                    currentStep === 'agent-selection' ? '45%' :
                    currentStep === 'loading' ? '75%' : '90%',
              marginLeft: '20px'  // Offset to align with the first circle
            }}
          ></div>
          
          {/* Step 1 */}
          <div 
            className={`flex flex-col items-center relative z-10 ${
              currentStep === 'profile' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-colors ${
              currentStep === 'profile' ? 'border-primary bg-primary text-white font-medium' : 
              ['agent-selection', 'loading', 'results'].includes(currentStep) ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-background'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">Profile</span>
          </div>
          
          {/* Step 2 */}
          <div 
            className={`flex flex-col items-center relative z-10 ${
              currentStep === 'agent-selection' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-colors ${
              currentStep === 'agent-selection' ? 'border-primary bg-primary text-white font-medium' : 
              ['loading', 'results'].includes(currentStep) ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-background'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Choose advisor</span>
          </div>
          
          {/* Step 3 */}
          <div 
            className={`flex flex-col items-center relative z-10 ${
              ['loading', 'results'].includes(currentStep) ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-colors ${
              currentStep === 'results' ? 'border-primary bg-primary text-white font-medium' : 
              currentStep === 'loading' ? 'border-primary bg-primary/20 text-primary' : 'border-muted bg-background'
            }`}>
              {currentStep === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : 3}
            </div>
            <span className="text-sm font-medium">
              {currentStep === 'loading' ? 'Analyzing...' : 'View analysis'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {currentStep === 'profile' && renderProfileStep()}
        {currentStep === 'agent-selection' && renderAgentSelectionStep()}
        {currentStep === 'loading' && renderLoadingStep()}
        {currentStep === 'results' && renderResultsStep()}
      </div>
    </div>
  );
}