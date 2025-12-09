import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface ParsedConstruction {
  construction_number: string;
  construction_type: 'window' | 'door' | 'sliding_door';
  width_inches: number | null;
  height_inches: number | null;
  width_mm: number | null;
  height_mm: number | null;
  rough_opening: string | null;
  location: string | null;
  model: string | null;
  opening_type: string | null;
  color_exterior: string | null;
  color_interior: string | null;
  glass_type: string | null;
  screen_type: string | null;
  handle_type: string | null;
  has_blinds: boolean;
  blinds_color: string | null;
  center_seal: boolean;
  comments: string | null;
  quantity: number;
  position_index: number;
}

export interface ParsedOrderData {
  quote_number: string | null;
  customer_name: string | null;
  order_date: string | null;
  constructions: ParsedConstruction[];
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
}

interface FileUploadZoneProps {
  onDataParsed: (data: ParsedOrderData) => void;
  onClear: () => void;
  parsedData: ParsedOrderData | null;
}

export function FileUploadZone({ onDataParsed, onClear, parsedData }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const processFile = useCallback(async (file: File) => {
    const validTypes = ['text/csv', 'application/pdf', 'application/vnd.ms-excel'];
    const validExtensions = ['.csv', '.pdf'];
    
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or PDF file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:text/csv;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf';

      const { data, error } = await supabase.functions.invoke('process-order-file', {
        body: {
          file_content: base64Content,
          file_type: fileType,
          file_name: file.name,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      onDataParsed(data);
      
      toast({
        title: "File processed",
        description: `Extracted ${data.constructions?.length || 0} constructions`,
      });
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process the file",
        variant: "destructive",
      });
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  }, [onDataParsed, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClear = useCallback(() => {
    setFileName(null);
    onClear();
  }, [onClear]);

  if (parsedData) {
    return (
      <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {parsedData.constructions.length} constructions • 
                {parsedData.windows_count} windows • 
                {parsedData.doors_count} doors • 
                {parsedData.sliding_doors_count} sliding doors
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
        ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept=".csv,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
        disabled={isProcessing}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Processing {fileName}...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Upload Order File</p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or click to upload CSV or PDF
            </p>
          </div>
        )}
      </label>
    </div>
  );
}
