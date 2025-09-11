import {
  ApiConfig,
  LoginRequest,
  LoginResponse,
  UserInfo,
  TrainStatusResponse,
  TrainStatusQuery,
  TrainStatusInfo,
  TrainUpdateRequest,
  CreateTrainRequest,
  UpdateTrainRequest,
  TrainListQuery,
  TrainListResponse,
  DeleteTrainResponse,
  OptimizationRequest,
  OptimizationResponse,
  SimulationRequest,
  SimulationResponse,
  KPIResponse,
  SystemOverview,
  SectionAnalytics,
  AnalyticsQuery,
  IngestionTriggerResponse,
  IngestionStatsResponse,
  ApiHealthResponse,
  SectionState,
  HealthCheckResponse,
  ApiError,
} from '@/types/api';

export class RailwayApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private config: ApiConfig;

  constructor(config?: Partial<ApiConfig>) {
    this.baseUrl = config?.baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    this.config = {
      baseUrl: this.baseUrl,
      wsUrl: process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:3001',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
    
    // Load token from storage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'railway_auth_token');
    }
  }

  // ============================================================================
  // Authentication & Token Management
  // ============================================================================

  public setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'railway_auth_token', token);
    }
  }

  public clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'railway_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  // ============================================================================
  // HTTP Request Helper
  // ============================================================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add auth token if available
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiClientError(
          response.status,
          errorData?.error?.message || response.statusText,
          errorData?.error?.code || 'UNKNOWN_ERROR',
          errorData?.error?.details
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError(408, 'Request timeout', 'TIMEOUT_ERROR');
      }
      
      throw new ApiClientError(0, 'Network error', 'NETWORK_ERROR');
    }
  }

  // ============================================================================
  // Authentication APIs
  // ============================================================================

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.setToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/v1/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearToken();
    }
  }

  async getUserInfo(): Promise<UserInfo> {
    return this.request<UserInfo>('/api/v1/auth/user');
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health');
  }

  // ============================================================================
  // Train Management APIs
  // ============================================================================

  async getTrainStatus(params?: TrainStatusQuery): Promise<TrainStatusResponse> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    return this.request<TrainStatusResponse>(`/api/v1/trains/status${queryString}`);
  }

  async getTrainById(trainId: string): Promise<TrainStatusInfo> {
    return this.request<TrainStatusInfo>(`/api/v1/trains/${trainId}`);
  }

  async updateTrainStatus(trainId: string, update: TrainUpdateRequest): Promise<TrainStatusInfo> {
    return this.request<TrainStatusInfo>(`/api/v1/trains/${trainId}/update`, {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  async getDelayedTrains(): Promise<TrainStatusResponse> {
    return this.request<TrainStatusResponse>('/api/v1/trains/delayed');
  }

  async getTrainsInSection(sectionId: string): Promise<TrainStatusResponse> {
    return this.request<TrainStatusResponse>(`/api/v1/trains/section/${sectionId}`);
  }

  async createTrain(train: CreateTrainRequest): Promise<TrainStatusInfo> {
    return this.request<TrainStatusInfo>('/api/v1/trains', {
      method: 'POST',
      body: JSON.stringify(train),
    });
  }

  async getAllTrains(query?: TrainListQuery): Promise<TrainListResponse> {
    const queryString = query ? '?' + new URLSearchParams(
      Object.entries(query)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    return this.request<TrainListResponse>(`/api/v1/trains${queryString}`);
  }

  async updateTrain(trainId: string, train: UpdateTrainRequest): Promise<TrainStatusInfo> {
    return this.request<TrainStatusInfo>(`/api/v1/trains/${trainId}`, {
      method: 'PUT',
      body: JSON.stringify(train),
    });
  }

  async deleteTrain(trainId: string): Promise<DeleteTrainResponse> {
    return this.request<DeleteTrainResponse>(`/api/v1/trains/${trainId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Optimization APIs
  // ============================================================================

  async optimizeSchedule(request: OptimizationRequest): Promise<OptimizationResponse> {
    return this.request<OptimizationResponse>('/api/v1/optimize/schedule', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ============================================================================
  // Simulation APIs
  // ============================================================================

  async simulateScenario(request: SimulationRequest): Promise<SimulationResponse> {
    return this.request<SimulationResponse>('/api/v1/simulate/scenario', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ============================================================================
  // Analytics APIs
  // ============================================================================

  async getKPIs(hours?: number, sectionId?: string): Promise<KPIResponse> {
    const params = new URLSearchParams();
    if (hours !== undefined) params.append('hours', hours.toString());
    if (sectionId) params.append('section_id', sectionId);
    
    const queryString = params.toString();
    return this.request<KPIResponse>(`/api/v1/analytics/kpis${queryString ? '?' + queryString : ''}`);
  }

  async getSystemOverview(): Promise<SystemOverview> {
    return this.request<SystemOverview>('/api/v1/analytics/overview');
  }

  async getSectionAnalytics(hours?: number): Promise<SectionAnalytics[]> {
    const params = new URLSearchParams();
    if (hours !== undefined) params.append('hours', hours.toString());
    
    const queryString = params.toString();
    return this.request<SectionAnalytics[]>(`/api/v1/analytics/sections${queryString ? '?' + queryString : ''}`);
  }

  // ============================================================================
  // Data Ingestion APIs
  // ============================================================================

  async triggerIngestion(): Promise<IngestionTriggerResponse> {
    return this.request<IngestionTriggerResponse>('/api/v1/ingestion/trigger', {
      method: 'POST',
    });
  }

  async getIngestionStats(): Promise<IngestionStatsResponse> {
    return this.request<IngestionStatsResponse>('/api/v1/ingestion/stats');
  }

  async checkApiHealth(): Promise<ApiHealthResponse> {
    return this.request<ApiHealthResponse>('/api/v1/ingestion/health');
  }

  // ============================================================================
  // Section Management APIs
  // ============================================================================

  async getSectionState(sectionId: string): Promise<SectionState> {
    return this.request<SectionState>(`/api/v1/sections/${sectionId}/state`);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public isTokenExpired(): boolean {
    if (!this.token) return true;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }

  public async validateConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  public isAuthenticationError(): boolean {
    return this.status === 401 || this.code === 'UNAUTHORIZED';
  }

  public isValidationError(): boolean {
    return this.status === 400 || this.code === 'VALIDATION_ERROR';
  }

  public isNotFoundError(): boolean {
    return this.status === 404 || this.code === 'NOT_FOUND';
  }

  public isForbiddenError(): boolean {
    return this.status === 403 || this.code === 'FORBIDDEN';
  }

  public isNetworkError(): boolean {
    return this.status === 0 || this.code === 'NETWORK_ERROR';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const apiClient = new RailwayApiClient();
export default apiClient;
