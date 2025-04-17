import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  TrendingUp, 
  Clock, 
  Calendar,
  LayoutDashboard,
  RefreshCw,
  HelpCircle,
  Bot
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define a more flexible response structure
interface AgentResponse {
  status: 'success' | 'error';
  agent?: string; // The name of the agent that handled the query
  response?: string; // The main text response
  message?: string; // For error messages
  handoff_occurred?: boolean;
  analysis?: any; // For structured analysis data from Investment Analyst
  structured_output?: any; // For structured output from Time Machine
  image_url?: string; // For visualizations
  trace_id?: string; // For debugging
  // Add more fields as needed for different agent types
  [key: string]: any; // Allow any other fields
}

export default function AgentResponse() {
  const location = useLocation();
  const navigate = useNavigate();
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Extract the agent response from the location state
  useEffect(() => {
    if (location.state?.agentResponse) {
      setAgentResponse(location.state.agentResponse);
      console.log("Received agent response:", location.state.agentResponse);
    }
  }, [location]);

  // Determine which agent icon to display
  const getAgentIcon = (agentName: string = '') => {
    const lowerCaseName = agentName.toLowerCase();
    if (lowerCaseName.includes('investment analyst') || lowerCaseName.includes('portfolio analysis')) {
      return <TrendingUp className="h-6 w-6 text-blue-500" />;
    } else if (lowerCaseName.includes('time machine') || lowerCaseName.includes('decision')) {
      return <Clock className="h-6 w-6 text-purple-500" />;
    } else if (lowerCaseName.includes('retirement')) {
      return <Calendar className="h-6 w-6 text-amber-500" />;
    } else if (lowerCaseName.includes('triage') || lowerCaseName.includes('team')) {
      return <Bot className="h-6 w-6 text-green-500" />;
    }
    return <HelpCircle className="h-6 w-6 text-gray-500" />;
  };

  // Format agent name for display
  const formatAgentName = (name: string = '') => {
    if (name === 'Investment Analyst') {
      return 'Portfolio Analysis';
    } else if (name === 'Investment Time Machine') {
      return 'Financial Decision Analysis';
    } else if (name === 'Financial Team Triage') {
      return 'Financial Advisor';
    }
    return name || 'AI Assistant';
  };

  // Get the main response content regardless of source
  const getMainContent = (response: AgentResponse) => {
    // First try to get direct response field
    if (response.response) {
      return response.response;
    }
    
    // Try to get content from structured outputs
    if (response.structured_output?.summary?.recommendation) {
      return response.structured_output.summary.recommendation;
    }
    
    // Try to get from analysis field that might come from investment analyst
    if (typeof response.analysis === 'string') {
      return response.analysis;
    }
    
    if (response.analysis?.market_overview) {
      return response.analysis.market_overview;
    }
    
    // Fallback to empty string
    return "No response content available.";
  };

  // Handle regenerating the response
  const handleRegenerate = () => {
    setLoading(true);
    // Simulate the regeneration delay
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  // If no response is available, show a fallback
  if (!agentResponse) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/agents')} className="hover:bg-background/80">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Agents
          </Button>
        </div>
        
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="h-6 w-6 mr-2 text-gray-400" />
              No Agent Response
            </CardTitle>
            <CardDescription>
              No agent response data was found. Please return to the dashboard and try your query again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>No data available</AlertTitle>
              <AlertDescription>
                We couldn't find any agent response data. This might be because you navigated directly to this page 
                instead of coming from the agent selection flow.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/agents')}>
              Return to Agents
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If there's an error in the response
  if (agentResponse.status === 'error') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/agents')} className="hover:bg-background/80">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Agents
          </Button>
        </div>
        
        <Card className="max-w-4xl mx-auto border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Error Processing Your Query</CardTitle>
            <CardDescription>
              There was an issue processing your financial query
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription>
                {agentResponse.message || 'An unexpected error occurred while processing your request'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/agents')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button variant="default" onClick={handleRegenerate} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Extract agent name from the response
  const agentName = agentResponse.agent || 'Financial Assistant';
  const mainContent = getMainContent(agentResponse);
  
  // Success response - render the agent's output
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/agents')} className="hover:bg-background/80">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Agents
        </Button>
        
        <Button 
          onClick={() => navigate('/dashboard')} 
          variant="outline"
          size="sm"
        >
          <LayoutDashboard className="h-4 w-4 mr-1.5" />
          Dashboard
        </Button>
      </div>

      {/* Main content card */}
      <div className="max-w-4xl mx-auto">
        {/* Agent identification header */}
        <div className="mb-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
            {getAgentIcon(agentName)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {formatAgentName(agentName)}
            </h2>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className={agentResponse.handoff_occurred ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}>
                {agentResponse.handoff_occurred ? 'Specialist Agent' : 'General Agent'}
              </Badge>
              {agentResponse.trace_id && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Trace: {agentResponse.trace_id.substring(0, 8)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Response card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              AI-generated insights based on your query
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-[80%]" />
                <Skeleton className="h-6 w-[90%]" />
                <Skeleton className="h-6 w-[75%]" />
                <Skeleton className="h-6 w-[85%]" />
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                {/* Display response content, handling different content types */}
                {typeof mainContent === 'string' ? (
                  mainContent.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))
                ) : (
                  <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(mainContent, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Display image if available */}
            {agentResponse.image_url && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Visualization</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                  <img 
                    src={agentResponse.image_url} 
                    alt="Financial visualization" 
                    className="mx-auto max-h-80 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Display raw response data for debugging */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 border-t pt-6">
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Debug: Raw Response Data</summary>
                  <pre className="mt-2 bg-slate-100 dark:bg-slate-800 p-4 rounded overflow-auto">
                    {JSON.stringify(agentResponse, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/agents')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button variant="default" onClick={handleRegenerate} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Display structured data if available */}
        {(agentResponse.analysis || agentResponse.structured_output) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[500px]">
              <div className="prose dark:prose-invert max-w-none">
                {/* Render structured output from Time Machine */}
                {agentResponse.structured_output && (
                  <div>
                    {/* Summary section if available */}
                    {agentResponse.structured_output.summary && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold">Summary</h3>
                        {agentResponse.structured_output.summary.headline && (
                          <p className="font-medium">{agentResponse.structured_output.summary.headline}</p>
                        )}
                        {agentResponse.structured_output.summary.key_points && (
                          <ul>
                            {agentResponse.structured_output.summary.key_points.map((point: string, idx: number) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    
                    {/* Action items if available */}
                    {agentResponse.structured_output.action_items && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold">Recommended Actions</h3>
                        <ul>
                          {agentResponse.structured_output.action_items.immediate_steps?.map((step: string, idx: number) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Render Investment Analyst output */}
                {agentResponse.analysis && typeof agentResponse.analysis !== 'string' && (
                  <div>
                    {agentResponse.analysis.portfolio_impact && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold">Portfolio Impact</h3>
                        <p>{agentResponse.analysis.portfolio_impact}</p>
                      </div>
                    )}
                    {agentResponse.analysis.risk_assessment && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold">Risk Assessment</h3>
                        <p>{agentResponse.analysis.risk_assessment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}