import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface CartItem {
  id: string; // unique identifier for cart item
  orderId: string;
  orderNumber: string;
  customerName: string;
  componentType: string;
  componentName: string | null;
  quantity: number;
  isFileExtracted: boolean;
  addedAt: string;
}

interface ProcurementCartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "addedAt">) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isInCart: (orderId: string, componentType: string, componentName: string | null) => boolean;
  getCartCount: () => number;
}

const ProcurementCartContext = createContext<ProcurementCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "procurement-cart";

export function ProcurementCartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((item: Omit<CartItem, "id" | "addedAt">) => {
    setCartItems((prev) => {
      // Check if already in cart
      const exists = prev.some(
        (i) =>
          i.orderId === item.orderId &&
          i.componentType === item.componentType &&
          i.componentName === item.componentName
      );
      if (exists) return prev;

      const newItem: CartItem = {
        ...item,
        id: `${item.orderId}-${item.componentType}-${item.componentName || "null"}-${Date.now()}`,
        addedAt: new Date().toISOString(),
      };
      return [...prev, newItem];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

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
