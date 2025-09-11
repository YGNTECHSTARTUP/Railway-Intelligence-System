"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Route,
  Shield,
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { OptimizationConstraint, ConstraintType } from '@/types/api';

interface ConstraintsConfigProps {
  constraints: OptimizationConstraint[];
  onConstraintsChange: (constraints: OptimizationConstraint[]) => void;
}

interface ConstraintTemplate {
  type: ConstraintType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPriority: number;
  defaultParameters: Record<string, unknown>;
  parameterDefinitions: ParameterDefinition[];
}

interface ParameterDefinition {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select' | 'boolean';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  unit?: string;
  description?: string;
}

const constraintTemplates: ConstraintTemplate[] = [
  {
    type: ConstraintType.SafetyDistance,
    name: 'Safety Distance',
    description: 'Maintain minimum distance between trains for safety',
    icon: Shield,
    defaultPriority: 1,
    defaultParameters: {
      min_distance_seconds: 300,
      apply_to_all: true,
      emergency_override: false
    },
    parameterDefinitions: [
      {
        key: 'min_distance_seconds',
        label: 'Minimum Distance',
        type: 'number',
        default: 300,
        min: 60,
        max: 1800,
        step: 30,
        unit: 'seconds',
        description: 'Minimum time gap between trains'
      },
      {
        key: 'apply_to_all',
        label: 'Apply to All Trains',
        type: 'boolean',
        default: true,
        description: 'Apply this constraint to all train types'
      },
      {
        key: 'emergency_override',
        label: 'Emergency Override',
        type: 'boolean',
        default: false,
        description: 'Allow emergency trains to bypass this constraint'
      }
    ]
  },
  {
    type: ConstraintType.PlatformCapacity,
    name: 'Platform Capacity',
    description: 'Limit number of trains per platform',
    icon: Users,
    defaultPriority: 2,
    defaultParameters: {
      max_trains_per_platform: 1,
      station_id: '',
      buffer_time_minutes: 5
    },
    parameterDefinitions: [
      {
        key: 'max_trains_per_platform',
        label: 'Max Trains per Platform',
        type: 'number',
        default: 1,
        min: 1,
        max: 10,
        step: 1,
        description: 'Maximum number of trains allowed simultaneously'
      },
      {
        key: 'station_id',
        label: 'Station ID',
        type: 'text',
        default: '',
        description: 'Specific station ID (leave empty for all stations)'
      },
      {
        key: 'buffer_time_minutes',
        label: 'Buffer Time',
        type: 'number',
        default: 5,
        min: 0,
        max: 30,
        step: 1,
        unit: 'minutes',
        description: 'Extra time buffer between platform assignments'
      }
    ]
  },
  {
    type: ConstraintType.TrainPriority,
    name: 'Train Priority',
    description: 'Prioritize certain train types over others',
    icon: Zap,
    defaultPriority: 3,
    defaultParameters: {
      priority_order: 'Emergency,Express,Mail,Passenger,Freight',
      strict_enforcement: true,
      delay_tolerance_minutes: 10
    },
    parameterDefinitions: [
      {
        key: 'priority_order',
        label: 'Priority Order',
        type: 'text',
        default: 'Emergency,Express,Mail,Passenger,Freight',
        description: 'Comma-separated list of train types in priority order'
      },
      {
        key: 'strict_enforcement',
        label: 'Strict Enforcement',
        type: 'boolean',
        default: true,
        description: 'Enforce priority strictly or allow flexibility'
      },
      {
        key: 'delay_tolerance_minutes',
        label: 'Delay Tolerance',
        type: 'number',
        default: 10,
        min: 0,
        max: 60,
        step: 5,
        unit: 'minutes',
        description: 'Maximum delay acceptable for priority enforcement'
      }
    ]
  },
  {
    type: ConstraintType.MaintenanceWindow,
    name: 'Maintenance Window',
    description: 'Avoid scheduling during maintenance periods',
    icon: Wrench,
    defaultPriority: 1,
    defaultParameters: {
      start_time: '02:00',
      end_time: '04:00',
      affected_sections: '',
      buffer_minutes: 30
    },
    parameterDefinitions: [
      {
        key: 'start_time',
        label: 'Start Time',
        type: 'text',
        default: '02:00',
        description: 'Maintenance window start time (HH:MM format)'
      },
      {
        key: 'end_time',
        label: 'End Time',
        type: 'text',
        default: '04:00',
        description: 'Maintenance window end time (HH:MM format)'
      },
      {
        key: 'affected_sections',
        label: 'Affected Sections',
        type: 'text',
        default: '',
        description: 'Comma-separated section IDs (empty for all)'
      },
      {
        key: 'buffer_minutes',
        label: 'Buffer Time',
        type: 'number',
        default: 30,
        min: 0,
        max: 120,
        step: 15,
        unit: 'minutes',
        description: 'Extra buffer time around maintenance window'
      }
    ]
  },
  {
    type: ConstraintType.SpeedLimit,
    name: 'Speed Limit',
    description: 'Enforce maximum speed limits on sections',
    icon: Route,
    defaultPriority: 2,
    defaultParameters: {
      max_speed_kmh: 80,
      section_id: '',
      weather_adjustment: false,
      adjustment_factor: 0.8
    },
    parameterDefinitions: [
      {
        key: 'max_speed_kmh',
        label: 'Maximum Speed',
        type: 'number',
        default: 80,
        min: 20,
        max: 200,
        step: 10,
        unit: 'km/h',
        description: 'Maximum allowed speed'
      },
      {
        key: 'section_id',
        label: 'Section ID',
        type: 'text',
        default: '',
        description: 'Specific section ID (empty for all sections)'
      },
      {
        key: 'weather_adjustment',
        label: 'Weather Adjustment',
        type: 'boolean',
        default: false,
        description: 'Adjust speed based on weather conditions'
      },
      {
        key: 'adjustment_factor',
        label: 'Adjustment Factor',
        type: 'number',
        default: 0.8,
        min: 0.1,
        max: 1.0,
        step: 0.1,
        description: 'Speed reduction factor for adverse conditions'
      }
    ]
  },
  {
    type: ConstraintType.CrossingTime,
    name: 'Crossing Time',
    description: 'Manage train crossing and overtaking',
    icon: Clock,
    defaultPriority: 2,
    defaultParameters: {
      min_crossing_time_minutes: 5,
      overtaking_allowed: true,
      priority_override: true
    },
    parameterDefinitions: [
      {
        key: 'min_crossing_time_minutes',
        label: 'Minimum Crossing Time',
        type: 'number',
        default: 5,
        min: 1,
        max: 30,
        step: 1,
        unit: 'minutes',
        description: 'Minimum time required for safe crossing'
      },
      {
        key: 'overtaking_allowed',
        label: 'Overtaking Allowed',
        type: 'boolean',
        default: true,
        description: 'Allow faster trains to overtake slower ones'
      },
      {
        key: 'priority_override',
        label: 'Priority Override',
        type: 'boolean',
        default: true,
        description: 'Allow high-priority trains to override crossing rules'
      }
    ]
  }
];

