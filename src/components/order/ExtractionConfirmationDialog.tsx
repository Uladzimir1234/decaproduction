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
import { Check, X, FileText, AlertCircle, Sparkles } from "lucide-react";
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
  hasBlinds: boolean;
  blindsColor: string;
  profileType: string;
  colorExterior: string;
  colorInterior: string;
  parsedOrderData: ParsedOrderData;
}

const PROFILE_TYPES = [
  { value: "S8000", label: "S8000" },
  { value: "Linear", label: "Linear" },
  { value: "Deca 70", label: "Deca 70" },
];

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
  const [hasBlinds, setHasBlinds] = useState(false);
  const [blindsColor, setBlindsColor] = useState("");
  const [profileType, setProfileType] = useState("");
  const [colorExterior, setColorExterior] = useState("");
  const [colorInterior, setColorInterior] = useState("");
  const [initialized, setInitialized] = useState(false);
  
  // Track what was detected from file
  const [detectedFields, setDetectedFields] = useState<Set<string>>(new Set());

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
    let detectedHasBlinds = false;
    let detectedBlindsColor = "";
    let detectedProfileType = "";
    let detectedColorExterior = "";
    let detectedColorInterior = "";
    const detectedSlidingDoors: Record<string, number> = {};
    const detected = new Set<string>();

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
          doorType = "multi_slide";
        }

        detectedSlidingDoors[doorType] = (detectedSlidingDoors[doorType] || 0) + construction.quantity;
        detected.add("slidingDoors");
      }

      // Detect screens
      if (construction.screen_type) {
        const screenLower = construction.screen_type.toLowerCase();
        if (screenLower.includes("flex")) {
          detectedScreenType = "flex";
          detected.add("screenType");
        } else if (screenLower.includes("deca") || screenLower.includes("aluminum")) {
          detectedScreenType = "deca";
          detected.add("screenType");
        }
        if (screenLower.includes("plisse") || screenLower.includes("retractable")) {
          detectedHasPlisse = true;
          detected.add("plisseScreens");
        }
      }

      // Detect blinds
      if (construction.has_blinds) {
        detectedHasBlinds = true;
        detected.add("blinds");
        if (construction.blinds_color) {
          detectedBlindsColor = construction.blinds_color;
          detected.add("blindsColor");
        }
      }

      // Detect profile type from model
      if (construction.model && !detectedProfileType) {
        const modelLower = construction.model.toLowerCase();
        if (modelLower.includes("s8000") || modelLower.includes("s-8000")) {
          detectedProfileType = "S8000";
          detected.add("profileType");
        } else if (modelLower.includes("linear")) {
          detectedProfileType = "Linear";
          detected.add("profileType");
        } else if (modelLower.includes("deca") || modelLower.includes("70")) {
          detectedProfileType = "Deca 70";
          detected.add("profileType");
        }
      }

      // Detect colors
      if (construction.color_exterior && !detectedColorExterior) {
        detectedColorExterior = construction.color_exterior;
        detected.add("colorExterior");
      }
      if (construction.color_interior && !detectedColorInterior) {
        detectedColorInterior = construction.color_interior;
        detected.add("colorInterior");
      }

      // Check components array
      if (construction.components) {
        for (const component of construction.components) {
          const typeLower = component.component_type.toLowerCase();
          const nameLower = (component.component_name || "").toLowerCase();

          if (typeLower.includes("screen") || nameLower.includes("screen")) {
            if (typeLower.includes("flex") || nameLower.includes("flex")) {
              detectedScreenType = "flex";
              detected.add("screenType");
            } else if (typeLower.includes("deca") || nameLower.includes("deca") || nameLower.includes("aluminum")) {
              detectedScreenType = "deca";
              detected.add("screenType");
            }
            if (typeLower.includes("plisse") || nameLower.includes("plisse") || nameLower.includes("retractable")) {
              detectedHasPlisse = true;
              detected.add("plisseScreens");
            }
          }

          if (typeLower.includes("nailing") || typeLower.includes("fin") || nameLower.includes("nailing") || nameLower.includes("flange")) {
            detectedHasNailingFins = true;
            detected.add("nailingFlanges");
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
    setHasBlinds(detectedHasBlinds);
    setBlindsColor(detectedBlindsColor);
    setProfileType(detectedProfileType);
    setColorExterior(detectedColorExterior);
    setColorInterior(detectedColorInterior);
    setDetectedFields(detected);
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
      hasBlinds,
      blindsColor,
      profileType,
      colorExterior,
      colorInterior,
      parsedOrderData: parsedData,
    });
  };
  
  // Helper to show "Detected from file" badge
  const DetectedBadge = ({ field }: { field: string }) => {
    if (!detectedFields.has(field)) return null;
    return (
      <Badge variant="secondary" className="ml-2 text-xs gap-1">
        <Sparkles className="h-3 w-3" />
        Detected
      </Badge>
    );
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

            {/* Profile & Colors */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Profile & Colors</h3>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>Profile Type</Label>
                  <DetectedBadge field="profileType" />
                </div>
                <Select 
                  value={profileType || "none"} 
                  onValueChange={(v) => setProfileType(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {PROFILE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label>Exterior Color</Label>
                    <DetectedBadge field="colorExterior" />
                  </div>
                  <Input
                    value={colorExterior}
                    onChange={(e) => setColorExterior(e.target.value)}
                    placeholder="e.g., White, RAL 7016"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label>Interior Color</Label>
                    <DetectedBadge field="colorInterior" />
                  </div>
                  <Input
                    value={colorInterior}
                    onChange={(e) => setColorInterior(e.target.value)}
                    placeholder="e.g., White, Oak"
                  />
                </div>
              </div>
            </div>

            {/* Blinds */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Blinds</h3>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={hasBlinds}
                  onCheckedChange={setHasBlinds}
                />
                <Label>Has Blinds</Label>
                <DetectedBadge field="blinds" />
              </div>

              {hasBlinds && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <div className="flex items-center">
                    <Label>Blinds Color</Label>
                    <DetectedBadge field="blindsColor" />
                  </div>
                  <Input
                    value={blindsColor}
                    onChange={(e) => setBlindsColor(e.target.value)}
                    placeholder="e.g., White, Gray"
                  />
                </div>
              )}
            </div>

            {/* Screens & Components */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">Screens & Components</h3>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Label>Screen Type</Label>
                  <DetectedBadge field="screenType" />
                </div>
                <Select 
                  value={screenType || "none"} 
                  onValueChange={(v) => setScreenType(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No screens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No screens</SelectItem>
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
                <DetectedBadge field="plisseScreens" />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={hasNailingFlanges}
                  onCheckedChange={setHasNailingFlanges}
                />
                <Label>Has Nailing Flanges</Label>
                <DetectedBadge field="nailingFlanges" />
              </div>
            </div>

            {/* Detected Components Summary */}
            {parsedData && parsedData.constructions.length > 0 && (() => {
              // Aggregate components that will be created for ordering stages
              const componentSummary: Record<string, { name: string | null; count: number }> = {};
              
              for (const construction of parsedData.constructions) {
                // Check AI-provided components
                if (construction.components && construction.components.length > 0) {
                  for (const comp of construction.components) {
                    const key = `${comp.component_type}::${comp.component_name || ''}`;
                    if (!componentSummary[key]) {
                      componentSummary[key] = { name: comp.component_name, count: 0 };
                    }
                    componentSummary[key].count += comp.quantity || construction.quantity;
                  }
                } else {
                  // Auto-detect from construction fields
                  if (construction.glass_type) {
                    const key = `glass::${construction.glass_type}`;
                    if (!componentSummary[key]) {
                      componentSummary[key] = { name: construction.glass_type, count: 0 };
                    }
                    componentSummary[key].count += construction.quantity;
                  }
                  if (construction.has_blinds) {
                    const key = `blinds::${construction.blinds_color || ''}`;
                    if (!componentSummary[key]) {
                      componentSummary[key] = { name: construction.blinds_color, count: 0 };
                    }
                    componentSummary[key].count += construction.quantity;
                  }
                  if (construction.screen_type) {
                    const key = `screens::${construction.screen_type}`;
                    if (!componentSummary[key]) {
                      componentSummary[key] = { name: construction.screen_type, count: 0 };
                    }
                    componentSummary[key].count += construction.quantity;
                  }
                  if (construction.handle_type) {
                    const key = `hardware::${construction.handle_type}`;
                    if (!componentSummary[key]) {
                      componentSummary[key] = { name: construction.handle_type, count: 0 };
                    }
                    componentSummary[key].count += construction.quantity;
                  }
                }
              }

              const entries = Object.entries(componentSummary);
              if (entries.length === 0) return null;

              return (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Ordering Components (Auto-Detected)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    These components will be created for tracking in Ordering Stages:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {entries.map(([key, { name, count }]) => {
                      const [type] = key.split('::');
                      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
                      return (
                        <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                          <Badge variant="outline" className="text-xs">
                            x{count}
                          </Badge>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{typeLabel}</span>
                            {name && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
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
