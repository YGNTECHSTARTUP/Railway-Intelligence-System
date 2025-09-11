// ============================================================================
// Railway Intelligence System - Frontend Type Definitions
// ============================================================================

// Geographic and Basic Types
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Enums
export enum TrainPriority {
  Emergency = 1,
  Mail = 2,
  Express = 3,
  Passenger = 4,
  Freight = 5,
  Maintenance = 6
}

export enum TrainStatus {
  Scheduled = "Scheduled",
  Running = "Running",
  Delayed = "Delayed",
  AtStation = "AtStation",
  Terminated = "Terminated",
  Cancelled = "Cancelled"
}

export enum Direction {
  Up = "Up",
  Down = "Down"
}

export enum UserRole {
  Admin = "Admin",
  Operator = "Operator",
  Viewer = "Viewer",
  SystemMonitor = "SystemMonitor"
}

export enum SectionStatus {
  Active = "Active",
  Maintenance = "Maintenance",
  Blocked = "Blocked",
  Closed = "Closed"
}

export enum DisruptionType {
  Weather = "Weather",
  SignalFailure = "SignalFailure",
  TrackMaintenance = "TrackMaintenance",
  Accident = "Accident",
  StrikeFactor = "StrikeFactor",
  PowerFailure = "PowerFailure",
  RollingStockFailure = "RollingStockFailure"
}

export enum TrainEventType {
  Departure = "Departure",
  Arrival = "Arrival",
  Delay = "Delay",
  SpeedChange = "SpeedChange",
  RouteChange = "RouteChange",
  Breakdown = "Breakdown",
  Emergency = "Emergency"
}

export enum EventSeverity {
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Critical = "Critical"
}

export enum ConstraintType {
  SafetyDistance = "SafetyDistance",
  PlatformCapacity = "PlatformCapacity",
  TrainPriority = "TrainPriority",
  MaintenanceWindow = "MaintenanceWindow",
  SpeedLimit = "SpeedLimit",
  CrossingTime = "CrossingTime"
}

export enum OptimizationObjective {
  MinimizeDelay = "MinimizeDelay",
  MaximizeThroughput = "MaximizeThroughput",
  MinimizeEnergyConsumption = "MinimizeEnergyConsumption",
  BalancedOptimal = "BalancedOptimal"
}

export enum WhatIfChangeType {
  AddTrain = "AddTrain",
  RemoveTrain = "RemoveTrain",
  DelayTrain = "DelayTrain",
  ChangeRoute = "ChangeRoute",
  BlockSection = "BlockSection",
  ChangeCapacity = "ChangeCapacity"
}

export enum TrackType {
  Single = "Single",
  Double = "Double",
  Multiple = "Multiple"
}

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
  expires_at: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_login?: string;
  active: boolean;
}

// Train Types
export interface Train {
  id: string;
  train_number: number;
  name: string;
  priority: TrainPriority;
  current_section: string;
  position: GeoPoint;
  delay_minutes: number;
  eta_next_station: string;
  speed_kmh: number;
  direction: Direction;
  status: TrainStatus;
  route: string[];
  created_at: string;
  updated_at: string;
}

export interface TrainStatusInfo {
  id: string;
  train_number: number;
  name: string;
  priority: TrainPriority;
  current_section: string;
  position: GeoPoint;
  delay_minutes: number;
  eta_next_station: string;
  speed_kmh: number;
  direction: Direction;
  status: TrainStatus;
  route: string[];
  updated_at: string;
}

export interface TrainStatusResponse {
  trains: TrainStatusInfo[];
  total_count: number;
  delayed_count: number;
  on_time_count: number;
  average_delay_minutes: number;
  timestamp: string;
}

export interface TrainStatusQuery {
  status?: TrainStatus;
  section_id?: string;
  priority?: TrainPriority;
  delayed_only?: boolean;
  limit?: number;
}

export interface TrainUpdateRequest {
  position?: GeoPoint;
  speed_kmh?: number;
  delay_minutes?: number;
  status?: TrainStatus;
  current_section?: string;
}

export interface CreateTrainRequest {
  train_number: number;
  name: string;
  priority: TrainPriority;
  route: string[];
  current_section?: string;
  position?: GeoPoint;
}

