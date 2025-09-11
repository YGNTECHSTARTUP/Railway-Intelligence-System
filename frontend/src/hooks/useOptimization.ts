import { useState, useCallback } from 'react';
import { 
  OptimizationRequest, 
  OptimizationResponse, 
  SimulationRequest, 
  SimulationResponse 
} from '@/types/api';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { toast } from 'sonner';

// ============================================================================
// Optimization Hook
// ============================================================================

export interface UseOptimizationResult {
  optimize: (request: OptimizationRequest) => Promise<OptimizationResponse>;
  optimizing: boolean;
  lastResult: OptimizationResponse | null;
  error: ApiClientError | null;
}

export function useOptimization(): UseOptimizationResult {
  const [optimizing, setOptimizing] = useState(false);
  const [lastResult, setLastResult] = useState<OptimizationResponse | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  
  const optimize = useCallback(async (request: OptimizationRequest): Promise<OptimizationResponse> => {
    setOptimizing(true);
    setError(null);
    
    try {
      // Show starting toast
      toast.loading('Starting schedule optimization...', {
        duration: 2000
      });
      
      const result = await apiClient.optimizeSchedule(request);
      
      // Show success toast with results
      toast.success(
        `✅ Optimization completed! 
        📊 ${result.conflicts_resolved} conflicts resolved
        ⏱️ ${result.total_delay_reduction_minutes}min delay reduction
        🎯 Computation time: ${result.computation_time_ms}ms`,
        {
          duration: 5000
        }
      );
      
      setLastResult(result);
      return result;
      
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : 
        new ApiClientError(0, 'Unknown optimization error', 'OPTIMIZATION_ERROR');
      
      setError(apiError);
      
      // Show error toast
      toast.error(`❌ Optimization failed: ${apiError.message}`, {
        duration: 4000
      });
      
      throw apiError;
    } finally {
      setOptimizing(false);
    }
  }, []);
  
  return { 
    optimize, 
    optimizing, 
    lastResult, 
    error 
  };
}

// ============================================================================
// Simulation Hook
// ============================================================================

export interface UseSimulationResult {
  simulate: (request: SimulationRequest) => Promise<SimulationResponse>;
  simulating: boolean;
  lastResult: SimulationResponse | null;
  error: ApiClientError | null;
}

export function useSimulation(): UseSimulationResult {
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  
  const simulate = useCallback(async (request: SimulationRequest): Promise<SimulationResponse> => {
    setSimulating(true);
    setError(null);
    
    try {
      // Show starting toast
      toast.loading(`🎭 Starting simulation: "${request.scenario_name}"...`, {
        duration: 2000
      });
      
      const result = await apiClient.simulateScenario(request);
      
      if (result.success) {
        // Show success toast with results
        toast.success(
          `✅ Simulation "${result.scenario_name}" completed!
          📈 ${result.performance_comparison.improvement_percent.toFixed(1)}% improvement
          🚂 ${result.simulation_results.total_trains_processed} trains processed
          ⚡ ${result.simulation_results.conflicts_detected} conflicts detected`,
          {
            duration: 6000
          }
        );
        
        // Show recommendations if available
        if (result.recommendations.length > 0) {
          toast.info(
            `💡 Recommendations:\n${result.recommendations.slice(0, 2).join('\n')}`,
            {
              duration: 5000
            }
          );
        }
      } else {
        toast.error(`❌ Simulation "${request.scenario_name}" failed`);
      }
      
      setLastResult(result);
      return result;
      
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : 
        new ApiClientError(0, 'Unknown simulation error', 'SIMULATION_ERROR');
      
      setError(apiError);
      
      // Show error toast
      toast.error(`❌ Simulation failed: ${apiError.message}`, {
        duration: 4000
      });
      
      throw apiError;
    } finally {
      setSimulating(false);
    }
  }, []);
  
  return { 
    simulate, 
    simulating, 
    lastResult, 
    error 
  };
}

