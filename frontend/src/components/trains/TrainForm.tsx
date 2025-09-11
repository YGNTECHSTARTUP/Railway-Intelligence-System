import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  MapPin, 
  Route,
  AlertCircle,
  Train,
  Clock,
  Gauge,
  Loader2
} from "lucide-react";
import { 
  TrainStatusInfo, 
  TrainStatus, 
  TrainPriority, 
  Direction,
  CreateTrainRequest,
  UpdateTrainRequest,
  GeoPoint 
} from "@/types/api";

interface TrainFormProps {
  mode: 'create' | 'edit' | 'view';
  initialData?: TrainStatusInfo | null;
  onSubmit: (data: CreateTrainRequest | UpdateTrainRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface TrainFormData {
  train_number: string;
  name: string;
  priority: TrainPriority | '';
  route: string[];
  current_section: string;
  position: {
    latitude: string;
    longitude: string;
  };
  status: TrainStatus | '';
  direction: Direction | '';
}

interface FormErrors {
  train_number?: string;
  name?: string;
  priority?: string;
  route?: string;
  current_section?: string;
  position?: string;
  status?: string;
  direction?: string;
}

const PRIORITY_OPTIONS = [
  { value: TrainPriority.Emergency, label: 'Emergency', color: 'bg-red-500' },
  { value: TrainPriority.Mail, label: 'Mail', color: 'bg-purple-500' },
  { value: TrainPriority.Express, label: 'Express', color: 'bg-blue-500' },
  { value: TrainPriority.Passenger, label: 'Passenger', color: 'bg-green-500' },
  { value: TrainPriority.Freight, label: 'Freight', color: 'bg-orange-500' },
  { value: TrainPriority.Maintenance, label: 'Maintenance', color: 'bg-gray-500' }
];

const STATUS_OPTIONS = [
  { value: TrainStatus.Scheduled, label: 'Scheduled' },
  { value: TrainStatus.Running, label: 'Running' },
  { value: TrainStatus.Delayed, label: 'Delayed' },
  { value: TrainStatus.AtStation, label: 'At Station' },
  { value: TrainStatus.Terminated, label: 'Terminated' },
  { value: TrainStatus.Cancelled, label: 'Cancelled' }
];

const DIRECTION_OPTIONS = [
  { value: Direction.Up, label: 'Up' },
  { value: Direction.Down, label: 'Down' }
];

export default function TrainForm({ 
  mode, 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false 
}: TrainFormProps) {
  const [formData, setFormData] = useState<TrainFormData>({
    train_number: '',
    name: '',
    priority: '',
    route: [],
    current_section: '',
    position: {
      latitude: '',
      longitude: ''
    },
    status: '',
    direction: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [routeInput, setRouteInput] = useState('');
  
  const isReadOnly = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';
  
  // Initialize form data from initialData
  useEffect(() => {
    if (initialData && (isEdit || mode === 'view')) {
      setFormData({
        train_number: initialData.train_number.toString(),
        name: initialData.name,
        priority: initialData.priority,
        route: initialData.route,
        current_section: initialData.current_section,
        position: {
          latitude: initialData.position.latitude.toString(),
          longitude: initialData.position.longitude.toString()
        },
        status: initialData.status,
        direction: initialData.direction
      });
      setRouteInput(initialData.route.join(', '));
    }
  }, [initialData, mode]);
  
  const handleInputChange = (field: keyof TrainFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const handleRouteChange = (value: string) => {
    setRouteInput(value);
    const routes = value.split(',').map(s => s.trim()).filter(s => s);
    handleInputChange('route', routes);
  };
  
  const addRouteStation = () => {
    const station = prompt("Enter station code:");
    if (station && station.trim()) {
      const newRoute = [...formData.route, station.trim()];
      handleInputChange('route', newRoute);
      setRouteInput(newRoute.join(', '));
    }
  };
  
  const removeRouteStation = (index: number) => {
    const newRoute = formData.route.filter((_, i) => i !== index);
    handleInputChange('route', newRoute);
    setRouteInput(newRoute.join(', '));
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Train number validation
    const trainNumber = parseInt(formData.train_number);
    if (!formData.train_number || isNaN(trainNumber) || trainNumber <= 0) {
      newErrors.train_number = 'Valid train number is required';
    }
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Train name is required';
    }
    
    // Priority validation
    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    }
    
    // Route validation
    if (formData.route.length === 0) {
      newErrors.route = 'At least one station in route is required';
    }
    
    // Position validation
    const lat = parseFloat(formData.position.latitude);
    const lng = parseFloat(formData.position.longitude);
    if (formData.position.latitude && (isNaN(lat) || lat < -90 || lat > 90)) {
      newErrors.position = 'Latitude must be between -90 and 90';
    }
    if (formData.position.longitude && (isNaN(lng) || lng < -180 || lng > 180)) {
      newErrors.position = 'Longitude must be between -180 and 180';
    }
    
    // Status validation for edit mode
    if (isEdit && !formData.status) {
      newErrors.status = 'Status is required';
    }
    
    // Direction validation for edit mode  
    if (isEdit && !formData.direction) {
      newErrors.direction = 'Direction is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const position: GeoPoint | undefined = 
      formData.position.latitude && formData.position.longitude ? {
        latitude: parseFloat(formData.position.latitude),
        longitude: parseFloat(formData.position.longitude)
      } : undefined;
    
    if (isCreate) {
      const createData: CreateTrainRequest = {
        train_number: parseInt(formData.train_number),
        name: formData.name.trim(),
        priority: formData.priority as TrainPriority,
        route: formData.route,
        current_section: formData.current_section.trim() || undefined,
        position
      };
      onSubmit(createData);
    } else if (isEdit) {
      const updateData: UpdateTrainRequest = {
        train_number: parseInt(formData.train_number),
        name: formData.name.trim(),
        priority: formData.priority as TrainPriority,
        route: formData.route,
        current_section: formData.current_section.trim() || undefined,
        position,
        status: formData.status as TrainStatus,
        direction: formData.direction as Direction
      };
      onSubmit(updateData);
    }
  };
  
  const canEditField = (field: string): boolean => {
    if (isReadOnly) return false;
    if (isCreate) return true;
    
    // In edit mode, check if train is running
    if (initialData?.status === TrainStatus.Running) {
      // Only allow editing of certain fields for running trains
      return ['current_section', 'position'].includes(field);
    }
    
    return true;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Train className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="train_number">
                Train Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="train_number"
                type="number"
                value={formData.train_number}
                onChange={(e) => handleInputChange('train_number', e.target.value)}
                placeholder="Enter train number"
                disabled={!canEditField('train_number') || loading}
                className={errors.train_number ? 'border-red-500' : ''}
              />
              {errors.train_number && (
                <p className="text-sm text-red-500">{errors.train_number}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">
                Train Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter train name"
                disabled={!canEditField('name') || loading}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.priority?.toString() || ''} 
                onValueChange={(value) => handleInputChange('priority', parseInt(value))}
                disabled={!canEditField('priority') || loading}
              >
                <SelectTrigger className={errors.priority ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-red-500">{errors.priority}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="current_section">Current Section</Label>
              <Input
                id="current_section"
                value={formData.current_section}
                onChange={(e) => handleInputChange('current_section', e.target.value)}
                placeholder="Enter current section ID"
                disabled={!canEditField('current_section') || loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Route className="h-5 w-5" />
            <span>Route Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route">
              Route Stations <span className="text-red-500">*</span>
            </Label>
            <div className="flex space-x-2">
              <Input
                id="route"
                value={routeInput}
                onChange={(e) => handleRouteChange(e.target.value)}
                placeholder="Enter station codes separated by commas (e.g., STA001, STA002, STA003)"
                disabled={!canEditField('route') || loading}
                className={errors.route ? 'border-red-500' : ''}
              />
              {!isReadOnly && canEditField('route') && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addRouteStation}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            {errors.route && (
              <p className="text-sm text-red-500">{errors.route}</p>
            )}
          </div>
          
          {/* Route Station List */}
          {formData.route.length > 0 && (
            <div className="space-y-2">
              <Label>Route Stations ({formData.route.length})</Label>
              <div className="flex flex-wrap gap-2">
                {formData.route.map((station, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="flex items-center space-x-1 py-1 px-2"
                  >
                    <span className="text-xs font-mono">{index + 1}.</span>
                    <span>{station}</span>
                    {!isReadOnly && canEditField('route') && (
                      <button
                        type="button"
                        onClick={() => removeRouteStation(index)}
                        disabled={loading}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Position & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Position & Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.position.latitude}
                onChange={(e) => handleInputChange('position', {
                  ...formData.position,
                  latitude: e.target.value
                })}
                placeholder="e.g., 28.6139"
                disabled={!canEditField('position') || loading}
                className={errors.position ? 'border-red-500' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.position.longitude}
                onChange={(e) => handleInputChange('position', {
                  ...formData.position,
                  longitude: e.target.value
                })}
                placeholder="e.g., 77.2090"
                disabled={!canEditField('position') || loading}
                className={errors.position ? 'border-red-500' : ''}
              />
              {errors.position && (
                <p className="text-sm text-red-500">{errors.position}</p>
              )}
            </div>
          </div>
          
          {/* Status and Direction (only for edit mode) */}
          {(isEdit || mode === 'view') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status {isEdit && <span className="text-red-500">*</span>}
                </Label>
                <Select 
                  value={formData.status || ''} 
                  onValueChange={(value) => handleInputChange('status', value)}
                  disabled={!canEditField('status') || loading}
                >
                  <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-500">{errors.status}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="direction">
                  Direction {isEdit && <span className="text-red-500">*</span>}
                </Label>
                <Select 
                  value={formData.direction || ''} 
                  onValueChange={(value) => handleInputChange('direction', value)}
                  disabled={!canEditField('direction') || loading}
                >
                  <SelectTrigger className={errors.direction ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.direction && (
                  <p className="text-sm text-red-500">{errors.direction}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Runtime Information (view mode only) */}
      {mode === 'view' && initialData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gauge className="h-5 w-5" />
              <span>Runtime Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Current Speed</Label>
                <p className="text-lg font-semibold">{initialData.speed_kmh} km/h</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Delay</Label>
                <p className={`text-lg font-semibold ${initialData.delay_minutes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {initialData.delay_minutes > 0 ? `+${initialData.delay_minutes}` : initialData.delay_minutes} min
                </p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Last Updated</Label>
                <p className="text-sm text-gray-600">
                  {new Date(initialData.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings for Running Trains */}
      {isEdit && initialData?.status === TrainStatus.Running && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            This train is currently running. Only position and section updates are allowed.
          </AlertDescription>
        </Alert>
      )}

      {/* Form Actions */}
      {!isReadOnly && (
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isCreate ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isCreate ? 'Create Train' : 'Update Train'}
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