export function ConstraintsConfig({ constraints, onConstraintsChange }: ConstraintsConfigProps) {
  const [editingConstraint, setEditingConstraint] = useState<OptimizationConstraint | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedConstraint, setExpandedConstraint] = useState<string | null>(null);

  const addConstraint = (template: ConstraintTemplate) => {
    const newConstraint: OptimizationConstraint = {
      constraint_type: template.type,
      priority: template.defaultPriority,
      parameters: { ...template.defaultParameters }
    };

    onConstraintsChange([...constraints, newConstraint]);
    setShowAddDialog(false);
  };

  const updateConstraint = (index: number, updatedConstraint: OptimizationConstraint) => {
    const updated = [...constraints];
    updated[index] = updatedConstraint;
    onConstraintsChange(updated);
    setEditingConstraint(null);
  };

  const removeConstraint = (index: number) => {
    const updated = constraints.filter((_, i) => i !== index);
    onConstraintsChange(updated);
  };

  const getConstraintTemplate = (type: ConstraintType) => {
    return constraintTemplates.find(t => t.type === type);
  };

  const getPriorityColor = (priority: number): string => {
    if (priority === 1) return 'bg-red-500';
    if (priority <= 3) return 'bg-orange-500';
    if (priority <= 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const renderParameterInput = (
    paramDef: ParameterDefinition, 
    value: unknown, 
    onChange: (value: unknown) => void
  ) => {
    switch (paramDef.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{paramDef.label}</Label>
              <span className="text-sm text-muted-foreground">
                {value} {paramDef.unit}
              </span>
            </div>
            {paramDef.min !== undefined && paramDef.max !== undefined ? (
              <Slider
                value={[Number(value)]}
                onValueChange={([val]) => onChange(val)}
                min={paramDef.min}
                max={paramDef.max}
                step={paramDef.step || 1}
                className="w-full"
              />
            ) : (
              <Input
                type="number"
                value={String(value)}
                onChange={(e) => onChange(Number(e.target.value))}
                min={paramDef.min}
                max={paramDef.max}
                step={paramDef.step}
              />
            )}
            {paramDef.description && (
              <p className="text-xs text-muted-foreground">{paramDef.description}</p>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Label>{paramDef.label}</Label>
            <Input
              value={String(value)}
              onChange={(e) => onChange(e.target.value)}
            />
            {paramDef.description && (
              <p className="text-xs text-muted-foreground">{paramDef.description}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div>
              <Label>{paramDef.label}</Label>
              {paramDef.description && (
                <p className="text-xs text-muted-foreground">{paramDef.description}</p>
              )}
            </div>
            <Button
              variant={Boolean(value) ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(!value)}
            >
              {Boolean(value) ? "Enabled" : "Disabled"}
            </Button>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label>{paramDef.label}</Label>
            <Select value={String(value)} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paramDef.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paramDef.description && (
              <p className="text-xs text-muted-foreground">{paramDef.description}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Optimization Constraints</span>
        </CardTitle>
        <CardDescription>
          Configure constraints that the optimizer must respect. Active: {constraints.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Constraint Button */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Constraint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Optimization Constraint</DialogTitle>
              <DialogDescription>
                Choose a constraint type to add to the optimization process
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {constraintTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card 
                    key={template.type}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => addConstraint(template)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-3">
                        <Icon className="w-5 h-5 text-primary mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={`mt-2 ${getPriorityColor(template.defaultPriority)} text-white`}
                          >
                            Priority {template.defaultPriority}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Active Constraints */}
        <div className="space-y-2">
          {constraints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No constraints configured</p>
              <p className="text-sm">Add constraints to guide the optimization process</p>
            </div>
          ) : (
            constraints.map((constraint, index) => {
              const template = getConstraintTemplate(constraint.constraint_type);
              const Icon = template?.icon || Settings;
              const isExpanded = expandedConstraint === `${constraint.constraint_type}-${index}`;
              
              return (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-medium">{template?.name || constraint.constraint_type}</h4>
                          <p className="text-sm text-muted-foreground">
                            {template?.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getPriorityColor(constraint.priority)} text-white`}>
                          Priority {constraint.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const key = `${constraint.constraint_type}-${index}`;
                            setExpandedConstraint(isExpanded ? null : key);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingConstraint(constraint)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeConstraint(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Parameters View */}
                    {isExpanded && template && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-medium mb-3">Parameters</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(constraint.parameters).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs font-medium text-muted-foreground">
                                {key.replace(/_/g, ' ').toUpperCase()}
                              </Label>
                              <div className="text-sm font-mono bg-muted p-2 rounded">
                                {typeof value === 'boolean' ? (value ? 'True' : 'False') : String(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Edit Constraint Dialog */}
        {editingConstraint && (
          <Dialog open={!!editingConstraint} onOpenChange={() => setEditingConstraint(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Constraint</DialogTitle>
                <DialogDescription>
                  Modify the parameters for this optimization constraint
                </DialogDescription>
              </DialogHeader>
              
              {(() => {
                const template = getConstraintTemplate(editingConstraint.constraint_type);
                if (!template) return null;

                return (
                  <div className="space-y-6">
                    {/* Priority Setting */}
                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <div className="flex items-center space-x-4">
                        <Slider
                          value={[editingConstraint.priority]}
                          onValueChange={([val]) => 
                            setEditingConstraint({ ...editingConstraint, priority: val })
                          }
                          min={1}
                          max={10}
                          step={1}
                          className="flex-1"
                        />
                        <Badge className={`${getPriorityColor(editingConstraint.priority)} text-white`}>
                          {editingConstraint.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        1 = Highest priority, 10 = Lowest priority
                      </p>
                    </div>

                    {/* Parameters */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Parameters</h4>
                      {template.parameterDefinitions.map((paramDef) => (
                        <div key={paramDef.key}>
                          {renderParameterInput(
                            paramDef,
                            editingConstraint.parameters[paramDef.key] ?? paramDef.default,
                            (value) => setEditingConstraint({
                              ...editingConstraint,
                              parameters: {
                                ...editingConstraint.parameters,
                                [paramDef.key]: value
                              }
                            })
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setEditingConstraint(null)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          const index = constraints.findIndex(c => 
                            c.constraint_type === editingConstraint.constraint_type &&
                            JSON.stringify(c.parameters) === JSON.stringify(
                              constraints.find(oc => oc.constraint_type === editingConstraint.constraint_type)?.parameters
                            )
                          );
                          if (index >= 0) {
                            updateConstraint(index, editingConstraint);
                          }
                        }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

export default ConstraintsConfig;
