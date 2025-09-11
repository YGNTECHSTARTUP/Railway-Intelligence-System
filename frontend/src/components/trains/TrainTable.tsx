import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Train,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrainStatusInfo, TrainStatus, TrainPriority, Direction } from "@/types/api";

interface TrainTableProps {
  trains: TrainStatusInfo[];
  loading?: boolean;
  totalCount: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onView: (train: TrainStatusInfo) => void;
  onEdit: (train: TrainStatusInfo) => void;
  onDelete: (train: TrainStatusInfo) => void;
  deleteLoading?: boolean;
}

const getStatusColor = (status: TrainStatus): string => {
  switch (status) {
    case TrainStatus.Running:
      return "bg-green-100 text-green-800 border-green-200";
    case TrainStatus.Delayed:
      return "bg-red-100 text-red-800 border-red-200";
    case TrainStatus.Scheduled:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case TrainStatus.AtStation:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case TrainStatus.Terminated:
      return "bg-gray-100 text-gray-800 border-gray-200";
    case TrainStatus.Cancelled:
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: TrainPriority): string => {
  switch (priority) {
    case TrainPriority.Emergency:
      return "bg-red-500 text-white";
    case TrainPriority.Mail:
      return "bg-purple-500 text-white";
    case TrainPriority.Express:
      return "bg-blue-500 text-white";
    case TrainPriority.Passenger:
      return "bg-green-500 text-white";
    case TrainPriority.Freight:
      return "bg-orange-500 text-white";
    case TrainPriority.Maintenance:
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-300 text-gray-800";
  }
};

const getPriorityLabel = (priority: TrainPriority): string => {
  switch (priority) {
    case TrainPriority.Emergency:
      return "Emergency";
    case TrainPriority.Mail:
      return "Mail";
    case TrainPriority.Express:
      return "Express";
    case TrainPriority.Passenger:
      return "Passenger";
    case TrainPriority.Freight:
      return "Freight";
    case TrainPriority.Maintenance:
      return "Maintenance";
    default:
      return "Unknown";
  }
};

export default function TrainTable({
  trains,
  loading = false,
  totalCount,
  currentPage,
  perPage,
  totalPages,
  onPageChange,
  onPerPageChange,
  onView,
  onEdit,
  onDelete,
  deleteLoading = false
}: TrainTableProps) {
  
  const canDeleteTrain = (train: TrainStatusInfo): boolean => {
    return train.status !== TrainStatus.Running;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Train Management</CardTitle>
          <CardDescription>Manage your train fleet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Loading trains...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trains || trains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Train Management</CardTitle>
          <CardDescription>Manage your train fleet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Train className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-600">No trains found</p>
            <p className="text-gray-500">Create your first train or adjust your filters</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Train Fleet ({totalCount})</span>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </CardTitle>
        <CardDescription>
          Manage train configurations, routes, and operational settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Train</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Current Section</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Delay</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trains.map((train) => (
                <TableRow key={train.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Train className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {train.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          #{train.train_number}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={cn("text-xs", getStatusColor(train.status))}>
                      {train.status}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={cn("text-xs", getPriorityColor(train.priority))}>
                      {getPriorityLabel(train.priority)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {train.current_section || 'N/A'}
                    </code>
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-32">
                      <p className="text-sm truncate">
                        {train.route.length > 0 ? train.route.join(' → ') : 'No route'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {train.route.length} station{train.route.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {train.direction}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      <p className="font-mono text-sm">{train.speed_kmh}</p>
                      <p className="text-xs text-gray-500">km/h</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      <p className={cn(
                        "font-mono text-sm",
                        train.delay_minutes > 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {train.delay_minutes > 0 ? `+${train.delay_minutes}` : train.delay_minutes}
                      </p>
                      <p className="text-xs text-gray-500">min</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {new Date(train.updated_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(train)}
                        className="h-8 w-8 p-0"
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(train)}
                        className="h-8 w-8 p-0"
                        title="Edit Train"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(train)}
                        disabled={!canDeleteTrain(train) || deleteLoading}
                        className={cn(
                          "h-8 w-8 p-0",
                          !canDeleteTrain(train) ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 hover:border-red-300"
                        )}
                        title={canDeleteTrain(train) ? "Delete Train" : "Cannot delete running train"}
                      >
                        {deleteLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select 
                value={perPage.toString()} 
                onValueChange={(value) => onPerPageChange(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalCount)} of {totalCount}
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-1 px-2">
                  <span className="text-sm font-medium">{currentPage}</span>
                  <span className="text-sm text-gray-500">of {totalPages}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Summary footer */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="font-medium">Total Trains:</span> {totalCount}
            </div>
            <div>
              <span className="font-medium">Active:</span> {trains.filter(t => 
                t.status === TrainStatus.Running || 
                t.status === TrainStatus.Delayed ||
                t.status === TrainStatus.AtStation
              ).length}
            </div>
            <div>
              <span className="font-medium">Delayed:</span> {trains.filter(t => t.status === TrainStatus.Delayed).length}
            </div>
            <div>
              <span className="font-medium">Avg Speed:</span> {trains.length > 0 ? 
                Math.round(trains.reduce((sum, train) => sum + train.speed_kmh, 0) / trains.length) : 0} km/h
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
