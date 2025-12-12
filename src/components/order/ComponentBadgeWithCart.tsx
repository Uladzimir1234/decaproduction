import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ShoppingCart, Check } from "lucide-react";
import { useProcurementCart } from "@/contexts/ProcurementCartContext";
import { useToast } from "@/hooks/use-toast";

interface ComponentBadgeWithCartProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  componentName: string;
  componentType: string;
  componentDisplayName: string | null;
  quantity: number;
  isFileExtracted: boolean;
  children: React.ReactNode;
}

export function ComponentBadgeWithCart({
  orderId,
  orderNumber,
  customerName,
  componentName,
  componentType,
  componentDisplayName,
  quantity,
  isFileExtracted,
  children,
}: ComponentBadgeWithCartProps) {
  const { addToCart, isInCart } = useProcurementCart();
  const { toast } = useToast();

  const alreadyInCart = isInCart(orderId, componentType, componentDisplayName);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (alreadyInCart) {
      toast({
        title: "Already in cart",
        description: `${componentName} from order ${orderNumber} is already in your procurement cart`,
      });
      return;
    }

    addToCart({
      orderId,
      orderNumber,
      customerName,
      componentType,
      componentName: componentDisplayName,
      quantity,
      isFileExtracted,
    });

    toast({
      title: "Added to cart",
      description: `${componentName} from order ${orderNumber} added to procurement cart`,
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem 
          onClick={handleAddToCart}
          disabled={alreadyInCart}
          className="gap-2"
        >
          {alreadyInCart ? (
            <>
              <Check className="h-4 w-4 text-success" />
              Already in cart
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Add to Order Basket
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
