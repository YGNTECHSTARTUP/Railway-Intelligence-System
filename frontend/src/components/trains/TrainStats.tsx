import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Train, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainStatsProps {
  totalTrains: number;
  delayedTrains: number;
  onTimeTrains: number;
  averageDelay: number;
  isLoading?: boolean;
}

export default function TrainStats({ 
  totalTrains, 
  delayedTrains, 
  onTimeTrains, 
  averageDelay, 
  isLoading = false 
}: TrainStatsProps) {
  const onTimePercentage = totalTrains > 0 ? ((onTimeTrains / totalTrains) * 100).toFixed(1) : 0;
  const delayPercentage = totalTrains > 0 ? ((delayedTrains / totalTrains) * 100).toFixed(1) : 0;
  
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getPerformanceStatus = (percentage: number) => {
    if (percentage >= 95) return 'Excellent';
    if (percentage >= 90) return 'Good';
    if (percentage >= 75) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Trains */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Train className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  totalTrains.toLocaleString()
                )}
              </p>
              <p className="text-sm text-gray-600">Total Active Trains</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* On-Time Performance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className={cn("text-2xl font-bold", getPerformanceColor(parseFloat(onTimePercentage.toString())))}>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    `${onTimePercentage}%`
                  )}
                </p>
                <Badge 
                  variant={parseFloat(onTimePercentage.toString()) >= 90 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {getPerformanceStatus(parseFloat(onTimePercentage.toString()))}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                On-Time Performance ({onTimeTrains} trains)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delayed Trains */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-red-600">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    delayedTrains.toLocaleString()
                  )}
                </p>
                <Badge variant="destructive" className="text-xs">
                  {delayPercentage}%
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Delayed Trains</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Delay */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className={cn(
                  "text-2xl font-bold",
                  averageDelay <= 5 ? "text-green-600" : 
                  averageDelay <= 15 ? "text-yellow-600" : "text-red-600"
                )}>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    `${averageDelay.toFixed(1)}`
                  )}
                </p>
                <span className="text-sm text-gray-500">min</span>
                {averageDelay > 0 && (
                  <Badge 
                    variant={averageDelay <= 5 ? "default" : averageDelay <= 15 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {averageDelay <= 5 ? "Good" : averageDelay <= 15 ? "Fair" : "Poor"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">Average Delay</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
