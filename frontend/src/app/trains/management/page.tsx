"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Train, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  Settings,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  useAllTrains, 
  useCreateTrain, 
  useUpdateTrain, 
  useDeleteTrain 
} from "@/hooks/useApi";
import { 
  TrainStatusInfo, 
  TrainStatus, 
  TrainPriority, 
  Direction,
  CreateTrainRequest,
  UpdateTrainRequest,
  TrainListQuery 
} from "@/types/api";
import TrainForm from "@/components/trains/TrainForm";
import TrainTable from "@/components/trains/TrainTable";

interface TrainManagementFilters {
  search: string;
  status: TrainStatus | 'all';
  priority: TrainPriority | 'all';
}

type FormMode = 'create' | 'edit' | 'view' | null;

export default function TrainManagementPage() {
  const [filters, setFilters] = useState<TrainManagementFilters>({
    search: '',
    status: 'all',
    priority: 'all'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedTrain, setSelectedTrain] = useState<TrainStatusInfo | null>(null);
  
  const { toast } = useToast();
  
  // Build query for API
  const query: TrainListQuery = useMemo(() => ({
    page: currentPage,
    per_page: perPage,
    status: filters.status !== 'all' ? filters.status : undefined,
    search: filters.search || undefined
  }), [currentPage, perPage, filters]);
  
  // API hooks
  const { 
    data: trainsData, 
    loading: trainsLoading, 
    error: trainsError, 
    refetch: refetchTrains 
  } = useAllTrains(query, { 
    refetchInterval: 30000 
  });
  
  const createTrainMutation = useCreateTrain({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Train created successfully"
      });
      setFormMode(null);
      refetchTrains();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const updateTrainMutation = useUpdateTrain({
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "Train updated successfully"
      });
      setFormMode(null);
      setSelectedTrain(null);
      refetchTrains();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const deleteTrainMutation = useDeleteTrain({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Train deleted successfully"
      });
      refetchTrains();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Filter trains client-side for priority filter
  const filteredTrains = useMemo(() => {
    if (!trainsData?.trains) return [];
    
    return trainsData.trains.filter(train => {
      const matchesPriority = filters.priority === 'all' || train.priority === filters.priority;
      return matchesPriority;
    });
  }, [trainsData?.trains, filters.priority]);
  
  const handleFilterChange = (key: keyof TrainManagementFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };
  
  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all'
    });
    setCurrentPage(1);
  };
  
  const handleCreateTrain = () => {
    setSelectedTrain(null);
    setFormMode('create');
  };
  
  const handleEditTrain = (train: TrainStatusInfo) => {
    setSelectedTrain(train);
    setFormMode('edit');
  };
  
  const handleViewTrain = (train: TrainStatusInfo) => {
    setSelectedTrain(train);
    setFormMode('view');
  };
  
  const handleDeleteTrain = async (train: TrainStatusInfo) => {
    if (train.status === TrainStatus.Running) {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete a train that is currently running",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm(`Are you sure you want to delete train "${train.name}" (${train.train_number})?`)) {
      await deleteTrainMutation.execute(train.id);
    }
  };
  
  const handleFormSubmit = async (formData: CreateTrainRequest | UpdateTrainRequest) => {
    try {
      if (formMode === 'create') {
        await createTrainMutation.execute(formData as CreateTrainRequest);
      } else if (formMode === 'edit' && selectedTrain) {
        await updateTrainMutation.execute({
          trainId: selectedTrain.id,
          request: formData as UpdateTrainRequest
        });
      }
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };
  
  const isLoading = trainsLoading || createTrainMutation.loading || 
                   updateTrainMutation.loading || deleteTrainMutation.loading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/trains">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Monitoring
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <Settings className="h-8 w-8 text-blue-600" />
              <span>Train Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Create, update, and manage train fleet configurations
            </p>
          </div>
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
          <Button onClick={handleCreateTrain}>
            <Plus className="h-4 w-4 mr-2" />
            Add Train
          </Button>
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

      {/* Summary Stats */}
      {trainsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Trains</p>
                  <p className="text-2xl font-bold text-gray-900">{trainsData.total_count}</p>
                </div>
                <Train className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Trains</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredTrains.filter(t => 
                      t.status === TrainStatus.Running || 
                      t.status === TrainStatus.Delayed ||
                      t.status === TrainStatus.AtStation
                    ).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delayed Trains</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredTrains.filter(t => t.status === TrainStatus.Delayed).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Page</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {trainsData.page} / {trainsData.total_pages}
                  </p>
                </div>
                <Filter className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search & Filters</span>
            {(filters.search || filters.status !== 'all' || filters.priority !== 'all') && (
              <Badge variant="secondary" className="ml-2">
                {filteredTrains.length} filtered
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            
            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={!filters.search && filters.status === 'all' && filters.priority === 'all'}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trains Table */}
      <TrainTable
        trains={filteredTrains}
        loading={trainsLoading}
        totalCount={trainsData?.total_count || 0}
        currentPage={currentPage}
        perPage={perPage}
        totalPages={trainsData?.total_pages || 1}
        onPageChange={setCurrentPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setCurrentPage(1);
        }}
        onView={handleViewTrain}
        onEdit={handleEditTrain}
        onDelete={handleDeleteTrain}
        deleteLoading={deleteTrainMutation.loading}
      />

      {/* Train Form Dialog */}
      <Dialog open={!!formMode} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {formMode === 'create' && (
                <>
                  <Plus className="h-5 w-5" />
                  <span>Create New Train</span>
                </>
              )}
              {formMode === 'edit' && (
                <>
                  <Edit className="h-5 w-5" />
                  <span>Edit Train</span>
                </>
              )}
              {formMode === 'view' && (
                <>
                  <Eye className="h-5 w-5" />
                  <span>View Train Details</span>
                </>
              )}
            </DialogTitle>
            {formMode && (
              <DialogDescription>
                {formMode === 'create' && "Add a new train to the system with route and configuration details."}
                {formMode === 'edit' && "Update train information. Running trains have limited edit options."}
                {formMode === 'view' && "View detailed information about this train."}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {formMode && (
            <TrainForm
              mode={formMode}
              initialData={selectedTrain}
              onSubmit={handleFormSubmit}
              onCancel={() => setFormMode(null)}
              loading={createTrainMutation.loading || updateTrainMutation.loading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
