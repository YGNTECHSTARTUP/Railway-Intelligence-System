"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Toaster } from "../ui/sonner";
import { useToast } from "../../hooks/use-toast";

// ============================================================================
// App Context for Global State
// ============================================================================

interface AppContextType {
  isInitialized: boolean;
  notifications: boolean;
  setNotifications: (enabled: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProviders');
  }
  return context;
}

// ============================================================================
// Global Error Handler
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4 p-8">
            <div className="text-6xl">🚂</div>
            <h1 className="text-2xl font-bold text-gray-900">
              Something went wrong
            </h1>
            <p className="text-gray-600 max-w-md">
              The Railway Intelligence System encountered an unexpected error. 
              Please refresh the page or contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Notification Handler
// ============================================================================

function NotificationHandler({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      toast({
        title: "System Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    };

    // Global error handler for uncaught exceptions
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      toast({
        title: "Application Error",
        description: "An error occurred while running the application.",
        variant: "destructive",
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [toast]);

  return <>{children}</>;
}

// ============================================================================
// Main App Providers Component
// ============================================================================

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    // Initialize app settings from localStorage
    const savedNotifications = localStorage.getItem('railway-notifications');
    if (savedNotifications !== null) {
      setNotifications(JSON.parse(savedNotifications));
    }
    
    // App is now initialized
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // Save notification preference
    localStorage.setItem('railway-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const appValue: AppContextType = {
    isInitialized,
    notifications,
    setNotifications,
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Initializing Railway Intelligence System...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppContext.Provider value={appValue}>
        <NotificationHandler>
          {children}
          <Toaster />
        </NotificationHandler>
      </AppContext.Provider>
    </ErrorBoundary>
  );
}
