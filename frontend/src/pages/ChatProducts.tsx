import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Loader2, Send, ChevronLeft, ChevronRight, Search, 
  Mic, Square, AlertCircle, Lightbulb
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ProductResult {
  name: string;
  ticker: string;
  provider: string;
  performance: {
    oneYear: number;
    threeYear: number;
    fiveYear: number;
    sinceInception: number;
  };
  expenseRatio: number;
  category: string;
  description: string;
}

export default function ChatProducts() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [productResults, setProductResults] = useState<ProductResult[]>([])
  const [lastQuestion, setLastQuestion] = useState<string>("")
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sample questions
  const sampleQuestions = [
    "Which fund has double digit returns?",
    "Compare ZCN and XIU"
  ]

  // Loading progress effect
  useEffect(() => {
    if (loading) {
      setLoadingProgress(0)
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval)
            return prev
          }
          return prev + Math.floor(Math.random() * 5)
        })
      }, 500)
      
      return () => {
        clearInterval(interval)
        setLoadingProgress(0)
      }
    }
  }, [loading])
  
  const processApiResponse = (data: any, userQuery: string): ProductResult[] => {
    // Handle standard API response structure
    if (data.products && Array.isArray(data.products)) {
      return data.products.map((product: any) => ({
        name: product.name || "Unknown product",
        ticker: product.ticker || "N/A",
        provider: product.provider || "Unknown provider",
        performance: {
          oneYear: parseFloat(product.performance?.oneYear) || 0,
          threeYear: parseFloat(product.performance?.threeYear) || 0,
          fiveYear: parseFloat(product.performance?.fiveYear) || 0, 
          sinceInception: parseFloat(product.performance?.sinceInception) || 0
        },
        expenseRatio: parseFloat(product.expenseRatio) || 0,
        category: product.category || "Uncategorized",
        description: product.description || "No description available"
      }))
    }
    
    // Handle results directly from DB query
    if (data.results && Array.isArray(data.results)) {
      return data.results.map((product: any) => ({
        name: product.fund_name || "Unknown product",
        ticker: product.fund_symbol || "N/A",
        provider: product.fund_company || "Unknown provider",
        performance: {
          oneYear: parseFloat(product.returns_1_year) || 0,
          threeYear: parseFloat(product.returns_3_year) || 0,
          fiveYear: parseFloat(product.returns_5_year) || 0, 
          sinceInception: parseFloat(product.returns_since_inception) || 0
        },
        expenseRatio: parseFloat(product.expense_ratio) || 0,
        category: product.assetclass_primary || "Uncategorized",
        description: product.short_description || "No description available"
      }))
    }
    
    // Extract product data from explanation text
    if (data.explanation) {
      const explanation = data.explanation
      
      // Look for structured data in the explanation
      const productDataRegex = /\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g
      const matches = [...explanation.matchAll(productDataRegex)]
      
      if (matches.length > 0) {
        const products: ProductResult[] = []
        
        // Skip header row if present
        const startIdx = matches[0][1].includes("Fund") || matches[0][1].includes("Name") ? 1 : 0
        
        for (let i = startIdx; i < matches.length; i++) {
          const match = matches[i]
          const nameWithTicker = match[1].trim()
          // Try to extract ticker from name (usually in parentheses)
          const tickerMatch = nameWithTicker.match(/\(([^)]+)\)/)
          const ticker = tickerMatch ? tickerMatch[1].trim() : "N/A"
          const name = tickerMatch ? nameWithTicker.replace(/\([^)]+\)/, '').trim() : nameWithTicker
          
          // Extract performance numbers - look for percentage values
          const performanceText = match[3] ? match[3].trim() : ""
          const performanceMatch = performanceText.match(/([-+]?\d+\.?\d*)%/)
          const oneYearReturn = performanceMatch ? parseFloat(performanceMatch[1]) : 0
          
          // Extract expense ratio if present
          const expenseText = match[2] ? match[2].trim() : ""
          const expenseMatch = expenseText.match(/(\d+\.?\d*)%/)
          const expenseRatio = expenseMatch ? parseFloat(expenseMatch[1]) : 0
          
          products.push({
            name,
            ticker,
            provider: match[2] ? match[2].trim().replace(/\d+\.?\d*%/, '').trim() : "Unknown provider",
            performance: {
              oneYear: oneYearReturn,
              threeYear: 0,
              fiveYear: 0,
              sinceInception: 0
            },
            expenseRatio,
            category: match[4] ? match[4].trim() : "Uncategorized",
            description: "Investment product extracted from search results."
          })
        }
        
        return products
      }
    }
    
    return []
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    setInput('')
    setLastQuestion(userMessage)
    
    setLoading(true)

    try {
      const response = await apiRequest('/api/chat/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: data.explanation || "I've found some product information for you." 
      }
      
      setMessages([assistantMessage])
      
      const products = processApiResponse(data, userMessage)
      setProductResults(products.slice(0, 3))
      
    } catch (error) {
      setMessages([{ 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request. Please try again with a different question.' 
      }])
      setProductResults([])
    } finally {
      setLoading(false)
    }
  }

  const processAudioRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log("No audio chunks recorded")
      return
    }
    
    console.log(`Processing ${audioChunksRef.current.length} audio chunks`)
    
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
    console.log(`Created audio blob of size: ${audioBlob.size} bytes`)
    
    setLoading(true)

    try {
      const formData = new FormData()
      const extension = mimeType.split('/')[1] || 'webm'
      formData.append('file', audioBlob, `recording.${extension}`)
      console.log(`Sending audio file as recording.${extension}`)

      const response = await apiRequest('/api/voice-chat/products', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.transcription) {
        setLastQuestion(data.transcription)
        toast({
          title: "Voice transcription",
          description: data.transcription
        })
      }
      
      if (data.explanation) {
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: data.explanation
        }
        setMessages([assistantMessage])
      }
      
      const products = processApiResponse(data, data.transcription || "")
      setProductResults(products.slice(0, 3))
      
    } catch (error) {
      setMessages([{ 
        role: 'assistant', 
        content: 'Sorry, I had trouble processing your voice input. Could you try again or type your question?' 
      }])
      setProductResults([])
      toast({
        variant: "destructive",
        title: "Voice processing error",
        description: "We couldn't process your voice input. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

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
        
        await processAudioRecording()
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      
      toast({
        title: "Recording started",
        description: "Speak your investment product query clearly."
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
        description: "Processing your voice query..."
      })
    }
  }

  const handleSampleQuestion = (question: string) => {
    setInput(question)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const clearChat = () => {
    setMessages([])
    setProductResults([])
    setLastQuestion("")
  }

  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
  }

  const formatPerformance = (value: number) => {
    const color = value >= 0 ? 'text-green-600' : 'text-red-600'
    return <span className={color}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</span>
  }

  // Render loading state
  const renderLoading = () => (
    <div className="mx-auto max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ChevronLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="flex items-center gap-1">
          Dashboard
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="mb-8 text-center">
        <Badge className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-2 border-0">
          AI assistant
        </Badge>
        <h1 className="text-3xl font-bold mb-2">Search for investment product ideas</h1>
      </div>
      
      <Card className="min-h-[400px] shadow-sm border border-border/40">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-7 w-7 text-primary/70" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>
            
            <div className="max-w-md">
              <h3 className="text-lg font-medium mb-2">Finding investment products for you...</h3>
              <p className="text-sm text-muted-foreground mb-6">
                I'm searching for the best products matching your criteria and analyzing their performance.
              </p>
              
              <div className="space-y-1 w-64 mx-auto">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Searching product database</span>
                  <span>{Math.min(loadingProgress, 100)}%</span>
                </div>
                <Progress value={loadingProgress} className="h-1.5" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render combined results
  const renderResults = () => {
    // Combine messages and product results in one view
    const hasContent = messages.length > 0 || productResults.length > 0
    
    if (!hasContent) {
      return null
    }
    
    return (
      <Card className="min-h-[400px] shadow-sm border border-border/40">
        <CardHeader className="border-b bg-muted/30 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {lastQuestion ? (
                <span className="text-base font-medium">Results for: <span className="italic">{lastQuestion}</span></span>
              ) : (
                "Investment Analysis"
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-6">
            {/* AI Explanation */}
            {messages.length > 0 && messages[0].role === 'assistant' && (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>
                  {messages[0].content}
                </ReactMarkdown>
              </div>
            )}
            
            {/* Product Results */}
            {productResults.length > 0 && (
              <div className="space-y-4 mt-4">
                {productResults.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-base font-medium mb-3 flex items-center gap-1.5">
                      <Search className="h-4 w-4 text-primary" />
                      Matching investment products
                    </h3>
                    
                    <div className="grid gap-4">
                      {productResults.map((product, index) => (
                        <div 
                          key={index} 
                          className="p-4 border rounded-lg hover:shadow-sm transition-shadow bg-muted/5"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{product.name}</h4>
                                <Badge variant="outline" className="text-xs font-normal">
                                  {product.ticker}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{product.provider} • {product.category}</p>
                            </div>
                            
                            <div className="text-sm text-right">
                              <div className="mb-1">
                                <span className="text-muted-foreground mr-2">1 Year:</span>
                                {formatPerformance(product.performance.oneYear)}
                              </div>
                              <div>
                                <span className="text-muted-foreground mr-2">Expense:</span>
                                {product.expenseRatio.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm mt-2">{product.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // If loading, only show the loading state
  if (loading) {
    return renderLoading()
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ChevronLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="flex items-center gap-1">
          Dashboard
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="mb-8 text-center">
        <Badge className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-2 border-0">
          AI assistant
        </Badge>
        <h1 className="text-3xl font-bold mb-2">Search for investment product ideas</h1>
      </div>
      
      <div className="mb-8">
        <form onSubmit={handleSubmit} className="flex w-full max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about investment products..."
              className="pl-10 py-6 text-base"
              disabled={loading || isRecording}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading || isRecording || !input.trim()} 
            className="ml-2 bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            className={`ml-2 ${isRecording ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
            size="icon"
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
      </div>

      {/* Only show sample questions if we don't have results yet */}
      {(messages.length === 0 && productResults.length === 0) && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {sampleQuestions.map((question, index) => (
            <Badge 
              key={index}
              variant="outline" 
              className="py-2 px-4 cursor-pointer hover:bg-muted/50 transition-colors text-sm"
              onClick={() => handleSampleQuestion(question)}
            >
              {question}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Render results if available */}
      {(messages.length > 0 || productResults.length > 0) && renderResults()}
      
      <div className="text-center text-xs text-muted-foreground mt-8">
        AI can make mistakes. Please double check important information.
      </div>
    </div>
  )
}