// ============================================================================
// Batch Operations Hook
// ============================================================================

export interface UseBatchOptimizationResult {
  optimizeMultiple: (requests: OptimizationRequest[]) => Promise<OptimizationResponse[]>;
  optimizing: boolean;
  progress: number;
  results: OptimizationResponse[];
  errors: ApiClientError[];
}

export function useBatchOptimization(): UseBatchOptimizationResult {
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OptimizationResponse[]>([]);
  const [errors, setErrors] = useState<ApiClientError[]>([]);
  
  const optimizeMultiple = useCallback(async (requests: OptimizationRequest[]): Promise<OptimizationResponse[]> => {
    setOptimizing(true);
    setProgress(0);
    setResults([]);
    setErrors([]);
    
    const totalRequests = requests.length;
    const batchResults: OptimizationResponse[] = [];
    const batchErrors: ApiClientError[] = [];
    
    try {
      toast.loading(`🔄 Processing ${totalRequests} optimization requests...`);
      
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        
        try {
          const result = await apiClient.optimizeSchedule(request);
          batchResults.push(result);
          
          // Update progress
          const newProgress = ((i + 1) / totalRequests) * 100;
          setProgress(newProgress);
          setResults([...batchResults]);
          
        } catch (error) {
          const apiError = error instanceof ApiClientError ? error : 
            new ApiClientError(0, `Optimization ${i + 1} failed`, 'BATCH_ERROR');
          batchErrors.push(apiError);
          setErrors([...batchErrors]);
        }
      }
      
      // Show completion toast
      const successCount = batchResults.length;
      const errorCount = batchErrors.length;
      
      if (errorCount === 0) {
        toast.success(`✅ All ${successCount} optimizations completed successfully!`);
      } else {
        toast.warning(`⚠️ ${successCount} succeeded, ${errorCount} failed`);
      }
      
      return batchResults;
      
    } finally {
      setOptimizing(false);
      setProgress(100);
    }
  }, []);
  
  return {
    optimizeMultiple,
    optimizing,
    progress,
    results,
    errors
  };
}

// ============================================================================
// Real-time Optimization Status Hook
// ============================================================================

export interface UseOptimizationStatusResult {
  status: string;
  progress: number;
  phase: string;
  estimatedCompletion: number;
  isActive: boolean;
}

export function useOptimizationStatus(requestId: string | null): UseOptimizationStatusResult {
  const [status, setStatus] = useState('IDLE');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Ready');
  const [estimatedCompletion, setEstimatedCompletion] = useState(0);
  
  // This would typically use WebSocket for real-time updates
  // For now, we'll use polling when a request is active
  
  const isActive = status === 'PROCESSING' || status === 'QUEUED';
  
  return {
    status,
    progress,
    phase,
    estimatedCompletion,
    isActive
  };
}

// ============================================================================
// Optimization History Hook
// ============================================================================

export interface OptimizationHistoryEntry {
  id: string;
  timestamp: Date;
  sectionId: string;
  objective: string;
  success: boolean;
  executionTimeMs: number;
  conflictsResolved: number;
  delayReduction: number;
}

export function useOptimizationHistory() {
  const [history, setHistory] = useState<OptimizationHistoryEntry[]>([]);
  
  const addToHistory = useCallback((result: OptimizationResponse, request: OptimizationRequest) => {
    const entry: OptimizationHistoryEntry = {
      id: `opt_${Date.now()}`,
      timestamp: new Date(),
      sectionId: request.section_id,
      objective: request.objective,
      success: result.success,
      executionTimeMs: result.computation_time_ms,
      conflictsResolved: result.conflicts_resolved,
      delayReduction: result.total_delay_reduction_minutes
    };
    
    setHistory(prev => [entry, ...prev.slice(0, 19)]); // Keep last 20 entries
  }, []);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);
  
  return {
    history,
    addToHistory,
    clearHistory
  };
}
