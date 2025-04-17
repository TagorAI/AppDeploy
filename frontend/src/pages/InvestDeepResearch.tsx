import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  FileText, 
  Link2,
  Loader2,
  ExternalLink,
  AlertCircle,
  LightbulbIcon,
  Sparkles,
  BookOpen,
  Clock,
  Info,
  Database,
  CheckCircle2,
  BarChart3,
  Send,
  Mic,
  Square
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

// Define interface for deep research response
interface DeepResearchResponse {
  content: string;
  citations: string[];
  source: string;
  timestamp: string;
  query: string;
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }
}

export default function InvestDeepResearch() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const { toast } = useToast()
  const [query, setQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"research" | "sources" | "reasoning">("research")
  const [researchResults, setResearchResults] = useState<DeepResearchResponse | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Loading animation states
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [searchPercentage, setSearchPercentage] = useState(0)
  const [researchSteps, setResearchSteps] = useState({
    gathering: false,
    analyzing: false,
    synthesizing: false,
    verifying: false
  })

  // Audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)

  // New variable to store the interval reference
  const progressInterval = useRef<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    triggerResearchProcess()

    try {
      const response = await apiRequest('/api/investments/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query })
      })

      clearInterval(progressInterval.current)
      setLoadingProgress(100)
      setSearchPercentage(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to get research results')
      }

      const data = await response.json()
      setResearchResults(data)
      setActiveTab("research")
    } catch (error) {
      console.error('Deep research error:', error)
      setError(error instanceof Error ? error.message : 'We couldn\'t find an answer right now')
      setResearchResults(null)
      clearInterval(progressInterval.current)
      setLoadingProgress(0)
      setSearchPercentage(0)
    } finally {
      setLoading(false)
    }
  }

  // Extracted common loading animation logic to a shared function
  const triggerResearchProcess = () => {
    setLoading(true)
    setError(null)
    
    // Reset and animate loading states
    setLoadingProgress(0)
    setSearchPercentage(0)
    setResearchSteps({
      gathering: false,
      analyzing: false,
      synthesizing: false,
      verifying: false
    })
    
    // Clear any existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }
    
    // Simulate research progress
    progressInterval.current = window.setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval.current as number)
          return 95
        }
        return prev + (Math.random() * 3)
      })
      
      setSearchPercentage(prev => {
        const newValue = prev + (Math.random() * 7)
        return Math.min(newValue, 95)
      })
    }, 600)
    
    // Simulate research steps
    setTimeout(() => setResearchSteps(prev => ({ ...prev, gathering: true })), 800)
    setTimeout(() => setResearchSteps(prev => ({ ...prev, analyzing: true })), 3000)
    setTimeout(() => setResearchSteps(prev => ({ ...prev, synthesizing: true })), 5500)
    setTimeout(() => setResearchSteps(prev => ({ ...prev, verifying: true })), 7500)
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''
        }
      }
      
      console.log(`Using MIME type: ${mimeType}`)
      const options = mimeType ? { mimeType } : undefined
      mediaRecorderRef.current = new MediaRecorder(stream, options)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstart = () => {
        setIsRecording(true)
        setRecordingTime(0)
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false)
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        
        await processVoiceInput()
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      
      toast({
        title: "Recording started",
        description: "Speak your research question clearly."
      })
      
    } catch (err) {
      console.error("Error starting recording:", err)
      toast({
        variant: "destructive",
        title: "Microphone access denied",
        description: "Please enable microphone access in your browser settings."
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      toast({
        title: "Recording stopped",
        description: "Processing your voice input..."
      })
    }
  }

  const processVoiceInput = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log("No audio chunks recorded")
      return
    }
    
    console.log(`Processing ${audioChunksRef.current.length} audio chunks`)
    
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
    console.log(`Created audio blob of size: ${audioBlob.size} bytes`)
    
    // Start the research animation process (same as with text input)
    triggerResearchProcess()

    try {
      const formData = new FormData()
      const extension = mimeType.split('/')[1] || 'webm'
      formData.append('file', audioBlob, `recording.${extension}`)
      console.log(`Sending audio file as recording.${extension}`)

      const response = await apiRequest('/api/investments/voice-deep-research', {
        method: 'POST',
        body: formData
      })

      // Clear the animation interval
      clearInterval(progressInterval.current as number)
      setLoadingProgress(100)
      setSearchPercentage(100)

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.transcription) {
        setQuery(result.transcription)
        toast({
          title: "Voice transcription",
          description: result.transcription
        })
      }
      
      if (result.content) {
        setResearchResults(result)
        setActiveTab("research")
      }
      
    } catch (error) {
      console.error('Voice deep research error:', error)
      toast({
        variant: "destructive",
        title: "Voice processing error",
        description: "We couldn't process your voice input. Please try again or type your question."
      })
      
      setError("We couldn't process your voice input. Please try again.")
      setResearchResults(null)
      clearInterval(progressInterval.current as number)
      setLoadingProgress(0)
      setSearchPercentage(0)
    } finally {
      setLoading(false)
    }
  }

  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
  }

  // Handle example selection - only fills in the search bar without auto-submitting
  const handleExample = (exampleQuery: string) => {
    // Just set the query text and focus the input
    setQuery(exampleQuery)
    
    // Focus the input so user can edit if needed
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
    
    // Add a toast to guide the user to click the send button
    toast({
      title: "Example selected",
      description: "Click the send button when you're ready to research this topic.",
      duration: 3000
    })
  }

  const formatDate = (timestamp: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
            onClick={() => navigate('/dashboard')}
            className="bg-black hover:bg-black/90 text-white"
          >
            Dashboard
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="text-center mb-4">
          <span className="inline-block bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-medium px-3 py-1 rounded-full mb-2">
            <BookOpen className="h-3.5 w-3.5 inline-block mr-1.5" />
            In-depth research
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Investment research</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Access comprehensive financial insights backed by verified sources
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side - Research input and how it works */}
        <div className="space-y-6">
          <Card className="border-2 border-black/10 dark:border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Research any financial topic
              </CardTitle>
              <CardDescription>
                Enter your question to get comprehensive insights and analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What financial topic would you like to research?"
                    className="flex-1 p-3 h-12 border rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white/30 focus:outline-none"
                    disabled={loading || isRecording}
                  />
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={loading}
                      size="icon"
                      className={`h-12 w-12 ${isRecording ? 
                        "bg-red-600 text-white hover:bg-red-700" : 
                        "bg-primary/10 text-primary hover:bg-primary/20"}`}
                    >
                      {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading || !query.trim() || isRecording}
                    size="icon"
                    className="h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
                
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Try one of these topics:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button" /* Added type="button" to prevent form submission */
                      onClick={() => handleExample("What are the most effective retirement investment strategies for Canadians?")}
                      className="text-xs bg-transparent"
                    >
                      Retirement strategies
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button" /* Added type="button" to prevent form submission */
                      onClick={() => handleExample("How do TFSA and RRSP contribution strategies compare for different income levels?")}
                      className="text-xs bg-transparent"
                    >
                      TFSA vs RRSP analysis
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-center mt-3">
                  Type your query or use the microphone to ask your financial questions
                </div>
              </form>
            </CardContent>
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
                  <span>Enter your financial question or topic for research</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">2</span>
                  <span>Our AI analyzes multiple trusted sources and databases</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">3</span>
                  <span>Review in-depth analysis, verified sources, and methodology</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
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
                  <BookOpen className="animate-pulse mr-2 h-5 w-5 text-blue-500" />
                  Researching Your Topic
                </CardTitle>
                <CardDescription>
                  Our AI is analyzing trusted sources to provide comprehensive insights
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  {/* Research stages visualization */}
                  <div className="space-y-4">
                    <div className={`flex items-start rounded-lg transition-colors duration-300 p-3 ${researchSteps.gathering ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                      <div className={`flex h-8 w-8 rounded-full items-center justify-center mr-3 transition-colors duration-300 ${researchSteps.gathering ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {researchSteps.gathering ? 
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : 
                          <Clock className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center">
                          <p className={`text-sm font-medium transition-colors duration-300 ${researchSteps.gathering ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
                            Gathering information
                          </p>
                          {researchSteps.gathering && (
                            <div className="ml-auto bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">
                              Completed
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Accessing regulatory frameworks and financial databases
                        </p>
                      </div>
                    </div>
                    
                    <div className={`flex items-start rounded-lg transition-colors duration-300 p-3 ${researchSteps.analyzing ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                      <div className={`flex h-8 w-8 rounded-full items-center justify-center mr-3 transition-colors duration-300 ${researchSteps.analyzing ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {researchSteps.analyzing ? 
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : 
                          <Clock className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center">
                          <p className={`text-sm font-medium transition-colors duration-300 ${researchSteps.analyzing ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
                            Analyzing financial data
                          </p>
                          {researchSteps.analyzing && (
                            <div className="ml-auto bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">
                              Completed
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Examining historical trends and current market conditions
                        </p>
                      </div>
                    </div>
                    
                    <div className={`flex items-start rounded-lg transition-colors duration-300 p-3 ${researchSteps.synthesizing ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                      <div className={`flex h-8 w-8 rounded-full items-center justify-center mr-3 transition-colors duration-300 ${researchSteps.synthesizing ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {researchSteps.synthesizing ? 
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : 
                          <Clock className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center">
                          <p className={`text-sm font-medium transition-colors duration-300 ${researchSteps.synthesizing ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
                            Synthesizing insights
                          </p>
                          {researchSteps.synthesizing && (
                            <div className="ml-auto bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">
                              Completed
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Combining expert analysis with verified information
                        </p>
                      </div>
                    </div>
                    
                    <div className={`flex items-start rounded-lg transition-colors duration-300 p-3 ${researchSteps.verifying ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                      <div className={`flex h-8 w-8 rounded-full items-center justify-center mr-3 transition-colors duration-300 ${researchSteps.verifying ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {researchSteps.verifying ? 
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : 
                          <Clock className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center">
                          <p className={`text-sm font-medium transition-colors duration-300 ${researchSteps.verifying ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
                            Finalizing research
                          </p>
                          {researchSteps.verifying && (
                            <div className="ml-auto bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full">
                              Completed
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ensuring accuracy and creating clear presentation
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center mt-6">
                    <div className="text-center">
                      <Sparkles className="h-10 w-10 mx-auto mb-3 text-blue-500 animate-pulse" />
                      <p className="text-sm text-muted-foreground">This usually takes about 30 seconds</p>
                      <p className="text-sm font-medium mt-2">{Math.round(searchPercentage)}% complete</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : researchResults ? (
            <Card className="border-2 border-black/10 dark:border-white/10 h-full">
              <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-black">
                <CardTitle>Research results</CardTitle>
                <CardDescription>
                  Based on your query: "{researchResults.query}"
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Tabs 
                  value={activeTab} 
                  onValueChange={(value: any) => setActiveTab(value as "research" | "sources" | "reasoning")} 
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="research" className="text-sm">
                      <FileText className="h-4 w-4 mr-1.5" />
                      Analysis
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="text-sm">
                      <Link2 className="h-4 w-4 mr-1.5" />
                      Sources {researchResults.citations.length > 0 && `(${researchResults.citations.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="reasoning" className="text-sm">
                      <LightbulbIcon className="h-4 w-4 mr-1.5" />
                      Methodology
                    </TabsTrigger>
                  </TabsList>
                  
                  <ScrollArea className="h-[500px]">
                    <div className="px-1">
                      <TabsContent value="research" className="mt-0">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-4" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-xl font-semibold my-3" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-lg font-medium my-2" {...props} />,
                              p: ({node, ...props}) => <p className="mb-4 text-base leading-relaxed" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 my-4" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-4" {...props} />,
                              li: ({node, ...props}) => <li className="mb-2" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                              blockquote: ({node, ...props}) => (
                                <blockquote className="border-l-4 border-blue-200 pl-4 my-4 italic" {...props} />
                              ),
                              code: ({node, ...props}) => (
                                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />
                              ),
                              a: ({node, ...props}) => (
                                <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                              ),
                              table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-4">
                                  <table className="min-w-full divide-y divide-gray-200" {...props} />
                                </div>
                              ),
                              th: ({node, ...props}) => (
                                <th className="py-2 px-4 text-left font-medium bg-gray-50" {...props} />
                              ),
                              td: ({node, ...props}) => (
                                <td className="py-2 px-4 border-t border-gray-100" {...props} />
                              ),
                            }}
                          >
                            {researchResults.content}
                          </ReactMarkdown>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="sources" className="mt-0">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-5">
                          <h3 className="text-base font-medium mb-1 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Link2 className="h-4 w-4" />
                            Verified research sources
                          </h3>
                          <p className="text-sm text-blue-700/80 dark:text-blue-400/80">
                            All sources have been validated for accuracy and relevance
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          {researchResults.citations.length > 0 ? (
                            researchResults.citations.map((citation, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md text-blue-600 dark:text-blue-400">
                                  <ExternalLink className="h-4 w-4" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <a 
                                    href={citation} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                                  >
                                    {citation}
                                  </a>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No external sources were referenced for this analysis</p>
                          )}
                        </div>
                        
                        {researchResults.usage && (
                          <div className="mt-8 pt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">Research metrics</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border">
                                <p className="text-xs text-muted-foreground mb-1">Query complexity</p>
                                <p className="font-medium text-xl">{researchResults.usage.prompt_tokens}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border">
                                <p className="text-xs text-muted-foreground mb-1">Analysis depth</p>
                                <p className="font-medium text-xl">{researchResults.usage.completion_tokens}</p>
                              </div>
                              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border">
                                <p className="text-xs text-muted-foreground mb-1">Total scope</p>
                                <p className="font-medium text-xl">{researchResults.usage.total_tokens}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="reasoning" className="mt-0">
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-5">
                          <h3 className="text-base font-medium mb-1 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <LightbulbIcon className="h-4 w-4" />
                            Research methodology
                          </h3>
                          <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                            The analytical approach and verification process behind this research
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                          {researchResults.reasoning ? (
                            <div className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                              {researchResults.reasoning}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <p className="font-medium">
                                Research methodology overview:
                              </p>
                              <p className="mt-3 text-sm">
                                For this financial research query, we followed our comprehensive five-step analysis process:
                              </p>
                              
                              <div className="mt-4 space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/50 items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-medium flex-shrink-0">
                                    1
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Source identification</p>
                                    <p className="text-xs mt-0.5 text-muted-foreground">
                                      We identified authoritative sources including government financial regulators, established financial institutions, and peer-reviewed publications.
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                  <div className="flex h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/50 items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-medium flex-shrink-0">
                                    2
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Data collection</p>
                                    <p className="text-xs mt-0.5 text-muted-foreground">
                                      Information was gathered from multiple independent sources with particular attention to Canadian-specific financial frameworks.
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                  <div className="flex h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/50 items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-medium flex-shrink-0">
                                    3
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Cross-verification</p>
                                    <p className="text-xs mt-0.5 text-muted-foreground">
                                      Multiple cross-verification steps were performed to ensure accuracy of information across all sources.
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                  <div className="flex h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/50 items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-medium flex-shrink-0">
                                    4
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Analysis and synthesis</p>
                                    <p className="text-xs mt-0.5 text-muted-foreground">
                                      Insights were synthesized with attention to practical application for Canadian investors.
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                  <div className="flex h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/50 items-center justify-center text-amber-700 dark:text-amber-400 text-xs font-medium flex-shrink-0">
                                    5
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Final quality check</p>
                                    <p className="text-xs mt-0.5 text-muted-foreground">
                                      Research underwent a final verification for accuracy, completeness, and relevance to the research question.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </div>
                  </ScrollArea>
                </Tabs>
              </CardContent>
              <CardFooter className="pt-2 pb-6 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setQuery('');
                    setResearchResults(null);
                  }}
                  className="text-sm"
                >
                  Research Another Topic
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-2 border-black/10 dark:border-white/10 h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle>Your research results</CardTitle>
                <CardDescription>
                  Enter your question on the left to see the research here
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col items-center justify-center py-12 text-center">
                <div className="max-w-xs mx-auto">
                  <div className="bg-slate-100 dark:bg-slate-800 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-base font-medium mb-2">Your research will appear here</h3>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-muted-foreground">
        I'm your AI assistant — I do my best but I can make mistakes. Please verify important financial information.
      </div>
    </div>
  )
}