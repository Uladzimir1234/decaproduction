import { useState, useEffect } from "react";
import { Loader2, Grid3X3 } from "lucide-react";
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

interface ConstructionNote {
  note_text: string;
  created_by_email: string | null;
  created_at: string;
}

interface ConstructionWithExtra extends Construction {
  manufacturing?: { stage: string; status: string }[];
  notes_count?: number;
  notes?: ConstructionNote[];
  is_delivered?: boolean;
  open_issues_count?: number;
}

interface OrderFulfillment {
  welding_status?: string | null;
  assembly_status?: string | null;
  glass_status?: string | null;
  doors_status?: string | null;
  sliding_doors_status?: string | null;
}

interface OrderMapInlineProps {
  orderId: string;
  orderNumber: string;
  isProductionReady: boolean;
}

export function OrderMapInline({ orderId, orderNumber, isProductionReady }: OrderMapInlineProps) {
  const [constructions, setConstructions] = useState<ConstructionWithExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConstruction, setSelectedConstruction] = useState<ConstructionWithExtra | null>(null);
  const [orderFulfillment, setOrderFulfillment] = useState<OrderFulfillment | null>(null);

  useEffect(() => {
    fetchConstructions(true); // Show loading only on initial mount
    
    const channel = supabase
      .channel(`order-constructions-inline-${orderId}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'construction_issues',
        },
        () => fetchConstructions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_fulfillment',
          filter: `order_id=eq.${orderId}`,
        },
        () => fetchConstructions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const fetchConstructions = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    
    // Fetch order_fulfillment for fallback status
    const { data: fulfillmentData } = await supabase
      .from('order_fulfillment')
      .select('welding_status, assembly_status, glass_status, doors_status, sliding_doors_status')
      .eq('order_id', orderId)
      .maybeSingle();
    
    setOrderFulfillment(fulfillmentData);
    
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

    const { data: mfgData } = await supabase
      .from('construction_manufacturing')
      .select('construction_id, stage, status')
      .in('construction_id', constructionIds);

    const { data: notesData } = await supabase
      .from('construction_notes')
      .select('construction_id, note_text, created_by_email, created_at')
      .in('construction_id', constructionIds)
      .order('created_at', { ascending: false });

    const { data: deliveryData } = await supabase
      .from('construction_delivery')
      .select('construction_id, is_delivered')
      .in('construction_id', constructionIds);

    const { data: issuesData } = await supabase
      .from('construction_issues')
      .select('construction_id')
      .in('construction_id', constructionIds)
      .eq('status', 'open');

    const enrichedConstructions: ConstructionWithExtra[] = constructionsData.map(c => {
      const manufacturing = mfgData?.filter(m => m.construction_id === c.id) || [];
      const constructionNotes = notesData?.filter(n => n.construction_id === c.id) || [];
      const deliveryRecord = deliveryData?.find(d => d.construction_id === c.id);
      const open_issues_count = issuesData?.filter(i => i.construction_id === c.id).length || 0;
      
      return {
        ...c,
        manufacturing,
        notes_count: constructionNotes.length,
        notes: constructionNotes.map(n => ({
          note_text: n.note_text,
          created_by_email: n.created_by_email,
          created_at: n.created_at,
        })),
        is_delivered: deliveryRecord?.is_delivered || false,
        open_issues_count,
      };
    });

    setConstructions(enrichedConstructions);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (constructions.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="text-center">
          <Grid3X3 className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">No constructions</p>
        </div>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 text-[10px]">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500" /> Not started</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-400" /> Welded</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-500" /> Assembled</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-500" /> Glass installed</div>
      </div>
      
      {/* Construction grid - full width spread */}
      <div className="flex flex-wrap gap-2 justify-start w-full">
        {constructions.map(construction => (
          <ConstructionCard
            key={construction.id}
            construction={construction}
            onClick={() => setSelectedConstruction(construction)}
            onViewDetails={() => setSelectedConstruction(construction)}
            isSelected={selectedConstruction?.id === construction.id}
            orderFulfillment={orderFulfillment}
            orderId={orderId}
            isProductionReady={isProductionReady}
            onRefresh={fetchConstructions}
            usePopover={true}
          />
        ))}
      </div>

      {/* Detail panel */}
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
