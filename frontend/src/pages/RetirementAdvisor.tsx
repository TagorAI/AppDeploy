import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Info, 
  Zap, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Calendar,
  MessageSquare,
  TrendingUp,
  Check,
  Mic,
  Square,
  ArrowUp,
  Home,
  Plane,
  HeartPulse,
  Medal,
  LayoutDashboard
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Define interfaces to match backend Pydantic models
interface RetirementSummary {
  headline: string;
  current_age: number;
  retirement_age: number;
  years_until_retirement: number;
  years_in_retirement: number;
  key_points: string[];
}

interface FinancialProjections {
  current_savings: number;
  projected_savings_at_retirement: number;
  required_savings: number;
  savings_gap: number;
  monthly_contribution_current: number;
  monthly_contribution_recommended: number;
  retirement_income_monthly: number;
  government_benefits: number;
  savings_income: number;
}

interface LifestyleDescription {
  housing: string;
  travel: string;
  leisure: string;
  healthcare: string;
  overall_lifestyle: string;
}

interface RetirementImage {
  image_url: string;
  description: string;
  milestones_represented: string[];
}

interface RetirementAnalysis {
  query: string;
  user_age: number;
  user_income: number;
  user_country: string;
  currency: string;
  summary: RetirementSummary;
  financial_projections: FinancialProjections;
  lifestyle_description: LifestyleDescription;
  insights: string[];
  visualization?: RetirementImage;
}

