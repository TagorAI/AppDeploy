import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import TopNav from './components/layout/TopNav'
import ScrollToTop from './components/ScrollToTop'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from './pages/Dashboard'
import ViewProfile from './pages/ViewProfile'
import EditProfile from './pages/EditProfile'
import FinancialFitness from './pages/FinancialFitness'
import Chat from './pages/Chat'
import Admin from './pages/Admin'
import ViewInvestmentProducts from './pages/ViewInvestmentProducts'
import ChatProducts from './pages/ChatProducts'
import GrowSavings from './pages/GrowSavings'
import GrowSavingsRecommendations from './pages/GrowSavingsRecommendations'
import RetirementLanding from './pages/RetirementLanding'
import RetirementRecommendations from './pages/RetirementRecommendations'
import InvestLanding from './pages/InvestLanding'
import InvestmentRecommendations from './pages/InvestmentRecommendations'
import FinancialSnapshot from './pages/FinancialSnapshot'
import RetirementCurrentPlan from './pages/RetirementCurrentPlan'
import RetirementWhatIf from './pages/RetirementWhatIf'
import FinancialPlan from './pages/FinancialPlan'
import ComingSoon from './components/ComingSoon'
import Screening from '@/components/signup/Screening'
import InvestRiskProfiling from './pages/InvestRiskProfiling'
import InvestUpload from './pages/InvestUpload'
import InvestViewHoldings from "./pages/InvestViewHoldings"
import { ThemeProvider } from "./components/theme/ThemeProvider"
import UpdateAllocations from './pages/UpdateAllocations'
import InvestViewAssetAllocation from './pages/InvestViewAssetAllocation'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import InvestWhatIf from './pages/InvestWhatIf'
import InvestNews from './pages/InvestNews'
import ResetPassword from './pages/ResetPassword'
import Feedback from './components/Feedback'
import AboutApp from './pages/AboutApp'
import InvestDeepResearch from './pages/InvestDeepResearch'
import InvestmentAnalyst from './pages/InvestmentAnalyst'
import RetirementAdvisor from './pages/RetirementAdvisor'
import FinancialEducation from './pages/FinancialEducation'
import InvestTimeMachine from './pages/InvestTimeMachine'
import SimpleJourney from './pages/SimpleJourney'
import DashboardAgentsMenu from '@/pages/DashboardAgentsMenu'
import InvestmentAnalystAgent from '@/pages/InvestmentAnalystAgent'
import InvestmentTimeMachineAgent from '@/pages/InvestmentTimeMachineAgent'
import FinancialTeamAgent from '@/pages/DashboardAgentsTeam'
import AgentsOutput from '@/pages/AgentsOutput'

/**
 * Root component that handles routing and layout for the application.
 * Public routes (Welcome, Login, Signup) are rendered without the TopNav
 * Protected routes (Dashboard, Profile) include the TopNav component
 */
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <Router>
        <AuthProvider>
          <ScrollToTop />
          {/* Public routes */}
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/screening" element={<Screening />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<AboutApp />} />
            
            {/* Protected routes - wrap all protected routes in a layout with TopNav */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ViewProfile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/checkup" element={<FinancialFitness />} />
              <Route path="/assistant" element={<Chat />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/products" element={<ViewInvestmentProducts />} />
              <Route path="/admin/update-allocations" element={<UpdateAllocations />} />
              <Route path="/chat-products" element={<ChatProducts />} />
              <Route path="/grow-savings" element={<GrowSavings />} />
              <Route path="/grow-savings/recommendations" element={<GrowSavingsRecommendations />} />
              <Route path="/retirement" element={<RetirementLanding />} />
              <Route path="/retirement/checklist" element={<RetirementLanding />} />
              <Route path="/retirement/current-plan" element={<RetirementCurrentPlan />} />
              <Route path="/retirement/what-if" element={<RetirementWhatIf />} />
              <Route path="/retirement/recommendations" element={<RetirementRecommendations />} />
              <Route path="/retirement/advisor" element={<RetirementAdvisor />} />
              <Route path="/grow-investments" element={<InvestLanding />} />
              <Route path="/grow-investments/recommendations" element={<InvestmentRecommendations />} />
              <Route path="/dashboard/snapshot" element={<FinancialSnapshot />} />
              <Route path="/dashboard/financial-plan" element={<FinancialPlan />} />
              <Route path="/budget" element={<ComingSoon />} />
              <Route path="/spending" element={<ComingSoon />} />
              <Route path="/invest-risk-profiling" element={<InvestRiskProfiling />} />
              <Route path="/dashboard/investments/upload" element={<InvestUpload />} />
              <Route path="/dashboard/investments/holdings" element={<InvestViewHoldings />} />
              <Route path="/dashboard/investments" element={<InvestLanding />} />
              <Route path="/dashboard/investments/asset-allocation" element={<InvestViewAssetAllocation />} />
              <Route path="/invest-what-if" element={<InvestWhatIf />} />
              <Route path="/dashboard/investments/news" element={<InvestNews />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/about" element={<AboutApp />} />
              <Route path="/invest-deep-research" element={<InvestDeepResearch />} />
              <Route path="/invest-analyst" element={<InvestmentAnalyst />} />
              <Route path="/financial-education" element={<FinancialEducation />} />
              <Route path="/invest-timemachine" element={<InvestTimeMachine />} />
              <Route path="/simple-journey" element={<SimpleJourney />} />
              <Route path="/agents" element={<DashboardAgentsMenu />} />
              <Route path="/investment-analyst-agent" element={<InvestmentAnalystAgent />} />
              <Route path="/investment-timemachine-agent" element={<InvestmentTimeMachineAgent />} />
              <Route path="/financial-team" element={<FinancialTeamAgent />} />
              <Route path="/agents/output" element={<AgentsOutput />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

// Create a layout component for protected routes
function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is not authenticated and redirect to login
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <>
      <TopNav />
      <Outlet />
    </>
  );
}

export default App