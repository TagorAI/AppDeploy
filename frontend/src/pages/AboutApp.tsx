import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  ChevronRight, 
  Lightbulb, 
  PiggyBank,
  TrendingUp,
  Shield,
  ChevronLeft,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle,
  Coffee,
  Clock,
  Lock,
  Eye,
  CreditCard,
  DollarSign,
  LineChart
} from 'lucide-react'

export default function AboutApp() {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll to show sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Core features with consistent design for better visualization
  const coreFeatures = [
    {
      id: "snapshot",
      icon: <Eye className="h-6 w-6 text-blue-600" />,
      title: "Financial snapshot",
      description: "Get a complete picture of your finances at a glance — see what you have and where it's going.",
      imageSrc: "/static/financial-snapshot.png",
      color: "blue"
    },
    {
      id: "whatif",
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      title: "What-if scenarios",
      description: "Explore how different life and financial choices could affect your future.",
      imageSrc: "/static/what-if-analysis.png",
      color: "green"
    },
    {
      id: "investments",
      icon: <LineChart className="h-6 w-6 text-purple-600" />,
      title: "Investment ideas",
      description: "Discover investment options that align with your goals",
      imageSrc: "/static/investment-ideas.png",
      color: "purple"
    }
  ]

  // Core benefits - now aligned with the actual visual examples
  const coreBenefits = [
    {
      icon: <Lightbulb className="h-6 w-6 text-blue-600" />,
      color: "blue",
      title: "Simplified finance",
      description: "Jargon-free explanations in plain language you'll actually understand."
    },
    {
      icon: <PiggyBank className="h-6 w-6 text-green-600" />,
      color: "green",
      title: "Personalized guidance",
      description: "Tailored support that fits your life, not generic tips from a blog."
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-600" />,
      color: "purple",
      title: "Private financial space",
      description: "Your own confidential environment to explore finances with AI support."
    },
    {
      icon: <Clock className="h-6 w-6 text-amber-600" />,
      color: "amber",
      title: "Time-saving",
      description: "Get supportive financial coaching in minutes, not meetings."
    }
  ]

  // Steps with detailed information
  const steps = [
    {
      number: 1,
      title: "Setup your profile",
      description: "Answer a few simple questions about your finances and goals in under 5 minutes.",
      icon: <Calendar className="h-6 w-6 text-slate-700" />
    },
    {
      number: 2,
      title: "Financial snapshot",
      description: "Get a clear picture of where you stand today with your spending, saving, and investing.",
      icon: <BarChart2 className="h-6 w-6 text-slate-700" />
    },
    {
      number: 3,
      title: "Personalized guidance",
      description: "Receive supportive guidance tailored to your situation, written in simple language.",
      icon: <CheckCircle className="h-6 w-6 text-slate-700" />
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky header that appears on scroll */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-md py-3" : "bg-transparent py-4"
      }`}>
        <div className="container mx-auto px-4 max-w-6xl flex justify-between items-center">
          <div className="flex items-center">
            <Shield className={`h-6 w-6 mr-2 ${isScrolled ? "text-black" : "text-slate-700"}`} />
            <span className={`font-semibold ${isScrolled ? "text-black" : "text-slate-700"}`}>Tagor AI</span>
          </div>
          
          <Button 
            onClick={() => navigate('/login')}
            className={`${isScrolled 
              ? "bg-black text-white hover:bg-gray-800" 
              : "bg-black/90 text-white hover:bg-black"}`}
          >
            Get started
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {/* Navigation - back button is more subtle/understated */}
        <div className="container mx-auto px-4 max-w-6xl">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mt-4 hover:bg-slate-100 text-slate-500">
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
        </div>

        {/* Hero Section - more impactful, with clearer value proposition */}
        <div className="container mx-auto px-4 max-w-6xl py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-left">
              <div className="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Coffee className="h-4 w-4 mr-1" />
                <span>Made for Canadians</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-slate-800 leading-tight">
                Financial guidance<br />
                <span className="text-blue-600">Your money, your way.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-lg">
                AI-powered guidance that simplifies your finances. No jargon or confusing charts—just clear insights tailored to you.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => navigate('/login')}
                  size="lg"
                  className="bg-black text-white hover:bg-gray-800 px-8 py-6 text-lg"
                >
                  Start your journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const element = document.getElementById('features')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg"
                >
                  See how it works
                </Button>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl">
                <img 
                  src="/static/financial-snapshot.png" 
                  alt="Financial Snapshot Preview" 
                  className="w-full h-auto rounded-xl"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
                  <div className="p-6 text-white">
                    <h3 className="font-bold text-xl">Your complete financial picture</h3>
                    <p className="text-white/90">Understand your money at a glance</p>
                  </div>
                </div>
              </div>
              
              {/* Floating card for visual interest */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-lg shadow-lg p-4 max-w-xs">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium text-sm">Your investment growth</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-2">
                  <div className="h-2 bg-green-500 rounded-full w-3/4"></div>
                </div>
                <span className="text-xs text-gray-500">75% toward retirement goal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="bg-slate-50 py-6">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex justify-center items-center flex-wrap gap-x-12 gap-y-4">
              <div className="flex items-center">
                <Lock className="h-5 w-5 text-slate-700 mr-2" />
                <span className="text-sm font-medium text-slate-600">Your confidential space</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-slate-700 mr-2" />
                <span className="text-sm font-medium text-slate-600">Trust and privacy built-in</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-slate-700 mr-2" />
                <span className="text-sm font-medium text-slate-600">No hidden fees</span>
              </div>
              <div className="flex items-center">
                <PiggyBank className="h-5 w-5 text-slate-700 mr-2" />
                <span className="text-sm font-medium text-slate-600">Made for Canadians</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Featured Tools - Integrated with Benefits */}
        <div className="container mx-auto px-4 max-w-6xl py-20" id="features">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-800">Tools that work for you</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              For busy Canadians who want financial clarity without complexity
            </p>
          </div>
          
          {/* Integrated feature cards with visuals */}
          <div className="space-y-24">
            {coreFeatures.map((feature, index) => (
              <div key={feature.id} className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center`}>
                {/* Visual component - remove overlaid text */}
                <div className="md:w-1/2">
                  <div className="relative rounded-xl overflow-hidden shadow-xl">
                    <img 
                      src={feature.imageSrc} 
                      alt={feature.title} 
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                
                {/* Description component */}
                <div className="md:w-1/2 space-y-6">
                  <div className={`p-2 rounded-full w-12 h-12 flex items-center justify-center bg-${feature.color}-100`}>
                    {feature.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-800">{feature.title}</h3>
                  
                  <p className="text-lg text-slate-600">
                    {feature.description}
                  </p>
                  
                  {/* Feature-specific benefits */}
                  <div className="pt-4 space-y-4">
                    {feature.id === "snapshot" && (
                      <>
                        <div className="flex items-start">
                          <DollarSign className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-slate-600">See your full net worth and analysis</p>
                        </div>
                        <div className="flex items-start">
                          <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-slate-600">Track your emergency fund status</p>
                        </div>
                      </>
                    )}
                    
                    {feature.id === "whatif" && (
                      <>
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-slate-600">Test different retirement scenarios: changing careers, retiring early, or working longer</p>
                        </div>
                        <div className="flex items-start">
                          <BarChart2 className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-slate-600">Explore market downturns or housing purchases without risking a dime</p>
                        </div>
                      </>
                    )}
                    
                    {feature.id === "investments" && (
                      <>
                        <div className="flex items-start">
                          <PiggyBank className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-slate-600">Get investment ideas that match your preferences</p>
                        </div>
                        <div className="flex items-start">
                          <Shield className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-slate-600">Understand the why behind each idea in plain language</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us - Core Benefits */}
        <div className="bg-slate-50 py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-800">Why use the app</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Simple, personalized financial guidance in minutes, not meetings.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {coreBenefits.map((benefit, index) => (
                <Card key={index} className="border-none p-6 shadow-lg hover:shadow-xl transition-all duration-300 h-full bg-white">
                  <div className="flex flex-col h-full">
                    <div className={`bg-${benefit.color}-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4`}>
                      {benefit.icon}
                    </div>
                    
                    <h3 className="font-bold text-lg mb-3 text-slate-800">{benefit.title}</h3>
                    
                    <p className="text-slate-600 flex-grow">
                      {benefit.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works - now with more engaging visuals and clearer steps */}
        <div className="container mx-auto px-4 max-w-6xl py-20" id="how-it-works">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-800">How it works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple steps
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline connector */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-200 hidden md:block -translate-x-1/2"></div>
            
            <div className="space-y-16 md:space-y-0">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className={`flex flex-col md:flex-row ${index % 2 === 1 ? 'md:flex-row-reverse' : ''} items-center gap-8`}>
                    <div className="md:w-1/2 relative">
                      <div className="hidden md:block absolute top-5" style={{ 
                        left: index % 2 === 1 ? 'auto' : '-1.5rem', 
                        right: index % 2 === 1 ? '-1.5rem' : 'auto',
                        zIndex: 10 
                      }}>
                        <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center border-4 border-slate-200 shadow-md">
                          <span className="text-lg font-bold text-slate-700">{step.number}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="bg-slate-100 md:hidden rounded-full w-10 h-10 flex items-center justify-center">
                            <span className="font-bold text-slate-700">{step.number}</span>
                          </div>
                          
                          <h3 className="font-bold text-xl text-slate-800">{step.title}</h3>
                        </div>
                        
                        <p className="text-slate-600">{step.description}</p>
                      </div>
                    </div>
                    
                    <div className="md:w-1/2 flex justify-center">
                      {index === 0 && (
                        <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-sm relative">
                          <div className="absolute -top-3 -right-3 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                            Quick & simple
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Your financial goals</label>
                              <div className="h-8 bg-slate-100 rounded-md"></div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Current savings</label>
                              <div className="h-8 bg-slate-100 rounded-md"></div>
                            </div>
                            <div className="flex justify-end">
                              <div className="w-24 h-10 bg-black rounded-md flex items-center justify-center text-white text-xs font-medium">
                                Continue
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {index === 1 && (
                        <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-sm relative">
                          <div className="absolute -top-3 -right-3 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                            Clear overview
                          </div>
                          <div className="mb-4 pb-4 border-b border-slate-100">
                            <span className="text-xs text-slate-500">YOUR NET WORTH</span>
                            <div className="text-2xl font-bold">$124,580</div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Emergency fund</span>
                                <span className="font-medium">$12,000</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full">
                                <div className="h-2 bg-green-500 rounded-full w-full"></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Retirement</span>
                                <span className="font-medium">$89,450</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full">
                                <div className="h-2 bg-blue-500 rounded-full w-2/3"></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Debt</span>
                                <span className="font-medium">$23,130</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full">
                                <div className="h-2 bg-amber-500 rounded-full w-1/3"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {index === 2 && (
                        <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-sm relative">
                          <div className="absolute -top-3 -right-3 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                            Simple language
                          </div>
                          <div className="space-y-4">
                            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                              <h4 className="font-medium text-blue-800 mb-1">Emergency fund insight</h4>
                              <p className="text-sm text-blue-700">Add $250/month until you reach 6 months of expenses.</p>
                            </div>
                            
                            <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                              <h4 className="font-medium text-green-800 mb-1">Retirement strategy</h4>
                              <p className="text-sm text-green-700">Using your RRSP contribution room could save $2,350 in taxes this year.</p>
                            </div>                           
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA - more prominent and compelling */}
        <div className="bg-slate-900 py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center bg-blue-900/60 text-blue-200 px-3 py-1 rounded-full text-sm font-medium mb-4">
                BETA
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready for financial clarity?</h2>
              
              <Button 
                onClick={() => navigate('/login')}
                size="lg"
                className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg shadow-lg"
              >
                Start your journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}