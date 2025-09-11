"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Download,
  Share,
  BarChart3,
  Train,
  MapPin,
  Timer,
  Target,
  Activity,
  ChevronRight,
  Info
} from 'lucide-react';
import { OptimizationResponse, TrainScheduleUpdate } from '@/types/api';

interface OptimizationResultsProps {
  result: OptimizationResponse;
  onExport?: () => void;
  onShare?: () => void;
  onApplySchedule?: (scheduleUpdates: TrainScheduleUpdate[]) => void;
}

export function OptimizationResults({ 
  result, 
  onExport, 
  onShare, 
  onApplySchedule 
}: OptimizationResultsProps) {
  const [selectedTrain, setSelectedTrain] = useState<TrainScheduleUpdate | null>(null);

  const formatTime = (timeString: string): string => {
    try {
      return new Date(timeString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Invalid time';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const getDelayColor = (delayMinutes: number): string => {
    if (delayMinutes <= 0) return 'text-green-600';
    if (delayMinutes <= 5) return 'text-yellow-600';
    if (delayMinutes <= 15) return 'text-orange-600';
    return 'text-red-600';
  };

  const getDelayIcon = (delayMinutes: number) => {
    if (delayMinutes <= 0) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (delayMinutes <= 15) return <Clock className="w-4 h-4 text-orange-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with Success Status */}
      <Card className={`border-l-4 ${result.success ? 'border-l-green-500 bg-green-50/50' : 'border-l-red-500 bg-red-50/50'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {result.success ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <CardTitle className="text-xl">
                  {result.success ? 'Optimization Completed Successfully' : 'Optimization Failed'}
                </CardTitle>
                <CardDescription>
                  {result.message || 'Schedule optimization results are ready for review'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onShare && (
                <Button variant="outline" size="sm" onClick={onShare}>
                  <Share className="w-4 h-4 mr-1" />
                  Share
                </Button>
              )}
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              )}
              {result.success && onApplySchedule && (
                <Button size="sm" onClick={() => onApplySchedule(result.optimized_schedule)}>
                  Apply Schedule
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conflicts Resolved</p>
                <p className="text-2xl font-bold">{result.conflicts_resolved}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delay Reduction</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatDuration(result.total_delay_reduction_minutes)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Computation Time</p>
                <p className="text-2xl font-bold">{result.computation_time_ms}ms</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objective Value</p>
                <p className="text-2xl font-bold">{result.objective_value.toFixed(1)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      {result.success && (
        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedule">Optimized Schedule</TabsTrigger>
            <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Train className="w-5 h-5" />
                  <span>Train Schedule Updates</span>
                </CardTitle>
                <CardDescription>
                  {result.optimized_schedule.length} trains with schedule modifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.optimized_schedule.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Train className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No schedule updates required</p>
                      <p className="text-sm">All trains are running optimally</p>
                    </div>
                  ) : (
                    result.optimized_schedule.map((update, index) => (
                      <Card 
                        key={index} 
                        className={`cursor-pointer hover:border-primary/50 transition-colors ${
                          selectedTrain?.train_id === update.train_id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedTrain(update)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getDelayIcon(update.delay_adjustment_minutes)}
                              <div>
                                <h4 className="font-medium">{update.train_id}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Timer className="w-3 h-3" />
                                    <span>Depart: {formatTime(update.new_departure_time)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>Arrive: {formatTime(update.new_arrival_time)}</span>
                                  </div>
                                  {update.assigned_platform && (
                                    <Badge variant="outline" className="text-xs">
                                      {update.assigned_platform}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <p className={`font-medium ${getDelayColor(update.delay_adjustment_minutes)}`}>
                                  {update.delay_adjustment_minutes > 0 
                                    ? `+${update.delay_adjustment_minutes}min`
                                    : update.delay_adjustment_minutes < 0
                                    ? `${update.delay_adjustment_minutes}min`
                                    : 'On Time'
                                  }
                                </p>
                                <p className="text-xs text-muted-foreground">Adjustment</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {selectedTrain?.train_id === update.train_id && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="font-medium mb-2">Schedule Changes</h5>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">New Departure:</span>
                                      <span className="font-medium">{formatTime(update.new_departure_time)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">New Arrival:</span>
                                      <span className="font-medium">{formatTime(update.new_arrival_time)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Platform:</span>
                                      <span className="font-medium">{update.assigned_platform || 'TBD'}</span>
                                    </div>
                                  </div>
                                </div>

                                {update.speed_profile.length > 0 && (
                                  <div>
                                    <h5 className="font-medium mb-2">Speed Profile</h5>
                                    <div className="space-y-1 text-sm max-h-24 overflow-y-auto">
                                      {update.speed_profile.map((point, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            {point.position_km}km:
                                          </span>
                                          <span className="font-medium">{point.speed_kmh}km/h</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Delay Reduction</span>
                    <div className="text-right">
                      <span className="font-medium text-green-600">
                        {formatDuration(result.total_delay_reduction_minutes)}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Conflicts Resolved</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {result.conflicts_resolved} resolved
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Objective Score</span>
                    <div className="text-right">
                      <span className="font-medium">{result.objective_value.toFixed(2)}</span>
                      <p className="text-xs text-muted-foreground">Lower is better</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Computation Efficiency</span>
                    <div className="text-right">
                      <span className="font-medium">{result.computation_time_ms}ms</span>
                      <p className="text-xs text-muted-foreground">
                        {result.computation_time_ms < 1000 ? 'Excellent' : 
                         result.computation_time_ms < 5000 ? 'Good' : 'Acceptable'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Optimization Impact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Improved Punctuality</p>
                        <p className="text-xs text-muted-foreground">
                          {result.optimized_schedule.filter(t => t.delay_adjustment_minutes < 0).length} trains 
                          now running ahead of schedule
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Reduced Conflicts</p>
                        <p className="text-xs text-muted-foreground">
                          {result.conflicts_resolved} scheduling conflicts automatically resolved
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Optimized Routes</p>
                        <p className="text-xs text-muted-foreground">
                          {result.optimized_schedule.filter(t => t.speed_profile.length > 0).length} trains 
                          received speed profile optimizations
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Platform Efficiency</p>
                        <p className="text-xs text-muted-foreground">
                          {result.optimized_schedule.filter(t => t.assigned_platform).length} trains 
                          assigned to optimal platforms
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Optimization Recommendations</span>
                </CardTitle>
                <CardDescription>
                  Insights and suggestions based on the optimization results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Static recommendations based on results */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Immediate Actions</h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• Apply the optimized schedule to reduce total delays by {formatDuration(result.total_delay_reduction_minutes)}</li>
                      <li>• Monitor trains with significant schedule adjustments</li>
                      <li>• Validate platform assignments before implementation</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Long-term Improvements</h4>
                    <ul className="space-y-1 text-sm text-green-800">
                      <li>• Consider implementing dynamic scheduling for high-traffic periods</li>
                      <li>• Review maintenance windows to minimize conflicts</li>
                      <li>• Evaluate platform capacity upgrades for busy stations</li>
                    </ul>
                  </div>

                  {result.conflicts_resolved > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-medium text-amber-900 mb-2">Attention Required</h4>
                      <ul className="space-y-1 text-sm text-amber-800">
                        <li>• {result.conflicts_resolved} conflicts were resolved - review root causes</li>
                        <li>• Consider increasing buffer times between conflicting trains</li>
                        <li>• Evaluate if additional signaling capacity is needed</li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default OptimizationResults;
