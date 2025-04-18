import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ChevronLeft } from 'lucide-react'

const screeningQuestions = [
  {
    id: 'financial_stability',
    question: "Are you currently facing any significant financial challenges, such as difficulty paying bills or high levels of debt?",
    options: [
      { value: "A", label: "No, I am financially stable" },
      { value: "B", label: "I have some challenges, but overall I am not in financial distress" },
      { value: "C", label: "Yes, I am facing significant financial difficulties" }
    ],
    disqualifyingValues: ["C"]
  },
  {
    id: 'investment_objective',
    question: "What is your primary goal for using this app?",
    options: [
      { value: "A", label: "To build long-term wealth" },
      { value: "B", label: "To engage in speculative trading, such as with cryptocurrencies" },
      { value: "C", label: "I'm not sure yet and need guidance" }
    ],
    disqualifyingValues: ["B"]
  },
  {
    id: 'product_preference',
    question: "Which types of investments interest you the most?",
    options: [
      { value: "A", label: "Simple, affordable, diversified investment options" },
      { value: "B", label: "Cryptocurrencies" },
      { value: "C", label: "Exotic investment products like hedge funds & options" },
      { value: "D", label: "I would value coaching on this front" }
    ],
    disqualifyingValues: ["B", "C"]
  },
  {
    id: 'financial_literacy',
    question: "How would you rate your general understanding of managing your finances?",
    options: [
      { value: "A", label: "I have a basic understanding of finance and would value simple, straightforward, affordable guidance" },
      { value: "B", label: "I have a reasonable understanding and can handle some market fluctuations" },
      { value: "C", label: "I have no experience or understanding of managing my finances" }
    ],
    disqualifyingValues: ["C"]
  }
]

export default function Screening() {
  const navigate = useNavigate()
  const [showIntro, setShowIntro] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [selectedValue, setSelectedValue] = useState('')

  const currentQuestion = screeningQuestions[currentStep]

  const handleBack = () => {
    navigate(-1)
  }

  const handleAnswer = (answer: string) => {
    if (currentQuestion.disqualifyingValues.includes(answer)) {
      setIsDisqualified(true)
      return
    }

    if (currentStep < screeningQuestions.length - 1) {
      setSelectedValue('')
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/signup')
    }
  }

  if (showIntro) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <CardHeader className="pt-16 text-center">
            <CardTitle className="text-2xl font-montserrat">
              Is this the right app for you?
            </CardTitle>
            <CardDescription>
              A quick check to make sure we can help you with your finances
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <ul className="space-y-2 list-disc pl-4 text-muted-foreground">
                  <li>Just 4 quick questions</li>
                  <li>Takes about 2 minutes</li>
                  <li>Helps match our service to your needs</li>
                </ul>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => setShowIntro(false)} 
              className="px-8"
            >
              Get started
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isDisqualified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-montserrat">
              Thank you for your interest
            </CardTitle>
            <CardDescription className="text-left">
              Based on your responses, we recommend working with a financial professional
              to address your immediate financial needs before using our automated service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <CardHeader className="pt-16 text-center">
          <CardTitle className="text-2xl font-montserrat">
            Financial profile
          </CardTitle>
          <CardDescription>
            Step {currentStep + 1} of {screeningQuestions.length}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <p className="text-foreground text-base">{currentQuestion.question}</p>
            <RadioGroup
              value={selectedValue}
              onValueChange={(value) => {
                setSelectedValue(value)
                handleAnswer(value)
              }}
              className="space-y-4"
            >
              {currentQuestion.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={option.value}
                    id={`${currentQuestion.id}-${option.value}`}
                  />
                  <Label 
                    htmlFor={`${currentQuestion.id}-${option.value}`}
                    className="text-sm"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
