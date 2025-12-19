import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Truck } from "lucide-react";
import { DeliveryBatchCard } from "./DeliveryBatchCard";
import { ShippingSelectionPanel } from "./ShippingSelectionPanel";
import type { ConstructionData } from "./ConstructionChipSelector";

interface OrderInfo {
  id: string;
  order_number: string;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  has_sliding_doors: boolean;
  screen_type: string | null;
  has_nailing_flanges?: boolean | null;
  has_plisse_screens?: boolean | null;
  visible_hinges_count?: number | null;
  hidden_hinges_count?: number | null;
}

interface DeliveryBatch {
  id: string;
  order_id: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  delivery_person: string | null;
}

interface BatchShippingItem {
  id: string;
  batch_id: string;
  item_type: string;
  quantity: number;
  is_complete: boolean;
}

interface BatchCustomShippingItem {
  id: string;
  batch_id: string;
  name: string;
  quantity: number;
  is_complete: boolean;
}

interface BatchConstructionItem {
  id: string;
  batch_id: string;
  construction_id: string;
  quantity: number;
  include_glass: boolean;
  include_screens: boolean;
  include_blinds: boolean;
  include_hardware: boolean;
  is_delivered: boolean;
  delivery_notes: string | null;
}

interface BatchConstructionComponent {
  id: string;
  batch_construction_item_id: string;
  component_type: string;
  quantity: number;
  is_delivered: boolean;
  unit_index: number;
}

interface ShippedUnitInfo {
  unitIndex: number;
  components: string[];
}

interface DeliveryBatchSectionProps {
  order: OrderInfo;
  manufacturingProgress: number;
}

