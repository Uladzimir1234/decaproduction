import { useState, useEffect } from "react";
import { X, Grid3X3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConstructionCard } from "./ConstructionCard";
import { ConstructionDetailPanel } from "./ConstructionDetailPanel";
import { supabase } from "@/integrations/supabase/client";

interface Construction {
  id: string;
  construction_number: string;
  construction_type: string;
  width_inches: number | null;
  height_inches: number | null;
  width_mm: number | null;
  height_mm: number | null;
  rough_opening: string | null;
  location: string | null;
  model: string | null;
  opening_type: string | null;
  color_exterior: string | null;
  color_interior: string | null;
  glass_type: string | null;
  screen_type: string | null;
  handle_type: string | null;
  has_blinds: boolean;
  blinds_color: string | null;
  center_seal: boolean;
  comments: string | null;
  quantity: number;
  position_index: number;
}

interface ConstructionWithExtra extends Construction {
  manufacturing?: { stage: string; status: string }[];
  notes_count?: number;
  is_delivered?: boolean;
}

interface OrderMapProps {
  orderId: string;
  orderNumber: string;
  isProductionReady: boolean;
  onClose: () => void;
}

export function OrderMap({ orderId, orderNumber, isProductionReady, onClose }: OrderMapProps) {
  const [constructions, setConstructions] = useState<ConstructionWithExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConstruction, setSelectedConstruction] = useState<ConstructionWithExtra | null>(null);

  useEffect(() => {
    fetchConstructions();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-constructions-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_constructions',
          filter: `order_id=eq.${orderId}`,
        },
        () => fetchConstructions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'construction_manufacturing',
        },
        () => fetchConstructions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const fetchConstructions = async () => {
    setLoading(true);
    
    // Fetch constructions
    const { data: constructionsData, error } = await supabase
      .from('order_constructions')
      .select('*')
      .eq('order_id', orderId)
      .order('position_index');

    if (error) {
      console.error('Error fetching constructions:', error);
      setLoading(false);
      return;
    }

    if (!constructionsData || constructionsData.length === 0) {
      setConstructions([]);
      setLoading(false);
      return;
    }

    const constructionIds = constructionsData.map(c => c.id);

    // Fetch manufacturing stages
    const { data: mfgData } = await supabase
      .from('construction_manufacturing')
      .select('construction_id, stage, status')
      .in('construction_id', constructionIds);

    // Fetch notes count
    const { data: notesData } = await supabase
      .from('construction_notes')
      .select('construction_id')
      .in('construction_id', constructionIds);

    // Fetch delivery status
    const { data: deliveryData } = await supabase
      .from('construction_delivery')
      .select('construction_id, is_delivered')
      .in('construction_id', constructionIds);

    // Combine data
    const enrichedConstructions: ConstructionWithExtra[] = constructionsData.map(c => {
      const manufacturing = mfgData?.filter(m => m.construction_id === c.id) || [];
      const notes_count = notesData?.filter(n => n.construction_id === c.id).length || 0;
      const deliveryRecord = deliveryData?.find(d => d.construction_id === c.id);
      
      return {
        ...c,
        manufacturing,
        notes_count,
        is_delivered: deliveryRecord?.is_delivered || false,
      };
    });

    setConstructions(enrichedConstructions);
    setLoading(false);
  };

  const windowsCount = constructions
    .filter(c => c.construction_type === 'window')
    .reduce((sum, c) => sum + c.quantity, 0);
  const doorsCount = constructions
    .filter(c => c.construction_type === 'door')
    .reduce((sum, c) => sum + c.quantity, 0);
  const slidingDoorsCount = constructions
    .filter(c => c.construction_type === 'sliding_door')
    .reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="fixed inset-0 bg-background/95 z-40 flex flex-col animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Grid3X3 className="h-5 w-5" />
          <div>
            <h2 className="font-bold">Order #{orderNumber} - Order Map</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{constructions.length} constructions</span>
              <span>•</span>
              <span>{windowsCount} windows</span>
              <span>•</span>
              <span>{doorsCount} doors</span>
              {slidingDoorsCount > 0 && (
                <>
                  <span>•</span>
                  <span>{slidingDoorsCount} sliding doors</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : constructions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Constructions</h3>
            <p className="text-sm text-muted-foreground">
              Upload an order file to add constructions
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {constructions.map(construction => (
                <ConstructionCard
                  key={construction.id}
                  construction={construction}
                  onClick={() => setSelectedConstruction(construction)}
                  isSelected={selectedConstruction?.id === construction.id}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Detail Panel */}
      {selectedConstruction && (
        <ConstructionDetailPanel
          construction={selectedConstruction}
          onClose={() => setSelectedConstruction(null)}
          orderId={orderId}
          isProductionReady={isProductionReady}
        />
      )}
    </div>
  );
}
