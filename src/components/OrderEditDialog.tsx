import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

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
  glass_ordered: boolean | null;
  screen_profile_available: boolean | null;
  screen_profile_ordered: boolean | null;
  windows_profile_type: string | null;
  windows_profile_available: boolean | null;
  hidden_hinges_count: number | null;
  visible_hinges_count: number | null;
  hardware_available: boolean | null;
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
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  // Step 2: Product Details
  const [windowsCount, setWindowsCount] = useState(0);
  const [doorsCount, setDoorsCount] = useState(0);
  const [hasSlidingDoors, setHasSlidingDoors] = useState(false);
  const [slidingDoorsCount, setSlidingDoorsCount] = useState(0);
  const [slidingDoorType, setSlidingDoorType] = useState("");
  const [hasPlisseScreens, setHasPlisseScreens] = useState(false);
  const [plisseScreensCount, setPlisseScreensCount] = useState(0);
  const [plisseDoorCount, setPlisseDoorCount] = useState(0);
  const [plisseWindowCount, setPlisseWindowCount] = useState(0);
  const [screenType, setScreenType] = useState("");
  const [hasNailingFlanges, setHasNailingFlanges] = useState(false);

  // Step 3: Component Availability
  const [glassOrdered, setGlassOrdered] = useState(false);
  const [screenProfileAvailable, setScreenProfileAvailable] = useState(false);
  const [screenProfileOrdered, setScreenProfileOrdered] = useState(false);
  const [windowsProfileType, setWindowsProfileType] = useState("");
  const [windowsProfileAvailable, setWindowsProfileAvailable] = useState(false);
  const [hiddenHingesCount, setHiddenHingesCount] = useState(0);
  const [visibleHingesCount, setVisibleHingesCount] = useState(0);
  const [hardwareAvailable, setHardwareAvailable] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      setStep(1);
    }
  }, [open]);

  useEffect(() => {
    if (order && open) {
      setCustomerId(order.customer_id);
      setCustomerName(order.customer_name);
      setOrderNumber(order.order_number);
      setOrderDate(order.order_date);
      setDeliveryDate(order.delivery_date);
      setWindowsCount(order.windows_count || 0);
      setDoorsCount(order.doors_count || 0);
      setHasSlidingDoors(order.has_sliding_doors || false);
      setSlidingDoorsCount(order.sliding_doors_count || 0);
      setSlidingDoorType(order.sliding_door_type || "");
      setHasPlisseScreens(order.has_plisse_screens || false);
      setPlisseScreensCount(order.plisse_screens_count || 0);
      setPlisseDoorCount(order.plisse_door_count || 0);
      setPlisseWindowCount(order.plisse_window_count || 0);
      setScreenType(order.screen_type || "");
      setHasNailingFlanges(order.has_nailing_flanges || false);
      setGlassOrdered(order.glass_ordered || false);
      setScreenProfileAvailable(order.screen_profile_available || false);
      setScreenProfileOrdered(order.screen_profile_ordered || false);
      setWindowsProfileType(order.windows_profile_type || "");
      setWindowsProfileAvailable(order.windows_profile_available || false);
      setHiddenHingesCount(order.hidden_hinges_count || 0);
      setVisibleHingesCount(order.visible_hinges_count || 0);
      setHardwareAvailable(order.hardware_available || false);
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
          customer_id: customerId,
          customer_name: customerName,
          order_number: orderNumber,
          order_date: orderDate,
          delivery_date: deliveryDate,
          windows_count: windowsCount,
          doors_count: doorsCount,
          has_sliding_doors: hasSlidingDoors,
          sliding_doors_count: hasSlidingDoors ? slidingDoorsCount : 0,
          sliding_door_type: hasSlidingDoors ? slidingDoorType : null,
          has_plisse_screens: hasPlisseScreens,
          plisse_screens_count: hasPlisseScreens ? plisseScreensCount : 0,
          plisse_door_count: hasPlisseScreens ? plisseDoorCount : 0,
          plisse_window_count: hasPlisseScreens ? plisseWindowCount : 0,
          screen_type: screenType || null,
          has_nailing_flanges: hasNailingFlanges,
          glass_ordered: glassOrdered,
          screen_profile_available: screenType === "deca" ? screenProfileAvailable : null,
          screen_profile_ordered: screenType === "flex" ? screenProfileOrdered : null,
          windows_profile_type: windowsProfileType || null,
          windows_profile_available: windowsProfileAvailable,
          hidden_hinges_count: hiddenHingesCount,
          visible_hinges_count: visibleHingesCount,
          hardware_available: hardwareAvailable,
        })
        .eq("id", order.id);

      if (error) throw error;

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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Count</Label>
                    <Input
                      type="number"
                      min="1"
                      value={slidingDoorsCount}
                      onChange={(e) => setSlidingDoorsCount(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={slidingDoorType} onValueChange={setSlidingDoorType}>
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
                </div>
              )}
            </div>

            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <Label>Plisse Screens</Label>
                <Switch checked={hasPlisseScreens} onCheckedChange={setHasPlisseScreens} />
              </div>
              {hasPlisseScreens && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Count</Label>
                    <Input
                      type="number"
                      min="0"
                      value={plisseScreensCount}
                      onChange={(e) => setPlisseScreensCount(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Door Type</Label>
                    <Input
                      type="number"
                      min="0"
                      value={plisseDoorCount}
                      onChange={(e) => setPlisseDoorCount(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Window Type</Label>
                    <Input
                      type="number"
                      min="0"
                      value={plisseWindowCount}
                      onChange={(e) => setPlisseWindowCount(parseInt(e.target.value) || 0)}
                    />
                  </div>
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <Label>Glass Ordered</Label>
              <Switch checked={glassOrdered} onCheckedChange={setGlassOrdered} />
            </div>

            {screenType === "deca" && (
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <Label>Deca Screen Profile Available</Label>
                <Switch
                  checked={screenProfileAvailable}
                  onCheckedChange={setScreenProfileAvailable}
                />
              </div>
            )}

            {screenType === "flex" && (
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <Label>Flex Screen Profile Ordered</Label>
                <Switch
                  checked={screenProfileOrdered}
                  onCheckedChange={setScreenProfileOrdered}
                />
              </div>
            )}

            <div className="space-y-4 p-4 rounded-lg border">
              <div className="space-y-2">
                <Label>Windows Profile Type</Label>
                <Input
                  placeholder="e.g., uPVC 70mm"
                  value={windowsProfileType}
                  onChange={(e) => setWindowsProfileType(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Profile Available</Label>
                <Switch
                  checked={windowsProfileAvailable}
                  onCheckedChange={setWindowsProfileAvailable}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg border">
              <Label className="text-base font-medium">Hardware (Hinges)</Label>
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
              <div className="flex items-center justify-between">
                <Label>Hardware Available</Label>
                <Switch
                  checked={hardwareAvailable}
                  onCheckedChange={setHardwareAvailable}
                />
              </div>
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
