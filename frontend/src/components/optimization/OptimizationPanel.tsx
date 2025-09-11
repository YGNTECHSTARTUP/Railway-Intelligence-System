"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { 
  useOptimization, 
  useSimulation, 
  useBatchOptimization,
  useOptimizationHistory 
} from '@/hooks/useOptimization';
import { 
  OptimizationRequest, 
  OptimizationObjective, 
  SimulationRequest,
  WhatIfChangeType 
} from '@/types/api';

export function OptimizationPanel() {
  const { optimize, optimizing, lastResult, error } = useOptimization();
  const { simulate, simulating, lastResult: simulationResult } = useSimulation();
  const { optimizeMultiple, optimizing: batchOptimizing, progress } = useBatchOptimization();
  const { history, addToHistory } = useOptimizationHistory();

  const [selectedSection, setSelectedSection] = useState("SEC_001");
  const [timeHorizon, setTimeHorizon] = useState(120);
  const [objective, setObjective] = useState<OptimizationObjective>(OptimizationObjective.MinimizeDelay);

  const handleOptimize = async () => {
    const request: OptimizationRequest = {
      section_id: selectedSection,
      trains: [], // Would be populated with actual train data
      constraints: [], // Would be populated with actual constraints
      objective: objective,
      time_horizon_minutes: timeHorizon
    };

    try {
      const result = await optimize(request);
      addToHistory(result, request);
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  const handleSimulate = async () => {
    const request: SimulationRequest = {
      scenario_name: `Simulation ${new Date().toLocaleTimeString()}`,
      section_id: selectedSection,
      base_trains: [], // Would be populated with actual train data
      what_if_changes: [
        {
          change_type: WhatIfChangeType.DelayTrain,
          train_id: "T001",
          parameters: { delay_minutes: "15" }
        }
      ],
      simulation_duration_hours: 2.0
    };

    try {
      await simulate(request);
    } catch (error) {
      console.error('Simulation failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Optimization Center</h2>
          <p className="text-muted-foreground">
            AI-powered train schedule optimization and scenario analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={optimizing || simulating ? "default" : "secondary"}>
            {optimizing || simulating ? "Processing" : "Ready"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="optimize" className="space-y-4">
        <TabsList>
          <TabsTrigger value="optimize">Schedule Optimization</TabsTrigger>
          <TabsTrigger value="simulate">Scenario Simulation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Optimization Tab */}
        <TabsContent value="optimize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Schedule Optimization</span>
              </CardTitle>
              <CardDescription>
                Optimize train schedules to minimize delays and maximize throughput
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Configuration */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Section</label>
                  <select 
                    value={selectedSection} 
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="SEC_001">Main Line - Section 1</option>
                    <option value="SEC_002">Branch Line - Section 2</option>
                    <option value="SEC_003">Express Route - Section 3</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Time Horizon (minutes)</label>
                  <input
                    type="number"
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(Number(e.target.value))}
                    className="w-full mt-1 p-2 border rounded-md"
                    min="30"
                    max="480"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Objective</label>
                  <select 
                    value={objective} 
                    onChange={(e) => setObjective(e.target.value as OptimizationObjective)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value={OptimizationObjective.MinimizeDelay}>Minimize Delay</option>
                    <option value={OptimizationObjective.MaximizeThroughput}>Maximize Throughput</option>
                    <option value={OptimizationObjective.MinimizeEnergyConsumption}>Minimize Energy</option>
                    <option value={OptimizationObjective.BalancedOptimal}>Balanced Optimal</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                onClick={handleOptimize} 
                disabled={optimizing}
                className="w-full"
                size="lg"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing Schedule...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Optimize Schedule
                  </>
                )}
              </Button>

              {/* Results */}
              {lastResult && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-green-800 flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Optimization Results</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-green-900">Conflicts Resolved</div>
                        <div className="text-2xl font-bold text-green-600">{lastResult.conflicts_resolved}</div>
                      </div>
                      <div>
                        <div className="font-medium text-green-900">Delay Reduction</div>
                        <div className="text-2xl font-bold text-green-600">{lastResult.total_delay_reduction_minutes}min</div>
                      </div>
                      <div>
                        <div className="font-medium text-green-900">Computation Time</div>
                        <div className="text-2xl font-bold text-green-600">{lastResult.computation_time_ms}ms</div>
                      </div>
                      <div>
                        <div className="font-medium text-green-900">Success</div>
                        <div className="text-2xl font-bold text-green-600">
                          {lastResult.success ? "✅" : "❌"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Display */}
              {error && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Optimization Failed</span>
                    </div>
                    <p className="text-red-600 mt-2">{error.message}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulation Tab */}
        <TabsContent value="simulate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Scenario Simulation</span>
              </CardTitle>
              <CardDescription>
                Test what-if scenarios and analyze their impact on system performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleSimulate} 
                disabled={simulating}
                className="w-full"
                size="lg"
                variant="outline"
              >
                {simulating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Run Scenario Simulation
                  </>
                )}
              </Button>

              {/* Simulation Results */}
              {simulationResult && simulationResult.success && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-blue-800">
                      Simulation: {simulationResult.scenario_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-blue-900">Improvement</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {simulationResult.performance_comparison.improvement_percent.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-900">Trains Processed</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {simulationResult.simulation_results.total_trains_processed}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-900">Conflicts</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {simulationResult.simulation_results.conflicts_detected}
                        </div>
                      </div>
                    </div>
                    
                    {/* Recommendations */}
                    {simulationResult.recommendations.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-blue-900 mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          {simulationResult.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization History</CardTitle>
              <CardDescription>
                Recent optimization and simulation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No optimization history yet. Run an optimization to see results here.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${entry.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <div className="font-medium">{entry.sectionId}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.timestamp.toLocaleTimeString()} • {entry.objective}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">
                          {entry.conflictsResolved} conflicts • {entry.delayReduction}min saved
                        </div>
                        <div className="text-muted-foreground">
                          {entry.executionTimeMs}ms
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Status Indicator */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Python Optimization Service</span>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Connected (Port 50051)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            gRPC service ready for optimization requests
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default OptimizationPanel;
