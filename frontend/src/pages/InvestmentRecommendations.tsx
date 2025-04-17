import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { 
  RefreshCcw, 
  AlertCircle, 
  Loader2, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight,
  Lightbulb,
  TrendingUp
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import LearnMoreDialog from '@/components/LearnMoreDialog';

// Types
interface UserRecommendation {
  id: number;
  user_id: string;
  product_type: string;
  product_id: number;
  recommended_symbol: string;
  recommended_rationale: string;
  created_at: string;
  updated_at: string;
}

interface RecommendationResponse {
  has_recommendation: boolean;
  recommendation?: UserRecommendation;    // single recommendation object
  is_existing: boolean;
  message?: string;
  action?: string;
}

interface ParsedRationale {
  summary: string;
  keyPoints: string[];
  rationale: string;
}

const BACKEND_URL = 'http://localhost:8000';

// Component for highlighting financial terms
const FinancialTerm = ({ term, explanation, children }) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  
  return (
    <span 
      className="underline decoration-dotted cursor-help text-primary" 
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      onClick={() => handleLearnMore(`What is ${term}?`)}
    >
      {children}
      {tooltipVisible && (
        <div className="absolute z-50 p-2 bg-white shadow-lg rounded-md text-sm max-w-xs">
          {explanation}
          <Button size="sm" variant="link" className="mt-1">
            Learn more
          </Button>
        </div>
      )}
    </span>
  );
};

