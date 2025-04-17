import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, ArrowRight, X } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

interface LearnMoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  pageContext: string;
}

export default function LearnMoreDialog({ isOpen, onClose, query, pageContext }: LearnMoreDialogProps) {
  const { apiRequest } = useAuth();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your question...");
  
  const loadingMessages = [
    "Analyzing your question...",
    "Retrieving financial information...",
    "Personalizing your explanation...",
    "Simplifying complex concepts...",
    "Almost ready with your answer..."
  ];

  const fetchLearningContent = async (questionToAsk: string) => {
    setLoading(true);
    setContent(null); // Clear previous content
    setRelatedQuestions([]);
    
    try {
      console.log(`Fetching learning content for: "${questionToAsk}" with context: "${pageContext}"`);
      
      const response = await apiRequest('/api/investments/microlearning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: questionToAsk, 
          context: pageContext 
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch learning content: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received microlearning response:", data);
      
      if (data.success && data.education) {
        setContent(data.education);
      } else {
        console.error("Missing expected data in response:", data);
        setContent("Sorry, I couldn't get the information you requested. Please try again.");
      }
      
      // Generate related questions based on current query
      console.log("Fetching related questions...");
      const relatedResponse = await apiRequest('/api/investments/related-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: questionToAsk, 
          context: pageContext 
        })
      });
      
      if (relatedResponse.ok) {
        const relatedData = await relatedResponse.json();
        console.log("Received related questions:", relatedData);
        if (relatedData.success && relatedData.questions) {
          setRelatedQuestions(relatedData.questions);
        }
      } else {
        console.error("Failed to fetch related questions:", relatedResponse.status);
      }
    } catch (error) {
      console.error('Error fetching learning content:', error);
      setContent("Sorry, there was an error retrieving this information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && query) {
      console.log(`Dialog opened with query: "${query}"`);
      fetchLearningContent(query);
    }
  }, [isOpen, query]);

  useEffect(() => {
    let interval: number | null = null;
    
    if (loading) {
      interval = window.setInterval(() => {
        setLoadingProgress((prev) => {
          const messageIndex = Math.floor((prev / 100) * loadingMessages.length);
          setLoadingMessage(loadingMessages[messageIndex] || loadingMessages[0]);
          
          return prev >= 95 ? 95 : prev + 5;
        });
      }, 600);
    } else {
      setLoadingProgress(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] max-h-[85vh] overflow-y-auto" aria-describedby="dialog-description">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <DialogTitle>Learn More</DialogTitle>
          </div>
        </DialogHeader>
        
        {loading ? (
          <div className="py-4 flex flex-col items-center">
            <div className="mb-3 w-full">
              <Progress value={loadingProgress} className="h-1" />
            </div>
            <div className="animate-pulse flex space-x-4 w-full">
              <div className="flex-1 space-y-3 py-1">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 animate-pulse">{loadingMessage}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              {content ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No content available. Please try again.</p>
              )}
            </div>
            
            {relatedQuestions.length > 0 && (
              <div className="pt-3 border-t">
                <h4 className="text-sm font-medium mb-2">Related questions:</h4>
                <div className="space-y-2">
                  {relatedQuestions.slice(0, 2).map((question, idx) => (
                    <Button 
                      key={idx} 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-left h-auto py-1.5"
                      onClick={() => fetchLearningContent(question)}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      <span className="line-clamp-1">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Hidden element for accessibility */}
        <span id="dialog-description" className="sr-only">
          Dialog providing educational content about financial topics
        </span>
      </DialogContent>
    </Dialog>
  );
} 