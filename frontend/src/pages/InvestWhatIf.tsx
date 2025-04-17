import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Info, 
  Zap, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  LightbulbIcon,
  BarChart3
} from "lucide-react";

const BACKEND_URL = 'http://localhost:8000';

// Example scenarios to help users understand how to use the feature
const EXAMPLE_SCENARIOS = [
  "What if there's a bear market?",
  "What if technology stocks drop 10%?"
];

export default function InvestWhatIf() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  // Update textarea with selected example
  useEffect(() => {
    if (selectedExample) {
      setScenarioDescription(selectedExample);
      setSelectedExample(null);
    }
  }, [selectedExample]);

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
      }, 300);
      return () => {
        clearInterval(interval);
        setProgress(0);
      };
    }
  }, [loading]);

  const handleAnalyze = async () => {
    if (!scenarioDescription.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please describe your scenario first.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      const response = await apiRequest('/api/scenario_analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario_description: scenarioDescription
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze scenario');
      }

      const data = await response.json();
      
      setAnalysis({
        analysis: data.impact_analysis || "No analysis available", 
        impact: data.risk_assessment || "No risk assessment available",
        recommendations: data.recommended_actions || "No recommendations available"
      });
      
      setActiveTab('analysis');
      
      toast({
        title: "Analysis complete",
        description: "Your scenario has been analyzed!",
      });
    } catch (err) {
      console.error('Error analyzing scenario:', err);
      setError((err as Error).message || 'An error occurred during analysis');
      
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: (err as Error).message || 'Failed to analyze your scenario. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAnalysisSection = (title: string, icon: React.ReactNode, content: string) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <div className="pl-7 prose prose-sm dark:prose-invert max-w-none">
          {content.split('\n').map((paragraph, idx) => (
            <p key={idx} className={idx === 0 ? "font-medium" : ""}>{paragraph}</p>
          ))}
        </div>
      </div>
    );
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
            onClick={() => navigate('/grow-investments')}
            className="bg-black hover:bg-black/90 text-white"
          >
            Investment Checklist
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="text-center mb-4">
          <span className="inline-block bg-black/10 text-black dark:bg-white/10 dark:text-white text-sm font-medium px-3 py-1 rounded-full mb-2">
            Grow investments
          </span>
          <h1 className="text-3xl md:text-4xl font-montserrat font-bold mb-2">What if analysis</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore how different scenarios might impact your portfolio
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side - Scenario input */}
        <div className="space-y-6">
          <Card className="border-2 border-black/10 dark:border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Describe your scenario
              </CardTitle>
              <CardDescription>
                What investment situation would you like to explore? Be as specific as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <textarea 
                placeholder="Example: What if there's a bear market?"
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                className="w-full p-3 h-20 border rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white/30 focus:outline-none resize-none"
              />
              
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Try one of these examples:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {EXAMPLE_SCENARIOS.map((example, index) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      size="sm"
                      onClick={() => setScenarioDescription(example)}
                      className="text-xs bg-transparent"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pt-2 pb-6">
              <Button 
                onClick={handleAnalyze} 
                disabled={loading || !scenarioDescription.trim()}
                className="w-full py-6 bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all"
              >
                {loading ? (
                  <>
                    <Zap className="mr-2 h-5 w-5 animate-pulse" />
                    Analyzing your scenario...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Analyze This Scenario
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* How It Works Card */}
          <Card className="bg-slate-50 dark:bg-slate-900 border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">1</span>
                  <span>Describe a potential investment scenario or market event</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">2</span>
                  <span>Our AI analyzes how it might affect your specific portfolio</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">3</span>
                  <span>Review the analysis, potential impacts, and recommended actions</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Analysis Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Right side - Analysis results */}
        <div>
          {loading ? (
            <Card className="border-2 border-black/10 dark:border-white/10 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Zap className="animate-pulse mr-2 h-5 w-5 text-amber-500" />
                  Analyzing Your Scenario
                </CardTitle>
                <CardDescription>
                  Our AI is evaluating the potential impacts on your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Analyzing market data</span>
                      <span className="text-muted-foreground">{progress < 40 ? "In progress" : "Complete"}</span>
                    </div>
                    <Progress value={progress < 40 ? progress : 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Evaluating portfolio impact</span>
                      <span className="text-muted-foreground">{progress < 70 ? "In progress" : "Complete"}</span>
                    </div>
                    <Progress value={progress < 40 ? 0 : (progress < 70 ? (progress - 40) * (100/30) : 100)} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Generating recommendations</span>
                      <span className="text-muted-foreground">{progress < 70 ? "Pending" : "In progress"}</span>
                    </div>
                    <Progress value={progress < 70 ? 0 : (progress - 70) * (100/30)} className="h-2" />
                  </div>
                  
                  <div className="flex justify-center mt-10">
                    <div className="text-center">
                      <Sparkles className="h-10 w-10 mx-auto mb-3 text-amber-500 animate-pulse" />
                      <p className="text-sm text-muted-foreground">This usually takes about 30 seconds</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : analysis ? (
            <Card className="border-2 border-black/10 dark:border-white/10 h-full">
              <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-black">
                <CardTitle>Analysis results</CardTitle>
                <CardDescription>
                  Based on your scenario: "{scenarioDescription}"
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="analysis" className="text-sm">
                      <Info className="h-4 w-4 mr-1.5" />
                      Analysis
                    </TabsTrigger>
                    <TabsTrigger value="impact" className="text-sm">
                      <BarChart3 className="h-4 w-4 mr-1.5" />
                      Impact
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="text-sm">
                      <LightbulbIcon className="h-4 w-4 mr-1.5" />
                      Actions
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="px-1">
                    <TabsContent value="analysis" className="mt-0">
                      {renderAnalysisSection(
                        "Scenario analysis", 
                        <Info className="h-5 w-5 text-blue-500" />, 
                        analysis.analysis
                      )}
                    </TabsContent>
                    
                    <TabsContent value="impact" className="mt-0">
                      {renderAnalysisSection(
                        "Portfolio impact", 
                        <BarChart3 className="h-5 w-5 text-amber-500" />, 
                        analysis.impact
                      )}
                    </TabsContent>
                    
                    <TabsContent value="recommendations" className="mt-0">
                      {renderAnalysisSection(
                        "Recommended actions", 
                        <LightbulbIcon className="h-5 w-5 text-green-500" />, 
                        analysis.recommendations
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
                
                <div className="mt-8 pt-4 border-t border-dashed">
                  <Alert className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <Info className="h-4 w-4 text-slate-500" />
                    <AlertDescription className="text-xs text-slate-500">
                      This analysis is based on historical data and market trends. Actual results may vary.
                      The information provided is for educational purposes only.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
              <CardFooter className="pt-2 pb-6 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setScenarioDescription('');
                    setAnalysis(null);
                  }}
                  className="text-sm"
                >
                  Try Another Scenario
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-2 border-black/10 dark:border-white/10 h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle>Your analysis results</CardTitle>
                <CardDescription>
                  Describe your scenario on the left to see the analysis here
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col items-center justify-center py-12 text-center">
                <div className="max-w-xs mx-auto">
                  <div className="bg-slate-100 dark:bg-slate-800 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-base font-medium mb-2">Your analysis will appear here</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter a scenario on the left and click analyze
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <div className="disclaimer-footnote">
        I'm your AI coach — I do my best but I can make mistakes. Please check important information.
      </div>
    </div>
  );
}