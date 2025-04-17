import { useNavigate, Link } from 'react-router-dom'
import { Info } from 'lucide-react'

/**
 * Welcome page component that serves as the landing page for the AI Financial Advisor
 * Displays a welcome message and an enter button that navigates to the login page
 */
export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col relative">
      {/* Enhanced Beta Badge */}
      <div className="absolute top-4 right-4">
        <span 
          className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full border border-blue-200 cursor-help"
          title="Early access version. We're still polishing things, so your feedback is valuable! Try it out, but expect a few bumps along the way."
        >
          Beta
        </span>
      </div>

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-montserrat font-bold text-foreground">
          Welcome to your AI financial coach
        </h1>
        <p className="text-sm text-muted-foreground font-semibold">
          Simple  •  Personalized  •  Private
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg 
                     font-montserrat hover:opacity-90 transition-opacity"
        >
          Enter →
        </button>
      </div>

      {/* Enhanced About Link */}
      <div className="absolute bottom-12 text-center">
        <Link 
          to="/about" 
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors group"
        >
          <Info className="h-4 w-4 group-hover:text-blue-600" />
          <span>Learn how it works</span>
        </Link>
      </div>

      {/* Updated Footer */}
      <footer className="absolute bottom-4 text-gray-500 text-sm text-center">
        <div className="flex items-center justify-center gap-1.5">
          Advice Intelligence ™ Tagor AI Inc. 2025  •  Built for Canadians  •  Made in Canada with <span className="text-red-500">❤️</span> <span className="text-red-500">🍁</span>
        </div>
      </footer>
    </div>
  )
}