export interface UpdateTrainRequest {
  train_number: number;
  name: string;
  priority: TrainPriority;
  route: string[];
  current_section?: string;
  position?: GeoPoint;
  status?: TrainStatus;
  direction?: Direction;
}

export interface TrainListQuery {
  page?: number;
  per_page?: number;
  status?: TrainStatus;
  search?: string;
}

export interface TrainListResponse {
  trains: TrainStatusInfo[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
  timestamp: string;
}

export interface DeleteTrainResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// Optimization Types
export interface OptimizationRequest {
  section_id: string;
  trains: Train[];
  constraints: OptimizationConstraint[];
  objective: OptimizationObjective;
  time_horizon_minutes: number;
}

export interface OptimizationConstraint {
  constraint_type: ConstraintType;
  priority: number;
  parameters: Record<string, unknown>;
}

export interface OptimizationResponse {
  success: boolean;
  optimized_schedule: TrainScheduleUpdate[];
  objective_value: number;
  computation_time_ms: number;
  conflicts_resolved: number;
  total_delay_reduction_minutes: number;
  message: string;
}

export interface TrainScheduleUpdate {
  train_id: string;
  new_departure_time: string;
  new_arrival_time: string;
  assigned_platform?: string;
  speed_profile: SpeedProfilePoint[];
  delay_adjustment_minutes: number;
}

export interface SpeedProfilePoint {
  position_km: number;
  speed_kmh: number;
  time_offset_minutes: number;
}

// Simulation Types
export interface SimulationRequest {
  scenario_name: string;
  section_id: string;
  base_trains: Train[];
  what_if_changes: WhatIfChange[];
  simulation_duration_hours: number;
}

export interface WhatIfChange {
  change_type: WhatIfChangeType;
  train_id?: string;
  section_id?: string;
  parameters: Record<string, unknown>;
}

export interface SimulationResponse {
  success: boolean;
  scenario_name: string;
  simulation_results: SimulationResults;
  performance_comparison: PerformanceComparison;
  recommendations: string[];
}

export interface SimulationResults {
  total_trains_processed: number;
  average_delay_minutes: number;
  throughput_trains_per_hour: number;
  conflicts_detected: number;
  utilization_percent: number;
  timeline_events: SimulationEvent[];
}

export interface SimulationEvent {
  timestamp: string;
  event_type: string;
  train_id: string;
  section_id: string;
  description: string;
}

export interface PerformanceComparison {
  baseline_delay_minutes: number;
  scenario_delay_minutes: number;
  improvement_percent: number;
  baseline_throughput: number;
  scenario_throughput: number;
  throughput_improvement_percent: number;
}

// Analytics Types
export interface AnalyticsQuery {
  hours?: number;
  section_id?: string;
}

export interface KPIResponse {
  punctuality_percent: number;
  average_delay_minutes: number;
  throughput_trains_per_hour: number;
  utilization_percent: number;
  conflicts_resolved: number;
  total_trains_processed: number;
  period_hours: number;
  timestamp: string;
}

export interface SystemOverview {
  total_active_trains: number;
  delayed_trains: number;
  on_time_trains: number;
  total_sections: number;
  active_disruptions: number;
  system_utilization: number;
  average_speed_kmh: number;
  last_updated: string;
}

export interface SectionAnalytics {
  section_id: string;
  section_name: string;
  trains_processed: number;
  average_delay: number;
  utilization_percent: number;
  conflicts: number;
  capacity_utilization: number;
}

// Section Types
export interface RailwaySection {
  id: string;
  name: string;
  start_coordinates: GeoPoint;
  end_coordinates: GeoPoint;
  length_km: number;
  track_type: TrackType;
  max_speed_kmh: number;
  capacity_trains_per_hour: number;
  current_occupancy: number;
  status: SectionStatus;
  signals: string[];
  created_at: string;
  updated_at: string;
}

export interface SectionState {
  section_id: string;
  status: string;
  occupancy: number;
  capacity: number;
  trains: string[];
}

// Data Ingestion Types
export interface IngestionReport {
  trains_processed: number;
  stations_processed: number;
  events_generated: number;
  errors_encountered: number;
  processing_time_ms: number;
  timestamp: string;
}

export interface IngestionTriggerResponse {
  status: string;
  message: string;
  report: IngestionReport;
}

export interface IngestionStats {
  total_records_processed: number;
  successful_ingestions: number;
  failed_ingestions: number;
  average_processing_time_ms: number;
  last_ingestion: string;
  uptime_hours: number;
}

export interface IngestionStatsResponse {
  status: string;
  stats: IngestionStats;
}

export interface ApiHealthResponse {
  status: string;
  overall_health: string;
  api_status: Record<string, boolean>;
  timestamp: string;
}

// Event Types
export interface TrainEvent {
  id: string;
  train_id: string;
  event_type: TrainEventType;
  location: GeoPoint;
  station_code?: string;
  section_id?: string;
  timestamp: string;
  metadata: EventMetadata;
}

export interface EventMetadata {
  speed_kmh?: number;
  delay_minutes?: number;
  platform?: number;
  reason?: string;
  severity: EventSeverity;
}

export interface DisruptionEvent {
  id: string;
  disruption_type: DisruptionType;
  affected_sections: string[];
  affected_trains: string[];
  start_time: string;
  end_time?: string;
  impact_level: number;
  description: string;
  response_actions: ResponseAction[];
}

export interface ResponseAction {
  action_type: string;
  description: string;
  taken_at: string;
  taken_by: string;
}

// WebSocket Message Types
export type WsMessage = 
  | WsSubscribeMessage
  | WsSubscribeSectionMessage
  | WsTrainUpdateMessage
  | WsSectionUpdateMessage
  | WsDisruptionAlertMessage
  | WsSystemAlertMessage
  | WsConnectedMessage
  | WsErrorMessage;

export interface WsSubscribeMessage {
  type: "Subscribe";
  train_ids: string[];
}

export interface WsSubscribeSectionMessage {
  type: "SubscribeSection";
  section_ids: string[];
}

export interface WsTrainUpdateMessage {
  type: "TrainUpdate";
  train_id: string;
  position: GeoPoint;
  speed_kmh: number;
  delay_minutes: number;
  status: TrainStatus;
  timestamp: string;
}

export interface WsSectionUpdateMessage {
  type: "SectionUpdate";
  section_id: string;
  occupancy: number;
  conflicts: string[];
  timestamp: string;
}

export interface WsDisruptionAlertMessage {
  type: "DisruptionAlert";
  disruption_id: string;
  disruption_type: DisruptionType;
  affected_sections: string[];
  impact_level: number;
  description: string;
  timestamp: string;
}

export interface WsSystemAlertMessage {
  type: "SystemAlert";
  alert_type: string;
  message: string;
  severity: string;
  timestamp: string;
}

export interface WsConnectedMessage {
  type: "Connected";
  client_id: string;
  timestamp: string;
}

export interface WsErrorMessage {
  type: "Error";
  message: string;
  timestamp: string;
}

// API Error Types
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

// Health Check Types
export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
}

