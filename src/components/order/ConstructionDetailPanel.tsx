import { useState, useEffect } from "react";
import { X, Square, DoorOpen, PanelLeftOpen, Plus, MessageSquare, Truck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusButtonGroup, manufacturingStatusOptions } from "@/components/ui/status-button-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { format } from "date-fns";

interface ConstructionManufacturing {
  id: string;
  stage: string;
  status: string;
  notes: string | null;
  updated_at: string | null;
  updated_by_email: string | null;
}

interface ConstructionNote {
  id: string;
  note_type: string;
  note_text: string;
  created_by_email: string | null;
  created_at: string;
}

interface ConstructionDelivery {
  id: string;
  is_prepared: boolean;
  is_delivered: boolean;
}

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
}

interface ConstructionDetailPanelProps {
  construction: Construction;
  onClose: () => void;
  orderId: string;
  isProductionReady: boolean;
}

const MANUFACTURING_STAGES = [
  { key: 'frame_cutting', label: 'Frame Cutting' },
  { key: 'welding', label: 'Welding' },
  { key: 'assembly', label: 'Assembly' },
  { key: 'glass_installation', label: 'Glass Installation' },
];

export function ConstructionDetailPanel({
  construction,
  onClose,
  orderId,
  isProductionReady,
}: ConstructionDetailPanelProps) {
  const { isAdmin, isManager, isWorker } = useRole();
  const { toast } = useToast();
  const [manufacturing, setManufacturing] = useState<ConstructionManufacturing[]>([]);
  const [notes, setNotes] = useState<ConstructionNote[]>([]);
  const [delivery, setDelivery] = useState<ConstructionDelivery | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const canEdit = isAdmin || isManager || isWorker;

  const typeIcons = {
    window: Square,
    door: DoorOpen,
    sliding_door: PanelLeftOpen,
  };
  const Icon = typeIcons[construction.construction_type] || Square;

  const typeLabels = {
    window: 'Window',
    door: 'Door',
    sliding_door: 'Sliding Door',
  };

  useEffect(() => {
    fetchData();
  }, [construction.id]);

  const fetchData = async () => {
    // Fetch manufacturing stages
    const { data: mfgData } = await supabase
      .from('construction_manufacturing')
      .select('*')
      .eq('construction_id', construction.id);
    
    if (mfgData) {
      // Ensure all stages exist
      const existingStages = new Set(mfgData.map(m => m.stage));
      const stagesToCreate = MANUFACTURING_STAGES.filter(s => !existingStages.has(s.key));
      
      if (stagesToCreate.length > 0) {
        const { data: newStages } = await supabase
          .from('construction_manufacturing')
          .insert(stagesToCreate.map(s => ({
            construction_id: construction.id,
            stage: s.key,
            status: 'not_started',
          })))
          .select();
        
        if (newStages) {
          setManufacturing([...mfgData, ...newStages]);
        }
      } else {
        setManufacturing(mfgData);
      }
    }

    // Fetch notes
    const { data: notesData } = await supabase
      .from('construction_notes')
      .select('*')
      .eq('construction_id', construction.id)
      .order('created_at', { ascending: false });
    
    if (notesData) setNotes(notesData);

    // Fetch delivery status
    const { data: deliveryData } = await supabase
      .from('construction_delivery')
      .select('*')
      .eq('construction_id', construction.id)
      .is('delivery_batch_id', null)
      .maybeSingle();
    
    if (deliveryData) {
      setDelivery(deliveryData);
    } else {
      // Create delivery record if doesn't exist
      const { data: newDelivery } = await supabase
        .from('construction_delivery')
        .insert({
          construction_id: construction.id,
        })
        .select()
        .single();
      
      if (newDelivery) setDelivery(newDelivery);
    }
  };

  const handleStageUpdate = async (stage: string, status: string) => {
    if (!isProductionReady && !isAdmin) {
      toast({
        title: "Order on hold",
        description: "Cannot update manufacturing stages while order is on hold",
        variant: "destructive",
      });
      return;
    }

    const stageRecord = manufacturing.find(m => m.stage === stage);
    if (!stageRecord) return;

    const { error } = await supabase
      .from('construction_manufacturing')
      .update({ status })
      .eq('id', stageRecord.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setManufacturing(prev => 
        prev.map(m => m.stage === stage ? { ...m, status } : m)
      );
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    
    setAddingNote(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('construction_notes')
      .insert({
        construction_id: construction.id,
        note_type: 'general',
        note_text: newNoteText.trim(),
        created_by: user?.id,
        created_by_email: user?.email,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setNotes(prev => [data, ...prev]);
      setNewNoteText("");
    }
    
    setAddingNote(false);
  };

  const handleDeliveryUpdate = async (field: 'is_prepared' | 'is_delivered', value: boolean) => {
    if (!delivery) return;

    const { error } = await supabase
      .from('construction_delivery')
      .update({ [field]: value })
      .eq('id', delivery.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDelivery(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const manufacturingMap = new Map(manufacturing.map(m => [m.stage, m]));

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <div>
            <h2 className="font-bold">C-{construction.construction_number.padStart(3, '0')}</h2>
            <p className="text-sm text-muted-foreground">
              {typeLabels[construction.construction_type]}
              {construction.quantity > 1 && ` (×${construction.quantity})`}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Specifications */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Specifications</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {construction.width_inches && construction.height_inches && (
                <div>
                  <span className="text-muted-foreground">Size:</span>{" "}
                  {construction.width_inches.toFixed(2)}×{construction.height_inches.toFixed(2)}"
                </div>
              )}
              {construction.width_mm && construction.height_mm && (
                <div>
                  <span className="text-muted-foreground">Size (mm):</span>{" "}
                  {construction.width_mm}×{construction.height_mm}
                </div>
              )}
              {construction.rough_opening && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Rough Opening:</span>{" "}
                  {construction.rough_opening}
                </div>
              )}
              {construction.location && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Location:</span>{" "}
                  {construction.location}
                </div>
              )}
              {construction.model && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Model:</span>{" "}
                  {construction.model}
                </div>
              )}
              {construction.opening_type && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Opening:</span>{" "}
                  {construction.opening_type}
                </div>
              )}
              {construction.color_exterior && (
                <div>
                  <span className="text-muted-foreground">Ext. Color:</span>{" "}
                  {construction.color_exterior}
                </div>
              )}
              {construction.color_interior && (
                <div>
                  <span className="text-muted-foreground">Int. Color:</span>{" "}
                  {construction.color_interior}
                </div>
              )}
              {construction.glass_type && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Glass:</span>{" "}
                  <span className="text-xs">{construction.glass_type}</span>
                </div>
              )}
              {construction.screen_type && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Screen:</span>{" "}
                  {construction.screen_type}
                </div>
              )}
              {construction.handle_type && (
                <div>
                  <span className="text-muted-foreground">Handle:</span>{" "}
                  {construction.handle_type}
                </div>
              )}
              {construction.has_blinds && (
                <div>
                  <span className="text-muted-foreground">Blinds:</span>{" "}
                  {construction.blinds_color || 'Yes'}
                </div>
              )}
              {construction.center_seal && (
                <Badge variant="outline" className="w-fit">Center Seal</Badge>
              )}
            </div>
            {construction.comments && (
              <div className="text-sm bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground">Notes:</span> {construction.comments}
              </div>
            )}
          </div>

          <Separator />

          {/* Manufacturing Stages */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Manufacturing</h3>
            {!isProductionReady && (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Order is on hold - stages are locked
              </div>
            )}
            <div className="space-y-3">
              {MANUFACTURING_STAGES.map(({ key, label }) => {
                const stage = manufacturingMap.get(key);
                const status = stage?.status || 'not_started';
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      {stage?.updated_by_email && (
                        <span className="text-xs text-muted-foreground">
                          {stage.updated_by_email?.split('@')[0]}
                        </span>
                      )}
                    </div>
                    <StatusButtonGroup
                      value={status}
                      onChange={(val) => handleStageUpdate(key, val)}
                      options={manufacturingStatusOptions}
                      disabled={!canEdit || (!isProductionReady && !isAdmin)}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Delivery Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={delivery?.is_prepared || false}
                  onCheckedChange={(checked) => handleDeliveryUpdate('is_prepared', !!checked)}
                  disabled={!canEdit}
                />
                Prepared for shipping
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={delivery?.is_delivered || false}
                  onCheckedChange={(checked) => handleDeliveryUpdate('is_delivered', !!checked)}
                  disabled={!canEdit}
                />
                Delivered to customer
              </label>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes ({notes.length})
            </h3>
            
            {canEdit && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim() || addingNote}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="bg-muted/50 p-2 rounded text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{note.created_by_email?.split('@')[0] || 'Unknown'}</span>
                    <span>{format(new Date(note.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p>{note.note_text}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
