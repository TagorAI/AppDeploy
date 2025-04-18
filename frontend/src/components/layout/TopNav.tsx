import { Link, useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "../ui/dropdown-menu"
import { useState, useEffect } from 'react'
import { 
  Shield,
  LayoutDashboard,
  UserCircle,
  Activity,
  Wallet,
  TrendingUp,
  Clock,
  MessageCircle,
  ChevronDown,
  Menu,
  X,
  Brain
} from 'lucide-react'
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { useAuth } from '@/contexts/AuthContext'

/**
 * TopNav component provides main navigation for authenticated users
 * Includes links to Dashboard, Profile management, and Logout functionality
 * Styled using ShadCN design system with a modern, minimalist design
 */
export default function TopNav() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout, apiRequest } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await apiRequest('/api/admin/check-admin');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [apiRequest]);

  const handleLogout = () => {
    logout();
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  }

  return (
    <nav className="border-b border-border/40 bg-background backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="text-l font-montserrat font-semibold text-foreground hover:text-primary transition-colors duration-200"
            >
              Tagor AI
            </Link>
          </div>

          {/* Mobile menu button */}
          <button 
            className="lg:hidden flex items-center" 
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Main navigation items */}
            <MainNavItems isAdmin={isAdmin} />
            
            {/* Theme Toggle */}
            <div className="ml-2">
              <ThemeToggle />
            </div>
            
            {/* Logout Button */}
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground hover:bg-accent ml-2"
              size="sm"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden py-4 px-4 bg-background border-t border-border/40">
          <div className="flex flex-col space-y-3">
            <MobileNavItems isAdmin={isAdmin} />
            
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 

