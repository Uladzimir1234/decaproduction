import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";

interface SlidingDoorEntry {
  type: string;
  count: number;
}
interface Customer {
  id: string;
  name: string;
}
const SLIDING_DOOR_TYPES = [{
  value: "multi_slide",
  label: "Multi Slide"
}, {
  value: "smart_slide",
  label: "Smart Slide"
}, {
  value: "lift_and_slide",
  label: "Lift and Slide"
}, {
  value: "psk",
  label: "PSK"
}];
const SCREEN_TYPES = [{
  value: "flex",
  label: "Flex Screen"
}, {
  value: "deca",
  label: "Deca Aluminum Screen"
}];
export default function OrderCreate() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDate, setDeliveryDate] = useState("");

  // Step 2: Product Details
  const [windowsCount, setWindowsCount] = useState(0);
  const [doorsCount, setDoorsCount] = useState(0);
  const [hasSlidingDoors, setHasSlidingDoors] = useState(false);
  const [slidingDoorEntries, setSlidingDoorEntries] = useState<SlidingDoorEntry[]>([{ type: "", count: 1 }]);
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
    fetchCustomers();
  }, []);
  const fetchCustomers = async () => {
    const {
      data,
      error
    } = await supabase.from("customers").select("id, name").order("name");
    if (error) {
      console.error("Error fetching customers:", error);
    } else {
      setCustomers(data || []);
    }
  };
  const handleCustomerChange = (value: string) => {
    if (value === "new") {
      setIsNewCustomer(true);
      setCustomerId("");
      setCustomerName("");
    } else {
      setIsNewCustomer(false);
      setCustomerId(value);
      const customer = customers.find(c => c.id === value);
      if (customer) {
        setCustomerName(customer.name);
      }
    }
  };
  const validateStep = () => {
    if (step === 1) {
      const hasCustomer = isNewCustomer ? customerName.trim() : customerId;
      if (!hasCustomer || !orderNumber || !orderDate || !deliveryDate) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return false;
      }
    }
    if (step === 2) {
      if (windowsCount === 0 && doorsCount === 0 && !hasSlidingDoors) {
        toast({
          title: "No products",
          description: "Please add at least one window, door, or sliding door",
          variant: "destructive"
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
    if (!validateStep()) return;
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      let finalCustomerId = customerId;
      let finalCustomerName = customerName;

      // Create new customer if needed
      if (isNewCustomer && customerName.trim()) {
        const {
          data: newCustomer,
          error: customerError
        } = await supabase.from("customers").insert({
          user_id: user.id,
          name: customerName.trim()
        }).select().single();
        if (customerError) throw customerError;
        finalCustomerId = newCustomer.id;
        finalCustomerName = newCustomer.name;
      }
      const {
        data,
        error
      } = await supabase.from("orders").insert({
        user_id: user.id,
        customer_id: finalCustomerId,
        customer_name: finalCustomerName,
        order_number: orderNumber,
        order_date: orderDate,
        delivery_date: deliveryDate,
        windows_count: windowsCount,
        doors_count: doorsCount,
        has_sliding_doors: hasSlidingDoors,
        sliding_doors_count: hasSlidingDoors ? slidingDoorEntries.reduce((sum, e) => sum + e.count, 0) : 0,
        sliding_door_type: hasSlidingDoors ? JSON.stringify(slidingDoorEntries.filter(e => e.type)) : null,
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
        fulfillment_percentage: 0
      }).select().single();
      if (error) throw error;
      toast({
        title: "Order created",
        description: `Order #${orderNumber} has been created successfully.`
      });
      navigate(`/orders/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/orders")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        <h1 className="text-2xl font-bold">Create New Order</h1>
        <p className="text-muted-foreground">Step {step} of 3</p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />)}
      </div>

      {step === 1 && <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Customer and order details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={isNewCustomer ? "new" : customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new" className="text-primary font-medium">
                    + Add New Customer
                  </SelectItem>
                  {customers.map(customer => <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isNewCustomer && <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input placeholder="Enter customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>}
            <div className="space-y-2">
              <Label>Order Number *</Label>
              <Input placeholder="e.g., ORD-2024-001" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Date *</Label>
                <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Date *</Label>
                <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>}

      {step === 2 && <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Windows, doors, and accessories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Windows</Label>
                <Input type="number" min="0" value={windowsCount} onChange={e => setWindowsCount(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Number of Doors</Label>
                <Input type="number" min="0" value={doorsCount} onChange={e => setDoorsCount(parseInt(e.target.value) || 0)} />
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
                            {SLIDING_DOOR_TYPES.map(type => (
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
                          onChange={e => {
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
              {hasPlisseScreens && <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Count</Label>
                    <Input type="number" min="0" value={plisseScreensCount} onChange={e => setPlisseScreensCount(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Door Type (low threshold)</Label>
                    <Input type="number" min="0" value={plisseDoorCount} onChange={e => setPlisseDoorCount(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Window Type</Label>
                    <Input type="number" min="0" value={plisseWindowCount} onChange={e => setPlisseWindowCount(parseInt(e.target.value) || 0)} />
                  </div>
                </div>}
            </div>

            <div className="space-y-2">
              <Label>Screen Type</Label>
              <Select value={screenType} onValueChange={setScreenType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select screen type" />
                </SelectTrigger>
                <SelectContent>
                  {SCREEN_TYPES.map(type => <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>)}
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
                  <Input type="number" min="0" value={hiddenHingesCount} onChange={e => setHiddenHingesCount(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Visible Hinges Count</Label>
                  <Input type="number" min="0" value={visibleHingesCount} onChange={e => setVisibleHingesCount(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>}

      {step === 3 && <Card>
          <CardHeader>
            <CardTitle>Component Availability</CardTitle>
            <CardDescription>Track materials and hardware status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <Label>Glass Ordered</Label>
              <Switch checked={glassOrdered} onCheckedChange={setGlassOrdered} />
            </div>

            {screenType === "deca" && <div className="flex items-center justify-between p-4 rounded-lg border">
                <Label>Deca Screen Profile Available</Label>
                <Switch checked={screenProfileAvailable} onCheckedChange={setScreenProfileAvailable} />
              </div>}

            {screenType === "flex" && <div className="flex items-center justify-between p-4 rounded-lg border">
                <Label>Flex Screen Profile Ordered</Label>
                <Switch checked={screenProfileOrdered} onCheckedChange={setScreenProfileOrdered} />
              </div>}

            <div className="space-y-4 p-4 rounded-lg border">
              <div className="space-y-2">
                <Label>Windows Profile Type</Label>
                <Input placeholder="e.g., uPVC 70mm" value={windowsProfileType} onChange={e => setWindowsProfileType(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Profile Available</Label>
                <Switch checked={windowsProfileAvailable} onCheckedChange={setWindowsProfileAvailable} />
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg border">
              <Label className="text-base font-medium">Hardware (Hinges)</Label>
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
              <div className="flex items-center justify-between">
                <Label>Hardware Available</Label>
                <Switch checked={hardwareAvailable} onCheckedChange={setHardwareAvailable} />
              </div>
            </div>
          </CardContent>
        </Card>}

      <div className="flex justify-between mt-6">
        {step > 1 ? <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button> : <div />}

        {step < 3 ? <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button> : <Button onClick={handleSubmit} disabled={loading}>
            <Check className="h-4 w-4 mr-2" />
            {loading ? "Creating..." : "Create Order"}
          </Button>}
      </div>
    </div>;
}