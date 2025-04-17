import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface InvestmentHolding {
  id: string;
  holding_name: string;
  holding_symbol: string | null;
  number_of_units: number;
  average_cost_per_unit: number;
  currency: string;
  institution: string | null;
  account_type: string | null;
}

export default function InvestViewHoldings() {
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { apiRequest } = useAuth();

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        setIsLoading(true);
        
        const response = await apiRequest('/api/investments/holdings');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch holdings: ${response.status}`);
        }
        
        const data = await response.json();
        setHoldings(data.holdings || []);
      } catch (err) {
        console.error('Error fetching holdings:', err);
        setError('Failed to load your investment holdings. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHoldings();
  }, [apiRequest]);

  // Calculate total value for each holding
  const calculateTotalValue = (holding: InvestmentHolding) => {
    return holding.number_of_units * holding.average_cost_per_unit;
  };

  // Format currency
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  // Calculate portfolio total value
  const portfolioTotal = holdings.reduce((total, holding) => {
    return total + calculateTotalValue(holding);
  }, 0);

  if (isLoading) {
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
            onClick={() => navigate('/dashboard/investments/asset-allocation')}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            View Asset Allocation
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="text-center mb-6">
          <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
            Grow investments
          </span>
          <h1 className="text-3xl font-montserrat font-bold">Your Investment Holdings</h1>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading your investment holdings...</p>
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
          onClick={() => navigate('/dashboard/investments/asset-allocation')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          View Asset Allocation
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Grow investments
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Your Investment Holdings</h1>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {holdings.length === 0 && !error ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>No Investment Holdings</CardTitle>
            <CardDescription>
              You haven't added any investment holdings yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              To get started, upload your investment statement or add your holdings manually.
            </p>
            <Button onClick={() => navigate('/dashboard/investments/upload')}>
              Upload Investment Statement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Summary</CardTitle>
              <CardDescription>
                Total Portfolio Value: {formatCurrency(portfolioTotal, 'USD')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investment Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Cost Per Unit</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Account Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => (
                    <TableRow key={holding.id}>
                      <TableCell className="font-medium">{holding.holding_name}</TableCell>
                      <TableCell>{holding.holding_symbol || '-'}</TableCell>
                      <TableCell>{holding.number_of_units.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(holding.average_cost_per_unit, holding.currency)}</TableCell>
                      <TableCell>{formatCurrency(calculateTotalValue(holding), holding.currency)}</TableCell>
                      <TableCell>{holding.institution || '-'}</TableCell>
                      <TableCell>{holding.account_type || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/investments/upload')}
            >
              Upload More Holdings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 