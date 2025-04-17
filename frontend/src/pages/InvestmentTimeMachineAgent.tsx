import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Loader2, 
  CheckCircle2, 
  ChevronLeft, 
  Clock, 
  ArrowRight,
  DollarSign,
  Calendar,
  BarChart4,
  Lightbulb,
  AlertTriangle,
  LineChart,
  HeartHandshake,
  Landmark,
  TreeDeciduous,
  CheckCheck,
  List,
  Calculator,
  ArrowDownUp,
  ScrollText,
  Sparkles,
  Brain,
  ChevronDown,
  LayoutDashboard,
  Image
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

// Types for the structured response from the agent
interface Summary {
  headline: string;
  key_points: string[];
  financial_impact: string;
  recommendation: string;
}

interface DetailedAnalysis {
  investment_alternative: string;
  financial_calculations: string;
  opportunity_cost: string;
  sensitivity_analysis: string;
}

interface ContextFactors {
  quality_of_life: string;
  timeline_considerations: string;
  personal_values: string;
  alternatives: string;
}

interface ActionItems {
  immediate_steps: string[];
  long_term: string[];
  resources: string[];
}

interface StructuredOutput {
  query: string;
  decision_description: string;
  decision_amount: number;
  timeframe_years: number;
  currency: string;
  summary: Summary;
  detailed_analysis: DetailedAnalysis;
  context_factors: ContextFactors;
  action_items: ActionItems;
}

