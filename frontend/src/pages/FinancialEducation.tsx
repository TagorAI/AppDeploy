import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Lightbulb, 
  Send, 
  BookOpen, 
  Mic, 
  Square,
  ArrowRight,
  Info
} from "lucide-react";

export default function FinancialEducation() {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');
  const [educationContent, setEducationContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPersonalized, setIsPersonalized] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Sample questions the user can click on
  const sampleQuestions = [
    "What are the key financial concepts I should know?",
    "How do I start investing with little money?",
    "What's the difference between TFSA and RRSP?",
    "How can I build an emergency fund?"
  ];

  // Handle clicking on a sample question
  const handleSampleQuestion = (question: string) => {
    setQuery(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Simulate a loading progress bar
  useEffect(() => {
    if (loading) {
      // Check if user is logged in to determine if we'll be showing personalized content
      setIsPersonalized(!!localStorage.getItem('supabase.auth.token'));
      
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
  }, [loading]);

  const handleGetEducation = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/investments/microlearning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get educational content');
      }

      const data = await response.json();
      setEducationContent(data.education);
      toast({ title: "Explanation ready", description: "Your personalized explanation is ready." });
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }
      
      const options = mimeType ? { mimeType } : undefined;
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        await processVoiceInput();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      
      toast({
        title: "Recording started",
        description: "Ask your financial question clearly."
      });
      
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({
        variant: "destructive",
        title: "Microphone access denied",
        description: "Please enable microphone access in your browser settings."
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      toast({
        title: "Recording stopped",
        description: "Processing your voice input..."
      });
    }
  };

  const processVoiceInput = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log("No audio chunks recorded");
      return;
    }
    
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    
    setLoading(true);

    try {
      const formData = new FormData();
      const extension = mimeType.split('/')[1] || 'webm';
      formData.append('file', audioBlob, `recording.${extension}`);

      // Call the dedicated voice-to-text endpoint
      const transcriptionResponse = await apiRequest('/api/voice-to-text', {
        method: 'POST',
        body: formData
      });

      if (!transcriptionResponse.ok) {
        throw new Error(`Server responded with status: ${transcriptionResponse.status}`);
      }

      const transcriptionData = await transcriptionResponse.json();
      
      if (transcriptionData.success && transcriptionData.transcription) {
        setQuery(transcriptionData.transcription);
        
        // Now that we have the transcription, call the microlearning API
        const microlearningResponse = await apiRequest('/api/investments/microlearning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: transcriptionData.transcription, context })
        });
        
        if (!microlearningResponse.ok) {
          throw new Error('Failed to get educational content');
        }
        
        const microlearningData = await microlearningResponse.json();
        setEducationContent(microlearningData.education);
        
        toast({
          title: "Voice processed",
          description: `Your question: "${transcriptionData.transcription}"`
        });
      } else {
        throw new Error(transcriptionData.message || "Voice transcription failed");
      }
      
    } catch (error) {
      console.error('Voice processing error:', error);
      setError('Sorry, I had trouble processing your voice input. Could you try again or type your question?');
      toast({
        variant: "destructive",
        title: "Voice processing error",
        description: "We couldn't process your voice input. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Button onClick={() => navigate('/dashboard')}>
          Dashboard
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Title with Badge */}
      <div className="mb-8 text-center">
        <span className="inline-block bg-primary/10 text-primary text-sm px-3 py-1 rounded-full mb-2">
          Financial education
        </span>
        <h1 className="text-3xl font-bold">Learn at your own pace</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Get personalized explanations for any financial concept in plain language.
        </p>
      </div>
      
      {/* Main content area with two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Input */}
        <div className="flex flex-col space-y-6">
          {/* Ask anything card */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Ask anything</CardTitle>
                  <CardDescription>Type or speak your financial question</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    placeholder="What financial concept can I explain for you?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading || isRecording}
                    className="pr-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGetEducation();
                      }
                    }}
                  />
                </div>
                
                <Button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  variant="outline"
                  size="icon"
                  className={isRecording ? "bg-red-600 text-white hover:bg-red-700 border-red-600" : ""}
                >
                  {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                
                <Button
                  onClick={handleGetEducation}
                  disabled={!query.trim() || loading || isRecording}
                  size="icon"
                >
                  {loading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              {isRecording && (
                <div className="flex justify-center mt-2">
                  <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full animate-pulse">
                    <span className="mr-2 h-2 w-2 bg-red-600 rounded-full"></span>
                    <span className="text-sm font-medium">Recording {formatRecordingTime(recordingTime)}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-2">
                <Textarea
                  placeholder="Optional context: e.g., 'retirement planning', 'first-time investor'"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={loading || isRecording}
                  className="h-20 resize-none"
                />
              </div>
            </CardContent>
            
            {loading && (
              <div className="px-6 pb-4">
                <Progress value={progress} className="h-2" />
                {isPersonalized && progress > 30 && (
                  <div className="flex items-center justify-center mt-2">
                    <Lightbulb className="h-3 w-3 mr-2 text-primary/70" />
                    <p className="text-xs text-muted-foreground">
                      Tailoring for your profile...
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
          
          {/* Sample questions */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Popular questions</CardTitle>
                  <CardDescription>Quick access to common topics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {sampleQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => handleSampleQuestion(question)}
                  >
                    <ArrowRight className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="truncate">{question}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* How it works */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">How it works</CardTitle>
                  <CardDescription>Get the most from your learning experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3 text-sm">
                <p className="flex items-start">
                  <span className="bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 flex-shrink-0">1</span>
                  <span>Ask any financial question - be specific for better answers</span>
                </p>
                <p className="flex items-start">
                  <span className="bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 flex-shrink-0">2</span>
                  <span>Add optional context to tailor the explanation to your situation</span>
                </p>
                <p className="flex items-start">
                  <span className="bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 flex-shrink-0">3</span>
                  <span>Use voice input if you prefer to speak your question</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Response */}
        <div>
          {error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : educationContent ? (
            <Card className="border-primary/20 h-full">
              <div className="bg-primary/5 border-b border-primary/10 px-6 py-4 flex items-center">
                <div className="bg-primary/10 p-2 rounded-full mr-3">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Your personalized explanation</CardTitle>
              </div>
              <CardContent className="pt-6 overflow-auto max-h-[calc(100vh-300px)]">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{educationContent}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 border border-dashed rounded-lg">
              <BookOpen className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">Your explanation will appear here</h3>
              <p className="max-w-md">
                Ask a question about any financial concept and get a personalized explanation tailored to your profile and financial situation.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Disclaimer Footnote */}
      <div className="text-center text-xs text-muted-foreground mt-8">
        I'm your AI coach — I do my best but I can make mistakes. Please verify important information.
      </div>
    </div>
  );
}
