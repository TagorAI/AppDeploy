import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  token: string | null;
  getToken: () => string | null;
  login: (token: string) => void;
  logout: (message?: string) => void;
  isAuthenticated: boolean;
  apiRequest: (url: string, options?: RequestInit) => Promise<Response>;
  isValidating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isTokenValid, setIsTokenValid] = useState<boolean>(!!localStorage.getItem('access_token'));
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    setToken(storedToken);
    // Validate the token when component mounts
    if (storedToken) {
      validateToken(storedToken).then(() => {
        setIsValidating(false);
      });
    } else {
      setIsValidating(false);
    }
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    validateToken(newToken);
  };

  const logout = (message?: string) => {
    localStorage.removeItem('access_token');
    setToken(null);
    
    if (message) {
      toast({
        title: "Session expired",
        description: message,
        variant: "default",
      });
    }
    
    navigate('/login');
  };

  const getToken = () => {
    return localStorage.getItem('access_token');
  };

  // Move apiRequest inside the component as a method
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const currentToken = getToken();
    
    const headers = {
      ...(options.headers || {}),
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // Check if the error is related to token expiration
        if (
          response.status === 401 || 
          (response.status === 500 && errorText.includes("token is expired"))
        ) {
          logout("Your session has expired. Please log in again.");
          throw new Error("Session expired");
        }
        
        throw new Error(errorText);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    // Check if token exists and set up auto-refresh
    if (token) {
      // Check token validity
      const checkTokenValidity = async () => {
        try {
          // Change HEAD to GET method
          await apiRequest('/api/profile', { method: 'GET' });
        } catch (error) {
          // Token is invalid, logout
          logout("Your session has expired");
        }
      };
      
      // Check immediately
      checkTokenValidity();
      
      // Set up periodic checks (e.g., every 5 minutes)
      const interval = setInterval(checkTokenValidity, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [token]);

  // Add a function to validate token
  const validateToken = async (tokenToValidate: string | null) => {
    if (!tokenToValidate) {
      setIsTokenValid(false);
      return false;
    }
    
    // Basic check - token exists and is not expired
    try {
      // Just check token format - not a full verification
      const payload = JSON.parse(atob(tokenToValidate.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      
      setIsTokenValid(!isExpired);
      return !isExpired;
    } catch (e) {
      setIsTokenValid(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      getToken, 
      login, 
      logout, 
      isAuthenticated: !!token && isTokenValid,
      apiRequest,
      isValidating
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}