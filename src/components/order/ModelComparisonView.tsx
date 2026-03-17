import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Layers, Package, FileText, ArrowRight, AlertTriangle } from "lucide-react";
import { ParsedOrderData } from "./FileUploadZone";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FieldDifference {
  field: string;
  constructionNumber?: string;
  gemini15ProValue: string | null;
  gemini15FlashValue: string | null;
}

interface ModelResult {
  model: string;
  data: ParsedOrderData;
  processingTimeMs: number;
  error?: string;
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

interface ModelComparisonViewProps {
  data: ComparisonData;
  onSelectModel: (modelData: ParsedOrderData, modelName: string) => void;
  onCancel: () => void;
}

export function ModelComparisonView({ data, onSelectModel, onCancel }: ModelComparisonViewProps) {
  const { gemini15Pro, gemini15Flash, comparison } = data;

  const getWinner = () => {
    // Prefer model with more constructions, then more components, then more filled fields
    if (comparison.gemini15ProStats.constructions > comparison.gemini15FlashStats.constructions) return 'gemini15Pro';
    if (comparison.gemini15FlashStats.constructions > comparison.gemini15ProStats.constructions) return 'gemini15Flash';
    if (comparison.gemini15ProStats.components > comparison.gemini15FlashStats.components) return 'gemini15Pro';
    if (comparison.gemini15FlashStats.components > comparison.gemini15ProStats.components) return 'gemini15Flash';
    if (comparison.gemini15ProStats.filledFields > comparison.gemini15FlashStats.filledFields) return 'gemini15Pro';
    if (comparison.gemini15FlashStats.filledFields > comparison.gemini15ProStats.filledFields) return 'gemini15Flash';
    // Default to Run A
    return 'gemini15Pro';
  };

  const winner = getWinner();
  
  // Group field differences by construction number
  const orderLevelDiffs = comparison.fieldDifferences?.filter(d => !d.constructionNumber) || [];
  const constructionDiffs = comparison.fieldDifferences?.filter(d => d.constructionNumber) || [];
  
  // Group construction diffs by construction number
  const constructionDiffsByNumber = constructionDiffs.reduce((acc, diff) => {
    const key = diff.constructionNumber || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(diff);
    return acc;
  }, {} as Record<string, FieldDifference[]>);

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
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{comparison.fieldDifferences?.length || 0} field differences found</span>
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
        {/* Gemini 1.5 Pro */}
        <Card className={`relative ${winner === 'gemini15Pro' ? 'ring-2 ring-green-500' : ''}`}>
          {winner === 'gemini15Pro' && (
            <Badge className="absolute -top-2 left-4 bg-green-500">Recommended</Badge>
          )}
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Gemini 3.0 Flash (Run A)
              {gemini15Pro.error && <Badge variant="destructive">Error</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gemini15Pro.error ? (
              <p className="text-sm text-destructive">{gemini15Pro.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{(gemini15Pro.processingTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini15ProStats.constructions} constructions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini15ProStats.components} components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini15ProStats.filledFields} fields</span>
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{gemini15Pro.data.windows_count}W</Badge>
                  <Badge variant="outline">{gemini15Pro.data.doors_count}D</Badge>
                  <Badge variant="outline">{gemini15Pro.data.sliding_doors_count}S</Badge>
                </div>

                <Button
                  className="w-full"
                  variant={winner === 'gemini15Pro' ? 'default' : 'outline'}
                  onClick={() => onSelectModel(gemini15Pro.data, 'Gemini 3.0 Flash (Run A)')}
                >
                  Use This Result
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Gemini 1.5 Flash */}
        <Card className={`relative ${winner === 'gemini15Flash' ? 'ring-2 ring-green-500' : ''}`}>
          {winner === 'gemini15Flash' && (
            <Badge className="absolute -top-2 left-4 bg-green-500">Recommended</Badge>
          )}
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Gemini 3.0 Flash (Run B)
              <Badge variant="secondary" className="text-xs">Same Model</Badge>
              {gemini15Flash.error && <Badge variant="destructive">Error</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gemini15Flash.error ? (
              <p className="text-sm text-destructive">{gemini15Flash.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{(gemini15Flash.processingTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini15FlashStats.constructions} constructions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini15FlashStats.components} components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{comparison.gemini15FlashStats.filledFields} fields</span>
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{gemini15Flash.data.windows_count}W</Badge>
                  <Badge variant="outline">{gemini15Flash.data.doors_count}D</Badge>
                  <Badge variant="outline">{gemini15Flash.data.sliding_doors_count}S</Badge>
                </div>

                <Button
                  className="w-full"
                  variant={winner === 'gemini15Flash' ? 'default' : 'outline'}
                  onClick={() => onSelectModel(gemini15Flash.data, 'Gemini 3.0 Flash (Run B)')}
                >
                  Use This Result
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Field-by-Field Differences */}
      {comparison.fieldDifferences && comparison.fieldDifferences.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-amber-500" />
              Field Differences ({comparison.fieldDifferences.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {/* Order-level differences */}
              {orderLevelDiffs.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Order-Level Fields</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Field</TableHead>
                        <TableHead className="text-blue-600">Gemini 3.0 Flash (A)</TableHead>
                        <TableHead className="text-purple-600">Gemini 3.0 Flash (B)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderLevelDiffs.map((diff, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{diff.field}</TableCell>
                          <TableCell className="text-sm">
                            {diff.gemini15ProValue ? (
                              <span className="text-foreground">{diff.gemini15ProValue}</span>
                            ) : (
                              <span className="text-muted-foreground italic">empty</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {diff.gemini15FlashValue ? (
                              <span className="text-foreground">{diff.gemini15FlashValue}</span>
                            ) : (
                              <span className="text-muted-foreground italic">empty</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Construction-level differences grouped by construction number */}
              {Object.keys(constructionDiffsByNumber).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Construction-Level Fields</h4>
                  {Object.entries(constructionDiffsByNumber).map(([cNum, diffs]) => (
                    <div key={cNum} className="mb-4">
                      <Badge variant="outline" className="mb-2">Construction #{cNum}</Badge>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[150px]">Field</TableHead>
                            <TableHead className="text-blue-600">Gemini 3.0 Flash (A)</TableHead>
                            <TableHead className="text-purple-600">Gemini 3.0 Flash (B)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {diffs.map((diff, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium text-sm">{diff.field}</TableCell>
                              <TableCell className="text-sm">
                                {diff.gemini15ProValue ? (
                                  <span className="text-foreground">{diff.gemini15ProValue}</span>
                                ) : (
                                  <span className="text-muted-foreground italic">empty</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {diff.gemini15FlashValue ? (
                                  <span className="text-foreground">{diff.gemini15FlashValue}</span>
                                ) : (
                                  <span className="text-muted-foreground italic">empty</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
