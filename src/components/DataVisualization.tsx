import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Loader2, RefreshCw, Calendar, FileText, Plus, Trash2, Printer, Presentation, ArrowUpDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { 
  Bar, 
  Line, 
  Cell,
  BarChart, 
  LineChart, 
  PieChart, 
  RadarChart, 
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Scatter
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "./ui/chart";

interface VisualizationChart {
  id: string;
  title: string;
  description: string;
  chartType: "bar" | "line" | "pie" | "radar" | "scatter";
  chartData: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[] | Array<{x: number, y: number}>;
      backgroundColor?: string[];
      borderColor?: string;
      fill?: boolean;
    }>;
  };
  insights: string[];
  recommendations: string[];
}

interface VisualizationSet {
  id: string;
  title: string;
  description: string;
  summary: string;
  visualizations: VisualizationChart[];
  createdAt: string;
  metadata: {
    documentsAnalyzed: number;
    processingTime: number;
    filesReferenced: number;
  };
}

interface VisualizationSetSummary {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  metadata: {
    documentsAnalyzed: number;
    processingTime: number;
    filesReferenced: number;
  };
  visualizations: Array<{
    chartType: string;
  }>;
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_APIKEY || '';

// API Functions
const fetchVisualizationSets = async (): Promise<{ visualizationSets: VisualizationSetSummary[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/visualize`, {
    headers: {
      'Api-Key': API_KEY,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch visualization sets');
  }
  
  return response.json();
};

const fetchVisualizationSet = async (setId: string): Promise<VisualizationSet> => {
  const response = await fetch(`${API_BASE_URL}/api/visualize/${setId}`, {
    headers: {
      'Api-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch visualization set');
  }

  return response.json();
};

const generateVisualizationSet = async (): Promise<{ visualizationSetId: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/visualize/generate`, {
    method: 'POST',
    headers: {
      'Api-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate visualization set');
  }

  return response.json();
};

const deleteVisualizationSet = async (setId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/visualize/${setId}`, {
    method: 'DELETE',
    headers: {
      'Api-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete visualization set');
  }
};

const exportToPDF = async (setId: string): Promise<{ success: boolean; pdfUrl: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/visualize/${setId}/pdf`, {
    method: 'POST',
    headers: {
      'Api-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate PDF');
  }

  return response.json();
};

const exportToPowerPoint = async (setId: string): Promise<{ success: boolean; pptxUrl: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/visualize/${setId}/powerpoint`, {
    method: 'POST',
    headers: {
      'Api-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate PowerPoint');
  }

  return response.json();
};

export function DataVisualization() {
  const queryClient = useQueryClient();
  const [currentVisualizationSet, setCurrentVisualizationSet] = useState<VisualizationSet | null>(null);
  const [selectedVisualizationIndex, setSelectedVisualizationIndex] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // TanStack Query for fetching visualization sets
  const { data: visualizationSetsData, isLoading, error } = useQuery({
    queryKey: ['visualization-sets'],
    queryFn: fetchVisualizationSets,
  });

  const availableVisualizationSets = visualizationSetsData?.visualizationSets || [];

  // Generate visualization set mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const generateData = await generateVisualizationSet();
      const visualizationSet = await fetchVisualizationSet(generateData.visualizationSetId);
      return visualizationSet;
    },
    onSuccess: (data) => {
      setCurrentVisualizationSet(data);
      setSelectedVisualizationIndex(0);
      queryClient.invalidateQueries({ queryKey: ['visualization-sets'] });
    },
    onError: (error) => {
      console.error('Error generating visualization set:', error);
      toast.error('Failed to generate visualization set. Please try again.');
    },
  });

  // Load visualization set mutation
  const loadMutation = useMutation({
    mutationFn: fetchVisualizationSet,
    onSuccess: (data) => {
      setCurrentVisualizationSet(data);
      setSelectedVisualizationIndex(0);
    },
    onError: (error) => {
      console.error('Error loading visualization set:', error);
      toast.error('Failed to load visualization set.');
    },
  });

  // Delete visualization set mutation
  const deleteMutation = useMutation({
    mutationFn: deleteVisualizationSet,
    onSuccess: (_, setId) => {
      if (currentVisualizationSet?.id === setId) {
        setCurrentVisualizationSet(null);
        setSelectedVisualizationIndex(0);
      }
      queryClient.invalidateQueries({ queryKey: ['visualization-sets'] });
      toast.success("Visualization set deleted successfully");
    },
    onError: (error) => {
      console.error('Error deleting visualization set:', error);
      toast.error("Failed to delete visualization set. Please try again.");
    },
  });

  // Export to PDF mutation
  const exportPdfMutation = useMutation({
    mutationFn: exportToPDF,
    onSuccess: (result) => {
      if (result.success && result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
        toast.success("PDF opened in new tab!");
      } else {
        throw new Error('Invalid response from PDF generation service');
      }
    },
    onError: (error) => {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF. Please try again.");
    },
  });

  // Export to PowerPoint mutation
  const exportPptMutation = useMutation({
    mutationFn: exportToPowerPoint,
    onSuccess: (result) => {
      if (result.success && result.pptxUrl) {
        window.open(result.pptxUrl, '_blank');
        toast.success("PowerPoint opened in new tab!");
      } else {
        throw new Error('Invalid response from PowerPoint generation service');
      }
    },
    onError: (error) => {
      console.error('Error generating PowerPoint:', error);
      toast.error("Failed to generate PowerPoint. Please try again.");
    },
  });

  const handleGenerateVisualizationSet = () => {
    generateMutation.mutate();
  };

  const handleLoadVisualizationSet = (setId: string) => {
    loadMutation.mutate(setId);
  };

  const handleDeleteVisualizationSet = (setId: string) => {
    deleteMutation.mutate(setId);
  };

  const handleExportToPDF = () => {
    if (currentVisualizationSet) {
      exportPdfMutation.mutate(currentVisualizationSet.id);
    }
  };

  const handleExportToPowerPoint = () => {
    if (currentVisualizationSet) {
      exportPptMutation.mutate(currentVisualizationSet.id);
    }
  };


  const renderChart = () => {
    if (!currentVisualizationSet || !currentVisualizationSet.visualizations[selectedVisualizationIndex]) return null;
    
    const visualization = currentVisualizationSet.visualizations[selectedVisualizationIndex];

    // More vibrant topic colors from CSS - reordered for better visual impact
    const topicColors = [
      '#B13BFF', // Bright purple
      '#FFCC00', // Bright yellow
      '#EB3678', // Hot pink
      '#FB773C', // Bright orange
      '#F7374F', // Bright red
      '#4F1787', // Vibrant purple
      '#471396', // Electric purple
      '#180161', // Deep purple
      '#88304E', // Rich burgundy
      '#522546', // Wine
      '#090040', // Deep navy
      '#2C2C2C', // Charcoal (least vibrant, last)
    ];

    // Transform the data format for Recharts
    const transformDataForRecharts = () => {
      const { labels, datasets } = visualization.chartData;
      
      if (visualization.chartType === 'pie') {
        // For pie charts, combine labels and data with topic colors
        return labels.map((label, index) => ({
          name: label,
          value: datasets[0]?.data[index] || 0,
          fill: topicColors[index % topicColors.length]
        }));
      }
      
      // For other charts, create objects with label as key and datasets as properties
      return labels.map((label, index) => {
        const dataPoint: any = { name: label };
        datasets.forEach((dataset, datasetIndex) => {
          const key = dataset.label || `dataset${datasetIndex}`;
          dataPoint[key] = dataset.data[index];
        });
        return dataPoint;
      });
    };

    const chartData = transformDataForRecharts();
    
    // Create chart config for shadcn with topic colors
    const chartConfig: any = {};
    visualization.chartData.datasets.forEach((dataset, index) => {
      const key = dataset.label || `dataset${index}`;
      chartConfig[key] = {
        label: dataset.label,
        color: topicColors[index % topicColors.length]
      };
    });

    // Handle different chart types
    switch (visualization.chartType) {
      case 'bar':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {visualization.chartData.datasets.map((dataset, index) => (
                <Bar 
                  key={index}
                  dataKey={dataset.label || `dataset${index}`}
                  fill={topicColors[index % topicColors.length]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        );
      
      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {visualization.chartData.datasets.map((dataset, index) => (
                <Line 
                  key={index}
                  type="monotone"
                  dataKey={dataset.label || `dataset${index}`}
                  stroke={topicColors[index % topicColors.length]}
                  strokeWidth={3}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        );
      
      case 'pie':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        );
      
      case 'radar':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <RadarChart data={chartData}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              {visualization.chartData.datasets.map((dataset, index) => (
                <Radar
                  key={index}
                  name={dataset.label || `dataset${index}`}
                  dataKey={dataset.label || `dataset${index}`}
                  stroke={topicColors[index % topicColors.length]}
                  fill={topicColors[index % topicColors.length]}
                  fillOpacity={0.3}
                />
              ))}
            </RadarChart>
          </ChartContainer>
        );
      
      case 'scatter':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ScatterChart data={chartData}>
              <CartesianGrid />
              <XAxis type="number" dataKey="x" />
              <YAxis type="number" dataKey="y" />
              <ChartTooltip content={<ChartTooltipContent />} />
              {visualization.chartData.datasets.map((dataset, index) => (
                <Scatter
                  key={index}
                  name={dataset.label || `dataset${index}`}
                  data={Array.isArray(dataset.data[0]) ? dataset.data : chartData}
                  fill={topicColors[index % topicColors.length]}
                />
              ))}
            </ScatterChart>
          </ChartContainer>
        );
      
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortedVisualizationSets = [...availableVisualizationSets].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.title.localeCompare(b.title);
    } else {
      return b.title.localeCompare(a.title);
    }
  });

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Data Visualizations</CardTitle>
              <CardDescription>
                AI-generated insights from your knowledge base data
              </CardDescription>
            </div>
            <Button
              onClick={handleGenerateVisualizationSet}
              disabled={generateMutation.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Visualizations
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : 'An error occurred'}</AlertDescription>
        </Alert>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Available Visualization Sets */}
        <div className="col-span-4">
          {!isLoading && availableVisualizationSets.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Sets</CardTitle>
                    <CardDescription>
                      Select a visualization set
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSort}
                    className="h-8 px-2"
                    title={`Sort ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
                  >
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {sortedVisualizationSets.map((set) => (
                    <div
                      key={set.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        currentVisualizationSet?.id === set.id 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleLoadVisualizationSet(set.id)}
                    >
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm">{set.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2">{set.summary}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(set.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {set.metadata.documentsAnalyzed}
                            </span>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                disabled={deleteMutation.isPending && deleteMutation.variables === set.id}
                                title="Delete visualization set"
                              >
                                {deleteMutation.isPending && deleteMutation.variables === set.id ? (
                                  <Loader2 className="h-2 w-2 animate-spin" />
                                ) : (
                                  <Trash2 className="h-2 w-2" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Visualization Set</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this visualization set? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVisualizationSet(set.id);
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Current Visualization Set Display */}
        <div className="col-span-8">
          {currentVisualizationSet && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{currentVisualizationSet.title}</CardTitle>
                <CardDescription>{currentVisualizationSet.description}</CardDescription>
                <p className="text-sm text-gray-600 mt-2">{currentVisualizationSet.summary}</p>
              </div>
              <div className="flex gap-2 pl-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleExportToPDF}
                        disabled={exportPdfMutation.isPending}
                        className="text-white hover:opacity-80"
                        style={{ backgroundColor: '#B13BFF' }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>PDF Report</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleExportToPowerPoint}
                        disabled={exportPptMutation.isPending}
                        className="text-white hover:opacity-80"
                        style={{ backgroundColor: '#FB773C' }}
                      >
                        <Presentation className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>PowerPoint Presentation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['visualization-sets'] })}
                  className="text-white hover:opacity-80"
                  style={{ backgroundColor: '#FFCC00' }}
                  title="Refresh visualization sets"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-white hover:opacity-80"
                      style={{ backgroundColor: '#EB3678' }}
                      disabled={deleteMutation.isPending && deleteMutation.variables === currentVisualizationSet.id}
                      title="Delete visualization set"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === currentVisualizationSet.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Visualization Set</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this visualization set? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVisualizationSet(currentVisualizationSet.id);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {/* Visualization Navigation */}
            {currentVisualizationSet.visualizations.length > 1 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {currentVisualizationSet.visualizations.map((viz, index) => (
                  <Button
                    key={viz.id}
                    variant={selectedVisualizationIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVisualizationIndex(index)}
                  >
                    {viz.chartType.charAt(0).toUpperCase() + viz.chartType.slice(1)} Chart
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {currentVisualizationSet.visualizations[selectedVisualizationIndex] && (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    {currentVisualizationSet.visualizations[selectedVisualizationIndex].title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {currentVisualizationSet.visualizations[selectedVisualizationIndex].description}
                  </p>
                  {renderChart()}
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Key Insights
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {currentVisualizationSet.visualizations[selectedVisualizationIndex].insights.map((insight, index) => (
                        <li key={index} className="text-sm">{insight}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {currentVisualizationSet.visualizations[selectedVisualizationIndex].recommendations.map((recommendation, index) => (
                        <li key={index} className="text-sm">{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full flex justify-between items-center text-xs text-gray-500">
              <div className="flex gap-4">
                <span>{currentVisualizationSet.metadata.documentsAnalyzed} documents analyzed</span>
                <span>{currentVisualizationSet.metadata.filesReferenced} files referenced</span>
                <span>Processing time: {Math.round(currentVisualizationSet.metadata.processingTime / 1000)}s</span>
              </div>
              <span>Created: {formatDate(currentVisualizationSet.createdAt)}</span>
            </div>
          </CardFooter>
        </Card>
      )}

          {/* Loading State for Right Column */}
          {(isLoading || loadMutation.isPending) && (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Loading visualization data...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State for Right Column */}
          {!isLoading && !loadMutation.isPending && !currentVisualizationSet && (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Select a Visualization Set</h3>
                  <p className="text-sm text-gray-600">
                    Choose a visualization set from the left panel to view detailed insights.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Global Empty State - only show when no sets available */}
      {!isLoading && availableVisualizationSets.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Visualizations Available</h3>
              <p className="text-sm text-gray-600 mb-4">
                Generate your first visualization set to get AI-driven insights from your knowledge base.
              </p>
              <Button
                onClick={handleGenerateVisualizationSet}
                disabled={generateMutation.isPending}
                className="bg-black text-white hover:bg-gray-800"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Visualizations
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DataVisualization;