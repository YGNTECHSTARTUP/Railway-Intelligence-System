'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserInfo, 
  LoginResponse, 
  UserRole 
} from '@/types/api';
import { apiClient, ApiClientError } from '@/lib/api-client';

// ============================================================================
// Authentication Context
// ============================================================================

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiClientError | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Role Permission Helper
// ============================================================================

function checkPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  // Admin can access everything
  if (userRole === UserRole.Admin) return true;
  
  // Operator can access Operator and Viewer functions
  if (userRole === UserRole.Operator && 
      (requiredRole === UserRole.Operator || requiredRole === UserRole.Viewer)) {
    return true;
  }
  
  // SystemMonitor can access Viewer functions
  if (userRole === UserRole.SystemMonitor && requiredRole === UserRole.Viewer) {
    return true;
  }
  
  // Viewer can only access Viewer functions
  if (userRole === UserRole.Viewer && requiredRole === UserRole.Viewer) {
    return true;
  }
  
  return false;
}

// ============================================================================
// Auth Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      if (apiClient.isAuthenticated() && !apiClient.isTokenExpired()) {
        try {
          const userInfo = await apiClient.getUserInfo();
          setUser(userInfo);
          setError(null);
        } catch (err) {
          console.error('Failed to fetch user info:', err);
          apiClient.clearToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response: LoginResponse = await apiClient.login(username, password);
      setUser(response.user);
      setError(null);
      
      // Redirect to dashboard after successful login
      router.push('/');
    } catch (err) {
      const apiError = err instanceof ApiClientError ? err : 
        new ApiClientError(0, 'Login failed', 'LOGIN_ERROR');
      setError(apiError);
      setUser(null);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
      router.push('/login');
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!apiClient.isAuthenticated()) {
      setUser(null);
      return;
    }

    try {
      const userInfo = await apiClient.getUserInfo();
      setUser(userInfo);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh user info:', err);
      const apiError = err instanceof ApiClientError ? err : 
        new ApiClientError(0, 'Failed to refresh user', 'REFRESH_ERROR');
      setError(apiError);
      
      if (apiError.isAuthenticationError()) {
        setUser(null);
        apiClient.clearToken();
        router.push('/login');
      }
    }
  }, [router]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);

  const hasPermission = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;
    return checkPermission(user.role, requiredRole);
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// useAuth Hook
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// Protected Route HOC
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = UserRole.Viewer,
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (!hasPermission(requiredRole)) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// ============================================================================
// Role-based Access Control Hooks
// ============================================================================

export function useRoleAccess() {
  const { user, hasPermission, hasRole } = useAuth();

  const canManageTrains = hasPermission(UserRole.Operator);
  const canOptimize = hasPermission(UserRole.Operator);
  const canSimulate = hasPermission(UserRole.Operator);
  const canTriggerIngestion = hasPermission(UserRole.Operator);
  const canViewAnalytics = hasPermission(UserRole.Viewer);
  const canViewHealth = hasPermission(UserRole.SystemMonitor);
  const isAdmin = hasRole(UserRole.Admin);
  const isOperator = hasRole(UserRole.Operator);
  const isViewer = hasRole(UserRole.Viewer);
  const isSystemMonitor = hasRole(UserRole.SystemMonitor);

  return {
    user,
    canManageTrains,
    canOptimize,
    canSimulate,
    canTriggerIngestion,
    canViewAnalytics,
    canViewHealth,
    isAdmin,
    isOperator,
    isViewer,
    isSystemMonitor,
    hasPermission,
    hasRole,
  };
}

// ============================================================================
// Login Form Hook
// ============================================================================

export interface LoginFormState {
  username: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}

export function useLoginForm() {
  const [formState, setFormState] = useState<LoginFormState>({
    username: '',
    password: '',
    isLoading: false,
    error: null,
  });

  const { login } = useAuth();

  const updateField = useCallback((field: 'username' | 'password', value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      error: null, // Clear error when user types
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.username.trim() || !formState.password.trim()) {
      setFormState(prev => ({
        ...prev,
        error: 'Please enter both username and password',
      }));
      return;
    }

    setFormState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await login(formState.username.trim(), formState.password);
      // Success - redirect handled by AuthProvider
    } catch (err) {
      const errorMessage = err instanceof ApiClientError 
        ? err.message 
        : 'Login failed. Please try again.';
      
      setFormState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [formState.username, formState.password, login]);

  const reset = useCallback(() => {
    setFormState({
      username: '',
      password: '',
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    formState,
    updateField,
    handleSubmit,
    reset,
  };
}

// ============================================================================
// Token Expiry Hook
// ============================================================================

export function useTokenExpiry() {
  const { logout, refreshUser } = useAuth();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);

  useEffect(() => {
    if (!apiClient.isAuthenticated()) return;

    const checkExpiry = () => {
      if (apiClient.isTokenExpired()) {
        logout();
        return;
      }

      try {
        const token = apiClient.getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const exp = payload.exp * 1000;
          const timeLeft = exp - Date.now();
          setTimeUntilExpiry(Math.max(0, timeLeft));

          // Auto-refresh user info periodically
          if (timeLeft > 60000) { // More than 1 minute left
            refreshUser().catch(console.error);
          }
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
        logout();
      }
    };

    // Check immediately
    checkExpiry();

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);

    return () => clearInterval(interval);
  }, [logout, refreshUser]);

  return {
    timeUntilExpiry,
    isExpiringSoon: timeUntilExpiry !== null && timeUntilExpiry < 300000, // 5 minutes
  };
}
