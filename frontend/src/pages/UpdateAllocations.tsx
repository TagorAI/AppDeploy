import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext'

// Define interfaces for data types
interface AllocationData {
  product_symbol: string;
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

interface ProductMatch {
  id: number;
  fund_name: string;
  fund_symbol: string;
}

export default function UpdateAllocations() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<AllocationData | null>(null);
  const [productMatch, setProductMatch] = useState<ProductMatch | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalAllocation, setTotalAllocation] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { apiRequest } = useAuth();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check if it's a PDF
      if (selectedFile.type !== 'application/pdf') {
        setErrorMessage('Please upload a PDF file');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setErrorMessage(null);
    }
  };

  // Extract asset allocation data from PDF
  const handleExtract = async () => {
    if (!file) {
      setErrorMessage('Please select a file first');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use apiRequest instead of direct fetch
      const response = await apiRequest('/api/admin/extract-asset-allocation', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to extract data from the file');
      }
      
      const data = await response.json();
      
      setExtractedData(data.allocation_data);
      setProductMatch(data.product_match);
      
      // Calculate total allocation
      calculateTotalAllocation(data.allocation_data);
      
      toast({
        title: "Extraction successful",
        description: "Asset allocation data extracted from the factsheet",
      });
    } catch (error) {
      console.error('Extraction error:', error);
      setErrorMessage((error as Error).message || 'An error occurred during extraction');
      
      toast({
        variant: "destructive",
        title: "Extraction failed",
        description: (error as Error).message || 'Failed to process the factsheet',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Calculate total allocation percentage
  const calculateTotalAllocation = (data: AllocationData) => {
    const total = Object.entries(data).reduce((sum, [key, value]) => {
      // Skip the product_symbol field
      if (key !== 'product_symbol' && typeof value === 'number') {
        return sum + value;
      }
      return sum;
    }, 0);
    
    setTotalAllocation(parseFloat(total.toFixed(2)));
  };

  // Handle allocation field updates
  const handleAllocationChange = (field: keyof AllocationData, value: string) => {
    if (!extractedData) return;
    
    const numValue = value === '' ? 0 : parseFloat(value);
    
    // Ensure value is a valid number between 0 and 100
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return;
    }
    
    const updatedData = {
      ...extractedData,
      [field]: numValue
    };
    
    setExtractedData(updatedData);
    calculateTotalAllocation(updatedData);
  };

  // Save asset allocation data
  const handleSave = async () => {
    if (!extractedData || !productMatch) {
      setErrorMessage('Missing allocation data or product match');
      return;
    }

    // Validate total allocation
    if (totalAllocation > 100) {
      setErrorMessage('Total allocation cannot exceed 100%');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    
    try {
      // Use apiRequest instead of direct fetch
      const response = await apiRequest('/api/admin/save-asset-allocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investment_product_id: productMatch.id,
          allocations: extractedData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save asset allocation');
      }
      
      const result = await response.json();
      
      toast({
        title: "Save successful",
        description: `Asset allocation for ${productMatch.fund_name} saved successfully`,
      });
      
      // Reset form and navigate back after short delay
      setTimeout(() => {
        setFile(null);
        setExtractedData(null);
        setProductMatch(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        navigate('/admin');
      }, 1500);
      
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage((error as Error).message || 'An error occurred while saving');
      
      toast({
        variant: "destructive",
        title: "Save failed",
        description: (error as Error).message || 'Failed to save asset allocation data',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setProductMatch(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Allocation field groups for display
  const allocationGroups = [
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

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to admin
        </Button>
        <h1 className="text-3xl font-bold">Update asset allocations</h1>
      </div>
      
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {!extractedData ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload fund factsheet</CardTitle>
            <CardDescription>
              Upload a PDF factsheet to extract asset allocation data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="file-upload" className="flex-none">Factsheet PDF</Label>
                <Input 
                  ref={fileInputRef}
                  id="file-upload" 
                  type="file" 
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="flex-grow"
                />
              </div>
              
              {file && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleExtract}
              disabled={!file || isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Extract allocations
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset allocation data</CardTitle>
              {productMatch ? (
                <CardDescription>
                  Extracted for {productMatch.fund_name} ({productMatch.fund_symbol})
                </CardDescription>
              ) : (
                <CardDescription>
                  Extracted from factsheet for {extractedData.product_symbol || "Unknown product"}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">Total allocation</Label>
                  <Progress 
                    value={totalAllocation} 
                    max={100} 
                    className={totalAllocation > 100 ? "bg-red-200" : ""}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-sm">{totalAllocation}%</span>
                    <span className="text-sm text-muted-foreground">Target: 100%</span>
                  </div>
                  {totalAllocation > 100 && (
                    <p className="text-sm text-red-500 mt-1">
                      Total allocation exceeds 100%. Please adjust the values.
                    </p>
                  )}
                </div>

                {allocationGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-4">
                    <h3 className="font-medium text-lg">{group.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <div className="flex items-center">
                            <Input
                              id={field.key}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={extractedData[field.key as keyof AllocationData] || 0}
                              onChange={(e) => handleAllocationChange(field.key as keyof AllocationData, e.target.value)}
                              className="flex-grow"
                            />
                            <span className="ml-2">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving || totalAllocation > 100 || !productMatch}
                className={!productMatch ? "cursor-not-allowed opacity-50" : ""}
              >
                {isSaving ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save allocation
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      <Toaster />
    </div>
  );
}