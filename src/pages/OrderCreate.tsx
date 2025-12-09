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
import { createAuditLog } from "@/lib/auditLog";
import { useRole } from "@/hooks/useRole";
import { FileUploadZone, ParsedOrderData } from "@/components/order/FileUploadZone";
import { ConstructionsPreview } from "@/components/order/ConstructionsPreview";

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
  const { isSeller } = useRole();
  const totalSteps = isSeller ? 2 : 3;
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);

  // Step 1: Basic Info
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
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
  
  // Parsed file data
  const [parsedOrderData, setParsedOrderData] = useState<ParsedOrderData | null>(null);
  
  useEffect(() => {
    fetchCustomers();
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      // Get all users with seller role
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

  const handleFileParsed = (data: ParsedOrderData) => {
    setParsedOrderData(data);
    // Auto-fill from parsed data
    if (data.quote_number) setOrderNumber(data.quote_number);
    if (data.customer_name) {
      setIsNewCustomer(true);
      setCustomerName(data.customer_name);
    }
    setWindowsCount(data.windows_count);
    setDoorsCount(data.doors_count);
    if (data.sliding_doors_count > 0) {
      setHasSlidingDoors(true);
    }
  };

  const handleClearFile = () => {
    setParsedOrderData(null);
  };
  const validateStep = () => {
    if (step === 1) {
      const hasCustomer = isNewCustomer ? customerName.trim() : customerId;
      // Admin/Manager must select a seller, sellers auto-assign to themselves
      const needsSeller = !isSeller && !assignedSellerId;
      if (!hasCustomer || !orderNumber || !orderDate || !deliveryDate) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return false;
      }
      if (needsSeller) {
        toast({
          title: "Missing seller",
          description: "Please assign this order to a seller",
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
      // Determine the assigned seller: for sellers, auto-assign to themselves
      const finalSellerId = isSeller ? user.id : assignedSellerId;

      let finalCustomerId = customerId;
      let finalCustomerName = customerName;

      // Create new customer if needed - assign to the seller, not the creator
      if (isNewCustomer && customerName.trim()) {
        const {
          data: newCustomer,
          error: customerError
        } = await supabase.from("customers").insert({
          user_id: finalSellerId,
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
        user_id: finalSellerId,
        created_by: user.id,
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
        fulfillment_percentage: 0
      }).select().single();
      if (error) throw error;
      
      await createAuditLog({
        action: 'order_created',
        description: `Created order #${orderNumber} for ${finalCustomerName}`,
        entityType: 'order',
        entityId: data.id,
      });
      
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
        <p className="text-muted-foreground">Step {step} of {totalSteps}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />)}
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
            
            {/* Seller Assignment - only for admin/manager */}
            {!isSeller && (
              <div className="space-y-2">
                <Label>Assign to Seller *</Label>
                <Select value={assignedSellerId} onValueChange={setAssignedSellerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a seller" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map(seller => (
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
            )}
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
                            {PLISSE_SCREEN_TYPES.map(type => (
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

      {step === 3 && !isSeller && <Card>
          <CardHeader>
            <CardTitle>Component Availability</CardTitle>
            <CardDescription>Track materials and hardware status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
          </CardContent>
        </Card>}

      <div className="flex justify-between mt-6">
        {step > 1 ? <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button> : <div />}

        {step < totalSteps ? <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button> : <Button onClick={handleSubmit} disabled={loading}>
            <Check className="h-4 w-4 mr-2" />
            {loading ? "Creating..." : "Create Order"}
          </Button>}
      </div>
    </div>;
}