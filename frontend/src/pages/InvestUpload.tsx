import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Upload, FileText, CheckCircle, Edit, Save, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Define interfaces for our data types
interface InvestmentHolding {
  holding_name?: string;
  holding_symbol?: string;
  number_of_units?: number;
  average_cost_per_unit?: number;
  currency?: string;
  institution?: string;
  account_type?: string;
}

interface ExtractResponse {
  success: boolean;
  holdings: InvestmentHolding[];
  message?: string;
}

const InvestUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<InvestmentHolding[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<"append" | "overwrite">("append");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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

  // Handle file upload and extraction
  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a file first');
      return;
    }

    setIsUploading(true);
    setIsExtracting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('/api/investments/extract', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to extract data from the file');
      }
      
      const data: ExtractResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to extract investment data');
      }
      
      setExtractedData(data.holdings);
      
      // Show success message
      toast({
        title: "Extraction successful",
        description: `Extracted ${data.holdings.length} investment holdings from your statement.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage((error as Error).message || 'An error occurred during upload');
      
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: (error as Error).message || 'Failed to process your investment statement.',
      });
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  // Handle saving the extracted data
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      
      const response = await apiRequest('/api/investments/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdings: extractedData,
          save_mode: saveMode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save investment holdings');
      }
      
      const result = await response.json();
      
      setSuccessMessage(result.message || 'Investment holdings saved successfully');
      setShowConfirmDialog(false);
      
      toast({
        title: "Save successful",
        description: "Your investment holdings have been saved to your profile.",
      });
      
      // Reset form after successful save
      setFile(null);
      setExtractedData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // After successful save, navigate to the holdings view
      navigate('/dashboard/investments/holdings');
      
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage((error as Error).message || 'An error occurred while saving');
      
      toast({
        variant: "destructive",
        title: "Save failed",
        description: (error as Error).message || 'Failed to save your investment holdings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle editing individual holding
  const handleEditRow = (index: number, field: keyof InvestmentHolding, value: string | number) => {
    const updatedData = [...extractedData];
    
    // Handle numeric fields correctly
    if (field === 'number_of_units' || field === 'average_cost_per_unit') {
      updatedData[index][field] = value === '' ? undefined : Number(value);
    } else {
      // Handle string fields
      updatedData[index][field] = value === '' ? undefined : String(value);
    }
    
    setExtractedData(updatedData);
  };

  // Add a new empty row
  const handleAddRow = () => {
    setExtractedData([
      ...extractedData,
      {
        holding_name: '',
        holding_symbol: '',
        number_of_units: undefined,
        average_cost_per_unit: undefined,
        currency: 'CAD',
        institution: '',
        account_type: ''
      }
    ]);
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    const updatedData = [...extractedData];
    updatedData.splice(index, 1);
    setExtractedData(updatedData);
  };

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
          onClick={() => navigate('/dashboard/investments/holdings')}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          View Holdings
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="text-center mb-6">
        <span className="inline-block bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full mb-2">
          Grow investments
        </span>
        <h1 className="text-3xl font-montserrat font-bold">Upload investment statement</h1>
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Success message */}
      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* File upload section */}
      {!extractedData.length && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload your investment statement</CardTitle>
            <CardDescription>
              Upload a PDF file of your investment statement. We'll extract your holdings information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="file-upload" className="flex-none">Statement file</Label>
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
              onClick={handleUpload}
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
                  Upload and extract
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Extracted data review and edit */}
      {extractedData.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Review extracted holdings</h2>
            <div className="flex gap-2">
              <Button 
                variant={isEditMode ? "default" : "outline"} 
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Edit className="mr-2 h-4 w-4" />
                {isEditMode ? "Finish editing" : "Edit holdings"}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setFile(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investment name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Cost per unit</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Account type</TableHead>
                    {isEditMode && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedData.map((holding, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            value={holding.holding_name || ''}
                            onChange={(e) => handleEditRow(index, 'holding_name', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          holding.holding_name
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            value={holding.holding_symbol || ''}
                            onChange={(e) => handleEditRow(index, 'holding_symbol', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          holding.holding_symbol
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={holding.number_of_units || ''}
                            onChange={(e) => handleEditRow(index, 'number_of_units', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          holding.number_of_units
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={holding.average_cost_per_unit || ''}
                            onChange={(e) => handleEditRow(index, 'average_cost_per_unit', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          holding.average_cost_per_unit
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            value={holding.currency || 'CAD'}
                            onChange={(e) => handleEditRow(index, 'currency', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          holding.currency || 'CAD'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            value={holding.institution || ''}
                            onChange={(e) => handleEditRow(index, 'institution', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          holding.institution
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Input
                            value={holding.account_type || ''}
                            onChange={(e) => handleEditRow(index, 'account_type', e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          holding.account_type
                        )}
                      </TableCell>
                      {isEditMode && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            
            {isEditMode && (
              <CardFooter className="border-t flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={handleAddRow}
                >
                  + Add investment
                </Button>
              </CardFooter>
            )}
          </Card>
          
          {/* Save options section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Save options</CardTitle>
              <CardDescription>
                Choose how you want to save these investment holdings to your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer ${
                  saveMode === "append" ? "border-primary bg-secondary/50" : "border-border"
                }`}
                onClick={() => setSaveMode("append")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-4 h-4 rounded-full ${
                    saveMode === "append" ? "bg-primary" : "border border-muted-foreground"
                  }`}></div>
                  <h3 className="font-medium">Append to existing holdings</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Add these holdings to your existing ones. Use this if you're adding a new account.
                </p>
              </div>
              
              <div 
                className={`p-4 border rounded-lg cursor-pointer ${
                  saveMode === "overwrite" ? "border-primary bg-secondary/50" : "border-border"
                }`}
                onClick={() => setSaveMode("overwrite")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-4 h-4 rounded-full ${
                    saveMode === "overwrite" ? "bg-primary" : "border border-muted-foreground"
                  }`}></div>
                  <h3 className="font-medium">Replace all existing holdings</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Delete all your existing holdings and replace with these. Use this for a complete update.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save to my profile
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Confirmation dialog */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm save</DialogTitle>
                <DialogDescription>
                  {saveMode === "append" 
                    ? "You're about to add these holdings to your existing ones."
                    : "Warning: This will replace all your existing investment holdings with these new ones."}
                </DialogDescription>
              </DialogHeader>
              <div>
                <p>You are saving {extractedData.length} investment holdings.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Confirm save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default InvestUpload; 