export default function InvestmentRecommendations() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();
  const [emailStatus, setEmailStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  const fetchExistingRecommendation = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/investment/recommendations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch investment idea');
      }
      
      const data = await response.json();
      console.log('Fetched data:', data);
      
      setRecommendation(data);
      return data.has_recommendation;
    } catch (error) {
      console.error('Error in fetchExistingRecommendation:', error);
      setError('Failed to fetch investment idea');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await apiRequest('/api/investment/recommendations?force_new=true');
      
      if (!response.ok) {
        throw new Error('Failed to refresh investment idea');
      }
      
      const data = await response.json();
      console.log('Refresh data:', data);
      
      setRecommendation(data);
      
      toast({
        title: "Investment idea refreshed",
        description: "Your investment suggestion has been updated.",
      });
    } catch (error) {
      console.error('Error refreshing investment idea:', error);
      setError('Failed to refresh investment idea');
      
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Failed to refresh investment idea",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleEmailRecommendation = async () => {
    try {
      setEmailStatus(null); // Reset status
      setSendingEmail(true);
      
      console.log("Sending email request to test inbox...");
      const response = await apiRequest('/api/investment/email-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Response status:", response.status);
      
      const responseData = await response.json();
      console.log("Response data:", responseData);
      
      if (!response.ok) {
        throw new Error(responseData.detail || `HTTP error! status: ${response.status}`);
      }
      
      // Set success status
      setEmailStatus({
        success: true,
        message: "Investment idea email sent successfully to test inbox."
      });

      toast({
        title: "Email sent!",
        description: "Test email sent successfully to Resend test inbox.",
      });
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Set error status
      setEmailStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send email. Please try again."
      });

      toast({
        variant: "destructive",
        title: "Error sending email",
        description: error instanceof Error ? error.message : "Failed to send email. Please try again.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    const initializeRecommendation = async () => {
      const hasExisting = await fetchExistingRecommendation();
      if (!hasExisting) {
        await handleRefresh();
      }
    };

    initializeRecommendation();
  }, []);

  // Get the current recommendation
  const currentRecommendation = recommendation?.recommendation;

  // Helper function to format the date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Parse rationale to extract key information for highlighted display
  const parseRationale = (rationale: string): ParsedRationale => {
    if (!rationale) return { summary: '', keyPoints: [], rationale: '' };
    
    const lines = rationale.split('\n').filter(line => line.trim().length > 0);
    let summary = '';
    const keyPoints: string[] = [];
    
    // Use the first paragraph as summary (if it's not too long)
    if (lines.length > 0 && lines[0].length < 300) {
      summary = lines[0];
    }
    
    // Look for bullet points or numbered lists
    const bulletRegex = /^[\s•\-*]+(.+)$/;
    const numberedRegex = /^\d+[\.\)]\s+(.+)$/;
    
    lines.forEach(line => {
      const bulletMatch = line.match(bulletRegex);
      const numberedMatch = line.match(numberedRegex);
      
      // Fix the TypeScript error by proper null checking
      if (bulletMatch?.[1] || numberedMatch?.[1]) {
        const point = (bulletMatch?.[1] || numberedMatch?.[1])?.trim() || '';
        if (point.length > 10) {  // Only add substantial points
          keyPoints.push(point);
        }
      }
    });
    
    return { summary, keyPoints, rationale };
  };
  
  // Use useMemo to avoid recomputing parsed content on every render
  const parsedContent = useMemo(() => 
    currentRecommendation ? 
      parseRationale(currentRecommendation.recommended_rationale) : 
      { summary: '', keyPoints: [], rationale: '' }
  , [currentRecommendation?.recommended_rationale]);

  // Determine loading message based on state
  const loadingMessage = recommendation 
    ? 'Refreshing your investment idea...' 
    : 'Analyzing your investment profile...';

  // Determine progress value based on state  
  const progressValue = recommendation ? 70 : 40;

  const handleLearnMore = (query: string) => {
    setCurrentQuery(query);
    setLearnMoreOpen(true);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Navigation Bar */}
      <div className="flex justify-between items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 hover:bg-accent/50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        
        <Button 
          onClick={() => navigate('/invest-what-if')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          What if analysis
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-8 text-center">
        <Badge 
          variant="outline" 
          className="mb-2 font-normal text-xs px-3 py-1 border-primary/20 bg-primary/5"
        >
          Grow investments
        </Badge>
        <h1 className="text-3xl font-bold font-montserrat">Investment ideas for you</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Personalized investment ideas based on your risk profile, time horizon, and financial goals
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-primary/70" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium">{loadingMessage}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We're finding the best investment option for your needs
                </p>
              </div>
              <Progress value={progressValue} className="w-64 h-1.5" />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error retrieving investment idea</AlertTitle>
          <AlertDescription className="mt-1">
            {error}
            <div className="mt-4">
              <Button size="sm" onClick={handleRefresh}>Try again</Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : recommendation?.has_recommendation && currentRecommendation ? (
        <div className="space-y-6">
          {/* Main Investment Idea Card */}
          <Card className="border border-primary/20 overflow-hidden">
            <div className="bg-primary/5 border-b border-primary/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mt-1">{currentRecommendation.recommended_symbol}</h2>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  variant="outline"
                  size="sm"
                  className="gap-1 border-primary/30 hover:bg-primary/10"
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Updating...' : 'Refresh'}
                </Button>

                <Button
                  onClick={handleEmailRecommendation}
                  disabled={sendingEmail}
                  variant="outline"
                  size="sm"
                  className="gap-1 border-primary/30 hover:bg-primary/10"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {sendingEmail ? 'Sending...' : 'Email this to me'}
                </Button>
              </div>
            </div>
            
            <CardContent className="pt-6 pb-4 space-y-6">
              {parsedContent.summary && (
                <div className="bg-secondary/30 rounded-lg p-4 border border-secondary/10">
                  <p className="font-medium italic text-secondary-foreground">
                    {parsedContent.summary}
                  </p>
                </div>
              )}
              
              {/* Key Investment Points */}
              {parsedContent.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Key investment points</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {parsedContent.keyPoints.slice(0, 4).map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-background">
                        <div className="bg-primary/10 p-1 rounded mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="text-sm">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Full Analysis */}
              <div className="space-y-2">
                <div className="prose max-w-none prose-sm">
                  {currentRecommendation.recommended_rationale.split('\n').map((paragraph, idx) => (
                    paragraph.trim() ? <p key={idx}>{paragraph}</p> : <br key={idx} />
                  ))}
                </div>
              </div>
              
              {/* Email Status Alert */}
              {emailStatus && (
                <Alert
                  variant={emailStatus.success ? "default" : "destructive"}
                  className="mt-4"
                >
                  {emailStatus.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {emailStatus.success ? "Email sent" : "Email error"}
                  </AlertTitle>
                  <AlertDescription>
                    {emailStatus.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardFooter className="border-t bg-muted/20 py-3 px-6">
              <div className="w-full flex items-center justify-end text-xs text-muted-foreground">
                {currentRecommendation.updated_at && (
                  <span>Last updated: {formatDateTime(currentRecommendation.updated_at)}</span>
                )}
              </div>
            </CardFooter>
          </Card>
          
          <div className="disclaimer-footnote">
            I'm your AI coach — I do my best but I can make mistakes. Please check important information.
          </div>

          {currentRecommendation && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Learn more about this recommendation
              </h3>
              <div className="grid gap-2">
                {/* Contextual learning buttons */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start border border-dashed" 
                  onClick={() => handleLearnMore(`What is ${currentRecommendation.recommended_symbol} and why might it be good for me?`)}
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span>What is {currentRecommendation.recommended_symbol} and why might it be good for me?</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start border border-dashed" 
                  onClick={() => handleLearnMore(`What risks should I know about with ${currentRecommendation.product_type}s?`)}
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span>What risks should I know about with this investment?</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="border border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="bg-muted inline-flex p-3 rounded-full mx-auto">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">No investment ideas available</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {recommendation?.message || "We couldn't generate an investment suggestion at this time. Try refreshing or update your investment profile."}
              </p>
              <div className="pt-4">
                <Button onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Generate ideas
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <LearnMoreDialog 
        isOpen={learnMoreOpen} 
        onClose={() => setLearnMoreOpen(false)} 
        query={currentQuery} 
        pageContext="investment recommendations page"
      />
    </div>
  );
}