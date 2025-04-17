import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  Loader2, 
  ArrowRight, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight, 
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';

interface UserRecommendation {
  id: number
  user_id: string
  product_type: string
  product_id: number
  recommended_symbol: string
  recommended_rationale: string
  created_at: string
  updated_at: string
}

interface RecommendationResponse {
  has_recommendation: boolean
  recommendation?: UserRecommendation
  is_existing: boolean
  message?: string
  action?: string
  missing_fields?: string[]
}

export default function RetirementRecommendations() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchExistingRecommendation = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await apiRequest('/api/recommendations');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch recommendation');
      }
      
      const data = await response.json();
      setRecommendation(data);
    } catch (error) {
      console.error('Error fetching recommendation:', error);
      setError((error as Error).message || 'An error occurred while fetching your recommendation');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExistingRecommendation();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
      const response = await apiRequest('/api/recommendations?force_new=true');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate new recommendation');
      }
      
      const data = await response.json();
      setRecommendation(data);
      
      toast({
        title: "Recommendation refreshed",
        description: "We've generated a new retirement recommendation for you.",
      });
    } catch (error) {
      console.error('Error refreshing recommendation:', error);
      setError((error as Error).message || 'An error occurred while generating a new recommendation');
      
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: (error as Error).message || 'Failed to generate a new recommendation.',
      });
    } finally {
      setRefreshing(false);
    }
  }
  
  // Placeholder for future email functionality
  const handleEmailRecommendation = () => {
    toast({
      title: "Feature coming soon",
      description: "The ability to email your retirement recommendations will be available in a future update.",
    });
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Unknown date';
    }
  }

  // Parse rationale to extract key information for highlighted display
  const parseRationale = (rationale: string) => {
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
      if (bulletMatch || numberedMatch) {
        const point = (bulletMatch || numberedMatch)[1].trim();
        if (point.length > 10) {  // Only add substantial points
          keyPoints.push(point);
        }
      }
    });
    
    return { summary, keyPoints, rationale };
  };

  const currentRecommendation = recommendation?.recommendation;
  const parsedContent = currentRecommendation ? 
    parseRationale(currentRecommendation.recommended_rationale) : 
    { summary: '', keyPoints: [], rationale: '' };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Navigation Bar */}
      <div className="flex justify-between items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        
        <Button
          onClick={() => navigate('/retirement/what-if')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          What If Analysis
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Page Header */}
      <div className="mb-8 text-center">
        <Badge 
          variant="outline" 
          className="mb-2 font-normal text-xs px-3 py-1 border-primary/20 bg-primary/5"
        >
          Plan retirement
        </Badge>
        <h1 className="text-3xl font-bold font-montserrat">Retirement Ideas For You</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Personalized retirement investment suggestions based on your goals, timeline, and risk tolerance
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary/70" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {recommendation ? 'Refreshing your retirement ideas...' : 'Analyzing your retirement profile...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  We're finding the best investment option for your retirement goals
                </p>
              </div>
              <Progress value={recommendation ? 70 : 40} className="w-64 h-1.5" />
            </div>
          </CardContent>
        </Card>
      ) : recommendation && recommendation.has_recommendation ? (
        <div className="space-y-6">
          {/* Main Recommendation Card */}
          <Card className="border border-primary/20 overflow-hidden">
            <div className="bg-primary/5 border-b border-primary/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <Badge className="bg-primary/90">{recommendation.recommendation?.product_type}</Badge>
                  <h2 className="text-xl font-bold mt-1">{recommendation.recommendation?.recommended_symbol}</h2>
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
                  disabled={!recommendation?.has_recommendation || loading}
                  variant="outline"
                  size="sm"
                  className="gap-1 border-primary/30 hover:bg-primary/10"
                >
                  <Mail className="h-4 w-4" />
                  Email this to me
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
              
              {/* Key Points */}
              {parsedContent.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Key Investment Points</h3>
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
              
              {/* Full Recommendation Rationale */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Full Retirement Investment Idea</h3>
                <div className="prose max-w-none prose-sm">
                  {currentRecommendation?.recommended_rationale.split('\n').map((paragraph, idx) => (
                    paragraph.trim() ? <p key={idx}>{paragraph}</p> : <br key={idx} />
                  ))}
                </div>
              </div>
              
              {/* Next Steps */}
              <div className="space-y-2 mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Next Steps</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="bg-primary/10 p-1 rounded mt-0.5">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm">Review your retirement goals and risk tolerance</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-primary/10 p-1 rounded mt-0.5">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm">Consider this idea as part of your overall retirement strategy</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-primary/10 p-1 rounded mt-0.5">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm">Consult with a financial advisor before making investment decisions</p>
                  </li>
                </ul>
              </div>
            </CardContent>
            
            <CardFooter className="border-t bg-muted/20 py-3 px-6">
              <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
                <span>Based on your retirement goals and market outlook</span>
                {currentRecommendation?.updated_at && (
                  <span>Last updated: {formatDateTime(currentRecommendation.updated_at)}</span>
                )}
              </div>
            </CardFooter>
          </Card>
          
          {/* Explore Card */}
          <Card className="border-dashed border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Want to learn more?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Explore how this investment idea might fit into your retirement planning
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/retirement/current-plan')}>
                    View retirement plan
                  </Button>
                  <Button onClick={() => navigate('/retirement/what-if')} className="gap-1">
                    Explore scenarios
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : recommendation && recommendation.action === "complete_profile" ? (
        <Card className="border border-yellow-200">
          <CardHeader className="bg-yellow-50/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle>Complete Your Profile</CardTitle>
            </div>
            <CardDescription className="ml-7">
              We need more information to provide personalized retirement ideas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-medium">
              Please complete your profile with the following missing information:
            </p>
            {recommendation.missing_fields && recommendation.missing_fields.length > 0 && (
              <ul className="space-y-2 mt-4">
                {recommendation.missing_fields.map((field, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="bg-yellow-100 p-1 rounded mt-0.5">
                      <ArrowRight className="h-3.5 w-3.5 text-yellow-600" />
                    </div>
                    <span className="text-sm">{field.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-4">
              <Button onClick={() => navigate('/profile')} className="gap-1">
                Update Profile
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="bg-muted inline-flex p-3 rounded-full mx-auto">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">No Retirement Ideas Available</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {recommendation?.message || "We don't have enough data to generate personalized retirement ideas. Please ensure you've completed your financial profile."}
              </p>
              <div className="pt-4">
                <Button onClick={() => navigate('/profile')} className="gap-1">
                  Update Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}