import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrainStatusResponse,
  TrainStatusQuery,
  TrainStatusInfo,
  SystemOverview,
  KPIResponse,
  SectionAnalytics,
  IngestionStatsResponse,
  ApiHealthResponse,
  OptimizationRequest,
  OptimizationResponse,
  SimulationRequest,
  SimulationResponse,
  CreateTrainRequest,
  UpdateTrainRequest,
  TrainListQuery,
  TrainListResponse,
  DeleteTrainResponse,
} from '@/types/api';
import { apiClient, ApiClientError } from '@/lib/api-client';

// ============================================================================
// Generic API Hook
// ============================================================================

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiClientError | null;
  lastUpdated: Date | null;
}

export interface UseApiOptions {
  immediate?: boolean;
  refetchInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = [],
  options: UseApiOptions = {}
) {
  const {
    immediate = true,
    refetchInterval,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
      retryCountRef.current = 0;
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : 
        new ApiClientError(0, 'Unknown error', 'UNKNOWN_ERROR');
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: apiError,
      }));

      // Retry logic for non-auth errors
      if (!apiError.isAuthenticationError() && retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        setTimeout(() => execute(), retryDelay * retryCountRef.current);
      }
    }
  }, [apiCall, retryAttempts, retryDelay]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [...dependencies, immediate]);

  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      intervalRef.current = setInterval(execute, refetchInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [execute, refetchInterval]);

  return {
    ...state,
    refetch,
    execute,
  };
}

// ============================================================================
// Train Management Hooks
// ============================================================================

export function useTrainStatus(
  query?: TrainStatusQuery,
  options?: UseApiOptions
) {
  return useApi(
    () => apiClient.getTrainStatus(query),
    [query],
    options
  );
}

export function useTrain(trainId: string, options?: UseApiOptions) {
  return useApi(
    () => apiClient.getTrainById(trainId),
    [trainId],
    options
  );
}

export function useDelayedTrains(options?: UseApiOptions) {
  return useApi(
    () => apiClient.getDelayedTrains(),
    [],
    options
  );
}

export function useTrainsInSection(sectionId: string, options?: UseApiOptions) {
  return useApi(
    () => apiClient.getTrainsInSection(sectionId),
    [sectionId],
    options
  );
}

export function useAllTrains(
  query?: TrainListQuery,
  options?: UseApiOptions
) {
  return useApi(
    () => apiClient.getAllTrains(query),
    [query],
    options
  );
}

// ============================================================================
// Analytics Hooks
// ============================================================================

export function useKPIs(
  hours?: number,
  sectionId?: string,
  options?: UseApiOptions
) {
  return useApi(
    () => apiClient.getKPIs(hours, sectionId),
    [hours, sectionId],
    options
  );
}

export function useSystemOverview(options?: UseApiOptions) {
  return useApi(
    () => apiClient.getSystemOverview(),
    [],
    options
  );
}

export function useSectionAnalytics(
  hours?: number,
  options?: UseApiOptions
) {
  return useApi(
    () => apiClient.getSectionAnalytics(hours),
    [hours],
    options
  );
}

// ============================================================================
// Data Ingestion Hooks
// ============================================================================

export function useIngestionStats(options?: UseApiOptions) {
  return useApi(
    () => apiClient.getIngestionStats(),
    [],
    options
  );
}

export function useApiHealth(options?: UseApiOptions) {
  return useApi(
    () => apiClient.checkApiHealth(),
    [],
    options
  );
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export interface UseMutationState<T> {
  data: T | null;
  loading: boolean;
  error: ApiClientError | null;
}

export interface UseMutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiClientError) => void;
}

export function useMutation<TRequest, TResponse>(
  mutationFn: (request: TRequest) => Promise<TResponse>,
  options?: UseMutationOptions<TResponse>
) {
  const [state, setState] = useState<UseMutationState<TResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (request: TRequest) => {
    setState({ data: null, loading: true, error: null });

    try {
      const data = await mutationFn(request);
      setState({ data, loading: false, error: null });
      options?.onSuccess?.(data);
      return data;
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : 
        new ApiClientError(0, 'Unknown error', 'UNKNOWN_ERROR');
      
      setState({ data: null, loading: false, error: apiError });
      options?.onError?.(apiError);
      throw apiError;
    }
  }, [mutationFn, options]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    mutate: execute, // Alias for execute
  };
}

// ============================================================================
// Specific Mutation Hooks
// ============================================================================

export function useOptimizeSchedule(options?: UseMutationOptions<OptimizationResponse>) {
  return useMutation(
    (request: OptimizationRequest) => apiClient.optimizeSchedule(request),
    options
  );
}

export function useSimulateScenario(options?: UseMutationOptions<SimulationResponse>) {
  return useMutation(
    (request: SimulationRequest) => apiClient.simulateScenario(request),
    options
  );
}

export function useTriggerIngestion(options?: UseMutationOptions<unknown>) {
  return useMutation(
    () => apiClient.triggerIngestion(),
    options
  );
}

export function useCreateTrain(options?: UseMutationOptions<TrainStatusInfo>) {
  return useMutation(
    (request: CreateTrainRequest) => apiClient.createTrain(request),
    options
  );
}

export function useUpdateTrain(options?: UseMutationOptions<TrainStatusInfo>) {
  return useMutation(
    ({ trainId, request }: { trainId: string; request: UpdateTrainRequest }) => 
      apiClient.updateTrain(trainId, request),
    options
  );
}

export function useDeleteTrain(options?: UseMutationOptions<DeleteTrainResponse>) {
  return useMutation(
    (trainId: string) => apiClient.deleteTrain(trainId),
    options
  );
}

// ============================================================================
// Health Check Hook
// ============================================================================

export function useHealthCheck(options?: UseApiOptions) {
  return useApi(
    () => apiClient.healthCheck(),
    [],
    { refetchInterval: 30000, ...options }
  );
}