// Utility Types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  loading: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Dashboard Metrics Types
export interface DashboardMetrics {
  system_status: "Operational" | "Degraded" | "Offline";
  avg_response_time: string;
  optimization_rate: string;
  active_users: number;
  last_updated: string;
}

export interface FeatureMetric {
  label: string;
  value: string;
  change?: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  href: string;
  icon: string;
  status: 'implemented' | 'active' | 'beta';
  metrics?: FeatureMetric[];
}

// Configuration Types
export interface ApiConfig {
  baseUrl: string;
  wsUrl: string;
  timeout: number;
  retryAttempts: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
}

// Query and Filter Types
export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

export interface TrainFilter extends TrainStatusQuery, DateRangeFilter {
  search?: string;
  sort_by?: 'name' | 'delay' | 'priority' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface AnalyticsFilter extends AnalyticsQuery, DateRangeFilter {
  metric_type?: 'delay' | 'throughput' | 'utilization';
  aggregation?: 'hour' | 'day' | 'week';
}

// Form Types
export interface OptimizationFormData {
  section_id: string;
  train_ids: string[];
  constraints: {
    safety_distance: boolean;
    platform_capacity: boolean;
    train_priority: boolean;
    maintenance_window: boolean;
    speed_limit: boolean;
    crossing_time: boolean;
  };
  objective: OptimizationObjective;
  time_horizon_minutes: number;
}

export interface SimulationFormData {
  scenario_name: string;
  section_id: string;
  train_ids: string[];
  changes: {
    type: WhatIfChangeType;
    parameters: Record<string, unknown>;
  }[];
  duration_hours: number;
}

// Export utility type helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
