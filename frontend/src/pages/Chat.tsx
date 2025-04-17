import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, ChevronLeft, ChevronRight, Mic, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from "@/components/ui/use-toast"

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await apiRequest('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage })
      })

      if (!response.ok) throw new Error('Failed to send message')
      
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setLoading(false)
    }
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
        description: "Speak your question clearly."
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
    
    setLoading(true)

    try {
      const formData = new FormData()
      const extension = mimeType.split('/')[1] || 'webm'
      formData.append('file', audioBlob, `recording.${extension}`)
      console.log(`Sending audio file as recording.${extension}`)

      const response = await apiRequest('/api/voice-chat', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.transcription) {
        setMessages(prev => [...prev, { role: 'user', content: data.transcription }])
        toast({
          title: "Voice transcription",
          description: data.transcription
        })
      }
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
      
    } catch (error) {
      console.error('Voice chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I had trouble processing your voice input. Could you try again or type your question?' 
      }])
      toast({
        variant: "destructive",
        title: "Voice processing error",
        description: "We couldn't process your voice input. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
  }

  const sampleQuestions = [
    "Can you explain TFSA vs RRSP?",
    "What's an FHSA?"
  ]

  const handleSampleQuestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
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
        <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full mb-2">
          AI assistant
        </span>
        <h1 className="text-3xl font-bold">Get your financial questions answered</h1>
      </div>
      
      <div className="text-center mb-6">
        <div className="flex justify-center gap-2">
          {sampleQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSampleQuestion(question)}
              className="text-sm px-4 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <Card className="h-[440px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <ReactMarkdown className="prose dark:prose-invert max-w-none">
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={loading || isRecording}
            />
            
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`${isRecording ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
              size="icon"
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button type="submit" disabled={loading || isRecording || !input.trim()}>
              {loading ? (
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
        </div>
      </Card>
      
      {/* Disclaimer Footnote */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        AI can make mistakes. Please check important information.
      </div>
    </div>
  )
} 