"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, 
  Settings, 
  Play, 
  BarChart3, 
  History, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Train,
  MapPin
} from 'lucide-react';
import { 
  OptimizationRequest, 
  OptimizationResponse, 
  OptimizationObjective, 
  OptimizationConstraint,
  Train as TrainType
} from '@/types/api';
import { useOptimization } from '@/hooks/useOptimization';
import TrainSelectionForm from './TrainSelectionForm';
import ConstraintsConfig from './ConstraintsConfig';
import OptimizationResults from './OptimizationResults';
import { toast } from 'sonner';

export function OptimizationDashboard() {
  const { optimize, optimizing, lastResult, error } = useOptimization();
  
  // Form state
  const [selectedSection, setSelectedSection] = useState("SEC_001");
  const [timeHorizon, setTimeHorizon] = useState(120);
  const [objective, setObjective] = useState<OptimizationObjective>(OptimizationObjective.MinimizeDelay);
  const [selectedTrains, setSelectedTrains] = useState<TrainType[]>([]);
  const [constraints, setConstraints] = useState<OptimizationConstraint[]>([]);
  const [activeTab, setActiveTab] = useState("setup");

  // Available sections (in production, this would come from an API)
  const sections = [
    { id: "SEC_001", name: "Mumbai Central - Western Line", type: "Main Line" },
    { id: "SEC_002", name: "Delhi Junction - Northern Line", type: "Express Route" },
    { id: "SEC_003", name: "Chennai Express - Southern Line", type: "High Speed" },
    { id: "SEC_004", name: "Kolkata Metro - Eastern Line", type: "Urban Metro" },
    { id: "SEC_005", name: "Bangalore City - Central Line", type: "Mixed Traffic" }
  ];

  const handleOptimize = async () => {
    // Validation
    if (selectedTrains.length === 0) {
      toast.error("Please select at least one train for optimization");
      return;
    }

    if (timeHorizon < 30) {
      toast.error("Time horizon must be at least 30 minutes");
      return;
    }

    const request: OptimizationRequest = {
      section_id: selectedSection,
      trains: selectedTrains,
      constraints: constraints,
      objective: objective,
      time_horizon_minutes: timeHorizon
    };

    try {
      await optimize(request);
      setActiveTab("results");
    } catch (error) {
      console.error('Optimization failed:', error);
      // Error is already handled by the hook with toast
    }
  };

  const handleExportResults = () => {
    if (!lastResult) return;
    
    const dataStr = JSON.stringify(lastResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `optimization_results_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success("Optimization results exported successfully");
  };

  const handleShareResults = async () => {
    if (!lastResult) return;

    try {
      await navigator.share({
        title: 'Railway Optimization Results',
        text: `Optimization completed: ${lastResult.conflicts_resolved} conflicts resolved, ${lastResult.total_delay_reduction_minutes}min delay reduction`,
      });
    } catch (error) {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(
        `Railway Optimization Results:\n- Conflicts resolved: ${lastResult.conflicts_resolved}\n- Delay reduction: ${lastResult.total_delay_reduction_minutes} minutes\n- Computation time: ${lastResult.computation_time_ms}ms`
      );
      toast.success("Results copied to clipboard");
    }
  };

  const handleApplySchedule = (scheduleUpdates: any[]) => {
    // In a real application, this would send the schedule updates to the backend
    toast.success(`Schedule applied! ${scheduleUpdates.length} trains updated`);
    console.log("Applying schedule updates:", scheduleUpdates);
  };

  const canOptimize = selectedTrains.length > 0 && timeHorizon >= 30;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Optimization Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered railway schedule optimization with constraint programming
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={optimizing ? "default" : "secondary"}>
            {optimizing ? "Optimizing..." : "Ready"}
          </Badge>
          {lastResult && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Last run: {lastResult.success ? "Success" : "Failed"}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Setup</span>
          </TabsTrigger>
          <TabsTrigger value="constraints" className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>Constraints</span>
          </TabsTrigger>
          <TabsTrigger value="run" className="flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>Execute</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Results</span>
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Optimization Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure the basic parameters for schedule optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Railway Section</label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          <div>
                            <div className="font-medium">{section.name}</div>
                            <div className="text-xs text-muted-foreground">{section.type}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Horizon (minutes)</label>
                  <Select value={timeHorizon.toString()} onValueChange={(v) => setTimeHorizon(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Optimization Objective</label>
                  <Select value={objective} onValueChange={(v) => setObjective(v as OptimizationObjective)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OptimizationObjective.MinimizeDelay}>
                        Minimize Delay
                      </SelectItem>
                      <SelectItem value={OptimizationObjective.MaximizeThroughput}>
                        Maximize Throughput
                      </SelectItem>
                      <SelectItem value={OptimizationObjective.MinimizeEnergyConsumption}>
                        Minimize Energy
                      </SelectItem>
                      <SelectItem value={OptimizationObjective.BalancedOptimal}>
                        Balanced Optimal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Train Selection */}
          <TrainSelectionForm
            selectedTrains={selectedTrains}
            onTrainsChange={setSelectedTrains}
            sectionId={selectedSection}
          />

          {/* Quick Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Train className="w-4 h-4" />
                <span>{selectedTrains.length} trains selected</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{timeHorizon} min horizon</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{sections.find(s => s.id === selectedSection)?.name.split(" - ")[0]}</span>
              </div>
            </div>
            <Button onClick={() => setActiveTab("constraints")} disabled={selectedTrains.length === 0}>
              Configure Constraints
            </Button>
          </div>
        </TabsContent>

        {/* Constraints Tab */}
        <TabsContent value="constraints" className="space-y-6">
          <ConstraintsConfig
            constraints={constraints}
            onConstraintsChange={setConstraints}
          />
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("setup")}>
              Back to Setup
            </Button>
            <Button onClick={() => setActiveTab("run")}>
              Proceed to Execute
            </Button>
          </div>
        </TabsContent>

        {/* Execute Tab */}
        <TabsContent value="run" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Ready to Optimize</span>
              </CardTitle>
              <CardDescription>
                Review your configuration and start the optimization process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Configuration Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Section</p>
                        <p className="text-xs text-muted-foreground">
                          {sections.find(s => s.id === selectedSection)?.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2">
                      <Train className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">{selectedTrains.length} Trains</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedTrains.filter(t => t.delay_minutes > 0).length} delayed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium">{constraints.length} Constraints</p>
                        <p className="text-xs text-muted-foreground">
                          {constraints.filter(c => c.priority <= 2).length} high priority
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">{timeHorizon} Minutes</p>
                        <p className="text-xs text-muted-foreground">
                          {objective.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Validation Messages */}
              {!canOptimize && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2 text-amber-800">
                      <AlertCircle className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Configuration Issues</p>
                        <ul className="text-sm mt-1 space-y-1">
                          {selectedTrains.length === 0 && <li>• Please select at least one train</li>}
                          {timeHorizon < 30 && <li>• Time horizon must be at least 30 minutes</li>}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Execute Button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleOptimize}
                  disabled={!canOptimize || optimizing}
                  className="px-8 py-3"
                >
                  {optimizing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Optimizing Schedule...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Start Optimization
                    </>
                  )}
                </Button>
              </div>

              {/* Error Display */}
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertCircle className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Optimization Error</p>
                        <p className="text-sm mt-1">{error.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("constraints")}>
              Back to Constraints
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setActiveTab("results")} 
              disabled={!lastResult}
            >
              View Last Results
            </Button>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {lastResult ? (
            <OptimizationResults
              result={lastResult}
              onExport={handleExportResults}
              onShare={handleShareResults}
              onApplySchedule={handleApplySchedule}
            />
          ) : (
            <Card>
              <CardContent className="pt-8">
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                  <p className="mb-4">Run an optimization to see detailed results and analysis</p>
                  <Button onClick={() => setActiveTab("run")}>
                    Start Optimization
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OptimizationDashboard;
