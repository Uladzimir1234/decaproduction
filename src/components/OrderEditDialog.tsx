import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { createAuditLog } from "@/lib/auditLog";

interface SlidingDoorEntry {
  type: string;
  count: number;
}

interface PlisseScreenEntry {
  type: string;
  count: number;
}

const PLISSE_SCREEN_TYPES = [
  { value: "door", label: "Door Type (low threshold)" },
  { value: "window", label: "Window Type" },
];

interface Customer {
  id: string;
  name: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  user_id: string;
  windows_count: number | null;
  doors_count: number | null;
  has_sliding_doors: boolean | null;
  sliding_doors_count: number | null;
  sliding_door_type: string | null;
  has_plisse_screens: boolean | null;
  plisse_screens_count: number | null;
  plisse_door_count: number | null;
  plisse_window_count: number | null;
  screen_type: string | null;
  has_nailing_flanges: boolean | null;
  windows_profile_type: string | null;
  hidden_hinges_count: number | null;
  visible_hinges_count: number | null;
  reinforcement_status: string | null;
  reinforcement_order_date: string | null;
  windows_profile_status: string | null;
  windows_profile_order_date: string | null;
  glass_status: string | null;
  glass_order_date: string | null;
  screens_status: string | null;
  screens_order_date: string | null;
  plisse_screens_status: string | null;
  plisse_screens_order_date: string | null;
  nail_fins_status: string | null;
  nail_fins_order_date: string | null;
  hardware_status: string | null;
  hardware_order_date: string | null;
}

interface OrderEditDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
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

