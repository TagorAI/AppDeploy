import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ChevronLeft,
  TrendingUp,
  Clock,
  Calendar,
  LayoutDashboard,
  ArrowRight,
  Search,
  Loader2,
  MessageSquare,
  Mic,
  Square
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DashboardAgentsMenu() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const { toast } = useToast();
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Agent card data - removed the financial-team card
  const agentCards = [
    {
      id: 'investment',
      title: 'Analyze my portfolio',
      description: 'Get personalized investment recommendations based on your goals and risk profile. Receive a detailed portfolio analysis with specific action steps.',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'blue',
      route: '/investment-analyst-agent',
      buttonText: 'Start'
    },
    {
      id: 'timemachine',
      title: 'Plan my spending',
      description: 'See how different financial choices might affect your future. Compare options for major purchases or investments and visualize the long-term impact.',
      icon: <Clock className="h-6 w-6" />,
      color: 'purple',
      route: '/investment-timemachine-agent',
      buttonText: 'Start'
    },
    {
      id: 'retirement',
      title: 'Plan my retirement',
      description: "Project your retirement savings and analyze if you're on track. Get customized strategies to meet your retirement goals.",
      icon: <Calendar className="h-6 w-6" />,
      color: 'amber',
      route: '/retirement/advisor',
      buttonText: 'Start'
    }
  ];

  // Color mapping for consistent styling
  const colorStyles = {
    blue: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      cardBorder: 'group-hover:border-blue-400',
      cardBg: 'bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
      title: 'text-blue-700 dark:text-blue-400'
    },
    purple: {
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      cardBorder: 'group-hover:border-purple-400',
      cardBg: 'bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
      title: 'text-purple-700 dark:text-purple-400'
    },
    amber: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      cardBorder: 'group-hover:border-amber-400',
      cardBg: 'bg-gradient-to-br from-amber-50/50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
      title: 'text-amber-700 dark:text-amber-400'
    },
    green: {
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      cardBorder: 'group-hover:border-green-400',
      cardBg: 'bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20',
      title: 'text-green-700 dark:text-green-400'
    }
  };

  // Format recording time as mm:ss
  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Start voice recording
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
      
      console.log(`Using MIME type: ${mimeType}`);
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
        
        await processAudioRecording();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      
      toast({
        title: "Recording started",
        description: "Speak your financial question clearly",
      });
      
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({
        variant: "destructive",
        title: "Microphone access denied",
        description: "Please enable microphone access in your browser settings",
      });
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      toast({
        title: "Recording stopped",
        description: "Processing your voice query...",
      });
    }
  };

  // Process the audio recording using voice-to-text endpoint
  const processAudioRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log("No audio chunks recorded");
      return;
    }
    
    console.log(`Processing ${audioChunksRef.current.length} audio chunks`);
    
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    console.log(`Created audio blob of size: ${audioBlob.size} bytes`);
    
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      const extension = mimeType.split('/')[1] || 'webm';
      formData.append('file', audioBlob, `recording.${extension}`);
      console.log(`Sending audio file as recording.${extension}`);

      // Call the voice-to-text endpoint instead of voice-chat
      const response = await auth.apiRequest('/api/voice-to-text', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process your voice input');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to transcribe audio');
      }
      
      if (result.transcription) {
        // Set the transcribed text to the input field
        setQuery(result.transcription);
        
        toast({
          title: "Voice transcription",
          description: result.transcription
        });
        
        // Automatically submit the form after a brief delay
        setTimeout(() => {
          // Only auto-submit if there's a valid transcription and at least 3 words
          if (result.transcription.trim() && result.transcription.split(' ').length >= 3) {
            handleQuerySubmit(new Event('submit') as any);
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('Error processing voice input:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      toast({
        variant: "destructive",
        title: "Voice processing failed",
        description: error instanceof Error ? error.message : 'Failed to process your voice input',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced query submission to match the FinancialTeamAgent implementation
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Submitting query to financial-team endpoint:", query);
      
      // Call the financial-team endpoint
      const response = await auth.apiRequest('/api/financial-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process your query');
      }
      
      const result = await response.json();
      console.log("Received response from financial-team endpoint:", result);
      
      // Navigate to the AgentsOutput page with the result
      navigate('/agents/output', { 
        state: { 
          agentResponse: {
            status: result.status || 'success',
            agent: result.agent || result.handled_by || 'Financial Team',
            response: result.response || result.message,
            handoff_occurred: result.handoff_occurred || false,
            analysis: result.analysis,
            structured_output: result.structured_output,
            image_url: result.image_url,
            trace_id: result.trace_id,
            ...result // Include all other fields
          } 
        } 
      });
      
      toast({
        title: "Query processed",
        description: "Your financial question has been answered",
      });
      
    } catch (error) {
      console.error('Error processing query:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      toast({
        variant: "destructive",
        title: "Query failed",
        description: error instanceof Error ? error.message : 'Failed to process your request',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-background/80">
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

      {/* Header - Enhance to highlight the direct query feature */}
      <div className="text-center mb-8">
        <span className="inline-block bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium px-3 py-1 rounded-full mb-2">
          <MessageSquare className="h-3.5 w-3.5 inline-block mr-1" />
          Ask me anything
        </span>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Your personal financial assistants
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Ask a question or select a specialized agent below
        </p>
      </div>
      
      {/* Enhanced Query Bar with Voice Input */}
      <div className="max-w-3xl mx-auto mb-12">
        <form onSubmit={handleQuerySubmit} className="flex flex-col space-y-4">
          <div className="flex w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything about your finances..."
                className="pl-10 py-6 text-lg rounded-xl shadow-sm border-2 focus:border-green-400"
                disabled={isLoading || isRecording}
              />
            </div>
            
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`ml-2 ${isRecording ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
              size="icon"
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button 
              type="submit" 
              className="ml-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading || isRecording || !query.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Ask
                </>
              )}
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
          
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <p className="text-center text-sm text-muted-foreground">
            Try asking: "How are my investments performing?" or "Should I buy a house or invest the money?"
          </p>
        </form>
      </div>
      
      {/* Agent Cards - Enhanced Layout */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {agentCards.map(card => (
          <Card 
            key={card.id}
            className={`overflow-hidden border transition-all ${colorStyles[card.color as keyof typeof colorStyles].cardBg} ${colorStyles[card.color as keyof typeof colorStyles].cardBorder} cursor-pointer group hover:shadow-lg transform hover:-translate-y-1`} 
            onClick={() => navigate(card.route)}
            onMouseEnter={() => setHoveredCard(card.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <CardContent className="p-6 h-full flex flex-col">
              {/* Header with icon and title */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full ${colorStyles[card.color as keyof typeof colorStyles].iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <div className={colorStyles[card.color as keyof typeof colorStyles].iconColor}>
                    {card.icon}
                  </div>
                </div>
                <h3 className={`text-xl font-semibold ${colorStyles[card.color as keyof typeof colorStyles].title} group-hover:translate-x-1 transition-transform`}>
                  {card.title}
                </h3>
              </div>
              
              {/* Description */}
              <p className="text-muted-foreground mb-6 flex-grow">
                {card.description}
              </p>
              
              {/* Button - Centered and standard width */}
              <div className="flex justify-center w-full mt-auto">
                <Button 
                  variant="default"
                  className="px-6 group-hover:translate-y-[-2px] transition-all"
                >
                  {card.buttonText}
                  <ArrowRight className={`ml-2 h-4 w-4 ${hoveredCard === card.id ? 'transform translate-x-1' : ''} transition-transform`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}