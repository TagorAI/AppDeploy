import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, PieChart, Table } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';

export default function Admin() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiRequest('/api/admin/upload-investment-products', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      toast({
        title: "Success",
        description: data.message,
      });
      setFile(null);
      // Reset the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin dashboard</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Upload investment products
            </CardTitle>
            <CardDescription>
              Upload an Excel file containing investment product data. The file should include all required fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100"
              />
              <p className="text-sm text-muted-foreground">
                Accepted formats: .xlsx, .xls
              </p>
            </div>
            
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? "Uploading..." : "Upload file"}
            </Button>

            {file && (
              <p className="text-sm text-muted-foreground">
                Selected file: {file.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate('/admin/update-allocations')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-6 w-6" />
              Update asset allocations
            </CardTitle>
            <CardDescription>
              Upload fund fact sheets to extract and update asset allocation percentages
            </CardDescription>
          </CardHeader>
          <CardContent>
            Upload PDF fact sheets and manage asset allocations for investment products
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate('/admin/products')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-6 w-6" />
              View investment products
            </CardTitle>
            <CardDescription>
              Browse and manage investment products in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            View all investment products with detailed information
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
} 