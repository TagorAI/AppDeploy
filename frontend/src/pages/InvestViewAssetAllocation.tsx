import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, AlertTriangle, PieChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

interface AssetAllocation {
  equity_us: number;
  equity_europe: number;
  equity_canada: number;
  equity_emerging_markets: number;
  commodity_gold: number;
  commodity_other: number;
  bonds_investmentgrade_us: number;
  bonds_investmentgrade_canada: number;
  bonds_international_ex_us: number;
  bonds_emerging_markets: number;
  real_estate: number;
  alternatives: number;
}

interface UnmappedHolding {
  holding_name: string;
  holding_symbol: string;
  holding_value: number;
  number_of_units: number;
  average_cost_per_unit: number;
}

interface AllocationResponse {
  total_value: number;
  allocations: AssetAllocation;
  mapped_percentage: number;
  unmapped_holdings: UnmappedHolding[];
  message: string;
}

// Custom color palette
const COLORS = [
  '#3366CC', '#DC3912', '#FF9900', '#109618', // Equities 
  '#990099', '#0099C6', // Commodities
  '#DD4477', '#66AA00', '#B82E2E', '#316395', // Bonds
  '#994499', '#22AA99' // Real Estate & Alternatives
];

// Allocation category mappings
const categories = [
  { 
    title: "Equity", 
    fields: [
      { key: "equity_us", label: "US" },
      { key: "equity_europe", label: "Europe" },
      { key: "equity_canada", label: "Canada" },
      { key: "equity_emerging_markets", label: "Emerging Markets" }
    ]
  },
  {
    title: "Fixed Income",
    fields: [
      { key: "bonds_investmentgrade_us", label: "US Investment Grade" },
      { key: "bonds_investmentgrade_canada", label: "Canada Investment Grade" },
      { key: "bonds_international_ex_us", label: "International ex-US" },
      { key: "bonds_emerging_markets", label: "Emerging Markets" }
    ]
  },
  {
    title: "Alternatives & Other",
    fields: [
      { key: "commodity_gold", label: "Gold" },
      { key: "commodity_other", label: "Other Commodities" },
      { key: "real_estate", label: "Real Estate" },
      { key: "alternatives", label: "Alternatives" }
    ]
  }
];

export default function InvestViewAssetAllocation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocationData, setAllocationData] = useState<AllocationResponse | null>(null);
  const [chartData, setChartData] = useState<Array<{name: string, value: number}>>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { apiRequest } = useAuth();

  useEffect(() => {
    fetchAssetAllocation();
  }, []);

  useEffect(() => {
    if (allocationData?.allocations) {
      const chartItems: Array<{name: string, value: number}> = [];
      
      // Process each category
      categories.forEach(category => {
        category.fields.forEach(field => {
          const value = allocationData.allocations[field.key as keyof AssetAllocation] || 0;
          if (value > 0) {
            chartItems.push({
              name: field.label,
              value: parseFloat(value.toFixed(2))
            });
          }
        });
      });
      
      setChartData(chartItems);
    }
  }, [allocationData]);

  const fetchAssetAllocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/investments/asset-allocation');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch asset allocation');
      }
      
      const data: AllocationResponse = await response.json();
      setAllocationData(data);
      
    } catch (error) {
      console.error('Error fetching asset allocation:', error);
      setError((error as Error).message);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load asset allocation: ${(error as Error).message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-foreground hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={() => navigate('/grow-investments/recommendations')}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            Recommendations
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="text-center mb-6">
          <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
            Grow investments
          </span>
          <h1 className="text-3xl font-montserrat font-bold">Your Asset Allocation</h1>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading your asset allocation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="text-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={() => navigate('/grow-investments/recommendations')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          Recommendations
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Grow investments
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Your Asset Allocation</h1>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {allocationData && allocationData.total_value === 0 && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Investments Found</AlertTitle>
          <AlertDescription>
            You don't have any investment holdings yet. Add your holdings to see your asset allocation.
          </AlertDescription>
        </Alert>
      )}
      
      {allocationData && allocationData.total_value > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Summary</CardTitle>
                <CardDescription>
                  Total Portfolio Value: {formatCurrency(allocationData.total_value)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span>Mapped to Asset Classes</span>
                    <span>{allocationData.mapped_percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={allocationData.mapped_percentage} className="h-2" />
                  
                  {allocationData.mapped_percentage < 80 && (
                    <Alert className="mt-4" variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {allocationData.mapped_percentage < 30 
                          ? "Most of your holdings couldn't be mapped to asset classes. Add more details or contact support." 
                          : "Some of your holdings couldn't be mapped to asset classes."}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {categories.map((category, categoryIndex) => {
                  const categoryTotal = category.fields.reduce((sum, field) => {
                    return sum + (allocationData.allocations[field.key as keyof AssetAllocation] || 0);
                  }, 0);
                  
                  return (
                    <div key={categoryIndex} className="mb-6">
                      <h3 className="font-medium mb-2 flex justify-between">
                        <span>{category.title}</span>
                        <span>{categoryTotal.toFixed(1)}%</span>
                      </h3>
                      
                      <div className="space-y-3">
                        {category.fields.map((field, fieldIndex) => {
                          const value = allocationData.allocations[field.key as keyof AssetAllocation] || 0;
                          if (value <= 0) return null;
                          
                          return (
                            <div key={fieldIndex}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{field.label}</span>
                                <span>{value.toFixed(1)}%</span>
                              </div>
                              <Progress value={value} className="h-1" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            
            {allocationData.unmapped_holdings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Unmapped Holdings</CardTitle>
                  <CardDescription>
                    These holdings couldn't be mapped to asset classes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allocationData.unmapped_holdings.map((holding, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">{holding.holding_name}</p>
                          <p className="text-sm text-muted-foreground">{holding.holding_symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(holding.holding_value)}</p>
                          <p className="text-sm text-muted-foreground">
                            {holding.number_of_units} × {formatCurrency(holding.average_cost_per_unit)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={(entry) => `${entry.name}: ${entry.value}%`}
                        labelLine={false}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No allocation data available</p>
                </div>
              )}
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/dashboard/investments/holdings')}
                >
                  Manage holdings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 