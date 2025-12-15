import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Layers, Package, FileText, ArrowRight } from "lucide-react";
import { ParsedOrderData } from "./FileUploadZone";

interface ModelResult {
  model: string;
  data: ParsedOrderData;
  processingTimeMs: number;
  error?: string;
}

interface ComparisonData {
  gemini25: ModelResult;
  gemini3: ModelResult;
  comparison: {
    constructionCountMatch: boolean;
    componentCountMatch: boolean;
    differences: string[];
    gemini25Stats: { constructions: number; components: number; filledFields: number };
    gemini3Stats: { constructions: number; components: number; filledFields: number };
  };
}

interface ModelComparisonViewProps {
  data: ComparisonData;
  onSelectModel: (modelData: ParsedOrderData, modelName: string) => void;
  onCancel: () => void;
}

export function ModelComparisonView({ data, onSelectModel, onCancel }: ModelComparisonViewProps) {
  const { gemini25, gemini3, comparison } = data;
  
  const getWinner = () => {
    // Prefer model with more constructions, then more components, then more filled fields
    if (comparison.gemini25Stats.constructions > comparison.gemini3Stats.constructions) return 'gemini25';
    if (comparison.gemini3Stats.constructions > comparison.gemini25Stats.constructions) return 'gemini3';
    if (comparison.gemini25Stats.components > comparison.gemini3Stats.components) return 'gemini25';
    if (comparison.gemini3Stats.components > comparison.gemini25Stats.components) return 'gemini3';
    if (comparison.gemini25Stats.filledFields > comparison.gemini3Stats.filledFields) return 'gemini25';
    if (comparison.gemini3Stats.filledFields > comparison.gemini25Stats.filledFields) return 'gemini3';
    // Default to Gemini 3 (newer)
    return 'gemini3';
  };
  
  const winner = getWinner();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Model Comparison Results</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      
      {/* Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm">
            {comparison.differences.length === 0 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Both models produced identical results</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-amber-500" />
                <span>{comparison.differences.length} differences found</span>
              </>
            )}
          </div>
          {comparison.differences.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {comparison.differences.map((diff, i) => (
                <li key={i}>• {diff}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      
      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gemini 2.5 Pro */}
        <Card className={`relative ${winner === 'gemini25' ? 'ring-2 ring-green-500' : ''}`}>
          {winner === 'gemini25' && (
            <Badge className="absolute -top-2 left-4 bg-green-500">Recommended</Badge>
          )}
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Gemini 2.5 Pro
              {gemini25.error && <Badge variant="destructive">Error</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gemini25.error ? (
              <p className="text-sm text-destructive">{gemini25.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{(gemini25.processingTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini25Stats.constructions} constructions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini25Stats.components} components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini25Stats.filledFields} fields</span>
                  </div>
                </div>
                
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{gemini25.data.windows_count}W</Badge>
                  <Badge variant="outline">{gemini25.data.doors_count}D</Badge>
                  <Badge variant="outline">{gemini25.data.sliding_doors_count}S</Badge>
                </div>
                
                <Button 
                  className="w-full" 
                  variant={winner === 'gemini25' ? 'default' : 'outline'}
                  onClick={() => onSelectModel(gemini25.data, 'Gemini 2.5 Pro')}
                >
                  Use This Result
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Gemini 3 Pro Preview */}
        <Card className={`relative ${winner === 'gemini3' ? 'ring-2 ring-green-500' : ''}`}>
          {winner === 'gemini3' && (
            <Badge className="absolute -top-2 left-4 bg-green-500">Recommended</Badge>
          )}
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Gemini 3 Pro Preview
              <Badge variant="secondary" className="text-xs">New</Badge>
              {gemini3.error && <Badge variant="destructive">Error</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gemini3.error ? (
              <p className="text-sm text-destructive">{gemini3.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{(gemini3.processingTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini3Stats.constructions} constructions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini3Stats.components} components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini3Stats.filledFields} fields</span>
                  </div>
                </div>
                
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{gemini3.data.windows_count}W</Badge>
                  <Badge variant="outline">{gemini3.data.doors_count}D</Badge>
                  <Badge variant="outline">{gemini3.data.sliding_doors_count}S</Badge>
                </div>
                
                <Button 
                  className="w-full" 
                  variant={winner === 'gemini3' ? 'default' : 'outline'}
                  onClick={() => onSelectModel(gemini3.data, 'Gemini 3 Pro Preview')}
                >
                  Use This Result
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
