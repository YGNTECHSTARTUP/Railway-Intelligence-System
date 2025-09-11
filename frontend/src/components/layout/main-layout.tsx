"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Train, 
  Activity, 
  BarChart3, 
  Settings, 
  Zap, 
  Database, 
  PlayCircle, 
  AlertTriangle,
  Menu,
  X,
  Home,
  GitBranch,
  Clock,
  Users,
  LogOut,
  User,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSystemStatus } from '@/hooks/useWebSocket';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
  submenu?: SidebarItem[];
}

const navigationItems: SidebarItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'System overview and key metrics'
  },
  {
    title: 'Train Monitoring',
    href: '/trains',
    icon: Train,
    description: 'Real-time train tracking and status',
    badge: 'Live',
    submenu: [
      {
        title: 'Live Tracking',
        href: '/trains/live',
        icon: Activity,
        description: 'Real-time train positions'
      },
      {
        title: 'Train Status',
        href: '/trains/status',
        icon: Clock,
        description: 'Current train statuses'
      },
      {
        title: 'Route Management',
        href: '/trains/routes',
        icon: GitBranch,
        description: 'Route planning and management'
      }
    ]
  },
  {
    title: 'OR-Tools Optimization',
    href: '/optimization',
    icon: Zap,
    description: 'Advanced scheduling optimization',
    badge: 'AI',
    submenu: [
      {
        title: 'Schedule Optimizer',
        href: '/optimization/schedule',
        icon: Clock,
        description: 'Optimize train schedules'
      },
      {
        title: 'Conflict Resolution',
        href: '/optimization/conflicts',
        icon: AlertTriangle,
        description: 'Resolve scheduling conflicts'
      },
      {
        title: 'Performance Tuning',
        href: '/optimization/performance',
        icon: BarChart3,
        description: 'Optimize system performance'
      }
    ]
  },
  {
    title: 'What-If Simulation',
    href: '/simulation',
    icon: PlayCircle,
    description: 'Scenario analysis and planning',
    submenu: [
      {
        title: 'Scenario Builder',
        href: '/simulation/builder',
        icon: Settings,
        description: 'Create simulation scenarios'
      },
      {
        title: 'Results Analysis',
        href: '/simulation/results',
        icon: BarChart3,
        description: 'Analyze simulation outcomes'
      }
    ]
  },
  {
    title: 'Analytics & Metrics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance analytics and KPIs',
    submenu: [
      {
        title: 'Performance KPIs',
        href: '/analytics/kpis',
        icon: Activity,
        description: 'Key performance indicators'
      },
      {
        title: 'Delay Analysis',
        href: '/analytics/delays',
        icon: Clock,
        description: 'Delay patterns and trends'
      },
      {
        title: 'Capacity Utilization',
        href: '/analytics/capacity',
        icon: Users,
        description: 'Track and platform utilization'
      }
    ]
  },
  {
    title: 'Data Ingestion',
    href: '/ingestion',
    icon: Database,
    description: 'Data sources and ingestion',
    submenu: [
      {
        title: 'Data Sources',
        href: '/ingestion/sources',
        icon: Database,
        description: 'Configure data sources'
      },
      {
        title: 'Synthetic Data',
        href: '/ingestion/synthetic',
        icon: PlayCircle,
        description: 'Generate test data'
      }
    ]
  },
  {
    title: 'System Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configuration and preferences'
  }
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { connectionStatus, isConnected } = useSystemStatus();

  // Redirect to login if not authenticated (except for login page)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Initializing Railway Intelligence System...</p>
        </div>
      </div>
    );
  }

  // If on login page, don't show sidebar layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If not authenticated and not on login page, don't render
  if (!isAuthenticated) {
    return null;
  }

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Train className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Railway Intelligence</h1>
                <p className="text-xs text-gray-500">Smart Optimization System</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navigationItems.map((item) => (
              <div key={item.href}>
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                    isActive(item.href) 
                      ? "bg-blue-50 text-blue-700 border border-blue-200" 
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                  onClick={() => {
                    if (item.submenu) {
                      toggleExpanded(item.href);
                    }
                  }}
                >
                  <Link href={item.submenu ? '#' : item.href} className="flex items-center space-x-3 flex-1">
                    <item.icon className="h-5 w-5" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.title}</span>
                        {item.badge && (
                          <Badge variant={item.badge === 'Live' ? 'destructive' : 'secondary'} className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    </div>
                  </Link>
                  {item.submenu && (
                    <Button variant="ghost" size="sm">
                      <Menu className={cn(
                        "h-4 w-4 transition-transform",
                        expandedItems.includes(item.href) && "rotate-90"
                      )} />
                    </Button>
                  )}
                </div>

                {/* Submenu */}
                {item.submenu && expandedItems.includes(item.href) && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center space-x-3 p-2 rounded-md text-sm transition-colors",
                          isActive(subItem.href)
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-gray-100 text-gray-600"
                        )}
                      >
                        <subItem.icon className="h-4 w-4" />
                        <div>
                          <span className="font-medium">{subItem.title}</span>
                          <p className="text-xs text-gray-500">{subItem.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t p-4 space-y-3">
            {/* System Status */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus.optimizer ? "bg-green-500" : "bg-red-500"
                )}></div>
                <span className={connectionStatus.optimizer ? "text-green-600" : "text-red-600"}>
                  OR-Tools: {connectionStatus.optimizer ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus.backend ? "bg-green-500" : "bg-red-500"
                )}></div>
                <span className={connectionStatus.backend ? "text-green-600" : "text-red-600"}>
                  Backend: {connectionStatus.backend ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-green-600" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-600" />
                )}
                <span className={isConnected ? "text-green-600" : "text-red-600"}>
                  WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            {/* User Info */}
            {isAuthenticated && user && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    className="h-8 w-8 p-0"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Railway Intelligence System
              </h2>
              <Badge variant="outline" className="text-xs">
                v1.0.0 - OR-Tools Integration
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Real-time Status */}
              <div className="flex items-center space-x-3">
                <Badge variant={connectionStatus.backend ? "outline" : "destructive"} className="text-xs">
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-1",
                    connectionStatus.backend ? "bg-green-500" : "bg-red-500"
                  )}></div>
                  Backend API
                </Badge>
                
                <Badge variant={isConnected ? "outline" : "destructive"} className="text-xs">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  WebSocket
                </Badge>
                
                <Badge variant={connectionStatus.optimizer ? "outline" : "secondary"} className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  OR-Tools
                </Badge>
              </div>
              
              {/* User Menu */}
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {user.username} ({user.role})
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logout()}
                    className="h-8 px-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
