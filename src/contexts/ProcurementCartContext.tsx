import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CartItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  componentType: string;
  componentName: string | null;
  quantity: number;
  isFileExtracted: boolean;
  addedAt: string;
  addedByEmail?: string;
}

interface ProcurementCartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "addedAt">) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (orderId: string, componentType: string, componentName: string | null) => boolean;
  getCartCount: () => number;
  isLoading: boolean;
}

const ProcurementCartContext = createContext<ProcurementCartContextType | undefined>(undefined);

export function ProcurementCartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch cart items from database
  const fetchCartItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("procurement_cart")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // User might not have access (worker/seller)
        if (error.code === "42501") {
          setCartItems([]);
          return;
        }
        throw error;
      }

      setCartItems(
        (data || []).map((item) => ({
          id: item.id,
          orderId: item.order_id,
          orderNumber: item.order_number,
          customerName: item.customer_name,
          componentType: item.component_type,
          componentName: item.component_name,
          quantity: item.quantity,
          isFileExtracted: item.is_file_extracted,
          addedAt: item.created_at,
          addedByEmail: item.added_by_email || undefined,
        }))
      );
    } catch (error) {
      console.error("Error fetching cart items:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("procurement-cart-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procurement_cart",
        },
        (payload) => {
          console.log("Procurement cart change:", payload);
          
          if (payload.eventType === "INSERT") {
            const item = payload.new;
            setCartItems((prev) => {
              // Check if already exists
              if (prev.some((i) => i.id === item.id)) return prev;
              return [
                {
                  id: item.id,
                  orderId: item.order_id,
                  orderNumber: item.order_number,
                  customerName: item.customer_name,
                  componentType: item.component_type,
                  componentName: item.component_name,
                  quantity: item.quantity,
                  isFileExtracted: item.is_file_extracted,
                  addedAt: item.created_at,
                  addedByEmail: item.added_by_email || undefined,
                },
                ...prev,
              ];
            });
          } else if (payload.eventType === "DELETE") {
            setCartItems((prev) => prev.filter((i) => i.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            const item = payload.new;
            setCartItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      id: item.id,
                      orderId: item.order_id,
                      orderNumber: item.order_number,
                      customerName: item.customer_name,
                      componentType: item.component_type,
                      componentName: item.component_name,
                      quantity: item.quantity,
                      isFileExtracted: item.is_file_extracted,
                      addedAt: item.created_at,
                      addedByEmail: item.added_by_email || undefined,
                    }
                  : i
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addToCart = useCallback(async (item: Omit<CartItem, "id" | "addedAt">) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("procurement_cart").insert({
        order_id: item.orderId,
        order_number: item.orderNumber,
        customer_name: item.customerName,
        component_type: item.componentType,
        component_name: item.componentName,
        quantity: item.quantity,
        is_file_extracted: item.isFileExtracted,
        added_by: userData.user.id,
        added_by_email: userData.user.email,
      });

      if (error) {
        if (error.code === "23505") {
          // Already in cart (unique constraint)
          toast({ title: "Already in cart", variant: "default" });
          return;
        }
        throw error;
      }

      toast({ title: "Added to cart" });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({ title: "Failed to add to cart", variant: "destructive" });
    }
  }, [toast]);

  const removeFromCart = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("procurement_cart")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Removed from cart" });
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({ title: "Failed to remove from cart", variant: "destructive" });
    }
  }, [toast]);

  const clearCart = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("procurement_cart")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;
      toast({ title: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast({ title: "Failed to clear cart", variant: "destructive" });
    }
  }, [toast]);

  const isInCart = useCallback(
    (orderId: string, componentType: string, componentName: string | null) => {
      return cartItems.some(
        (i) =>
          i.orderId === orderId &&
          i.componentType === componentType &&
          i.componentName === componentName
      );
    },
    [cartItems]
  );

  const getCartCount = useCallback(() => {
    return cartItems.length;
  }, [cartItems]);

  return (
    <ProcurementCartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        getCartCount,
        isLoading,
      }}
    >
      {children}
    </ProcurementCartContext.Provider>
  );
}

export function useProcurementCart() {
  const context = useContext(ProcurementCartContext);
  if (context === undefined) {
    throw new Error("useProcurementCart must be used within a ProcurementCartProvider");
  }
  return context;
}
