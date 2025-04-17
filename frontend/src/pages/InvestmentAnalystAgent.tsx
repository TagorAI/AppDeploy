import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  CheckCircle2, 
  ChevronLeft, 
  LineChart, 
  UserCircle, 
  Search,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Lightbulb,
  BarChart4,
  ArrowRightLeft,
  ArrowUpRight,
  LayoutDashboard
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

export default function InvestmentAnalystAgent() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [parsedAnalysis, setParsedAnalysis] = useState<PortfolioAnalysisOutput | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('market');
  
  // For loading animation
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Function to get dynamic loading steps
  const getLoadingSteps = (): LoadingStep[] => {
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
  };

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile();
  }, []);
  
  // Try to parse the agent result into structured format when result changes
  useEffect(() => {
    if (agentResult?.analysis) {
      try {
        // Handle if already an object
        if (typeof agentResult.analysis === 'object') {
          // Map the fields from the API response to the expected UI structure
          const mappedAnalysis = {
            market_overview: agentResult.analysis.market_overview,
            portfolio_impact: agentResult.analysis.portfolio_impact,
            risk_assessment: agentResult.analysis.risk_assessment,
            recommended_actions: agentResult.analysis.recommended_actions || "",
            recommended_product: {
              symbol: agentResult.analysis.recommended_investment_product_symbol,
              name: agentResult.analysis.recommended_investment_product_name,
              type: extractProductType(agentResult.analysis.recommended_investment_product_name) || "ETF",
              // Add any other fields needed or default values
            },
            portfolio_fit_explanation: agentResult.analysis.recommended_investment_product_rationale
          };
          setParsedAnalysis(mappedAnalysis);
        }
        // Rest of your parsing logic...
      } catch (e) {
        console.error("Error parsing analysis:", e);
        setParsedAnalysis(null);
      }
    }
  }, [agentResult]);

  // Helper function to extract product type from name
  const extractProductType = (name) => {
    if (!name) return "";
    if (name.includes("ETF")) return "ETF";
    if (name.includes("Fund")) return "Fund";
    if (name.includes("Index")) return "Index Fund";
    // Add more product type detections as needed
    return "Investment";
  };

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
  }, [agentLoading]);

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

  const runAgent = async () => {
    setAgentLoading(true);
    setError(null);
    setParsedAnalysis(null);
    
    try {
      console.log("Starting investment analyst API request");
      
      // Make sure to use the correct endpoint
      const endpoint = '/api/investments/analyst-agent';
      console.log(`Sending request to endpoint: ${endpoint}`);
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Add empty object as required in the backend
        body: JSON.stringify({})
      });
      
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}): ${errorText}`);
        throw new Error(errorText || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Data received:`, data);
      setAgentResult(data);
      
    } catch (err: any) {
      console.error("Error running investment analyst agent:", err);
      setError(err.message || 'Failed to run investment analysis. Please try again.');
    } finally {
      console.log("Setting agentLoading to false");
      setAgentLoading(false);
    }
  };

  // Safe method to handle string operations with type checking
  const safeFormatMarkdown = (text: any): string => {
    if (typeof text !== 'string') return '';
    
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/<p><\/p>/g, '<br/>');
  };

  // Determines risk level color
  const getRiskColor = (riskLevel: string) => {
    const level = riskLevel.toLowerCase();
    if (level.includes('high') || level.includes('severe')) return 'text-red-500';
    if (level.includes('moderate') || level.includes('medium')) return 'text-amber-500';
    if (level.includes('low') || level.includes('minimal')) return 'text-green-500';
    return 'text-blue-500'; // Default
  };

  // Render the loading state
  const renderLoading = () => (
    <div className="w-full max-w-3xl mx-auto mt-6">
      <Card className="shadow-md border border-primary/10">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Analyzing your investment portfolio
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

  // Render the results
  const renderResults = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-md">
      <CardHeader className="bg-muted/30 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="h-5 w-5 text-primary" />
            Investment analysis results
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {error ? (
          <div className="flex items-start gap-3 text-destructive p-4 border border-destructive/30 rounded-md bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Error generating insights</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : agentResult ? (
          parsedAnalysis ? (
            // Enhanced structured output for investment analyst
            <div className="space-y-6">
              {/* Tabs for sections */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
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
                </TabsList>
                
                <TabsContent value="market" className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 p-4 border-b">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Market overview
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
                        Portfolio impact
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
                        Risk assessment
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
                        <Lightbulb className="h-5 w-5" />
                        Recommended investment
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
                                <span className="text-muted-foreground mr-1">Expense ratio:</span>
                                <span className="font-semibold">{parsedAnalysis.recommended_product.expense_ratio}</span>
                              </div>
                            )}
                            
                            {parsedAnalysis.recommended_product?.returns && (
                              <div className="flex items-center text-sm">
                                <span className="text-muted-foreground mr-1">Returns:</span>
                                <span className="font-semibold">{parsedAnalysis.recommended_product.returns}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <h5 className="font-medium flex items-center gap-1 mb-2">
                              Portfolio fit
                            </h5>
                            <div className="text-sm">
                              {parsedAnalysis.portfolio_fit_explanation?.split('\n').map((paragraph, i) => (
                                <p key={i} className="mb-2">{paragraph}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // Fallback for unstructured output
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/30 p-4 border-b">
                <h3 className="text-lg font-semibold">Analysis results</h3>
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
        ) : null}
      </CardContent>
      <CardFooter className="flex justify-center py-3 border-t">
        {agentResult && (
          <Button
            onClick={() => navigate('/agents')}
            disabled={agentLoading}
          >
            {agentLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Done
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  // Main render logic
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto mb-4">
        {/* Navigation - updated to match DashboardAgentsMenu */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/agents')}>
            <ChevronLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="default"
            size="sm"
          >
            <LayoutDashboard className="h-4 w-4 mr-1.5" />
            Dashboard
          </Button>
        </div>

        <div className="text-center mb-6">
          {/* Investment badge (already added) */}
          <span className="inline-block bg-black/10 text-black dark:bg-white/10 dark:text-white text-sm font-medium px-3 py-1 rounded-full mb-2">
            Investments
          </span>
          <h1 className="text-3xl font-bold font-montserrat text-foreground mb-1">Investment analyst</h1>
          <p className="text-muted-foreground text-lg">
            Get a comprehensive analysis of your investment portfolio based on current market conditions
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* INITIAL STATE - show when not loading, no analysis and not agent loading */}
            {!loading && !agentResult && !agentLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                {/* Left side - "How it works" guidance - 25% width */}
                <div className="lg:col-span-1">
                  <Card className="bg-slate-50 dark:bg-slate-900 border-none h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        How it works
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">1</span>
                          <span>AI analyzes your investment portfolio and reviews current market conditions</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">2</span>
                          <span>Advanced algorithms evaluate how recent market trends affect your specific holdings</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">3</span>
                          <span>You receive personalized investment recommendations aligned with your risk profile</span>
                        </li>
                      </ol>
                    </CardContent>
                  </Card>

                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {/* Right side - Portfolio analysis call-to-action card - 75% width */}
                <div className="lg:col-span-3">
                  <Card className="border-2 border-black/10 dark:border-white/10 h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-primary" />
                        Portfolio analysis
                      </CardTitle>
                      <CardDescription>
                        Get insights on your investments based on latest market trends
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="bg-slate-100 dark:bg-slate-800 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <LineChart className="h-7 w-7 text-slate-500" />
                        </div>
                        <h3 className="text-base font-medium mb-2">Optimize your investment strategy</h3>
                        <p className="text-sm text-muted-foreground max-w-md mb-5">
                          Our AI will analyze market trends, evaluate your holdings, and recommend the best opportunities for your portfolio.
                        </p>
                        
                        <Button 
                          onClick={runAgent} 
                          disabled={agentLoading}
                          className="py-6 bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all"
                        >
                          <LineChart className="mr-2 h-5 w-5" />
                          Analyze my portfolio
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {/* Loading state */}
            {agentLoading && renderLoading()}
            
            {/* Results state */}
            {!loading && !agentLoading && agentResult && renderResults()}
          </div>
        )}
      </div>
      
      {/* Footer with disclaimer - exactly as in RetirementAdvisor */}
      <div className="text-center text-xs text-muted-foreground mt-8">
        AI can make mistakes. Please double check important information.
      </div>
    </div>
  );
}