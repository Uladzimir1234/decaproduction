import { useProcurementCart, CartItem } from "@/contexts/ProcurementCartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ShoppingCart, Package, X, ArrowLeft } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

interface GroupedComponent {
  componentType: string;
  componentName: string | null;
  totalQuantity: number;
  items: CartItem[];
}

export default function Procurement() {
  const { cartItems, removeFromCart, clearCart } = useProcurementCart();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Group cart items by component type, then by component name
  const groupedComponents = useMemo(() => {
    const groups: Map<string, GroupedComponent> = new Map();

    cartItems.forEach((item) => {
      const key = `${item.componentType}|${item.componentName || "null"}`;
      
      if (groups.has(key)) {
        const existing = groups.get(key)!;
        existing.totalQuantity += item.quantity;
        existing.items.push(item);
      } else {
        groups.set(key, {
          componentType: item.componentType,
          componentName: item.componentName,
          totalQuantity: item.quantity,
          items: [item],
        });
      }
    });

    // Sort by component type
    return Array.from(groups.values()).sort((a, b) => 
      a.componentType.localeCompare(b.componentType)
    );
  }, [cartItems]);

  // Group by component type for section headers
  const groupedByType = useMemo(() => {
    const byType: Map<string, GroupedComponent[]> = new Map();
    
    groupedComponents.forEach((group) => {
      const existing = byType.get(group.componentType) || [];
      existing.push(group);
      byType.set(group.componentType, existing);
    });

    return byType;
  }, [groupedComponents]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(cartItems.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const removeSelected = () => {
    selectedItems.forEach((id) => removeFromCart(id));
    setSelectedItems(new Set());
  };

  const getComponentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      glass: "Glass",
      profile: "Profile",
      screens: "Screens",
      hardware: "Hardware",
      blinds: "Blinds",
      nail_fins: "Nail Fins",
      plisse_screens: "Plisse Screens",
      reinforcement: "Reinforcement",
      coupling_profile: "Coupling Profile",
      sash_limiter: "Sash Limiter",
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  };

  if (cartItems.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Procurement Cart</h1>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Your procurement cart is empty
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Right-click on "Needs ordering" component badges on the Orders page to add items
            </p>
            <Link to="/orders">
              <Button>
                Go to Orders
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Link to="/orders">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" />
            Procurement
            <Badge variant="secondary" className="ml-1 text-xs">{cartItems.length}</Badge>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={deselectAll}>
            Deselect
          </Button>
          {selectedItems.size > 0 && (
            <Button variant="destructive" size="sm" className="h-7 px-2 text-xs" onClick={removeSelected}>
              <Trash2 className="h-3 w-3 mr-1" />
              Remove ({selectedItems.size})
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearCart}>
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from(groupedByType.entries()).map(([componentType, groups]) => (
          <Card key={componentType} className="overflow-hidden">
            <CardHeader className="py-2 px-3 bg-muted/50">
              <CardTitle className="flex items-center gap-1 text-sm">
                <Package className="h-3 w-3" />
                {getComponentTypeLabel(componentType)}
                <Badge variant="outline" className="ml-auto text-xs h-5">
                  {groups.reduce((sum, g) => sum + g.totalQuantity, 0)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={`${group.componentType}-${group.componentName}`}
                    className="border rounded p-2 bg-muted/20"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium truncate flex-1">
                        {group.componentName || getComponentTypeLabel(group.componentType)}
                      </h4>
                      <Badge variant="secondary" className="text-xs h-4 px-1 ml-1">
                        ×{group.totalQuantity}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1 px-1.5 bg-background rounded text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => toggleItemSelection(item.id)}
                              className="h-3 w-3"
                            />
                            <Link
                              to={`/orders/${item.orderId}`}
                              className="font-medium hover:underline text-primary truncate"
                            >
                              {item.orderNumber}
                            </Link>
                            <span className="text-muted-foreground truncate hidden sm:inline">
                              {item.customerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-muted-foreground">×{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Future: Vendor selection and email sending will go here */}
      <Card className="mt-6 border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Vendor management and email sending coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
