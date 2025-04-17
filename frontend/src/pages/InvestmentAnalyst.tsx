import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from 'react-markdown';
import { 
  Info, 
  Zap, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  BarChart3
} from "lucide-react";

const BACKEND_URL = 'http://localhost:8000';

export default function InvestmentAnalyst() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  // Simulated loading progress to make the experience feel more engaging
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.floor(Math.random() * 10);
        });
      }, 400);
      return () => {
        clearInterval(interval);
        setProgress(0);
      };
    }
  }, [loading]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      const response = await apiRequest('/api/investments/analyst-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze portfolio');
      }

      const data = await response.json();
      
      if (data.status === "no_holdings") {
        setError(data.message);
        toast({
          variant: "destructive",
          title: "No investment holdings",
          description: data.message,
        });
      } else {
        setAnalysis(data.analysis);
        
        toast({
          title: "Analysis complete",
          description: "Your portfolio has been analyzed!",
        });
      }
    } catch (err) {
      console.error('Error analyzing portfolio:', err);
      setError((err as Error).message || 'An error occurred during analysis');
      
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: (err as Error).message || 'Failed to analyze your portfolio. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header Section */}
      <div className="relative mb-10">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-foreground hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={() => navigate('/invest-deep-research')}
            className="bg-black hover:bg-black/90 text-white"
          >
            Deep Research
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="text-center mb-4">
          <span className="inline-block bg-black/10 text-black dark:bg-white/10 dark:text-white text-sm font-medium px-3 py-1 rounded-full mb-2">
            Portfolio insights
          </span>
          <h1 className="text-3xl md:text-4xl font-montserrat font-bold mb-2">Investment analyst</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get an AI-powered analysis of your portfolio based on current market conditions
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        <Card className="border-2 border-black/10 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Portfolio analysis
            </CardTitle>
            <CardDescription>
              Our AI analyst evaluates your portfolio considering the latest market conditions
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {!loading && !analysis && !error && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-slate-100 dark:bg-slate-800 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-base font-medium mb-2">Get a personalized portfolio analysis</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Our AI will analyze your holdings, search for relevant market news, and provide recommendations tailored to your portfolio
                </p>
                
                <Button 
                  onClick={handleAnalyze} 
                  className="py-6 bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Analyze my portfolio
                </Button>
              </div>
            )}
            
            {loading && (
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Analyzing your holdings</span>
                    <span className="text-muted-foreground">{progress < 30 ? "In progress" : "Complete"}</span>
                  </div>
                  <Progress value={progress < 30 ? progress : 100} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Searching for market news</span>
                    <span className="text-muted-foreground">{progress < 60 ? "In progress" : "Complete"}</span>
                  </div>
                  <Progress value={progress < 30 ? 0 : (progress < 60 ? (progress - 30) * (100/30) : 100)} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Building analysis and recommendations</span>
                    <span className="text-muted-foreground">{progress < 60 ? "Pending" : "In progress"}</span>
                  </div>
                  <Progress value={progress < 60 ? 0 : (progress - 60) * (100/40)} className="h-2" />
                </div>
                
                <div className="flex justify-center mt-10">
                  <div className="text-center">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 text-amber-500 animate-pulse" />
                    <p className="text-sm text-muted-foreground">This usually takes about 1-2 minutes</p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className="my-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {analysis && (
              <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="pt-2 pb-6 flex justify-center">
            {analysis && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setAnalysis(null);
                }}
                className="text-sm"
              >
                Start a new analysis
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      <div className="disclaimer-footnote mt-8 text-center text-sm text-muted-foreground">
        I'm your AI investment analyst — I do my best but I can make mistakes. This is not financial advice. Always consult a professional for investment decisions.
      </div>
    </div>
  );
} 