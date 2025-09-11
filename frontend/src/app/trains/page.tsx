"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Train, 
  Search, 
  Filter,
  MapPin,
  Clock,
  Activity,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Eye,
  Settings,
  Download,
  Users,
  Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTrainStatus, useDelayedTrains } from "@/hooks/useApi";
import { useTrainUpdates } from "@/hooks/useWebSocket";
import { TrainStatusInfo, TrainStatus, TrainPriority, Direction } from "@/types/api";
import TrainList from "@/components/trains/TrainList";
import TrainMap from "@/components/trains/TrainMap";
import TrainStats from "@/components/trains/TrainStats";

interface TrainMonitoringFilters {
  search: string;
  status: TrainStatus | 'all';
  priority: TrainPriority | 'all';
  section: string;
  delayedOnly: boolean;
  direction: Direction | 'all';
}

export default function TrainMonitoringPage() {
  const [filters, setFilters] = useState<TrainMonitoringFilters>({
    search: '',
    status: 'all',
    priority: 'all',
    section: '',
    delayedOnly: false,
    direction: 'all'
  });
  
  const [view, setView] = useState<'list' | 'map' | 'analytics'>('list');
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  
  // API hooks with real-time updates
  const { 
    data: trainData, 
    loading: trainsLoading, 
    error: trainsError, 
    refetch: refetchTrains 
  } = useTrainStatus(
    {
      status: filters.status !== 'all' ? filters.status : undefined,
      priority: filters.priority !== 'all' ? filters.priority : undefined,
      section_id: filters.section || undefined,
      delayed_only: filters.delayedOnly || undefined,
      limit: 100
    },
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );
  
  const { 
    data: delayedTrains, 
    loading: delayedLoading 
  } = useDelayedTrains({ 
    refetchInterval: 15000 
  });
  
  // WebSocket real-time updates
  const trainUpdates = useTrainUpdates();
  
  // Merge API data with real-time updates
  const trains = useMemo(() => {
    if (!trainData?.trains) return [];
    
    return trainData.trains.map(train => {
      const update = trainUpdates.updates.find(u => u.train_id === train.id);
      if (update) {
        return {
          ...train,
          position: update.position,
          speed_kmh: update.speed_kmh,
          delay_minutes: update.delay_minutes,
          status: update.status,
          updated_at: update.timestamp
        };
      }
      return train;
    });
  }, [trainData?.trains, trainUpdates.updates]);
  
  // Apply client-side filters
  const filteredTrains = useMemo(() => {
    return trains.filter(train => {
      const matchesSearch = !filters.search || 
        train.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        train.train_number.toString().includes(filters.search) ||
        train.current_section.toLowerCase().includes(filters.search.toLowerCase());
        
      const matchesDirection = filters.direction === 'all' || train.direction === filters.direction;
      
      return matchesSearch && matchesDirection;
    });
  }, [trains, filters.search, filters.direction]);
  
  const handleFilterChange = (key: keyof TrainMonitoringFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      section: '',
      delayedOnly: false,
      direction: 'all'
    });
  };
  
  const exportTrainData = () => {
    const csvData = filteredTrains.map(train => ({
      'Train Number': train.train_number,
      'Name': train.name,
      'Status': train.status,
      'Priority': train.priority,
      'Section': train.current_section,
      'Speed (km/h)': train.speed_kmh,
      'Delay (min)': train.delay_minutes,
      'Last Updated': new Date(train.updated_at).toLocaleString()
    }));
    
    const csv = Object.keys(csvData[0] || {}).join(',') + '\n' + 
      csvData.map(row => Object.values(row).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `train-monitoring-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isLoading = trainsLoading || delayedLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Train className="h-8 w-8 text-blue-600" />
            <span>Train Monitoring System</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time tracking and monitoring of railway operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetchTrains}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportTrainData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/trains/management">
            <Button size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage Trains
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {trainsError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load train data: {trainsError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <TrainStats 
        totalTrains={trainData?.total_count || 0}
        delayedTrains={trainData?.delayed_count || 0}
        onTimeTrains={trainData?.on_time_count || 0}
        averageDelay={trainData?.average_delay_minutes || 0}
        isLoading={isLoading}
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search & Filters</span>
            {(filters.search || filters.status !== 'all' || filters.priority !== 'all' || 
              filters.section || filters.delayedOnly || filters.direction !== 'all') && (
              <Badge variant="secondary" className="ml-2">
                {filteredTrains.length} filtered
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search trains..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Status Filter */}
            <Select 
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Running">Running</SelectItem>
                <SelectItem value="Delayed">Delayed</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="AtStation">At Station</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Priority Filter */}
            <Select 
              value={filters.priority?.toString() || 'all'}
              onValueChange={(value) => handleFilterChange('priority', value === 'all' ? 'all' : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="1">Emergency</SelectItem>
                <SelectItem value="2">Mail</SelectItem>
                <SelectItem value="3">Express</SelectItem>
                <SelectItem value="4">Passenger</SelectItem>
                <SelectItem value="5">Freight</SelectItem>
                <SelectItem value="6">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Direction Filter */}
            <Select 
              value={filters.direction}
              onValueChange={(value) => handleFilterChange('direction', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="Up">Up</SelectItem>
                <SelectItem value="Down">Down</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Section Filter */}
            <Input
              placeholder="Section ID..."
              value={filters.section}
              onChange={(e) => handleFilterChange('section', e.target.value)}
            />
            
            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={!filters.search && filters.status === 'all' && 
                       filters.priority === 'all' && !filters.section &&
                       !filters.delayedOnly && filters.direction === 'all'}
            >
              Clear Filters
            </Button>
          </div>
          
          {/* Additional Options */}
          <div className="flex items-center space-x-4 mt-4 pt-4 border-t">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.delayedOnly}
                onChange={(e) => handleFilterChange('delayedOnly', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show only delayed trains</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'map' | 'analytics')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>List View</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Map View</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <TrainList 
            trains={filteredTrains}
            loading={isLoading}
            onSelectTrain={setSelectedTrainId}
            selectedTrainId={selectedTrainId}
          />
        </TabsContent>
        
        <TabsContent value="map" className="space-y-4">
          <TrainMap 
            trains={filteredTrains}
            loading={isLoading}
            onSelectTrain={setSelectedTrainId}
            selectedTrainId={selectedTrainId}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>System-wide train performance analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {trainData ? ((trainData.on_time_count / trainData.total_count) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-sm text-green-700">On-Time Performance</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredTrains.reduce((acc, train) => acc + train.speed_kmh, 0) / (filteredTrains.length || 1) || 0}
                      </div>
                      <div className="text-sm text-blue-700">Avg Speed (km/h)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Real-time Status Distribution</CardTitle>
                <CardDescription>Current status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    filteredTrains.reduce((acc, train) => {
                      acc[train.status] = (acc[train.status] || 0) + 1;
                      return acc;
                    }, {} as Record<TrainStatus, number>)
                  ).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <Badge variant="outline">{status}</Badge>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
