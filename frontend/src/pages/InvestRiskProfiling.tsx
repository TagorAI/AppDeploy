import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Question {
  id: number
  text: string
  options: {
    A: string
    B: string
    C: string
  }
}

const RISK_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "When you think about your money, what matters most to you?",
    options: {
      A: "I want to protect what I have, even if it means smaller gains",
      B: "I want a balance of safety and growth",
      C: "I want to grow my money as much as possible, even if that means taking risks"
    }
  },
  {
    id: 2,
    text: "If your investments dropped by 10% very quickly, how would you react?",
    options: {
      A: "I'd feel very worried and might take my money out",
      B: "I'd be concerned but would likely wait to see if things get better",
      C: "I'd see it as a chance to invest more"
    }
  },
  {
    id: 3,
    text: "How long do you plan to invest your money?",
    options: {
      A: "I need access to my money soon – within about 3 years",
      B: "I can leave my money invested for about 3 to 5 years",
      C: "I plan to invest for more than 5 years"
    }
  },
  {
    id: 4,
    text: "How involved do you want to be with your investments?",
    options: {
      A: "I prefer a hands-off approach and would rather have someone else manage them",
      B: "I'd like to check in every now and then",
      C: "I enjoy actively reviewing and adjusting my investments"
    }
  },
  {
    id: 5,
    text: "How comfortable are you with taking risks to try to earn higher returns?",
    options: {
      A: "I prefer to keep risks very low, even if it means smaller rewards",
      B: "I'm willing to take some risk if it could mean better returns",
      C: "I'm comfortable with higher risks for the chance of much bigger rewards"
    }
  }
]

export default function InvestRiskProfiling() {
  const navigate = useNavigate()
  const { isAuthenticated, apiRequest } = useAuth()
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [riskProfile, setRiskProfile] = useState("")
  const [currentProfile, setCurrentProfile] = useState("")

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      // This is handled by the ProtectedLayout, but added as a safety measure
      return
    }
  }, [isAuthenticated])

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== RISK_QUESTIONS.length) {
      alert("Please answer all questions before submitting.")
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest("/api/investment/risk-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ answers })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit risk profile: ${response.status}`)
      }

      const data = await response.json()
      setRiskProfile(data.risk_profile)
      setCurrentProfile(data.current_profile || "Not set")
      setShowResult(true)
    } catch (error) {
      console.error("Error submitting risk profile:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    setShowResult(false)
    navigate("/grow-investments")
  }

  return (
    <main className="container mx-auto py-8 px-4">
      {/* Navigation Buttons - Aligned with InvestLanding.tsx */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={() => navigate('/grow-investments')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Grow Investments
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Badge and title centered - Aligned with InvestLanding.tsx */}
        <div className="text-center mb-6">
          <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
            Grow investments
          </span>
          <h1 className="text-3xl font-montserrat font-bold">
            Investment Risk Profiling
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Help us understand your investment style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {RISK_QUESTIONS.map((question) => (
                <div key={question.id} className="space-y-3">
                  <h3 className="font-medium">{question.text}</h3>
                  <Select
                    value={answers[question.id] || ""}
                    onValueChange={(value) => 
                      setAnswers(prev => ({ ...prev, [question.id]: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an answer" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(question.options).map(([key, text]) => (
                        <SelectItem key={key} value={key}>
                          {text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length !== RISK_QUESTIONS.length || loading}
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Dialog */}
        <Dialog open={showResult} onOpenChange={setShowResult}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your Investment Risk Profile</DialogTitle>
              <DialogDescription>
                Based on your answers, we've determined your risk profile.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Previous profile</p>
                  <p className="text-lg font-medium capitalize">{currentProfile}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New profile</p>
                  <p className="text-lg font-medium capitalize">{riskProfile}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleConfirm}>
                Continue to dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
