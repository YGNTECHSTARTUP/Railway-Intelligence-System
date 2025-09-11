import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Train, 
  Gauge, 
  Clock, 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  Loader2,
  RefreshCw,
  Filter,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrainStatusInfo, TrainStatus, TrainPriority, Direction } from "@/types/api";

interface TrainMapProps {
  trains: TrainStatusInfo[];
  loading?: boolean;
  onSelectTrain?: (trainId: string) => void;
  selectedTrainId?: string | null;
}

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const getStatusColor = (status: TrainStatus): string => {
  switch (status) {
    case TrainStatus.Running:
      return "#10b981"; // green
    case TrainStatus.Delayed:
      return "#ef4444"; // red
    case TrainStatus.Scheduled:
      return "#3b82f6"; // blue
    case TrainStatus.AtStation:
      return "#f59e0b"; // yellow
    case TrainStatus.Terminated:
      return "#6b7280"; // gray
    case TrainStatus.Cancelled:
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
};

const getPrioritySize = (priority: TrainPriority): number => {
  switch (priority) {
    case TrainPriority.Emergency:
      return 16;
    case TrainPriority.Mail:
      return 14;
    case TrainPriority.Express:
      return 12;
    case TrainPriority.Passenger:
      return 10;
    case TrainPriority.Freight:
      return 8;
    case TrainPriority.Maintenance:
      return 6;
    default:
      return 8;
  }
};

export default function TrainMap({ 
  trains, 
  loading = false, 
  onSelectTrain, 
  selectedTrainId 
}: TrainMapProps) {
  const [mapView, setMapView] = useState<'standard' | 'satellite' | 'terrain'>('standard');
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);
  
  // Calculate map bounds from train positions
  const mapBounds = useMemo((): MapBounds | null => {
    if (!trains || trains.length === 0) return null;
    
    const lats = trains.map(t => t.position.latitude);
    const lngs = trains.map(t => t.position.longitude);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  }, [trains]);
  
  // Filter trains based on delay filter
  const visibleTrains = useMemo(() => {
    return showDelayedOnly ? trains.filter(t => t.delay_minutes > 0) : trains;
  }, [trains, showDelayedOnly]);
  
  // Convert real coordinates to SVG coordinates for visualization
  const trainPositions = useMemo(() => {
    if (!mapBounds || !visibleTrains.length) return [];
    
    const padding = 50;
    const mapWidth = 800 - (padding * 2);
    const mapHeight = 600 - (padding * 2);
    
    return visibleTrains.map(train => {
      const x = padding + ((train.position.longitude - mapBounds.minLng) / 
        (mapBounds.maxLng - mapBounds.minLng)) * mapWidth;
      const y = padding + ((mapBounds.maxLat - train.position.latitude) / 
        (mapBounds.maxLat - mapBounds.minLat)) * mapHeight;
      
      return {
        ...train,
        x,
        y,
        size: getPrioritySize(train.priority),
        color: getStatusColor(train.status)
      };
    });
  }, [visibleTrains, mapBounds]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Train Map</CardTitle>
          <CardDescription>Live train positions and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Loading map data...</p>
            </div>
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
            <MapPin className="h-5 w-5" />
            <span>Train Map ({visibleTrains.length} trains)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Tracking</span>
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>Real-time train positions with interactive controls</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Map Controls */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <Select value={mapView} onValueChange={(value) => setMapView(value as 'standard' | 'satellite' | 'terrain')}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showDelayedOnly}
                onChange={(e) => setShowDelayedOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show only delayed trains</span>
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Map Visualization */}
        <div className="relative">
          <svg 
            width="100%" 
            height="600" 
            viewBox="0 0 800 600" 
            className="border rounded-lg bg-gray-50"
          >
            {/* Grid lines for reference */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Railway sections (simplified representation) */}
            {mapBounds && trainPositions.length > 0 && (
              <>
                {/* Main railway lines */}
                <line 
                  x1="50" y1="300" x2="750" y2="300" 
                  stroke="#374151" strokeWidth="3" strokeDasharray="5,5"
                />
                <line 
                  x1="400" y1="50" x2="400" y2="550" 
                  stroke="#374151" strokeWidth="3" strokeDasharray="5,5"
                />
                
                {/* Train positions */}
                {trainPositions.map((train) => (
                  <g key={train.id}>
                    {/* Train icon */}
                    <circle
                      cx={train.x}
                      cy={train.y}
                      r={train.size}
                      fill={train.color}
                      stroke="#fff"
                      strokeWidth="2"
                      className={cn(
                        "cursor-pointer transition-all hover:stroke-4",
                        selectedTrainId === train.id && "stroke-4 stroke-blue-600"
                      )}
                      onClick={() => onSelectTrain?.(train.id)}
                    />
                    
                    {/* Train direction indicator */}
                    <polygon
                      points={`${train.x-4},${train.y-8} ${train.x+4},${train.y-8} ${train.x},${train.y-12}`}
                      fill={train.color}
                      className="cursor-pointer"
                      onClick={() => onSelectTrain?.(train.id)}
                      transform={`rotate(${train.direction === Direction.Up ? 0 : 180} ${train.x} ${train.y})`}
                    />
                    
                    {/* Train label */}
                    <text
                      x={train.x}
                      y={train.y + train.size + 20}
                      textAnchor="middle"
                      className="text-xs fill-gray-700 font-medium cursor-pointer"
                      onClick={() => onSelectTrain?.(train.id)}
                    >
                      {train.train_number}
                    </text>
                    
                    {/* Speed indicator for moving trains */}
                    {train.speed_kmh > 0 && (
                      <text
                        x={train.x}
                        y={train.y + train.size + 32}
                        textAnchor="middle"
                        className="text-xs fill-blue-600 font-semibold"
                      >
                        {train.speed_kmh.toFixed(0)} km/h
                      </text>
                    )}
                    
                    {/* Delay indicator for delayed trains */}
                    {train.delay_minutes > 0 && (
                      <circle
                        cx={train.x + train.size - 2}
                        cy={train.y - train.size + 2}
                        r="6"
                        fill="#ef4444"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                ))}
              </>
            )}
            
            {/* Map legend */}
            <g transform="translate(20, 20)">
              <rect x="0" y="0" width="180" height="120" fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4"/>
              <text x="10" y="20" className="text-sm font-semibold fill-gray-900">Map Legend</text>
              
              <circle cx="20" cy="40" r="6" fill="#10b981"/>
              <text x="35" y="45" className="text-xs fill-gray-700">Running</text>
              
              <circle cx="20" cy="60" r="6" fill="#ef4444"/>
              <text x="35" y="65" className="text-xs fill-gray-700">Delayed</text>
              
              <circle cx="20" cy="80" r="6" fill="#3b82f6"/>
              <text x="35" y="85" className="text-xs fill-gray-700">Scheduled</text>
              
              <circle cx="20" cy="100" r="6" fill="#f59e0b"/>
              <text x="35" y="105" className="text-xs fill-gray-700">At Station</text>
              
              <text x="100" y="45" className="text-xs fill-gray-700">Size = Priority</text>
              <text x="100" y="65" className="text-xs fill-gray-700">Arrow = Direction</text>
              <text x="100" y="85" className="text-xs fill-gray-700">Red dot = Delayed</text>
            </g>
          </svg>
        </div>

        {/* Train Info Panel */}
        {selectedTrainId && (
          <div className="mt-4 pt-4 border-t">
            {(() => {
              const selectedTrain = trains.find(t => t.id === selectedTrainId);
              if (!selectedTrain) return null;
              
              return (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Train className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">{selectedTrain.name}</span>
                      <Badge variant="outline">#{selectedTrain.train_number}</Badge>
                    </div>
                    <Badge className={getStatusColor(selectedTrain.status).replace('bg-', 'border-')}>
                      {selectedTrain.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedTrain.current_section}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Gauge className="h-4 w-4 text-gray-500" />
                      <span>{selectedTrain.speed_kmh.toFixed(0)} km/h</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className={cn(
                        selectedTrain.delay_minutes > 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {selectedTrain.delay_minutes > 0 ? `+${selectedTrain.delay_minutes}` : selectedTrain.delay_minutes} min
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Navigation className="h-4 w-4 text-gray-500" />
                      <span>{selectedTrain.direction}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-200">
                    <span className="text-xs text-gray-600">
                      Position: {selectedTrain.position.latitude.toFixed(4)}, {selectedTrain.position.longitude.toFixed(4)}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onSelectTrain?.(selectedTrain.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Map Statistics */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Showing {visibleTrains.length} trains</span>
            {mapBounds && (
              <span>
                Area: {(mapBounds.maxLat - mapBounds.minLat).toFixed(3)}° × {(mapBounds.maxLng - mapBounds.minLng).toFixed(3)}°
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live positions updated every 10 seconds</span>
          </div>
        </div>

        {/* Enhanced Map Notice */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Enhanced Mapping Integration</h4>
              <p className="text-sm text-blue-700 mt-1">
                This is a simplified visualization. The full implementation will integrate with:
              </p>
              <ul className="text-sm text-blue-700 mt-2 ml-4 space-y-1">
                <li>• Google Maps or OpenStreetMap for detailed railway infrastructure</li>
                <li>• Real railway track layouts and station positions</li>
                <li>• Interactive controls for zooming and panning</li>
                <li>• Route visualization and path planning</li>
                <li>• Geofencing and proximity alerts</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
