import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Train, 
  MapPin, 
  Clock, 
  Activity, 
  AlertTriangle, 
  Eye, 
  Navigation,
  Gauge,
  Calendar,
  Route,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrainStatusInfo, TrainStatus, TrainPriority, Direction } from "@/types/api";
import TrainDetails from "./TrainDetails";

interface TrainListProps {
  trains: TrainStatusInfo[];
  loading?: boolean;
  onSelectTrain?: (trainId: string) => void;
  selectedTrainId?: string | null;
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

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return date.toLocaleDateString();
};

export default function TrainList({ 
  trains, 
  loading = false, 
  onSelectTrain, 
  selectedTrainId 
}: TrainListProps) {
  const [detailsTrainId, setDetailsTrainId] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Train List</CardTitle>
          <CardDescription>Live train monitoring data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Loading train data...</p>
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
          <CardTitle>Train List</CardTitle>
          <CardDescription>Live train monitoring data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Train className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-600">No trains found</p>
            <p className="text-gray-500">Adjust your filters or check back later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Active Trains ({trains.length})</span>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Data</span>
          </Badge>
        </CardTitle>
        <CardDescription>Real-time train status and positioning</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Train</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Delay</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trains.map((train) => (
                <TableRow 
                  key={train.id}
                  className={cn(
                    "cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedTrainId === train.id && "bg-blue-50 border-l-4 border-l-blue-500"
                  )}
                  onClick={() => onSelectTrain?.(train.id)}
                >
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
                    <Badge className={getStatusColor(train.status)}>
                      {train.status}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getPriorityColor(train.priority)}>
                      {getPriorityLabel(train.priority)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{train.current_section}</p>
                        <p className="text-xs text-gray-500">
                          {train.position.latitude.toFixed(4)}, {train.position.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Gauge className="h-4 w-4 text-gray-400" />
                      <span className={cn(
                        "font-medium",
                        train.speed_kmh > 80 ? "text-orange-600" : 
                        train.speed_kmh > 0 ? "text-green-600" : "text-gray-600"
                      )}>
                        {train.speed_kmh.toFixed(0)} km/h
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className={cn(
                        "font-medium",
                        train.delay_minutes > 15 ? "text-red-600" :
                        train.delay_minutes > 5 ? "text-yellow-600" :
                        train.delay_minutes > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {train.delay_minutes > 0 ? `+${train.delay_minutes}` : train.delay_minutes} min
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Navigation className="h-3 w-3" />
                      <span>{train.direction}</span>
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {formatTimestamp(train.updated_at)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsTrainId(train.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <Train className="h-5 w-5 text-blue-600" />
                            <span>{train.name} (#{train.train_number})</span>
                          </DialogTitle>
                          <DialogDescription>
                            Detailed train information and real-time status
                          </DialogDescription>
                        </DialogHeader>
                        <TrainDetails trainId={train.id} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {trains.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing {trains.length} trains
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates every 10 seconds</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
