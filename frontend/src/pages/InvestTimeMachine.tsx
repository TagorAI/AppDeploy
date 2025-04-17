import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  TimerReset,
  DollarSign,
  HomeIcon,
  Briefcase,
  ShoppingBag
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

// Define interface for time machine response
interface TimeMachineResponse {
  status: string;
  analysis_type: "future";
  decision_description: string;
  decision_amount: number;
  analysis: string;
}

// Decision types and options
const decisionTypes = [
  { id: "home", label: "Buy a Home", icon: <HomeIcon className="h-4 w-4" /> },
  { id: "invest", label: "Invest", icon: <Briefcase className="h-4 w-4" /> },
  { id: "purchase", label: "Other Purchase", icon: <ShoppingBag className="h-4 w-4" /> }
];

export default function InvestTimeMachine() {
  const navigate = useNavigate()
  const { apiRequest } = useAuth()
  const { toast } = useToast()
  
  // Form state
  const [decisionType, setDecisionType] = useState<string>("invest")
  const [description, setDescription] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [timeframeYears, setTimeframeYears] = useState<number>(10)
  
  // Analysis state
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TimeMachineResponse | null>(null)
  
  // Prepare submission data
  const prepareSubmissionData = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid dollar amount"
      })
      return null
    }
    
    if (!description) {
      const defaultDescriptions = {
        "home": "purchasing a home",
        "invest": "investing in a new opportunity",
        "purchase": "making a major purchase"
      }
      
      setDescription(defaultDescriptions[decisionType] || "making a financial decision")
    }
    
    return {
      decision_description: description || `${decisionType === 'home' ? 'buying a home' : 
                                          decisionType === 'invest' ? 'investing in a new opportunity' : 
                                          'making a major purchase'}`,
      decision_amount: parseFloat(amount.replace(/,/g, '')),
      timeframe_years: timeframeYears
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = prepareSubmissionData()
    if (!data) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiRequest('/api/investments/timemachine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to process time machine analysis')
      }
      
      const resultData = await response.json()
      setResult(resultData)
      
      toast({
        title: "Analysis complete", 
        description: "Your financial decision analysis is ready"
      })
    } catch (error) {
      console.error('Time machine error:', error)
      setError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }
  
  // Example decision presets
  const examples = [
    {
      type: "home",
      description: "buying a home for my family",
      amount: "500000"
    },
    {
      type: "invest",
      description: "investing in a rental property",
      amount: "300000"
    },
    {
      type: "purchase",
      description: "buying a luxury car",
      amount: "80000"
    }
  ]
  
  const handleExampleSelection = (example: any) => {
    setDecisionType(example.type)
    setDescription(example.description)
    setAmount(example.amount)
    
    toast({
      title: "Example loaded",
      description: "You can adjust the details before analyzing"
    })
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(value)
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
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
          <span className="inline-block bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 text-sm font-medium px-3 py-1 rounded-full mb-2">
            <TimerReset className="h-3.5 w-3.5 inline-block mr-1.5" />
            Decision Analyzer
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Financial Decision Time Machine</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See if your financial decision makes sense compared to investing in the market
          </p>
        </div>
      </div>
      
      {!result ? (
        <Card className="border-2 border-black/10 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TimerReset className="h-5 w-5 text-purple-500" />
              What financial decision are you considering?
            </CardTitle>
            <CardDescription>
              Let's analyze if your decision makes financial sense compared to investing
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Decision Type Selection */}
              <div className="space-y-2">
                <Label>What type of decision are you considering?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {decisionTypes.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      variant={decisionType === type.id ? "secondary" : "outline"}
                      className={`h-16 flex flex-col items-center justify-center gap-1 ${
                        decisionType === type.id ? "border-2 border-purple-500" : ""
                      }`}
                      onClick={() => setDecisionType(type.id)}
                    >
                      <div className={`p-1.5 rounded-full ${
                        decisionType === type.id ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-muted"
                      }`}>
                        {type.icon}
                      </div>
                      <span>{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">What specifically are you considering?</Label>
                <Textarea
                  id="description"
                  placeholder={
                    decisionType === "home" ? "e.g., buying a new house in Toronto" : 
                    decisionType === "invest" ? "e.g., investing in dividend stocks" : 
                    "e.g., buying a new car"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">How much will this cost?</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount (e.g., 500,000)"
                    value={amount}
                    onChange={(e) => {
                      // Allow only numbers and commas
                      const value = e.target.value.replace(/[^0-9,]/g, '')
                      setAmount(value)
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Timeframe */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="timeframe">How far into the future do you want to look?</Label>
                  <span className="text-sm text-muted-foreground">{timeframeYears} years</span>
                </div>
                <Slider
                  id="timeframe"
                  value={[timeframeYears]}
                  min={5}
                  max={30}
                  step={5}
                  onValueChange={(value) => setTimeframeYears(value[0])}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 years</span>
                  <span>15 years</span>
                  <span>30 years</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading || !amount}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TimerReset className="h-4 w-4" />
                      Analyze My Decision
                    </>
                  )}
                </Button>
              </div>
              
              {/* Quick Examples */}
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Or try one of these examples:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {examples.map((example, i) => (
                    <Button
                      key={`example-${i}`}
                      type="button"
                      variant="outline"
                      className="justify-start text-left h-auto py-3"
                      onClick={() => handleExampleSelection(example)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {example.type === "home" ? <HomeIcon className="h-3.5 w-3.5 text-purple-600" /> :
                           example.type === "invest" ? <Briefcase className="h-3.5 w-3.5 text-purple-600" /> :
                           <ShoppingBag className="h-3.5 w-3.5 text-purple-600" />}
                          <span className="font-medium">{example.description}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(parseFloat(example.amount.replace(/,/g, '')))}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-black/10 dark:border-white/10">
          <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-black">
            <CardTitle className="flex items-center gap-2">
              <TimerReset className="h-5 w-5 text-purple-500" />
              Financial Decision Analysis
            </CardTitle>
            <CardDescription>
              {`Analysis of ${result.decision_description} for ${formatCurrency(result.decision_amount)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ScrollArea className="h-[600px]">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-5">
                  <h3 className="text-base font-medium mb-1 flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <TimerReset className="h-4 w-4" />
                    Decision Analysis
                  </h3>
                  <p className="text-sm text-purple-700/80 dark:text-purple-400/80">
                    Here's how your decision compares to investing the same amount in the S&P 500
                  </p>
                </div>
                
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
                      <blockquote className="border-l-4 border-purple-200 pl-4 my-4 italic" {...props} />
                    ),
                    code: ({node, ...props}) => (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />
                    ),
                    a: ({node, ...props}) => (
                      <a className="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                  }}
                >
                  {result.analysis}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="pt-2 pb-6 flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => {
                setResult(null);
                setDescription("");
                setAmount("");
              }}
              className="text-sm"
            >
              Analyze Another Decision
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mt-8 text-center text-xs text-muted-foreground">
        This analysis is for educational purposes only. Past market performance doesn't guarantee future results.
      </div>
    </div>
  )
}