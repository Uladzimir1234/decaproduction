import { useState, useEffect } from "react";
import { Grid3X3, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  open_issues_count?: number;
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'construction_issues',
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
      .select('construction_id')
      .in('construction_id', constructionIds);

    const { data: deliveryData } = await supabase
      .from('construction_delivery')
      .select('construction_id, is_delivered')
      .in('construction_id', constructionIds);

    // Fetch open issues count
    const { data: issuesData } = await supabase
      .from('construction_issues')
      .select('construction_id')
      .in('construction_id', constructionIds)
      .eq('status', 'open');

    const enrichedConstructions: ConstructionWithExtra[] = constructionsData.map(c => {
      const manufacturing = mfgData?.filter(m => m.construction_id === c.id) || [];
      const notes_count = notesData?.filter(n => n.construction_id === c.id).length || 0;
      const deliveryRecord = deliveryData?.find(d => d.construction_id === c.id);
      const open_issues_count = issuesData?.filter(i => i.construction_id === c.id).length || 0;
      
      return {
        ...c,
        manufacturing,
        notes_count,
        is_delivered: deliveryRecord?.is_delivered || false,
        open_issues_count,
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <DialogTitle className="text-sm font-bold">
              #{orderNumber} Order Map
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
              <span>{constructions.length} items</span>
              <span>•</span>
              <span>{windowsCount}W</span>
              <span>•</span>
              <span>{doorsCount}D</span>
              {slidingDoorsCount > 0 && (
                <>
                  <span>•</span>
                  <span>{slidingDoorsCount}S</span>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : constructions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Grid3X3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No constructions</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[calc(85vh-60px)]">
            <div className="p-3">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-3 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> Not started</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" /> Welded</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500" /> Assembled</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500" /> Glass installed</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
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

        {selectedConstruction && (
          <ConstructionDetailPanel
            construction={selectedConstruction}
            onClose={() => setSelectedConstruction(null)}
            orderId={orderId}
            isProductionReady={isProductionReady}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
