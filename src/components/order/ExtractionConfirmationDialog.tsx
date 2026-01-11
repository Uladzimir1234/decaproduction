import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Check, X, FileText, AlertCircle, Sparkles, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { ParsedOrderData, ParsedConstruction } from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "@/lib/auditLog";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConstructionReviewPanel } from "./ConstructionReviewPanel";
interface SlidingDoorEntry {
  type: string;
  count: number;
}

interface Seller {
  id: string;
  email: string;
  full_name: string | null;
}

interface ExtractionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedOrderData | null;
  onOrderCreated: () => void;
  onCancel: () => void;
  sellers: Seller[];
  isSeller: boolean;
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
  onOrderCreated,
  onCancel,
  sellers,
  isSeller,
}: ExtractionConfirmationDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [isCreating, setIsCreating] = useState(false);
  
  // New fields for order creation
  const [deliveryDate, setDeliveryDate] = useState("");
  const [assignedSellerId, setAssignedSellerId] = useState("");
  
  // Track what was detected from file
  const [detectedFields, setDetectedFields] = useState<Set<string>>(new Set());
  
  // Editable constructions - initialize from parsed data
  const [editedConstructions, setEditedConstructions] = useState<ParsedConstruction[]>([]);
  
  // Collapsible state for constructions section
  const [constructionsOpen, setConstructionsOpen] = useState(true);

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
    // Initialize editable constructions from parsed data
    setEditedConstructions([...parsedData.constructions]);
    setInitialized(true);
  }
  
  // Handler for construction edits
  const handleConstructionChange = (index: number, updates: Partial<ParsedConstruction>) => {
    setEditedConstructions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  // Reset initialized when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInitialized(false);
    }
    onOpenChange(newOpen);
  };

  const handleCreateOrder = async () => {
    if (!parsedData) return;
    
    // Validation
    if (!customerName.trim()) {
      toast({ title: "Missing customer name", variant: "destructive" });
      return;
    }
    if (!orderNumber.trim()) {
      toast({ title: "Missing order number", variant: "destructive" });
      return;
    }
    if (!deliveryDate) {
      toast({ title: "Missing delivery date", variant: "destructive" });
      return;
    }
    if (!isSeller && !assignedSellerId) {
      toast({ title: "Please assign this order to a seller", variant: "destructive" });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const finalSellerId = isSeller ? user.id : assignedSellerId;
      
      // Create customer
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({ user_id: finalSellerId, name: customerName.trim() })
        .select()
        .single();
      
      if (customerError) throw customerError;
      
      // Create order
      const slidingDoorsTotal = hasSlidingDoors 
        ? slidingDoorEntries.reduce((sum, e) => sum + e.count, 0) 
        : 0;
      
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: finalSellerId,
          created_by: user.id,
          customer_id: newCustomer.id,
          customer_name: customerName.trim(),
          order_number: orderNumber,
          order_date: orderDate,
          delivery_date: deliveryDate,
          windows_count: windowsCount,
          doors_count: doorsCount,
          has_sliding_doors: hasSlidingDoors,
          sliding_doors_count: slidingDoorsTotal,
          sliding_door_type: hasSlidingDoors ? JSON.stringify(slidingDoorEntries.filter(e => e.type)) : null,
          has_plisse_screens: hasPlisseScreens,
          screen_type: screenType || null,
          has_nailing_flanges: hasNailingFlanges,
          windows_profile_type: profileType || null,
          fulfillment_percentage: 0,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Save constructions - use edited constructions instead of original parsed data
      const constructionsToInsert = editedConstructions.map((c, index) => ({
        order_id: orderData.id,
        construction_number: c.construction_number,
        construction_type: c.construction_type,
        width_inches: c.width_inches,
        height_inches: c.height_inches,
        width_mm: c.width_mm,
        height_mm: c.height_mm,
        rough_opening: c.rough_opening,
        location: c.location,
        model: c.model,
        opening_type: c.opening_type,
        color_exterior: colorExterior || c.color_exterior,
        color_interior: colorInterior || c.color_interior,
        glass_type: c.glass_type,
        screen_type: c.screen_type,
        handle_type: c.handle_type,
        has_blinds: hasBlinds || c.has_blinds,
        blinds_color: blindsColor || c.blinds_color,
        center_seal: c.center_seal,
        comments: c.comments,
        quantity: c.quantity,
        position_index: index,
      }));
      
      const { data: insertedConstructions, error: constructionsError } = await supabase
        .from('order_constructions')
        .insert(constructionsToInsert)
        .select('id, construction_number');
      
      if (constructionsError) throw constructionsError;
      
      if (insertedConstructions) {
        // Create delivery entries for each construction
        const deliveryEntriesToInsert = insertedConstructions.map(ic => ({
          construction_id: ic.id,
          is_prepared: false,
          is_delivered: false,
        }));
        
        if (deliveryEntriesToInsert.length > 0) {
          await supabase.from('construction_delivery').insert(deliveryEntriesToInsert);
        }
        
        // Use the first construction for order-level aggregated components
        const firstConstructionId = insertedConstructions[0]?.id;
        
        if (firstConstructionId) {
          // Use pre-aggregated components from backend if available
          if (parsedData.aggregated_components && parsedData.aggregated_components.length > 0) {
            const aggregatedComponentsToInsert = parsedData.aggregated_components.map(comp => ({
              construction_id: firstConstructionId,
              component_type: comp.component_type,
              component_name: comp.component_name || null,
              quantity: comp.total_quantity,
              status: 'not_ordered',
            }));
            
            await supabase.from('construction_components').insert(aggregatedComponentsToInsert);
          } else {
            // Fallback: Aggregate components manually from edited constructions
            const componentMap = new Map<string, { type: string; name: string | null; qty: number }>();
            
            for (const construction of editedConstructions) {
              if (construction.components && construction.components.length > 0) {
                for (const comp of construction.components) {
                  const key = `${comp.component_type}::${comp.component_name || ''}`;
                  const existing = componentMap.get(key);
                  if (existing) {
                    existing.qty += comp.quantity || construction.quantity;
                  } else {
                    componentMap.set(key, {
                      type: comp.component_type,
                      name: comp.component_name,
                      qty: comp.quantity || construction.quantity,
                    });
                  }
                }
              } else {
                // Auto-detect from construction fields
                if (construction.glass_type) {
                  const key = `glass::${construction.glass_type}`;
                  const existing = componentMap.get(key);
                  if (existing) {
                    existing.qty += construction.quantity;
                  } else {
                    componentMap.set(key, { type: 'glass', name: construction.glass_type, qty: construction.quantity });
                  }
                }
                if (construction.has_blinds || hasBlinds) {
                  const blindsName = blindsColor || construction.blinds_color || null;
                  const key = `blinds::${blindsName || ''}`;
                  const existing = componentMap.get(key);
                  if (existing) {
                    existing.qty += construction.quantity;
                  } else {
                    componentMap.set(key, { type: 'blinds', name: blindsName, qty: construction.quantity });
                  }
                }
                if (construction.screen_type || screenType) {
                  const screenName = construction.screen_type || screenType;
                  const key = `screens::${screenName}`;
                  const existing = componentMap.get(key);
                  if (existing) {
                    existing.qty += construction.quantity;
                  } else {
                    componentMap.set(key, { type: 'screens', name: screenName, qty: construction.quantity });
                  }
                }
                if (construction.handle_type) {
                  const key = `hardware::${construction.handle_type}`;
                  const existing = componentMap.get(key);
                  if (existing) {
                    existing.qty += construction.quantity;
                  } else {
                    componentMap.set(key, { type: 'hardware', name: construction.handle_type, qty: construction.quantity });
                  }
                }
                // Add profile if available
                if (construction.model) {
                  const profileName = `${construction.model} (${colorExterior || construction.color_exterior || 'N/A'} / ${colorInterior || construction.color_interior || 'N/A'})`;
                  const key = `profile::${profileName}`;
                  const existing = componentMap.get(key);
                  if (existing) {
                    existing.qty += construction.quantity;
                  } else {
                    componentMap.set(key, { type: 'profile', name: profileName, qty: construction.quantity });
                  }
                }
              }
            }
            
            const aggregatedComponents = Array.from(componentMap.values()).map(c => ({
              construction_id: firstConstructionId,
              component_type: c.type,
              component_name: c.name,
              quantity: c.qty,
              status: 'not_ordered',
            }));
            
            if (aggregatedComponents.length > 0) {
              await supabase.from('construction_components').insert(aggregatedComponents);
            }
          }
        }
      }
      
      await createAuditLog({
        action: 'order_created',
        description: `Created order #${orderNumber} for ${customerName} with ${editedConstructions.length} constructions`,
        entityType: 'order',
        entityId: orderData.id,
      });
      
      toast({
        title: "Order created",
        description: `Order #${orderNumber} created with ${editedConstructions.length} constructions`,
      });
      
      onOrderCreated();
      navigate(`/orders/${orderData.id}`);
      
    } catch (error: any) {
      toast({
        title: "Error creating order",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
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

            {/* Constructions Detail - Collapsible section to review AI extracted details */}
            <Collapsible open={constructionsOpen} onOpenChange={setConstructionsOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between py-2 border-b">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {constructionsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Sparkles className="h-4 w-4 text-primary" />
                    Constructions Detail (AI Extracted)
                    <Badge variant="secondary" className="ml-1">
                      {editedConstructions.length} items
                    </Badge>
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Click to {constructionsOpen ? 'collapse' : 'expand'} • Click any field to edit
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-4">
                  <ConstructionReviewPanel
                    constructions={editedConstructions}
                    onConstructionChange={handleConstructionChange}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Date *</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={!deliveryDate ? "border-destructive" : ""}
                  />
                </div>
              </div>

              {!isSeller && sellers.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign to Seller *</Label>
                  <Select value={assignedSellerId} onValueChange={setAssignedSellerId}>
                    <SelectTrigger className={!assignedSellerId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a seller" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.full_name || seller.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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

            {/* Detected Components Summary - Use aggregated_components from backend */}
            {parsedData && (parsedData.aggregated_components?.length || 0) > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ordering Components (Aggregated from File)
                </h3>
                <p className="text-xs text-muted-foreground">
                  These {parsedData.aggregated_components!.length} unique component types will be created for tracking:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsedData.aggregated_components!.map((comp, index) => {
                    const typeLabel = comp.component_type.charAt(0).toUpperCase() + 
                      comp.component_type.slice(1).replace('_', ' ');
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                        <Badge variant="outline" className="text-xs shrink-0">
                          x{comp.total_quantity}
                        </Badge>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium">{typeLabel}</span>
                          {comp.component_name && (
                            <span className="text-xs text-muted-foreground truncate" title={comp.component_name}>
                              {comp.component_name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCreateOrder} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {isCreating ? "Creating..." : "Confirm & Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
