"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Train, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  Zap,
  Plus,
  Minus,
  Calendar,
  Users
} from 'lucide-react';
import { Train as TrainType, TrainPriority, TrainStatus } from '@/types/api';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api-client';

interface TrainSelectionFormProps {
  selectedTrains: TrainType[];
  onTrainsChange: (trains: TrainType[]) => void;
  sectionId: string;
}

export function TrainSelectionForm({ selectedTrains, onTrainsChange, sectionId }: TrainSelectionFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrainStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TrainPriority | 'all'>('all');
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);

  // Fetch available trains
  const { data: trainData, loading, error } = useApi(
    () => apiClient.getTrains({ 
      section_id: sectionId,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      delayed_only: showDelayedOnly,
      limit: 100 
    }),
    [sectionId, statusFilter, showDelayedOnly]
  );

  const availableTrains = trainData?.trains || [];

  // Filter trains based on search term and filters
  const filteredTrains = availableTrains.filter(train => {
    const matchesSearch = searchTerm === '' || 
      train.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      train.train_number.toString().includes(searchTerm) ||
      train.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || train.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const handleTrainToggle = (train: TrainType, checked: boolean) => {
    if (checked) {
      onTrainsChange([...selectedTrains, train]);
    } else {
      onTrainsChange(selectedTrains.filter(t => t.id !== train.id));
    }
  };

  const handleSelectAll = () => {
    onTrainsChange(filteredTrains);
  };

  const handleClearAll = () => {
    onTrainsChange([]);
  };

  const getPriorityColor = (priority: TrainPriority): string => {
    switch (priority) {
      case TrainPriority.Emergency: return 'bg-red-500';
      case TrainPriority.Express: return 'bg-orange-500';
      case TrainPriority.Mail: return 'bg-blue-500';
      case TrainPriority.Passenger: return 'bg-green-500';
      case TrainPriority.Freight: return 'bg-gray-500';
      case TrainPriority.Maintenance: return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: TrainStatus): string => {
    switch (status) {
      case TrainStatus.Running: return 'text-green-600 bg-green-50';
      case TrainStatus.Delayed: return 'text-red-600 bg-red-50';
      case TrainStatus.AtStation: return 'text-blue-600 bg-blue-50';
      case TrainStatus.Scheduled: return 'text-gray-600 bg-gray-50';
      case TrainStatus.Cancelled: return 'text-red-800 bg-red-100';
      case TrainStatus.Terminated: return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Train className="w-5 h-5" />
          <span>Select Trains for Optimization</span>
        </CardTitle>
        <CardDescription>
          Choose trains to include in the optimization process. Selected: {selectedTrains.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Search Trains</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name, number, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status-filter">Status Filter</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={TrainStatus.Running}>Running</SelectItem>
                <SelectItem value={TrainStatus.Delayed}>Delayed</SelectItem>
                <SelectItem value={TrainStatus.AtStation}>At Station</SelectItem>
                <SelectItem value={TrainStatus.Scheduled}>Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority-filter">Priority Filter</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value={TrainPriority.Emergency.toString()}>Emergency</SelectItem>
                <SelectItem value={TrainPriority.Express.toString()}>Express</SelectItem>
                <SelectItem value={TrainPriority.Mail.toString()}>Mail</SelectItem>
                <SelectItem value={TrainPriority.Passenger.toString()}>Passenger</SelectItem>
                <SelectItem value={TrainPriority.Freight.toString()}>Freight</SelectItem>
                <SelectItem value={TrainPriority.Maintenance.toString()}>Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 mt-6">
            <Checkbox
              id="delayed-only"
              checked={showDelayedOnly}
              onCheckedChange={setShowDelayedOnly}
            />
            <Label htmlFor="delayed-only" className="text-sm">
              Delayed Only
            </Label>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button onClick={handleSelectAll} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Select All ({filteredTrains.length})
            </Button>
            <Button onClick={handleClearAll} variant="outline" size="sm">
              <Minus className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredTrains.length} trains available
          </div>
        </div>

        <Separator />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading trains...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">Failed to load trains: {error.message}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Train List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTrains.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Train className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No trains found matching your criteria</p>
            </div>
          ) : (
            filteredTrains.map((train) => {
              const isSelected = selectedTrains.some(t => t.id === train.id);
              return (
                <div
                  key={train.id}
                  className={`border rounded-lg p-3 transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleTrainToggle(train, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(train.priority)}`} />
                          <span className="font-medium">{train.name}</span>
                          <Badge variant="outline" className="text-xs">
                            #{train.train_number}
                          </Badge>
                          <Badge className={getStatusColor(train.status)}>
                            {train.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{train.current_section}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Zap className="w-3 h-3" />
                            <span>{train.speed_kmh} km/h</span>
                          </div>
                          {train.delay_minutes > 0 && (
                            <div className="flex items-center space-x-1 text-red-600">
                              <Clock className="w-3 h-3" />
                              <span>+{train.delay_minutes}min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        {selectedTrains.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Selection Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrains.length} trains selected for optimization
                  </p>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div>
                    <span className="font-medium">Delayed: </span>
                    {selectedTrains.filter(t => t.delay_minutes > 0).length}
                  </div>
                  <div>
                    <span className="font-medium">Avg Speed: </span>
                    {selectedTrains.length > 0 
                      ? Math.round(selectedTrains.reduce((acc, t) => acc + t.speed_kmh, 0) / selectedTrains.length)
                      : 0} km/h
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export default TrainSelectionForm;
