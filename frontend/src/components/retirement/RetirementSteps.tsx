import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CheckSquare, 
  LineChart, 
  Lightbulb, 
  GitBranch,
  ArrowRight 
} from "lucide-react"
import { useNavigate } from 'react-router-dom'
import { Progress } from "@/components/ui/progress"

interface StepProps {
  title: string
  description: string
  icon: React.ReactNode
  status: 'completed' | 'in-progress' | 'pending'
  progress?: number
  path: string
}

const Step = ({ title, description, icon, status, progress, path }: StepProps) => {
  const navigate = useNavigate()
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'in-progress':
        return 'text-blue-500'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={() => navigate(path)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className={getStatusColor()}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {progress !== undefined && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}
        <div className="flex items-center gap-2 mt-4 text-sm font-medium">
          <span>View details</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function RetirementSteps() {
  const steps: StepProps[] = [
    {
      title: "Retirement checklist",
      description: "Review your retirement readiness and complete key planning steps",
      icon: <CheckSquare className="h-5 w-5" />,
      status: 'completed',
      progress: 100,
      path: "/retirement"
    },
    {
      title: "Current plan",
      description: "View your projected retirement income and savings trajectory",
      icon: <LineChart className="h-5 w-5" />,
      status: 'in-progress',
      progress: 60,
      path: "/retirement/current-plan"
    },
    {
      title: "Recommendations",
      description: "Get personalized investment and planning recommendations",
      icon: <Lightbulb className="h-5 w-5" />,
      status: 'in-progress',
      progress: 30,
      path: "/retirement/recommendations"
    },
    {
      title: "What-if scenarios",
      description: "Explore different retirement scenarios and their impacts",
      icon: <GitBranch className="h-5 w-5" />,
      status: 'pending',
      path: "/retirement/what-if"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {steps.map((step, index) => (
        <Step key={index} {...step} />
      ))}
    </div>
  )
} 