// Component for main navigation items - used in desktop view
function MainNavItems({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();

  return (
    <>
      {/* Dashboard */}
      <Button 
        variant="ghost" 
        size="sm"
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
        onClick={() => navigate('/dashboard')}
      >
        <LayoutDashboard className="h-4 w-4 mr-1" />
        Dashboard
      </Button>

      {/* AI Agents Dropdown (changed from Button to NavDropdown) */}
      <NavDropdown 
        icon={<Brain className="h-4 w-4 mr-1" />} 
        label="Agents"
        items={[
          { to: "/agents", label: "Agents dashboard" },
          { to: "/financial-team", label: "Financial assistant" }
        ]}
      />
      
      {/* Profile Dropdown */}
      <NavDropdown 
        icon={<UserCircle className="h-4 w-4 mr-1" />} 
        label="Profile"
        items={[
          { to: "/profile", label: "View profile" },
          { to: "/profile/edit", label: "Edit profile" }
        ]}
      />

      {/* Fitness Dropdown */}
      <NavDropdown 
        icon={<Activity className="h-4 w-4 mr-1" />} 
        label="Fitness"
        items={[
          { to: "/checkup", label: "Financial fitness" },
          { to: "/dashboard/snapshot", label: "Financial snapshot" },
          { to: "/dashboard/financial-plan", label: "Financial plan" }
        ]}
      />

      {/* Save Dropdown */}
      <NavDropdown 
        icon={<Wallet className="h-4 w-4 mr-1" />} 
        label="Save"
        items={[
          { to: "/grow-savings", label: "Checklist" },
          { to: "/grow-savings/recommendations", label: "Suggestions" }
        ]}
      />

      {/* Invest Dropdown */}
      <NavDropdown 
        icon={<TrendingUp className="h-4 w-4 mr-1" />} 
        label="Invest"
        items={[
          { to: "/grow-investments", label: "Checklist" },
          { to: "/invest-risk-profiling", label: "Risk profile" },
          { to: "/simple-journey", label: "Simple journey" },
          { to: "/dashboard/investments/upload", label: "Upload statements" },
          { to: "/dashboard/investments/holdings", label: "View holdings" },
          { to: "/dashboard/investments/asset-allocation", label: "View allocation" },
          { to: "/dashboard/investments/news", label: "Investment News" },
          { to: "/invest-deep-research", label: "Research" },
          { to: "/grow-investments/recommendations", label: "Investment ideas" },
          { to: "/invest-what-if", label: "What If Analysis" },
          { to: "/invest-analyst", label: "Investment Advisor" },
          { to: "/invest-timemachine", label: "Time Machine" }
        ]}
      />

      {/* Retire Dropdown */}
      <NavDropdown 
        icon={<Clock className="h-4 w-4 mr-1" />} 
        label="Retire"
        items={[
          { to: "/retirement", label: "Checklist" },
          { to: "/retirement/current-plan", label: "Current retirement plan" },
          { to: "/retirement/recommendations", label: "Retirement investment ideas" },
          { to: "/retirement/what-if", label: "What if" },
          { to: "/retirement/advisor", label: "Retirement advisor" }
        ]}
      />

      {/* Ask Dropdown */}
      <NavDropdown 
        icon={<MessageCircle className="h-4 w-4 mr-1" />} 
        label="Ask"
        items={[
          { to: "/assistant", label: "Guidance" },
          { to: "/chat-products", label: "Products" }
        ]}
      />

      {/* Learn button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
        onClick={() => navigate('/financial-education')}
      >
        {/* Use an icon that represents learning/education, e.g. Book */}
        <TrendingUp className="h-4 w-4 mr-1" />
        Learn
      </Button>

      
      {/* Admin Link - conditional */}
      {isAdmin && (
        <Button 
          variant="ghost" 
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={() => window.location.href = '/admin'}
        >
          <Shield className="h-4 w-4 mr-1" />
          Admin
        </Button>
      )}


    </>
  )
}

// Component for mobile navigation items - used in mobile view
function MobileNavItems({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  
  return (
    <>
      <Link 
        to="/dashboard" 
        className="flex items-center p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
        onClick={(e) => {
          e.preventDefault();
          navigate('/dashboard');
        }}
      >
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Dashboard
      </Link>

      <MobileNavGroup 
        icon={<UserCircle className="h-4 w-4 mr-2" />} 
        label="Profile"
        items={[
          { to: "/profile", label: "View profile" },
          { to: "/profile/edit", label: "Edit profile" }
        ]}
      />

      <MobileNavGroup 
        icon={<Activity className="h-4 w-4 mr-2" />} 
        label="Fitness"
        items={[
          { to: "/checkup", label: "Financial fitness" },
          { to: "/dashboard/snapshot", label: "Financial snapshot" },
          { to: "/dashboard/financial-plan", label: "Financial plan" }
        ]}
      />

      <MobileNavGroup 
        icon={<Wallet className="h-4 w-4 mr-2" />} 
        label="Save"
        items={[
          { to: "/grow-savings", label: "Checklist" },
          { to: "/grow-savings/recommendations", label: "Suggestions" }
        ]}
      />

      <MobileNavGroup 
        icon={<TrendingUp className="h-4 w-4 mr-2" />} 
        label="Invest"
        items={[
          { to: "/grow-investments", label: "Checklist" },
          { to: "/invest-risk-profiling", label: "Risk profile" },
          { to: "/simple-journey", label: "Simple journey" },
          { to: "/dashboard/investments/upload", label: "Upload statements" },
          { to: "/dashboard/investments/holdings", label: "View holdings" },
          { to: "/dashboard/investments/asset-allocation", label: "View allocation" },
          { to: "/dashboard/investments/news", label: "Investment News" },
          { to: "/invest-deep-research", label: "Research" },
          { to: "/grow-investments/recommendations", label: "Investment ideas" },
          { to: "/invest-what-if", label: "What If Analysis" },
          { to: "/invest-analyst", label: "Investment Advisor" },
          { to: "/invest-timemachine", label: "Time Machine" }
        ]}
      />

      <MobileNavGroup 
        icon={<Clock className="h-4 w-4 mr-2" />} 
        label="Retire"
        items={[
          { to: "/retirement", label: "Checklist" },
          { to: "/retirement/current-plan", label: "Current retirement plan" },
          { to: "/retirement/recommendations", label: "Retirement investment ideas" },
          { to: "/retirement/what-if", label: "What if" },
          { to: "/retirement/advisor", label: "Retirement advisor" }
        ]}
      />

      <MobileNavGroup 
        icon={<MessageCircle className="h-4 w-4 mr-2" />} 
        label="Ask"
        items={[
          { to: "/assistant", label: "Guidance" },
          { to: "/chat-products", label: "Products" }
        ]}
      />

      {isAdmin && (
        <Link 
          to="/admin" 
          className="flex items-center p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
        >
          <Shield className="h-4 w-4 mr-2" />
          Admin
        </Link>
      )}

      {/* AI Agents Group (changed from Link to MobileNavGroup) */}
      <MobileNavGroup
        icon={<Brain className="h-4 w-4 mr-2" />}
        label="AI Agents"
        items={[
          { to: "/agents", label: "Agents dashboard" },
          { to: "/financial-team", label: "Financial assistant" }
        ]}
      />
    </>
  )
}

// Define types for the navigation items
interface NavItem {
  to: string;
  label: string;
}

// Dropdown component for desktop navigation
function NavDropdown({ icon, label, items }: { icon: React.ReactNode, label: string, items: NavItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          {icon}
          {label}
          <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-card text-card-foreground border-border w-48 shadow-lg"
      >
        {items.map((item, index) => (
          <DropdownMenuItem 
            key={index} 
            className="text-sm py-1.5 hover:bg-accent focus:bg-accent" 
            asChild
          >
            <Link to={item.to}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Mobile navigation group component
function MobileNavGroup({ icon, label, items }: { icon: React.ReactNode, label: string, items: NavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/40 pb-2 mb-2 last:border-0">
      <button 
        className="flex items-center justify-between w-full p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          {icon}
          {label}
        </span>
        <ChevronDown 
          className={`h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className="pl-6 mt-1 space-y-1">
          {items.map((item, index) => (
            <Link 
              key={index}
              to={item.to} 
              className="block p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 