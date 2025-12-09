import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, FileText, AlertCircle } from "lucide-react";
import { ParsedOrderData } from "./FileUploadZone";

interface SlidingDoorEntry {
  type: string;
  count: number;
}

interface ExtractionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedOrderData | null;
  onConfirm: (confirmedData: ConfirmedExtractionData) => void;
  onCancel: () => void;
}

export interface ConfirmedExtractionData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  windowsCount: number;
  doorsCount: number;
  hasSlidingDoors: boolean;
  slidingDoorEntries: SlidingDoorEntry[];
  screenType: string;
  hasPlisseScreens: boolean;
  hasNailingFlanges: boolean;
  parsedOrderData: ParsedOrderData;
}

const SLIDING_DOOR_TYPES = [
  { value: "multi_slide", label: "Multi Slide" },
  { value: "smart_slide", label: "Smart Slide" },
  { value: "lift_and_slide", label: "Lift and Slide" },
  { value: "psk", label: "PSK" },
];

const SCREEN_TYPES = [
  { value: "flex", label: "Flex Screen" },
  { value: "deca", label: "Deca Aluminum Screen" },
];

export function ExtractionConfirmationDialog({
  open,
  onOpenChange,
  parsedData,
  onConfirm,
  onCancel,
}: ExtractionConfirmationDialogProps) {
  // Initialize state from parsed data
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [windowsCount, setWindowsCount] = useState(0);
  const [doorsCount, setDoorsCount] = useState(0);
  const [hasSlidingDoors, setHasSlidingDoors] = useState(false);
  const [slidingDoorEntries, setSlidingDoorEntries] = useState<SlidingDoorEntry[]>([]);
  const [screenType, setScreenType] = useState("");
  const [hasPlisseScreens, setHasPlisseScreens] = useState(false);
  const [hasNailingFlanges, setHasNailingFlanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form when parsedData changes
  if (parsedData && !initialized) {
    setCustomerName(parsedData.customer_name || "");
    setOrderNumber(parsedData.quote_number || "");
    setOrderDate(parsedData.order_date || new Date().toISOString().split("T")[0]);
    setWindowsCount(parsedData.windows_count);
    setDoorsCount(parsedData.doors_count);

    // Detect components from constructions
    let detectedScreenType = "";
    let detectedHasPlisse = false;
    let detectedHasNailingFins = false;
    const detectedSlidingDoors: Record<string, number> = {};

    for (const construction of parsedData.constructions) {
      // Detect sliding door types
      if (construction.construction_type === "sliding_door") {
        const model = (construction.model || "").toLowerCase();
        const comments = (construction.comments || "").toLowerCase();
        const combined = model + " " + comments;

        let doorType = "";
        if (combined.includes("multi") && combined.includes("slide")) {
          doorType = "multi_slide";
        } else if (combined.includes("smart") && combined.includes("slide")) {
          doorType = "smart_slide";
        } else if (combined.includes("lift") && combined.includes("slide")) {
          doorType = "lift_and_slide";
        } else if (combined.includes("psk")) {
          doorType = "psk";
        } else {
          // Default to multi_slide if type not detected
          doorType = "multi_slide";
        }

        detectedSlidingDoors[doorType] = (detectedSlidingDoors[doorType] || 0) + construction.quantity;
      }

      // Detect screens
      if (construction.screen_type) {
        const screenLower = construction.screen_type.toLowerCase();
        if (screenLower.includes("flex")) {
          detectedScreenType = "flex";
        } else if (screenLower.includes("deca") || screenLower.includes("aluminum")) {
          detectedScreenType = "deca";
        }
        if (screenLower.includes("plisse") || screenLower.includes("retractable")) {
          detectedHasPlisse = true;
        }
      }

      // Check components array
      if (construction.components) {
        for (const component of construction.components) {
          const typeLower = component.component_type.toLowerCase();
          const nameLower = (component.component_name || "").toLowerCase();

          if (typeLower.includes("screen") || nameLower.includes("screen")) {
            if (typeLower.includes("flex") || nameLower.includes("flex")) {
              detectedScreenType = "flex";
            } else if (typeLower.includes("deca") || nameLower.includes("deca") || nameLower.includes("aluminum")) {
              detectedScreenType = "deca";
            }
            if (typeLower.includes("plisse") || nameLower.includes("plisse") || nameLower.includes("retractable")) {
              detectedHasPlisse = true;
            }
          }

          if (typeLower.includes("nailing") || typeLower.includes("fin") || nameLower.includes("nailing") || nameLower.includes("flange")) {
            detectedHasNailingFins = true;
          }
        }
      }
    }

    // Set sliding doors state
    const slidingEntries = Object.entries(detectedSlidingDoors).map(([type, count]) => ({
      type,
      count,
    }));
    
    if (slidingEntries.length > 0 || parsedData.sliding_doors_count > 0) {
      setHasSlidingDoors(true);
      setSlidingDoorEntries(slidingEntries.length > 0 ? slidingEntries : [{ type: "", count: parsedData.sliding_doors_count }]);
    }

    setScreenType(detectedScreenType);
    setHasPlisseScreens(detectedHasPlisse);
    setHasNailingFlanges(detectedHasNailingFins);
    setInitialized(true);
  }

  // Reset initialized when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInitialized(false);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (!parsedData) return;

    onConfirm({
      customerName,
      orderNumber,
      orderDate,
      windowsCount,
      doorsCount,
      hasSlidingDoors,
      slidingDoorEntries: hasSlidingDoors ? slidingDoorEntries.filter(e => e.type) : [],
      screenType,
      hasPlisseScreens,
      hasNailingFlanges,
      parsedOrderData: parsedData,
    });
  };

  const handleCancel = () => {
    setInitialized(false);
    onCancel();
  };

  const addSlidingDoorEntry = () => {
    setSlidingDoorEntries([...slidingDoorEntries, { type: "", count: 1 }]);
  };

  const removeSlidingDoorEntry = (index: number) => {
    setSlidingDoorEntries(slidingDoorEntries.filter((_, i) => i !== index));
  };

  const updateSlidingDoorEntry = (index: number, field: "type" | "count", value: string | number) => {
    const updated = [...slidingDoorEntries];
    if (field === "type") {
      updated[index].type = value as string;
    } else {
      updated[index].count = value as number;
    }
    setSlidingDoorEntries(updated);
  };

  if (!parsedData) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Confirm Extracted Order Data
          </DialogTitle>
          <DialogDescription>
            Review and confirm the data extracted from your file. You can make adjustments before proceeding.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Extraction Summary */}
            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Extracted from file:</p>
                <p className="text-muted-foreground">
                  {parsedData.constructions.length} constructions • 
                  {parsedData.windows_count} windows • 
                  {parsedData.doors_count} doors • 
                  {parsedData.sliding_doors_count} sliding doors
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Number</Label>
                  <Input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Order number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Windows Count</Label>
                  <Input
                    type="number"
                    min={0}
                    value={windowsCount}
                    onChange={(e) => setWindowsCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Doors Count</Label>
                  <Input
                    type="number"
                    min={0}
                    value={doorsCount}
                    onChange={(e) => setDoorsCount(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Sliding Doors */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Sliding Doors</h3>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={hasSlidingDoors}
                  onCheckedChange={setHasSlidingDoors}
                />
                <Label>Has Sliding Doors</Label>
                {hasSlidingDoors && (
                  <Badge variant="secondary">
                    {slidingDoorEntries.reduce((sum, e) => sum + e.count, 0)} total
                  </Badge>
                )}
              </div>

              {hasSlidingDoors && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  {slidingDoorEntries.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={entry.type}
                        onValueChange={(v) => updateSlidingDoorEntry(index, "type", v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SLIDING_DOOR_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={entry.count}
                        onChange={(e) => updateSlidingDoorEntry(index, "count", parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      {slidingDoorEntries.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlidingDoorEntry(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addSlidingDoorEntry}>
                    + Add Another Type
                  </Button>
                </div>
              )}
            </div>

            {/* Components */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Components</h3>

              <div className="space-y-2">
                <Label>Screen Type</Label>
                <Select value={screenType} onValueChange={setScreenType}>
                  <SelectTrigger>
                    <SelectValue placeholder="No screens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No screens</SelectItem>
                    {SCREEN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={hasPlisseScreens}
                  onCheckedChange={setHasPlisseScreens}
                />
                <Label>Has Plisse Screens</Label>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={hasNailingFlanges}
                  onCheckedChange={setHasNailingFlanges}
                />
                <Label>Has Nailing Flanges</Label>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="h-4 w-4 mr-2" />
            Confirm & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
