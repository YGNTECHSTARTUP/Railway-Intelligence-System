import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Train, 
  MapPin, 
  Clock, 
  Gauge, 
  Route, 
  Navigation, 
  Activity, 
  AlertTriangle,
  Calendar,
  Users,
  Zap,
  TrendingUp,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrain } from "@/hooks/useApi";
import { TrainStatus, TrainPriority, Direction } from "@/types/api";

interface TrainDetailsProps {
  trainId: string;
}

const getStatusColor = (status: TrainStatus): string => {
  switch (status) {
    case TrainStatus.Running:
      return "text-green-600 bg-green-100";
    case TrainStatus.Delayed:
      return "text-red-600 bg-red-100";
    case TrainStatus.Scheduled:
      return "text-blue-600 bg-blue-100";
    case TrainStatus.AtStation:
      return "text-yellow-600 bg-yellow-100";
    case TrainStatus.Terminated:
      return "text-gray-600 bg-gray-100";
    case TrainStatus.Cancelled:
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const getPriorityLabel = (priority: TrainPriority): string => {
  switch (priority) {
    case TrainPriority.Emergency:
      return "Emergency";
    case TrainPriority.Mail:
      return "Mail";
    case TrainPriority.Express:
      return "Express";
    case TrainPriority.Passenger:
      return "Passenger";
    case TrainPriority.Freight:
      return "Freight";
    case TrainPriority.Maintenance:
      return "Maintenance";
    default:
      return "Unknown";
  }
};

export default function TrainDetails({ trainId }: TrainDetailsProps) {
  const { data: train, loading, error, refetch } = useTrain(trainId, {
    refetchInterval: 5000 // Update every 5 seconds for detailed view
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading train details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Failed to load train details: {error.message}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!train) {
    return (
      <div className="text-center py-8">
        <Train className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-600">Train not found</p>
        <p className="text-gray-500">The requested train may have been removed or terminated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Info Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Train className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold">{train.name}</p>
            <p className="text-sm text-gray-600">#{train.train_number}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-gray-400" />
          <div>
            <Badge className={getStatusColor(train.status)}>
              {train.status}
            </Badge>
            <p className="text-xs text-gray-600 mt-1">Current Status</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Gauge className="h-4 w-4 text-gray-400" />
          <div>
            <p className="font-semibold">{train.speed_kmh.toFixed(0)} km/h</p>
            <p className="text-xs text-gray-600">Current Speed</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <div>
            <p className={cn(
              "font-semibold",
              train.delay_minutes > 15 ? "text-red-600" :
              train.delay_minutes > 5 ? "text-yellow-600" :
              train.delay_minutes > 0 ? "text-orange-600" : "text-green-600"
            )}>
              {train.delay_minutes > 0 ? `+${train.delay_minutes}` : train.delay_minutes} min
            </p>
            <p className="text-xs text-gray-600">Delay Status</p>
          </div>
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(train.status)}>
                    {train.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <Badge variant="outline">
                    {getPriorityLabel(train.priority)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Direction:</span>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Navigation className="h-3 w-3" />
                    <span>{train.direction}</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Speed:</span>
                  <span className="font-semibold">{train.speed_kmh.toFixed(1)} km/h</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Delay:</span>
                  <span className={cn(
                    "font-semibold",
                    train.delay_minutes > 15 ? "text-red-600" :
                    train.delay_minutes > 5 ? "text-yellow-600" :
                    train.delay_minutes > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {train.delay_minutes > 0 ? `+${train.delay_minutes}` : train.delay_minutes} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ETA Next Station:</span>
                  <span className="font-semibold">
                    {new Date(train.eta_next_station).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="font-semibold">
                    {new Date(train.updated_at).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Current Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Section</label>
                  <p className="text-lg font-semibold">{train.current_section}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Coordinates</label>
                  <p className="text-lg font-semibold">
                    {train.position.latitude.toFixed(6)}, {train.position.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
              
              {/* Placeholder for map integration */}
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600">Interactive map coming soon</p>
                  <p className="text-sm text-gray-500">
                    Real-time position tracking will be displayed here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="route" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Route className="h-5 w-5" />
                <span>Route Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Planned Route</label>
                  <div className="mt-2 space-y-2">
                    {train.route.map((station, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          index === 0 ? "bg-green-500" :
                          station === train.current_section ? "bg-blue-500" :
                          index < train.route.indexOf(train.current_section) ? "bg-gray-300" :
                          "bg-gray-200"
                        )}></div>
                        <span className={cn(
                          "text-sm",
                          station === train.current_section ? "font-semibold text-blue-600" : "text-gray-600"
                        )}>
                          {station}
                          {station === train.current_section && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Current
                            </Badge>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">On-Time Performance:</span>
                  <span className={cn(
                    "font-semibold",
                    train.delay_minutes <= 0 ? "text-green-600" : 
                    train.delay_minutes <= 5 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {train.delay_minutes <= 0 ? "On Time" : 
                     train.delay_minutes <= 5 ? "Minor Delay" : "Delayed"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Speed Status:</span>
                  <span className={cn(
                    "font-semibold",
                    train.speed_kmh > 80 ? "text-orange-600" :
                    train.speed_kmh > 40 ? "text-green-600" :
                    train.speed_kmh > 0 ? "text-yellow-600" : "text-gray-600"
                  )}>
                    {train.speed_kmh > 80 ? "High Speed" :
                     train.speed_kmh > 40 ? "Normal" :
                     train.speed_kmh > 0 ? "Slow" : "Stopped"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Priority Level:</span>
                  <Badge variant={train.priority <= 2 ? "destructive" : train.priority <= 4 ? "default" : "secondary"}>
                    {getPriorityLabel(train.priority)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Current Position</p>
                      <p className="text-xs text-gray-600">{train.current_section}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">ETA Next Station</p>
                      <p className="text-xs text-gray-600">
                        {new Date(train.eta_next_station).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-gray-600">
                        {new Date(train.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Performance Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance History</span>
              </CardTitle>
              <CardDescription>
                Speed and delay trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600">Performance charts coming soon</p>
                  <p className="text-sm text-gray-500">
                    Historical speed and delay data will be visualized here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Real-time data • Updated {new Date(train.updated_at).toLocaleTimeString()}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
