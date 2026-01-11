import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, X, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ModelComparisonView } from "./ModelComparisonView";

export interface ParsedComponent {
  component_type: string;
  component_name: string | null;
  quantity: number;
}

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
  components?: ParsedComponent[];
}

export interface AggregatedComponent {
  component_type: string;
  component_name: string;
  total_quantity: number;
}

export interface ProfileInfo {
  model: string | null;
  color_exterior: string | null;
  color_interior: string | null;
}

export interface ParsedOrderData {
  quote_number: string | null;
  customer_name: string | null;
  order_date: string | null;
  constructions: ParsedConstruction[];
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  aggregated_components?: AggregatedComponent[];
  profile_info?: ProfileInfo | null;
}

interface ModelResult {
  model: string;
  data: ParsedOrderData;
  processingTimeMs: number;
  error?: string;
}

interface FieldDifference {
  field: string;
  constructionNumber?: string;
  gemini15ProValue: string | null;
  gemini15FlashValue: string | null;
}

interface ComparisonData {
  gemini15Pro: ModelResult;
  gemini15Flash: ModelResult;
  comparison: {
    constructionCountMatch: boolean;
    componentCountMatch: boolean;
    differences: string[];
    fieldDifferences: FieldDifference[];
    gemini15ProStats: { constructions: number; components: number; filledFields: number };
    gemini15FlashStats: { constructions: number; components: number; filledFields: number };
  };
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
  const [compareModels, setCompareModels] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const { toast } = useToast();

  const processFile = useCallback(async (file: File) => {
    const validTypes = [
      'text/csv', 
      'application/pdf', 
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const validExtensions = ['.csv', '.pdf', '.xls', '.xlsx'];
    
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, PDF, or Excel file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);
    setComparisonData(null);

    try {
      const reader = new FileReader();
      const base64Content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileName = file.name.toLowerCase();
      let fileType = 'pdf';
      if (fileName.endsWith('.csv')) fileType = 'csv';
      else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) fileType = 'excel';

      const { data, error } = await supabase.functions.invoke('process-order-file', {
        body: {
          file_content: base64Content,
          file_type: fileType,
          file_name: file.name,
          compare_models: compareModels,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (compareModels && data.gemini15Pro && data.gemini15Flash) {
        // Comparison mode - show comparison UI
        setComparisonData(data as ComparisonData);
        toast({
          title: "Comparison complete",
          description: `Compared Gemini 1.5 Pro vs Gemini 1.5 Flash`,
        });
      } else {
        // Normal mode
        onDataParsed(data);
        const componentCount = data.aggregated_components?.length || 0;
        toast({
          title: "File processed",
          description: `Extracted ${data.constructions?.length || 0} constructions, ${componentCount} unique component types`,
        });
      }
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
  }, [onDataParsed, toast, compareModels]);

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
    setComparisonData(null);
    onClear();
  }, [onClear]);

  const handleSelectModel = useCallback((modelData: ParsedOrderData, modelName: string) => {
    onDataParsed(modelData);
    setComparisonData(null);
    toast({
      title: "Model selected",
      description: `Using extraction from ${modelName}`,
    });
  }, [onDataParsed, toast]);

  // Show comparison view
  if (comparisonData) {
    return (
      <ModelComparisonView 
        data={comparisonData}
        onSelectModel={handleSelectModel}
        onCancel={handleClear}
      />
    );
  }

  if (parsedData) {
    const componentCount = parsedData.aggregated_components?.length || 0;
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
                {componentCount > 0 && ` • ${componentCount} component types`}
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
    <div className="space-y-3">
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
          accept=".csv,.pdf,.xls,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm font-medium">
                {compareModels ? 'Comparing models...' : `Processing ${fileName}...`}
              </p>
              <p className="text-xs text-muted-foreground">
                {compareModels
                  ? 'Running Gemini 1.5 Pro and Gemini 1.5 Flash in parallel...'
                  : 'Using AI for accurate extraction...'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Upload Order File</p>
              <p className="text-xs text-muted-foreground">
                PDF, CSV, or Excel
              </p>
            </div>
          )}
        </label>
      </div>
      
      {/* Compare Models Toggle */}
      <div className="flex items-center gap-2 px-1">
        <Checkbox 
          id="compare-models" 
          checked={compareModels}
          onCheckedChange={(checked) => setCompareModels(checked === true)}
          disabled={isProcessing}
        />
        <Label
          htmlFor="compare-models"
          className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5"
        >
          <GitCompare className="h-3.5 w-3.5" />
          Compare Gemini 1.5 Pro vs Gemini 1.5 Flash
        </Label>
      </div>
    </div>
  );
}