export function DeliveryBatchSection({ order, manufacturingProgress }: DeliveryBatchSectionProps) {
  const { toast } = useToast();
  const { canUpdateManufacturing, isSeller, isAdmin } = useRole();
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [batchShippingItems, setBatchShippingItems] = useState<Record<string, BatchShippingItem[]>>({});
  const [batchCustomShipping, setBatchCustomShipping] = useState<Record<string, BatchCustomShippingItem[]>>({});
  const [batchConstructionItems, setBatchConstructionItems] = useState<Record<string, BatchConstructionItem[]>>({});
  const [batchConstructionComponents, setBatchConstructionComponents] = useState<Record<string, BatchConstructionComponent[]>>({});
  const [allConstructions, setAllConstructions] = useState<ConstructionData[]>([]);

  const canEdit = canUpdateManufacturing && !isSeller;

  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from("delivery_batches")
      .select("*")
      .eq("order_id", order.id)
      .order("delivery_date", { ascending: true });

    if (!error && data) {
      setBatches(data);
      for (const batch of data) {
        fetchBatchItems(batch.id);
      }
    }
  }, [order.id]);

  const fetchAllConstructions = useCallback(async () => {
    const { data } = await supabase
      .from("order_constructions")
      .select("id, construction_number, construction_type, quantity, screen_type, has_blinds, handle_type, glass_type")
      .eq("order_id", order.id)
      .order("position_index", { ascending: true });
    if (data) setAllConstructions(data as ConstructionData[]);
  }, [order.id]);

  const fetchBatchItems = async (batchId: string) => {
    const [shippingRes, customShipRes, constructionRes] = await Promise.all([
      supabase.from("batch_shipping_items").select("*").eq("batch_id", batchId),
      supabase.from("batch_custom_shipping_items").select("*").eq("batch_id", batchId),
      supabase.from("batch_construction_items").select("*").eq("batch_id", batchId),
    ]);

    setBatchShippingItems(prev => ({ ...prev, [batchId]: shippingRes.data || [] }));
    setBatchCustomShipping(prev => ({ ...prev, [batchId]: customShipRes.data || [] }));
    
    const constructionItems = constructionRes.data || [];
    setBatchConstructionItems(prev => ({ ...prev, [batchId]: constructionItems }));

    // Fetch components for each construction item
    if (constructionItems.length > 0) {
      const itemIds = constructionItems.map(item => item.id);
      const { data: componentsData } = await supabase
        .from("batch_construction_components")
        .select("*")
        .in("batch_construction_item_id", itemIds);
      
      setBatchConstructionComponents(prev => ({ ...prev, [batchId]: componentsData || [] }));
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchAllConstructions();

    const batchesChannel = supabase
      .channel(`deliverybatches-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_batches',
          filter: `order_id=eq.${order.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBatch = payload.new as DeliveryBatch;
            setBatches(prev => [...prev, newBatch]);
            fetchBatchItems(newBatch.id);
          } else if (payload.eventType === 'UPDATE') {
            setBatches(prev => prev.map(batch => 
              batch.id === payload.new.id ? { ...batch, ...payload.new } : batch
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setBatches(prev => prev.filter(batch => batch.id !== deletedId));
            setBatchConstructionItems(prev => {
              const updated = { ...prev };
              delete updated[deletedId];
              return updated;
            });
            setBatchShippingItems(prev => {
              const updated = { ...prev };
              delete updated[deletedId];
              return updated;
            });
            setBatchCustomShipping(prev => {
              const updated = { ...prev };
              delete updated[deletedId];
              return updated;
            });
            setBatchConstructionComponents(prev => {
              const updated = { ...prev };
              delete updated[deletedId];
              return updated;
            });
          }
        }
      )
      .subscribe();

    const constructionsChannel = supabase
      .channel(`constructions-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_constructions',
          filter: `order_id=eq.${order.id}`
        },
        () => fetchAllConstructions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(constructionsChannel);
    };
  }, [fetchBatches, order.id, fetchAllConstructions]);

  // Calculate shipped units per construction from all batches
  const getShippedUnitsPerConstruction = useCallback(() => {
    const shippedUnits: Record<string, ShippedUnitInfo[]> = {};
    const existingBatchIds = new Set(batches.map(b => b.id));

    Object.entries(batchConstructionItems).forEach(([batchId, items]) => {
      if (!existingBatchIds.has(batchId)) return;
      
      items.forEach(item => {
        const constructionId = item.construction_id;
        if (!shippedUnits[constructionId]) {
          shippedUnits[constructionId] = [];
        }
        
        // Get components for this batch construction item
        const components = batchConstructionComponents[batchId]?.filter(
          c => c.batch_construction_item_id === item.id
        ) || [];
        
        // Group by unit_index
        const unitMap = new Map<number, string[]>();
        components.forEach(comp => {
          if (!unitMap.has(comp.unit_index)) {
            unitMap.set(comp.unit_index, []);
          }
          unitMap.get(comp.unit_index)!.push(comp.component_type);
        });
        
        unitMap.forEach((compTypes, unitIdx) => {
          shippedUnits[constructionId].push({
            unitIndex: unitIdx,
            components: compTypes,
          });
        });
      });
    });

    return shippedUnits;
  }, [batchConstructionItems, batchConstructionComponents, batches]);

  const shippedUnitsPerConstruction = getShippedUnitsPerConstruction();
  const totalBatches = batches.length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Shipping & Delivery</CardTitle>
          </div>
          <Badge variant="outline">
            {totalBatches} {totalBatches === 1 ? 'Batch' : 'Batches'}
          </Badge>
        </div>
        <CardDescription>
          Select ready items to create shipments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Always-visible shipping selection panel */}
        <ShippingSelectionPanel
          orderId={order.id}
          orderData={order}
          constructions={allConstructions}
          shippedUnitsPerConstruction={shippedUnitsPerConstruction}
          onBatchCreated={fetchBatches}
          canEdit={canEdit}
        />
        
        {/* Batch history */}
        {batches.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Delivery History</h4>
            {batches.map((batch, index) => (
              <DeliveryBatchCard
                key={batch.id}
                batch={batch}
                batchNumber={index + 1}
                shippingItems={batchShippingItems[batch.id] || []}
                customShippingItems={batchCustomShipping[batch.id] || []}
                constructionItems={batchConstructionItems[batch.id] || []}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onRefresh={fetchBatches}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