const RetirementAdvisor = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [analysis, setAnalysis] = useState<RetirementAnalysis | null>(null);
  const [planData, setPlanData] = useState<any | null>(null);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('plan');
  const [progress, setProgress] = useState(0);
  const responseRef = useRef<HTMLDivElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string | null>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef<number | null>(null);
  
  // Transcription state
  const [transcription, setTranscription] = useState('');
  const [showTranscription, setShowTranscription] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Simulated loading progress
  useEffect(() => {
    if (loading || submittingFeedback) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.floor(Math.random() * 5);
        });
      }, 600);
      return () => {
        clearInterval(interval);
        setProgress(0);
      };
    }
  }, [loading, submittingFeedback]);

  // Scroll to response when we get one
  useEffect(() => {
    if (analysis && responseRef.current && !loading && !submittingFeedback) {
      responseRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysis, loading, submittingFeedback]);

  // Scroll to top when we get a response
  useEffect(() => {
    if (analysis && !loading && !submittingFeedback) {
      window.scrollTo(0, 0);
    }
  }, [analysis, loading, submittingFeedback]);

  const handleGetRetirementPlan = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setPlanData(null);
    setFeedbackMode(false);
    setImageUrl(null);
    setImageDescription(null);
    
    try {
      const response = await apiRequest('/api/retirement/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze retirement plan');
      }

      const data = await response.json();
      
      setAnalysis(data.analysis);
      setPlanData(data.plan_data);
      setImageUrl(data.image_url);
      setImageDescription(data.image_description);
      setFeedbackMode(true);
      
      toast({
        title: "Retirement plan ready",
        description: "Your personalized plan has been created."
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error analyzing retirement plan:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err instanceof Error ? err.message : 'Failed to create your plan. Please try again.'
      });
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() && !transcription.trim()) {
      toast({
        variant: "destructive",
        title: "Feedback required",
        description: "Please tell us how you'd like to change your plan."
      });
      return;
    }

    setSubmittingFeedback(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/retirement/advisor/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedback || transcription,
          plan_data: planData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process feedback');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setPlanData(data.plan_data);
      setImageUrl(data.image_url);
      setImageDescription(data.image_description);
      setFeedback('');
      setTranscription('');
      setShowTranscription(false);
      
      toast({
        title: "Plan updated",
        description: "Your retirement plan has been updated."
      });
      
      setSubmittingFeedback(false);
    } catch (err) {
      console.error('Error processing feedback:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while processing your feedback');
      
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err instanceof Error ? err.message : 'Failed to update your plan. Please try again.'
      });
      setSubmittingFeedback(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Mock recording functionality
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone."
      });
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({
        variant: "destructive",
        title: "Microphone access denied",
        description: "Please enable microphone access in your browser."
      });
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      // Mock stopping recording
      setIsRecording(false);
      setIsTranscribing(true);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Simulate transcription
      setTimeout(() => {
        setTranscription("I'd like to retire at age 60 instead of 58, and I plan to travel more frequently.");
        setShowTranscription(true);
        setIsTranscribing(false);
        
        toast({
          title: "Voice processed",
          description: "Review and click 'Update my plan' to proceed."
        });
      }, 2000);
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Format currency values
  const formatCurrency = (value: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Render the retirement plan content based on structured data
  const renderRetirementPlan = () => {
    if (!analysis) return null;

    const { summary, financial_projections, currency } = analysis;

    return (
      <div className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
          <div className="mb-4 text-center">
            <h3 className="text-xl font-semibold mb-1">{summary.headline}</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
              <div className="text-muted-foreground text-xs mb-1">Current Age</div>
              <div className="text-xl font-semibold">{summary.current_age}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
              <div className="text-muted-foreground text-xs mb-1">Retirement Age</div>
              <div className="text-xl font-semibold">{summary.retirement_age}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
              <div className="text-muted-foreground text-xs mb-1">Years Until</div>
              <div className="text-xl font-semibold">{summary.years_until_retirement}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center">
              <div className="text-muted-foreground text-xs mb-1">Retirement Years</div>
              <div className="text-xl font-semibold">{summary.years_in_retirement}</div>
            </div>
          </div>
          
          <h4 className="font-medium mb-2">Key Points</h4>
          <ul className="space-y-1 ml-5 list-disc text-sm">
            {summary.key_points.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium mb-4">Financial Projections</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h5 className="text-sm font-medium text-muted-foreground mb-3">Current Status</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Current Savings</span>
                  <span className="font-medium">{formatCurrency(financial_projections.current_savings, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Monthly Contribution</span>
                  <span className="font-medium">{formatCurrency(financial_projections.monthly_contribution_current, currency)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h5 className="text-sm font-medium text-muted-foreground mb-3">Future Projections</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>At Retirement</span>
                  <span className="font-medium">{formatCurrency(financial_projections.projected_savings_at_retirement, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Required for Goals</span>
                  <span className="font-medium">{formatCurrency(financial_projections.required_savings, currency)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
            <h5 className="text-sm font-medium text-muted-foreground mb-3">Retirement Income</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                <div className="text-xs text-muted-foreground mb-1">Monthly Income</div>
                <div className="font-medium">{formatCurrency(financial_projections.retirement_income_monthly, currency)}</div>
              </div>
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                <div className="text-xs text-muted-foreground mb-1">From Government</div>
                <div className="font-medium">{formatCurrency(financial_projections.government_benefits, currency)}</div>
              </div>
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                <div className="text-xs text-muted-foreground mb-1">From Savings</div>
                <div className="font-medium">{formatCurrency(financial_projections.savings_income, currency)}</div>
              </div>
            </div>
          </div>
          
          {financial_projections.savings_gap > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                <div>
                  <h5 className="font-medium mb-1">Savings Gap</h5>
                  <p className="text-sm mb-2">
                    You currently have a savings gap of {formatCurrency(financial_projections.savings_gap, currency)}. 
                    Consider increasing your monthly contribution from {formatCurrency(financial_projections.monthly_contribution_current, currency)} to {formatCurrency(financial_projections.monthly_contribution_recommended, currency)}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-4 border-t border-dashed">
          <h4 className="font-medium mb-2">Key Insights</h4>
          <ul className="space-y-1 ml-5 list-disc text-sm">
            {analysis.insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Render the lifestyle description based on structured data
  const renderLifestyleDescription = () => {
    if (!analysis) return null;
    
    const { lifestyle_description } = analysis;
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold">Your Retirement Lifestyle</h3>
          <p className="text-muted-foreground">Based on your projected monthly income of {formatCurrency(analysis.financial_projections.retirement_income_monthly, analysis.currency)}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <Home className="h-5 w-5 mr-2 text-blue-500" />
              <h4 className="font-medium">Housing</h4>
            </div>
            <p className="text-sm">{lifestyle_description.housing}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <Plane className="h-5 w-5 mr-2 text-purple-500" />
              <h4 className="font-medium">Travel</h4>
            </div>
            <p className="text-sm">{lifestyle_description.travel}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <Medal className="h-5 w-5 mr-2 text-amber-500" />
              <h4 className="font-medium">Leisure Activities</h4>
            </div>
            <p className="text-sm">{lifestyle_description.leisure}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <HeartPulse className="h-5 w-5 mr-2 text-red-500" />
              <h4 className="font-medium">Healthcare</h4>
            </div>
            <p className="text-sm">{lifestyle_description.healthcare}</p>
          </div>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-lg mt-6">
          <h4 className="font-medium mb-3">Overall Lifestyle</h4>
          <p className="text-sm">{lifestyle_description.overall_lifestyle}</p>
        </div>
      </div>
    );
  };

  // Render the retirement journey visualization
  const renderRetirementVisualization = () => {
    if (!analysis) return null;
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold">Your retirement journey</h3>
          <p className="text-muted-foreground">Visual timeline of key milestones in your retirement plan</p>
        </div>
        
        {imageUrl ? (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-3xl rounded-lg overflow-hidden shadow-lg mb-6">
              <img 
                src={imageUrl} 
                alt={imageDescription || "Retirement journey visualization"} 
                className="w-full h-auto object-cover"
              />
            </div>
            
            {imageDescription && (
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-lg mt-2 max-w-3xl">
                <h4 className="font-medium mb-3">About this visualization</h4>
                <p className="text-sm mb-4">{imageDescription}</p>
                
                {analysis.visualization?.milestones_represented && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Key milestones represented:</h5>
                    <ul className="space-y-1 ml-5 list-disc text-sm">
                      {analysis.visualization.milestones_represented.map((milestone, idx) => (
                        <li key={idx}>{milestone}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="bg-slate-100 dark:bg-slate-800 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="text-base font-medium mb-2">No visualization available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Try adjusting your plan to generate a retirement journey visualization
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header Section - Updated with Dashboard button */}
      <div className="relative mb-10">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/agents')}
            className="text-foreground hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
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
        
        <div className="text-center mb-4">
          <span className="inline-block bg-black/10 text-black dark:bg-white/10 dark:text-white text-sm font-medium px-3 py-1 rounded-full mb-2">
            Retirement planning
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Retirement lifestyle advisor</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get insights about your retirement lifestyle
          </p>
        </div>
      </div>
      
      {/* INITIAL STATE - Modified layout */}
      {!loading && !analysis && !submittingFeedback && (
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
                    <span>AI analyzes your profile and creates a personalized retirement plan</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">2</span>
                    <span>See a description of your potential lifestyle in retirement</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">3</span>
                    <span>Provide feedback to refine the plan until it matches your goals</span>
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
          
          {/* Right side - Retirement exploration card - 75% width */}
          <div className="lg:col-span-3">
            <Card className="border-2 border-black/10 dark:border-white/10 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Retirement exploration
                </CardTitle>
                <CardDescription>
                  Get a personalized view of your retirement lifestyle
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="bg-slate-100 dark:bg-slate-800 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-7 w-7 text-slate-500" />
                  </div>
                  <h3 className="text-base font-medium mb-2">Discover your retirement lifestyle</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-5">
                    See what your  life might look like in retirement
                  </p>
                  
                  <Button 
                    onClick={handleGetRetirementPlan} 
                    disabled={loading}
                    className="py-6 bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all"
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    Make my retirement plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* LOADING STATE - Show only loading tile */}
      {(loading || submittingFeedback) && (
        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <Card className="border-2 border-black/10 dark:border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Sparkles className="animate-pulse mr-2 h-5 w-5 text-amber-500" />
                  {submittingFeedback ? "Updating Your Plan" : "Creating Your Plan"}
                </CardTitle>
                <CardDescription>
                  {submittingFeedback 
                    ? "Adjusting your retirement plan based on your feedback" 
                    : "Calculating your retirement projections and lifestyle"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{submittingFeedback ? "Processing feedback" : "Calculating retirement plan"}</span>
                      <span className="text-muted-foreground">{progress < 30 ? "In progress" : "Complete"}</span>
                    </div>
                    <Progress value={progress < 30 ? progress : 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{submittingFeedback ? "Updating lifestyle description" : "Creating lifestyle preview"}</span>
                      <span className="text-muted-foreground">{progress < 60 ? "In progress" : "Complete"}</span>
                    </div>
                    <Progress value={progress < 30 ? 0 : (progress < 60 ? (progress - 30) * (100/30) : 100)} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{submittingFeedback ? "Finalizing updated plan" : "Preparing recommendations"}</span>
                      <span className="text-muted-foreground">{progress < 60 ? "Pending" : "In progress"}</span>
                    </div>
                    <Progress value={progress < 60 ? 0 : (progress - 60) * (100/40)} className="h-2" />
                  </div>
                  
                  <div className="flex justify-center mt-10">
                    <div className="text-center">
                      <Sparkles className="h-10 w-10 mx-auto mb-3 text-amber-500 animate-pulse" />
                      <p className="text-sm text-muted-foreground">
                        {submittingFeedback 
                          ? "Almost there..." 
                          : "Just a moment..."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* RESULTS STATE - Modified layout */}
      {!loading && !submittingFeedback && analysis && (
        <div className="space-y-4">
          {/* Main retirement plan card */}
          <div className="w-full" ref={responseRef}>
            <Card className="border-2 border-black/10 dark:border-white/10">
              <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-black">
                <CardTitle>Retirement planning</CardTitle>
                <CardDescription>
                  Based on your current financial profile and retirement savings
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="plan" className="text-sm">
                      <Calendar className="h-4 w-4 mr-1.5" />
                      Retirement Plan
                    </TabsTrigger>
                    <TabsTrigger value="lifestyle" className="text-sm">
                      <Zap className="h-4 w-4 mr-1.5" />
                      Lifestyle
                    </TabsTrigger>
                    <TabsTrigger value="visualization" className="text-sm">
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Visualization
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="px-1">
                    <TabsContent value="plan" className="mt-0">
                      {renderRetirementPlan()}
                    </TabsContent>
                    
                    <TabsContent value="lifestyle" className="mt-0">
                      {renderLifestyleDescription()}
                    </TabsContent>

                    <TabsContent value="visualization" className="mt-0">
                      {renderRetirementVisualization()}
                    </TabsContent>
                  </div>
                </Tabs>
               
              </CardContent>
            </Card>
          </div>
          {/* Adjust your plan tile moved to Results State */}
          <div className="w-full max-w-3xl mx-auto mt-6">
            <Card className="border-2 border-black/10 dark:border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  Adjust your plan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder=""
                      value={transcription || feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full rounded-full border-input bg-background px-4 py-3 pr-24 text-sm shadow-sm focus:ring-1 focus:ring-primary"
                      disabled={isRecording || submittingFeedback || isTranscribing}
                    />
                    <div className="absolute right-2 flex gap-1">
                      <Button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={submittingFeedback || isTranscribing}
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full ${isRecording ? "text-red-500" : ""}`}
                        aria-label={isRecording ? "Stop recording" : "Start voice recording"}
                      >
                        {isRecording ? (
                          <Square className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={submittingFeedback || ((!feedback.trim() && !transcription.trim()) || isRecording || isTranscribing)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                      >
                        {submittingFeedback ? (
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {isRecording && (
                    <div className="flex justify-center">
                      <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full animate-pulse">
                        <span className="mr-2 h-2 w-2 bg-red-600 rounded-full"></span>
                        <span className="text-sm font-medium">Recording {formatRecordingTime(recordingTime)}</span>
                      </div>
                    </div>
                  )}
                  
                  {isTranscribing && (
                    <div className="flex justify-center">
                      <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                        <span className="text-sm font-medium relative">
                          <span className="inline-block w-full">Converting your voice to text</span>
                          <span className="absolute left-0 right-0 bottom-0 flex justify-center space-x-1 mt-1">
                            <span className="h-1 w-1 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="h-1 w-1 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="h-1 w-1 bg-blue-500 rounded-full animate-pulse"></span>
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setFeedback("The plan looks good to me!");
                        setTranscription("");
                        setShowTranscription(false);
                      }}
                      disabled={submittingFeedback || isRecording || isTranscribing}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Looks good - no more changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      <div className="text-center text-xs text-muted-foreground mt-8">
        AI can make mistakes. Please double check important information.
      </div>
    </div>
  );
};

export default RetirementAdvisor;