// Loading steps for the dynamic loading state
interface LoadingStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export default function InvestmentTimeMachineAgent() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  
  // Decision details - default timeframe is 5 years
  const [decisionDetails, setDecisionDetails] = useState({
    decision_description: '',
    decision_amount: 0,
    timeframe_years: 5
  });

  // For loading animation
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Active tab for results view
  const [activeTab, setActiveTab] = useState("summary");
  
  // Function to get dynamic loading steps
  const getLoadingSteps = (): LoadingStep[] => {
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
        icon: <BarChart4 className="h-5 w-5 text-primary" />,
        description: 'Calculating long-term financial impacts of different options...'
      },
      { 
        key: 'comparison', 
        label: 'Comparing outcomes', 
        icon: <LineChart className="h-5 w-5 text-primary" />,
        description: 'Comparing investment returns against your decision...'
      },
      { 
        key: 'report', 
        label: 'Finalizing insights', 
        icon: <Lightbulb className="h-5 w-5 text-primary" />,
        description: 'Compiling the decision analysis with actionable insights...'
      }
    ];
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

  // Improved getVisualizationUrl function to check both visualization and image_url fields
  const getVisualizationUrl = (): string | null => {
    if (!agentResult) return null;
    
    console.log("Getting visualization URL from:", agentResult);
    
    // Check for image_url field first (from the backend OpenAI API response)
    if (agentResult.image_url && typeof agentResult.image_url === 'string') {
      console.log("Found image_url in response:", agentResult.image_url);
      return agentResult.image_url;
    }
    
    // Check for visualization field as fallback
    if (agentResult.visualization && typeof agentResult.visualization === 'string') {
      console.log("Found visualization in response:", agentResult.visualization);
      return agentResult.visualization;
    }
    
    return null;
  };

  // Improved runAgent function
  const runAgent = async () => {
    // Validate inputs
    if (!decisionDetails.decision_description.trim()) {
      setError('Please describe the decision you are considering.');
      return;
    }
    
    if (decisionDetails.decision_amount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    setAgentLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/investments/timemachine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(decisionDetails)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      const data = await response.json();
      console.log("Agent result data:", data);
      
      // Enhanced logging for image URL detection
      if (data.image_url) {
        console.log("Found image_url in response:", data.image_url);
      } else if (data.visualization) {
        console.log("Found visualization in response:", data.visualization);
      } else {
        console.warn("No image URL found in response (neither image_url nor visualization fields)");
      }
      
      setAgentResult(data);
      
      // Reset active tab to summary when getting new results
      setActiveTab("summary");
    } catch (err) {
      setError('Failed to analyze your decision. Please try again.');
      console.error('Error running agent:', err);
    } finally {
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

  // Format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Improved function to check if we have structured output
  const hasStructuredOutput = (): boolean => {
    // First check if structured_output exists
    if (agentResult?.structured_output?.summary && 
        agentResult?.structured_output?.detailed_analysis &&
        agentResult?.structured_output?.context_factors &&
        agentResult?.structured_output?.action_items) {
      return true;
    }
    
    // If not, check if the fields are directly in the agentResult
    if (agentResult?.summary && 
        agentResult?.detailed_analysis &&
        agentResult?.context_factors &&
        agentResult?.action_items) {
      return true;
    }
    
    return false;
  };

  // Improved function to get the structured output with proper fallback handling
  const getStructuredOutput = (): StructuredOutput | null => {
    if (!agentResult) return null;
    
    // First try to get from structured_output field
    if (agentResult.structured_output?.summary) {
      return agentResult.structured_output as StructuredOutput;
    }
    
    // If not found, check if structured data is directly in the response
    if (agentResult.summary) {
      // The structured output is directly in the result
      return agentResult as StructuredOutput;
    }
    
    return null;
  };

  // Simplified renderVisualization function
  const renderVisualization = () => {
    // Get the visualization URL
    const visualizationUrl = getVisualizationUrl();
    console.log("Visualization URL:", visualizationUrl);
    
    if (!visualizationUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="bg-slate-100 dark:bg-slate-800 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="h-7 w-7 text-slate-500" />
          </div>
          <h3 className="text-base font-medium mb-2">No visualization available</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            We couldn't generate a visualization for this decision
          </p>
        </div>
      );
    }

    const structuredOutput = getStructuredOutput();
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold">Financial Decision Comparison</h3>
          <p className="text-muted-foreground">
            Visual comparison of your decision versus investing
          </p>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-3xl rounded-lg overflow-hidden shadow-lg mb-6">
            <img 
              src={visualizationUrl} 
              alt={`Visual comparison: ${structuredOutput?.decision_description || decisionDetails.decision_description} vs. investing in S&P 500`} 
              className="w-full h-auto object-cover"
              onError={(e) => {
                console.error("Error loading image:", e);
                // Fallback if image fails to load
                if (e.currentTarget.parentNode) {
                  e.currentTarget.style.display = 'none';
                  // Add a fallback error message
                  const errorElement = document.createElement('div');
                  errorElement.className = 'p-4 bg-red-50 text-red-700 text-center';
                  errorElement.innerText = 'Failed to load image. Please try again.';
                  e.currentTarget.parentNode.appendChild(errorElement);
                }
              }}
            />
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-lg mt-2 max-w-3xl">
            <h4 className="font-medium mb-3">About this visualization</h4>
            <p className="text-sm mb-4">
              This image compares the financial outcomes of {structuredOutput?.decision_description || decisionDetails.decision_description} 
              (${structuredOutput?.decision_amount || decisionDetails.decision_amount}) versus 
              investing the same amount in the S&P 500 index fund over {structuredOutput?.timeframe_years || 5} years.
            </p>
            
            <div>
              <h5 className="text-sm font-medium mb-2">Key insights:</h5>
              <ul className="space-y-1 ml-5 list-disc text-sm">
                <li>The left side shows the projected value of your decision.</li>
                <li>The right side shows how the same amount might grow if invested.</li>
                <li>The difference represents potential opportunity cost or financial advantage.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the loading state
  const renderLoading = () => (
    <div className="w-full max-w-3xl mx-auto mt-10">
      <Card className="shadow-md border border-primary/10">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Analyzing your financial decision
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

  // Render the decision form with updated layout (grid with how it works on left, form on right)
  const renderDecisionForm = () => (
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
                <span>Enter details about a purchase or expense you're considering</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">2</span>
                <span>AI compares the financial impact of spending vs. investing that amount</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">3</span>
                <span>View detailed analysis showing opportunity costs and alternative options</span>
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
      
      {/* Right side - Decision time machine form - 75% width */}
      <div className="lg:col-span-3">
        <Card className="border-2 border-black/10 dark:border-white/10 shadow-md h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Decision time machine
            </CardTitle>
            <CardDescription>
              Compare the financial impact of spending versus investing your money
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="decision_description">What are you considering purchasing?</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDecisionDetails({
                      ...decisionDetails,
                      decision_description: "Buy a car"
                    })}
                    className="rounded-full"
                  >
                    Buy a car
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDecisionDetails({
                      ...decisionDetails,
                      decision_description: "Buy a home"
                    })}
                    className="rounded-full"
                  >
                    Buy a home
                  </Button>
                </div>
                <Input
                  id="decision_description"
                  placeholder="E.g., a new car, vacation, home renovation"
                  value={decisionDetails.decision_description}
                  onChange={(e) => setDecisionDetails({
                    ...decisionDetails,
                    decision_description: e.target.value
                  })}
                  className="focus-visible:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="decision_amount">How much will it cost?</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="decision_amount"
                    type="number"
                    placeholder="Enter amount"
                    value={decisionDetails.decision_amount || ''}
                    onChange={(e) => setDecisionDetails({
                      ...decisionDetails,
                      decision_amount: Number(e.target.value)
                    })}
                    className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeframe_years">Over how many years?</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="timeframe_years"
                    type="number"
                    placeholder="Years"
                    value={decisionDetails.timeframe_years || ''}
                    onChange={(e) => setDecisionDetails({
                      ...decisionDetails,
                      timeframe_years: Number(e.target.value)
                    })}
                    className="pl-8 focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center py-6 border-t">
            <Button
              onClick={runAgent}
              disabled={agentLoading}
              className="py-6 bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all"
            >
              <Clock className="h-5 w-5 mr-2" />
              Analyze my choices
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );

  // Render the structured results - improved to handle different output formats
  const renderStructuredResults = () => {
    const structuredOutput = getStructuredOutput();
    
    if (!structuredOutput) {
      return renderLegacyResults();
    }
    
    // Ensure we have ActionItems (add a tab for it too)
    const actionItems = structuredOutput.action_items;
    
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-md">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Decision analysis
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            Analysis of {structuredOutput.decision_description} ({formatCurrency(structuredOutput.decision_amount)}) 
            over {structuredOutput.timeframe_years} years
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="summary" className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                <span>Summary</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-1.5">
                <Calculator className="h-4 w-4" />
                <span>Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="factors" className="flex items-center gap-1.5">
                <Brain className="h-4 w-4" />
                <span>Factors</span>
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-1.5">
                <CheckCheck className="h-4 w-4" />
                <span>Actions</span>
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-1.5">
                <Image className="h-4 w-4" />
                <span>Visual</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-6">
              <div className="bg-primary/5 p-5 rounded-lg border">
                <h2 className="text-xl font-semibold text-primary mb-3">{structuredOutput.summary.headline}</h2>
                <div className="space-y-3">
                  <p className="text-base">{structuredOutput.summary.financial_impact}</p>
                  <div className="pt-3 border-t border-primary/10">
                    <h3 className="font-medium mb-2 flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Key points
                    </h3>
                    <ul className="space-y-2">
                      {structuredOutput.summary.key_points.map((point, index) => (
                        <li key={index} className="flex gap-2">
                          <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">
                            {index + 1}
                          </div>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                <h3 className="font-medium text-green-700 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Recommendation
                </h3>
                <p className="text-green-800">{structuredOutput.summary.recommendation}</p>
              </div>
            </TabsContent>
            
            {/* Analysis Tab - Redesigned with blocks instead of accordions */}
            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <Landmark className="h-5 w-5 mr-2 text-blue-500" />
                    <h4 className="font-medium">Investment alternative</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.detailed_analysis.investment_alternative}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <Calculator className="h-5 w-5 mr-2 text-purple-500" />
                    <h4 className="font-medium">Financial calculations</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.detailed_analysis.financial_calculations}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <ArrowDownUp className="h-5 w-5 mr-2 text-amber-500" />
                    <h4 className="font-medium">Opportunity cost</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.detailed_analysis.opportunity_cost}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <LineChart className="h-5 w-5 mr-2 text-red-500" />
                    <h4 className="font-medium">Sensitivity analysis</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.detailed_analysis.sensitivity_analysis}</p>
                </div>
              </div>
            </TabsContent>
            
            {/* Factors Tab - Redesigned similar to lifestyle in RetirementAdvisor */}
            <TabsContent value="factors" className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold">Decision context factors</h3>
                <p className="text-muted-foreground">Important considerations beyond the numbers</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <HeartHandshake className="h-5 w-5 mr-2 text-blue-500" />
                    <h4 className="font-medium">Quality of life impact</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.context_factors.quality_of_life}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <Clock className="h-5 w-5 mr-2 text-purple-500" />
                    <h4 className="font-medium">Timeline considerations</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.context_factors.timeline_considerations}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <TreeDeciduous className="h-5 w-5 mr-2 text-amber-500" />
                    <h4 className="font-medium">Personal values</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.context_factors.personal_values}</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <List className="h-5 w-5 mr-2 text-red-500" />
                    <h4 className="font-medium">Alternatives</h4>
                  </div>
                  <p className="text-sm">{structuredOutput.context_factors.alternatives}</p>
                </div>
              </div>
            </TabsContent>
            
            {/* Action Items Tab (new) */}
            <TabsContent value="actions" className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold">Action Items</h3>
                <p className="text-muted-foreground">Next steps based on this analysis</p>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <CheckCheck className="h-5 w-5 mr-2 text-green-500" />
                    <h4 className="font-medium">Immediate steps</h4>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {actionItems.immediate_steps.map((step, index) => (
                      <li key={index} className="text-sm">{step}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    <h4 className="font-medium">Long-term actions</h4>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {actionItems.long_term.map((step, index) => (
                      <li key={index} className="text-sm">{step}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <ScrollText className="h-5 w-5 mr-2 text-purple-500" />
                    <h4 className="font-medium">Resources</h4>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {actionItems.resources.map((resource, index) => (
                      <li key={index} className="text-sm">{resource}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Visualization Tab */}
            <TabsContent value="visualization" className="space-y-6">
              {renderVisualization()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  // Render the results in legacy format (for backward compatibility)
  const renderLegacyResults = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-md">
      <CardHeader className="bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Decision analysis
          </CardTitle>
        </div>
        <CardDescription className="text-base">
          Analysis of {decisionDetails.decision_description} ({formatCurrency(decisionDetails.decision_amount)}) 
          over {decisionDetails.timeframe_years} years
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <div className="flex items-start gap-3 text-destructive p-4 border border-destructive/30 rounded-md bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Error generating analysis</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : agentResult ? (
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-md border border-muted">
              <h3 className="text-base font-semibold text-primary mb-2">Decision impact summary</h3>
              <p className="text-sm">
                Analysis of {decisionDetails.decision_description} (${decisionDetails.decision_amount.toLocaleString()}) 
                over {decisionDetails.timeframe_years} years
              </p>
            </div>
            
            <div className="prose prose-sm max-w-none">
              {typeof agentResult.analysis === 'string' ? (
                <div dangerouslySetInnerHTML={{ 
                  __html: safeFormatMarkdown(agentResult.analysis)
                }} />
              ) : (
                <p>Analysis results are available but not in the expected text format.</p>
              )}
            </div>
            
            {getVisualizationUrl() && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Visual comparison</h4>
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src={getVisualizationUrl() || ''} 
                    alt="Decision vs investment comparison" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="border-t pt-4 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  setAgentResult(null);
                }}
              >
                Analyze another decision
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/agents')}
              >
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing your analysis...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Main render logic
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto mb-8">
        {/* Navigation - updated to match InvestmentAnalystAgent */}
        {!agentLoading && (
          <div className="flex justify-between items-center mb-8">
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
        )}
      
        <div className="text-center mb-8">
          {/* Added spending badge above title */}
          <span className="inline-block bg-black/10 text-black dark:bg-white/10 dark:text-white text-sm font-medium px-3 py-1 rounded-full mb-2">
            Spending
          </span>
          <h1 className="text-3xl font-bold font-montserrat text-foreground mb-2">Financial decision time machine</h1>
          <p className="text-muted-foreground text-lg">
            See how your financial decisions today might affect your future wealth
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Main content - either form, loading, or results */}
            {agentLoading ? renderLoading() : 
             agentResult ? renderStructuredResults() : 
             renderDecisionForm()}
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