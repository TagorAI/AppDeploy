import { Button } from "@/components/ui/button"
import { useNavigate } from 'react-router-dom'
import { Construction } from 'lucide-react'

export default function ComingSoon() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-8"
        >
          ← Back
        </Button>

        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          <Construction className="h-16 w-16 text-primary" />
          <h1 className="text-4xl font-montserrat font-bold text-foreground">
            Coming soon
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            We're working hard to bring you this feature. Check back soon for updates!
          </p>
        </div>
      </div>
    </div>
  )
} 