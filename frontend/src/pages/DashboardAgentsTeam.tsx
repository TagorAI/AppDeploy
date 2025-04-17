import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  Send,
  Loader2,
  ChevronRight,
  Mic,
  Square
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function FinancialTeamAgent() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

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

      // Call the voice-to-text endpoint
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
            handleSubmit(new Event('submit') as any);
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

  // Handle query submission
  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleSampleQuestion = (question: string) => {
    setQuery(question);
    inputRef.current?.focus();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/agents')}>
          <ChevronLeft className="h-4 w-4 mr-2" />Back
        </Button>
        
        <Button onClick={() => navigate('/dashboard')}>
          Dashboard
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Title with Badge */}
      <div className="mb-8 text-center">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full mb-2">
          Financial assistant
        </span>
        <h1 className="text-3xl font-bold">Help me...</h1>
      </div>

      {/* Sample questions */}
      <div className="text-center mb-6">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleSampleQuestion("Analyze my retirement")}
            className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            Analyze my investments
          </button>
          <button
            onClick={() => handleSampleQuestion("Plan my retirement")}
            className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            Plan my retirement
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mb-8">
        <form 
          onSubmit={handleSubmit}
          className="flex gap-2 p-4 border rounded-lg shadow-sm bg-card"
        >
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your investments, retirement, or financial decisions..."
            className="flex-1"
            disabled={isLoading || isRecording}
          />
          
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`${isRecording ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
            size="icon"
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
          <Button type="submit" disabled={isLoading || isRecording || !query.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {isRecording && (
          <div className="flex justify-center mt-2">
            <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full animate-pulse">
              <span className="mr-2 h-2 w-2 bg-red-600 rounded-full"></span>
              <span className="text-sm font-medium">Recording {formatRecordingTime(recordingTime)}</span>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* Disclaimer Footnote */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        AI can make mistakes. Please check important information.
      </div>
    </div>
  );
} 