export function OrderEditDialog({ order, open, onOpenChange, onSave }: OrderEditDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [assignedSellerId, setAssignedSellerId] = useState("");

  // Step 2: Product Details
  const [windowsCount, setWindowsCount] = useState(0);
  const [doorsCount, setDoorsCount] = useState(0);
  const [hasSlidingDoors, setHasSlidingDoors] = useState(false);
  const [slidingDoorEntries, setSlidingDoorEntries] = useState<SlidingDoorEntry[]>([{ type: "", count: 1 }]);
  const [hasPlisseScreens, setHasPlisseScreens] = useState(false);
  const [plisseScreenEntries, setPlisseScreenEntries] = useState<PlisseScreenEntry[]>([{ type: "", count: 1 }]);
  const [screenType, setScreenType] = useState("");
  const [hasNailingFlanges, setHasNailingFlanges] = useState(false);

  // Step 3: Component Availability
  const [reinforcementStatus, setReinforcementStatus] = useState("not_ordered");
  const [reinforcementOrderDate, setReinforcementOrderDate] = useState("");
  const [windowsProfileType, setWindowsProfileType] = useState("");
  const [windowsProfileStatus, setWindowsProfileStatus] = useState("not_ordered");
  const [windowsProfileOrderDate, setWindowsProfileOrderDate] = useState("");
  const [glassStatus, setGlassStatus] = useState("not_ordered");
  const [glassOrderDate, setGlassOrderDate] = useState("");
  const [screensStatus, setScreensStatus] = useState("not_ordered");
  const [screensOrderDate, setScreensOrderDate] = useState("");
  const [plisseScreensStatus, setPlisseScreensStatus] = useState("not_ordered");
  const [plisseScreensOrderDate, setPlisseScreensOrderDate] = useState("");
  const [nailFinsStatus, setNailFinsStatus] = useState("not_ordered");
  const [nailFinsOrderDate, setNailFinsOrderDate] = useState("");
  const [hardwareStatus, setHardwareStatus] = useState("not_ordered");
  const [hardwareOrderDate, setHardwareOrderDate] = useState("");
  const [hiddenHingesCount, setHiddenHingesCount] = useState(0);
  const [visibleHingesCount, setVisibleHingesCount] = useState(0);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchSellers();
      setStep(1);
    }
  }, [open]);

  const fetchSellers = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "seller");
      
      if (roleError) throw roleError;
      
      if (roleData && roleData.length > 0) {
        const sellerIds = roleData.map(r => r.user_id);
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", sellerIds)
          .eq("status", "active");
        
        if (profileError) throw profileError;
        setSellers(profileData || []);
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
    }
  };

  useEffect(() => {
    if (order && open) {
      setCustomerId(order.customer_id);
      setCustomerName(order.customer_name);
      setOrderNumber(order.order_number);
      setOrderDate(order.order_date);
      setDeliveryDate(order.delivery_date);
      setAssignedSellerId(order.user_id || "");
      setWindowsCount(order.windows_count || 0);
      setDoorsCount(order.doors_count || 0);
      setHasSlidingDoors(order.has_sliding_doors || false);
      // Parse sliding door entries from JSON or create default
      try {
        const parsed = order.sliding_door_type ? JSON.parse(order.sliding_door_type) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlidingDoorEntries(parsed);
        } else if (order.sliding_door_type && order.sliding_doors_count) {
          // Legacy format: single type
          setSlidingDoorEntries([{ type: order.sliding_door_type, count: order.sliding_doors_count }]);
        } else {
          setSlidingDoorEntries([{ type: "", count: 1 }]);
        }
      } catch {
        // If JSON parse fails, treat as legacy single type
        if (order.sliding_door_type) {
          setSlidingDoorEntries([{ type: order.sliding_door_type, count: order.sliding_doors_count || 1 }]);
        } else {
          setSlidingDoorEntries([{ type: "", count: 1 }]);
        }
      }
      setHasPlisseScreens(order.has_plisse_screens || false);
      // Build plisse screen entries from door/window counts
      const plisseEntries: PlisseScreenEntry[] = [];
      if (order.plisse_door_count && order.plisse_door_count > 0) {
        plisseEntries.push({ type: "door", count: order.plisse_door_count });
      }
      if (order.plisse_window_count && order.plisse_window_count > 0) {
        plisseEntries.push({ type: "window", count: order.plisse_window_count });
      }
      setPlisseScreenEntries(plisseEntries.length > 0 ? plisseEntries : [{ type: "", count: 1 }]);
      setScreenType(order.screen_type || "");
      setHasNailingFlanges(order.has_nailing_flanges || false);
      setReinforcementStatus(order.reinforcement_status || "not_ordered");
      setReinforcementOrderDate(order.reinforcement_order_date || "");
      setWindowsProfileType(order.windows_profile_type || "");
      setWindowsProfileStatus(order.windows_profile_status || "not_ordered");
      setWindowsProfileOrderDate(order.windows_profile_order_date || "");
      setGlassStatus(order.glass_status || "not_ordered");
      setGlassOrderDate(order.glass_order_date || "");
      setScreensStatus(order.screens_status || "not_ordered");
      setScreensOrderDate(order.screens_order_date || "");
      setPlisseScreensStatus(order.plisse_screens_status || "not_ordered");
      setPlisseScreensOrderDate(order.plisse_screens_order_date || "");
      setNailFinsStatus(order.nail_fins_status || "not_ordered");
      setNailFinsOrderDate(order.nail_fins_order_date || "");
      setHardwareStatus(order.hardware_status || "not_ordered");
      setHardwareOrderDate(order.hardware_order_date || "");
      setHiddenHingesCount(order.hidden_hinges_count || 0);
      setVisibleHingesCount(order.visible_hinges_count || 0);
    }
  }, [order, open]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name");
    if (!error) {
      setCustomers(data || []);
    }
  };

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    const customer = customers.find((c) => c.id === value);
    if (customer) {
      setCustomerName(customer.name);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!customerId || !orderNumber || !orderDate || !deliveryDate) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return false;
      }
    }
    if (step === 2) {
      if (windowsCount === 0 && doorsCount === 0 && !hasSlidingDoors) {
        toast({
          title: "No products",
          description: "Please add at least one window, door, or sliding door",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep() || !order) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          user_id: assignedSellerId,
          customer_id: customerId,
          customer_name: customerName,
          order_number: orderNumber,
          order_date: orderDate,
          delivery_date: deliveryDate,
          windows_count: windowsCount,
          doors_count: doorsCount,
          has_sliding_doors: hasSlidingDoors,
          sliding_doors_count: hasSlidingDoors ? slidingDoorEntries.reduce((sum, e) => sum + e.count, 0) : 0,
          sliding_door_type: hasSlidingDoors ? JSON.stringify(slidingDoorEntries.filter(e => e.type)) : null,
          has_plisse_screens: hasPlisseScreens,
          plisse_screens_count: hasPlisseScreens ? plisseScreenEntries.reduce((sum, e) => sum + e.count, 0) : 0,
          plisse_door_count: hasPlisseScreens ? plisseScreenEntries.filter(e => e.type === 'door').reduce((sum, e) => sum + e.count, 0) : 0,
          plisse_window_count: hasPlisseScreens ? plisseScreenEntries.filter(e => e.type === 'window').reduce((sum, e) => sum + e.count, 0) : 0,
          screen_type: screenType || null,
          has_nailing_flanges: hasNailingFlanges,
          reinforcement_status: reinforcementStatus,
          reinforcement_order_date: reinforcementStatus === "ordered" ? reinforcementOrderDate || null : null,
          windows_profile_type: windowsProfileType || null,
          windows_profile_status: windowsProfileStatus,
          windows_profile_order_date: windowsProfileStatus === "ordered" ? windowsProfileOrderDate || null : null,
          glass_status: glassStatus,
          glass_order_date: glassStatus === "ordered" ? glassOrderDate || null : null,
          screens_status: screensStatus,
          screens_order_date: screensStatus === "ordered" ? screensOrderDate || null : null,
          plisse_screens_status: plisseScreensStatus,
          plisse_screens_order_date: plisseScreensStatus === "ordered" ? plisseScreensOrderDate || null : null,
          nail_fins_status: nailFinsStatus,
          nail_fins_order_date: nailFinsStatus === "ordered" ? nailFinsOrderDate || null : null,
          hardware_status: hardwareStatus,
          hardware_order_date: hardwareStatus === "ordered" ? hardwareOrderDate || null : null,
          hidden_hinges_count: hiddenHingesCount,
          visible_hinges_count: visibleHingesCount,
        })
        .eq("id", order.id);

      if (error) throw error;

      await createAuditLog({
        action: 'order_updated',
        description: `Edited order #${orderNumber} (${customerName})`,
        entityType: 'order',
        entityId: order.id,
      });

      toast({
        title: "Order updated",
        description: `Order #${orderNumber} has been updated successfully.`,
      });
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order #{order?.order_number}</DialogTitle>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order Number *</Label>
              <Input
                placeholder="e.g., ORD-2024-001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Date *</Label>
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
                />
              </div>
            </div>
            
            {/* Seller Assignment */}
            <div className="space-y-2">
              <Label>Assigned Seller *</Label>
              <Select value={assignedSellerId} onValueChange={setAssignedSellerId}>
                <SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                This order will only be visible to the assigned seller
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Windows</Label>
                <Input
                  type="number"
                  min="0"
                  value={windowsCount}
                  onChange={(e) => setWindowsCount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Doors</Label>
                <Input
                  type="number"
                  min="0"
                  value={doorsCount}
                  onChange={(e) => setDoorsCount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label>Sliding Doors</Label>
                <Switch checked={hasSlidingDoors} onCheckedChange={setHasSlidingDoors} />
              </div>
              {hasSlidingDoors && (
                <div className="space-y-3">
                  {slidingDoorEntries.map((entry, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>Type</Label>
                        <Select 
                          value={entry.type} 
                          onValueChange={(value) => {
                            const updated = [...slidingDoorEntries];
                            updated[index].type = value;
                            setSlidingDoorEntries(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {SLIDING_DOOR_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Count</Label>
                        <Input
                          type="number"
                          min="1"
                          value={entry.count}
                          onChange={(e) => {
                            const updated = [...slidingDoorEntries];
                            updated[index].count = parseInt(e.target.value) || 1;
                            setSlidingDoorEntries(updated);
                          }}
                        />
                      </div>
                      {slidingDoorEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSlidingDoorEntries(slidingDoorEntries.filter((_, i) => i !== index));
                          }}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSlidingDoorEntries([...slidingDoorEntries, { type: "", count: 1 }])}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Type
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label>Plisse Screens</Label>
                <Switch checked={hasPlisseScreens} onCheckedChange={setHasPlisseScreens} />
              </div>
              {hasPlisseScreens && (
                <div className="space-y-3">
                  {plisseScreenEntries.map((entry, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>Type</Label>
                        <Select 
                          value={entry.type} 
                          onValueChange={(value) => {
                            const updated = [...plisseScreenEntries];
                            updated[index].type = value;
                            setPlisseScreenEntries(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLISSE_SCREEN_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Count</Label>
                        <Input
                          type="number"
                          min="1"
                          value={entry.count}
                          onChange={(e) => {
                            const updated = [...plisseScreenEntries];
                            updated[index].count = parseInt(e.target.value) || 1;
                            setPlisseScreenEntries(updated);
                          }}
                        />
                      </div>
                      {plisseScreenEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPlisseScreenEntries(plisseScreenEntries.filter((_, i) => i !== index));
                          }}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPlisseScreenEntries([...plisseScreenEntries, { type: "", count: 1 }])}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Type
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Screen Type</Label>
              <Select value={screenType} onValueChange={setScreenType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select screen type" />
                </SelectTrigger>
                <SelectContent>
                  {SCREEN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <Label>Nailing Flanges</Label>
              <Switch checked={hasNailingFlanges} onCheckedChange={setHasNailingFlanges} />
            </div>

            <div className="space-y-4 p-4 rounded-lg border">
              <Label className="text-base font-medium">Hardware Type (Hinges)</Label>
              <p className="text-sm text-muted-foreground">Enter counts for each hinge type used in this order</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hidden Hinges Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={hiddenHingesCount}
                    onChange={(e) => setHiddenHingesCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visible Hinges Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={visibleHingesCount}
                    onChange={(e) => setVisibleHingesCount(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {/* Reinforcement */}
            <div className="space-y-3 p-4 rounded-lg border">
              <Label className="text-base font-medium">Reinforcement</Label>
              <Select value={reinforcementStatus} onValueChange={setReinforcementStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="not_ordered">Not Ordered</SelectItem>
                </SelectContent>
              </Select>
              {reinforcementStatus === "ordered" && (
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={reinforcementOrderDate} onChange={e => setReinforcementOrderDate(e.target.value)} />
                </div>
              )}
            </div>

            {/* Windows Profile */}
            <div className="space-y-3 p-4 rounded-lg border">
              <Label className="text-base font-medium">Windows Profile</Label>
              <div className="space-y-2">
                <Label>Profile Type</Label>
                <Select value={windowsProfileType} onValueChange={setWindowsProfileType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s8000">S8000</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="deca70">Deca 70</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={windowsProfileStatus} onValueChange={setWindowsProfileStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="not_ordered">Not Ordered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {windowsProfileStatus === "ordered" && (
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={windowsProfileOrderDate} onChange={e => setWindowsProfileOrderDate(e.target.value)} />
                </div>
              )}
            </div>

            {/* Glass */}
            <div className="space-y-3 p-4 rounded-lg border">
              <Label className="text-base font-medium">Glass</Label>
              <Select value={glassStatus} onValueChange={setGlassStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="not_ordered">Not Ordered</SelectItem>
                </SelectContent>
              </Select>
              {glassStatus === "ordered" && (
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={glassOrderDate} onChange={e => setGlassOrderDate(e.target.value)} />
                </div>
              )}
            </div>

            {/* Screens */}
            <div className="space-y-3 p-4 rounded-lg border">
              <Label className="text-base font-medium">Screens</Label>
              <Select value={screensStatus} onValueChange={setScreensStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="not_ordered">Not Ordered</SelectItem>
                </SelectContent>
              </Select>
              {screensStatus === "ordered" && (
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={screensOrderDate} onChange={e => setScreensOrderDate(e.target.value)} />
                </div>
              )}
            </div>

            {/* Plisse Screens */}
            <div className="space-y-3 p-4 rounded-lg border">
              <Label className="text-base font-medium">Plisse Screens</Label>
              <Select value={plisseScreensStatus} onValueChange={setPlisseScreensStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="not_ordered">Not Ordered</SelectItem>
                </SelectContent>
              </Select>
              {plisseScreensStatus === "ordered" && (
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={plisseScreensOrderDate} onChange={e => setPlisseScreensOrderDate(e.target.value)} />
                </div>
              )}
            </div>

            {/* Nail Fins */}
            <div className="space-y-3 p-4 rounded-lg border">
              <Label className="text-base font-medium">Nail Fins</Label>
              <Select value={nailFinsStatus} onValueChange={setNailFinsStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="not_ordered">Not Ordered</SelectItem>
                </SelectContent>
              </Select>
              {nailFinsStatus === "ordered" && (
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={nailFinsOrderDate} onChange={e => setNailFinsOrderDate(e.target.value)} />
                </div>
              )}
            </div>

            {/* Hardware */}
            <div className="space-y-3 p-4 rounded-lg border">
              <Label className="text-base font-medium">Hardware</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hidden Hinges Count</Label>
                  <Input type="number" min="0" value={hiddenHingesCount} onChange={e => setHiddenHingesCount(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Visible Hinges Count</Label>
                  <Input type="number" min="0" value={visibleHingesCount} onChange={e => setVisibleHingesCount(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={hardwareStatus} onValueChange={setHardwareStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="not_ordered">Not Ordered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hardwareStatus === "ordered" && (
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={hardwareOrderDate} onChange={e => setHardwareOrderDate(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              <Check className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
