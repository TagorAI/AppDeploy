import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  ExternalLink, 
  AlertCircle, 
  RefreshCw, 
  Newspaper, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  BarChart4,
  ArrowUpRight,
  Clock,
  Share2,
  CircleHelp,
  Loader2,
  PieChart,
  LineChart,
  Sparkles
} from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

interface NewsItem {
  title: string
  url: string
  time_published: string
  source: string
  summary: string
  overall_sentiment_label?: string
  ticker_sentiment?: Array<{
    ticker: string
    ticker_sentiment_label: string
  }>
}

interface NewsResponse {
  status: string
  message: string
  summary: string | null
  news_items: NewsItem[]
}

export default function InvestNews() {
  const navigate = useNavigate()
  const { isAuthenticated, apiRequest } = useAuth()
  const [newsData, setNewsData] = useState<NewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Fetching your personalized news...')

  const loadingMessages = [
    'Scanning the markets for your portfolio...',
    'Analyzing recent financial headlines...',
    'Finding relevant updates for your investments...',
    'Filtering noise from valuable signals...',
    'Calculating sentiment for your holdings...',
    'Preparing your personalized news summary...'
  ]

  const fetchNews = async () => {
    if (!isAuthenticated) return
    
    try {
      setLoading(true)
      // Start the loading animation
      setLoadingProgress(0)
      let messageIndex = 0
      setLoadingMessage(loadingMessages[0])
      
      // Simulate progress while the API call is happening
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          // Cap at 90% until we actually get data
          const newProgress = prev + (Math.random() * 15)
          if (newProgress >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          
          // Change message occasionally
          if (newProgress > (messageIndex + 1) * 15 && messageIndex < loadingMessages.length - 1) {
            messageIndex++
            setLoadingMessage(loadingMessages[messageIndex])
          }
          
          return newProgress
        })
      }, 700)
      
      const response = await apiRequest('/api/investments/news')
      
      clearInterval(progressInterval)
      setLoadingProgress(100)
      
      if (!response.ok) {
        throw new Error('Failed to fetch investment news')
      }
      
      const data = await response.json()
      // Slight delay to show 100% completion
      setTimeout(() => {
        setNewsData(data)
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error('Error fetching investment news:', error)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNews()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchNews()
  }, [isAuthenticated, apiRequest])

  const formatPublishedDate = (dateString: string) => {
    if (!dateString || dateString.length < 8) return 'Unknown date'
    
    try {
      // Format from YYYYMMDDTHHMMSS to readable date
      const year = dateString.slice(0, 4)
      const month = dateString.slice(4, 6)
      const day = dateString.slice(6, 8)
      
      let time = ''
      if (dateString.length > 8) {
        const hour = dateString.slice(9, 11)
        const minute = dateString.slice(11, 13)
        time = ` at ${hour}:${minute}`
      }
      
      return format(new Date(`${year}-${month}-${day}`), 'MMM d, yyyy') + time
    } catch (e) {
      return 'Unknown date'
    }
  }

  const getSentimentIcon = (sentiment?: string) => {
    if (!sentiment) return null
    
    switch(sentiment.toLowerCase()) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />
      case 'somewhat-bullish':
        return <TrendingUp className="h-4 w-4 text-emerald-400" />
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-rose-500" />
      case 'somewhat-bearish':
        return <TrendingDown className="h-4 w-4 text-rose-400" />
      default:
        return <BarChart4 className="h-4 w-4 text-gray-500" />
    }
  }

  const getSentimentVariant = (sentiment: string): "default" | "outline" | "secondary" | "destructive" | null => {
    switch (sentiment.toLowerCase()) {
      case "bullish":
        return "default";
      case "somewhat-bullish":
        return "secondary";
      case "bearish":
        return "destructive";
      case "somewhat-bearish":
        return "outline";
      default:
        return null;
    }
  }
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      case 'somewhat-bullish':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200'
      case 'neutral':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'somewhat-bearish':
        return 'bg-rose-50 text-rose-600 border-rose-200'
      case 'bearish':
        return 'bg-rose-100 text-rose-700 border-rose-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
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
            onClick={() => navigate('/dashboard/investments/upload')}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            Upload investments
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center mb-10 mt-10">
          <Badge variant="outline" className="mb-2 font-medium px-3 py-1 text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800/30 dark:text-indigo-400">
            <BarChart4 className="h-3.5 w-3.5 mr-1.5 inline-block" />
            Investment insights
          </Badge>
          <h1 className="text-3xl font-bold mb-3">Market pulse</h1>
          
          <div className="w-full max-w-md mx-auto mt-8">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{loadingMessage}</div>
              <div className="text-xs text-muted-foreground">{Math.round(loadingProgress)}%</div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-6">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-violet-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            
            <div className="flex justify-center items-center space-x-2 mt-4 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm text-muted-foreground italic">This might take a moment...</span>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We're analyzing market data relevant to your portfolio to provide you with personalized insights
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6 max-w-4xl mx-auto mt-12 opacity-40">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!newsData) {
    return (
      <div className="container mx-auto py-8 px-4">
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
            onClick={() => navigate('/dashboard/investments/upload')}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            Upload investments
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-2 font-medium px-3 py-1 text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800/30 dark:text-indigo-400">
            <BarChart4 className="h-3.5 w-3.5 mr-1.5 inline-block" />
            Investment insights
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Market pulse</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            News and analysis for your portfolio
          </p>
        </div>
        
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load news</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't retrieve investment news at this time. Please try again later.
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => fetchNews()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Try again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
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
          onClick={() => navigate('/dashboard/investments/upload')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Upload investments
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="text-center mb-6">
        <Badge variant="outline" className="mb-2 font-medium px-3 py-1 text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800/30 dark:text-indigo-400">
          <BarChart4 className="h-3.5 w-3.5 mr-1.5 inline-block" />
          Investment insights
        </Badge>
        <h1 className="text-3xl font-bold mb-2">The latest news impacting your portfolio</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Market insights tailored to what you own
        </p>
      </div>
      
      <div className="flex justify-center mb-8">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="flex items-center gap-2 shadow-sm hover:shadow transition-all border-indigo-200 hover:border-indigo-300"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} text-indigo-600`} />
                {refreshing ? 'Refreshing...' : 'Get latest updates'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Check for the most recent market news</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {newsData.status === 'no_holdings' && (
        <Alert className="mb-8 max-w-2xl mx-auto border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/30">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-400 font-medium text-base">No investments found</AlertTitle>
          <AlertDescription className="mt-2 text-amber-700 dark:text-amber-300/80">
            We need to know what you own to show relevant news. Upload your investment statements to get personalized updates.
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/investments/upload')}
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
              >
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                Upload investments
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {newsData.status === 'no_tickers' && (
        <Alert className="mb-8 max-w-2xl mx-auto border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/30">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-400 font-medium text-base">Missing ticker symbols</AlertTitle>
          <AlertDescription className="mt-2 text-amber-700 dark:text-amber-300/80">
            Your investments need ticker symbols for us to find relevant news. Please update your holdings.
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard/investments/holdings')}
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
              >
                Edit holdings
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {newsData.status === 'no_news' && (
        <Alert className="mb-8 max-w-2xl mx-auto">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <AlertTitle>No recent news found</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't find any recent news for your investments. Check back later for updates.
          </AlertDescription>
        </Alert>
      )}
      
      {newsData.status === 'success' && (
        <Tabs defaultValue="summary" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="grid min-w-[300px] grid-cols-2 shadow-md">
              <TabsTrigger value="summary" className="rounded-l-md">
                <div className="flex items-center gap-2 py-1">
                  <Newspaper className="h-4 w-4" />
                  <span>AI summary</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="articles" className="rounded-r-md">
                <div className="flex items-center gap-2 py-1">
                  <ExternalLink className="h-4 w-4" />
                  <span>All articles</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="summary">
            <Card className="border-border/40 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden max-w-4xl mx-auto">
              <div className="h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-300"></div>
              <CardHeader className="pb-2 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <CircleHelp className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="text-xs max-w-xs">This summary is generated by AI based on recent news articles relevant to your holdings</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="pt-5 px-6 md:px-8">
                {newsData.summary ? (
                  <div className="prose prose-slate dark:prose-invert prose-headings:font-medium max-w-none">
                    <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4 border-l-4 border-indigo-500">
                      <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-1"># Market update highlights</h3>
                      <p className="text-sm text-indigo-600/90 dark:text-indigo-300/90">Personalized insights based on your holdings</p>
                    </div>
                    
                    {newsData.summary.split('\n\n').map((paragraph, index) => {
                      // Extract stock symbols using regex (assumes symbols are 1-5 capital letters, sometimes preceded by a currency symbol)
                      const symbolPattern = /\b(\$?[A-Z]{1,5})\b(?!\.\w)/g;
                      
                      // Replace stock symbols with highlighted versions
                      const processedParagraph = paragraph.replace(symbolPattern, (match) => {
                        const symbol = match.startsWith('$') ? match.substring(1) : match;
                        return `<span class="inline-block bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md font-medium text-sm">${symbol}</span>`;
                      });
                      
                      return (
                        <div 
                          key={index} 
                          className={index === 0 
                            ? "text-lg leading-relaxed mb-6 text-foreground" 
                            : "mb-6 leading-relaxed text-foreground/90"
                          }
                        >
                          {index > 0 && (
                            <div className="flex items-center mb-3">
                              {index === 1 && <BarChart4 className="h-4 w-4 mr-2 text-emerald-600" />}
                              {index === 2 && <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" />}
                              {index === 3 && <AlertCircle className="h-4 w-4 mr-2 text-amber-600" />}
                              <h4 className="font-medium text-base">
                                {index === 1 && "Stock highlights"}
                                {index === 2 && "Industry trends"}
                                {index === 3 && "Market context"}
                              </h4>
                            </div>
                          )}
                          <div dangerouslySetInnerHTML={{ __html: processedParagraph }} />
                          
                          {index === 0 && <div className="border-b border-border/20 my-6"></div>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-70" />
                    <p className="text-muted-foreground text-lg">
                      No summary available
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Check the articles tab for individual news updates
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50 dark:from-indigo-950/30 dark:via-violet-950/30 dark:to-indigo-950/30 border-t border-border/30 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Updated: {new Date().toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30" onClick={handleRefresh}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
                    Get fresh insights
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-indigo-600 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Share this analysis</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardFooter>
            </Card>
            
            <div className="text-center mt-8 text-sm text-muted-foreground">
              <p>Want the full story? <Button variant="link" className="p-0 h-auto" onClick={() => document.querySelector('[data-value="articles"]')?.click()}>See all articles</Button></p>
            </div>
          </TabsContent>
          
          <TabsContent value="articles">
            <div className="space-y-6 max-w-4xl mx-auto">
              {newsData.news_items.length > 0 ? (
                newsData.news_items.map((item, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-md transition-all duration-300 border-border/50">
                    <div className={`h-1 ${
                      item.overall_sentiment_label?.toLowerCase() === 'bullish' ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' :
                      item.overall_sentiment_label?.toLowerCase() === 'somewhat-bullish' ? 'bg-gradient-to-r from-emerald-400 to-emerald-200' :
                      item.overall_sentiment_label?.toLowerCase() === 'bearish' ? 'bg-gradient-to-r from-rose-500 to-rose-300' :
                      item.overall_sentiment_label?.toLowerCase() === 'somewhat-bearish' ? 'bg-gradient-to-r from-rose-400 to-rose-200' :
                      'bg-gradient-to-r from-gray-400 to-gray-200'
                    }`}></div>
                    
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <CardTitle className="text-lg font-medium leading-tight">
                            {item.title}
                          </CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                            <div className="flex items-center bg-muted/40 px-2 py-0.5 rounded-full">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatPublishedDate(item.time_published)}
                            </div>
                            <Badge variant="outline" className="text-xs font-normal h-5 bg-background/80">
                              {item.source}
                            </Badge>
                            {item.overall_sentiment_label && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${getSentimentColor(item.overall_sentiment_label)}`}>
                                {getSentimentIcon(item.overall_sentiment_label)}
                                <span className="text-xs">{item.overall_sentiment_label}</span>
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <Button size="sm" variant="outline" className="h-8 hover:bg-indigo-600 hover:text-white hover:border-indigo-700 transition-colors">
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                            Read
                          </Button>
                        </a>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-5">
                      <p className="text-sm leading-relaxed text-foreground/90">{item.summary}</p>
                      
                      {item.ticker_sentiment && item.ticker_sentiment.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/40">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-medium text-muted-foreground">Ticker sentiment</h4>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Share2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Share this analysis</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {item.ticker_sentiment.map((sentiment, idx) => {
                              const variant = getSentimentVariant(sentiment.ticker_sentiment_label);
                              return (
                                <Badge 
                                  key={idx}
                                  variant={variant || "outline"}
                                  className="flex items-center gap-1.5 py-1.5 transition-colors"
                                >
                                  <span className="font-bold">{sentiment.ticker}</span>
                                  <Separator orientation="vertical" className="h-3" />
                                  <span className="flex items-center">
                                    {getSentimentIcon(sentiment.ticker_sentiment_label)}
                                    <span className="ml-1">{sentiment.ticker_sentiment_label}</span>
                                  </span>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="bg-muted/20 max-w-md mx-auto rounded-lg p-8">
                    <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">No articles found</h3>
                    <p className="text-muted-foreground mb-4">
                      We couldn't find any recent news for your investments
                    </p>
                    <Button variant="outline" onClick={handleRefresh} className="border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50">
                      <RefreshCw className="h-4 w-4 mr-2 text-indigo-600" />
                      Check for new articles
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}