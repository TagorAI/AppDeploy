import { Button } from "@/components/ui/button"
import { useNavigate } from 'react-router-dom'
import { Construction, ChevronLeft, Lightbulb, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

export default function Feedback() {
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState("")
  const [submitted, setSubmitted] = useState(false)
  
  const handleSubmit = () => {
    // In a real implementation, you would send this feedback to your backend
    console.log("Feedback submitted:", feedback)
    setSubmitted(true)
    // Reset after 3 seconds
    setTimeout(() => {
      setFeedback("")
      setSubmitted(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-8"
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <Construction className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-montserrat font-bold text-foreground mb-4">
              Coming Soon & Feature Feedback
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're working on several exciting features to help you better manage your finances. 
              Your feedback helps us prioritize what matters most to you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card>
              <CardHeader>
                <CardTitle>Budget Management</CardTitle>
                <CardDescription>
                  Set personalized budgets that work with your lifestyle and track your spending against them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                  <li>Create custom budget categories</li>
                  <li>Set spending limits per category</li>
                  <li>Get alerts when approaching limits</li>
                  <li>See monthly spending trends</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Expense Tracking</CardTitle>
                <CardDescription>
                  Easily track your spending and understand where your money goes each month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                  <li>Categorize your transactions automatically</li>
                  <li>Visual breakdown of spending patterns</li>
                  <li>Identify opportunities to save</li>
                  <li>Set monthly spending goals</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bill Management</CardTitle>
                <CardDescription>
                  Never miss a payment with integrated bill tracking and reminders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                  <li>Add recurring bills with due dates</li>
                  <li>Get payment reminders</li>
                  <li>Track payment history</li>
                  <li>Optimize payment schedules</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Financial Goals</CardTitle>
                <CardDescription>
                  Set achievable financial goals and track your progress toward them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                  <li>Create specific, measurable goals</li>
                  <li>Track progress with visual indicators</li>
                  <li>Get personalized tips to reach goals faster</li>
                  <li>Celebrate milestones along the way</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center gap-4">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Share Your Thoughts</CardTitle>
                <CardDescription>
                  Which features would you like to see first? Do you have any suggestions?
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="I'd love to see..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[120px]"
                />
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!feedback.trim() || submitted}
                >
                  {submitted ? "Thank you for your feedback!" : "Submit Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Lightbulb className="h-5 w-5" />
            <p className="text-sm">Your feedback directly influences our development priorities.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 