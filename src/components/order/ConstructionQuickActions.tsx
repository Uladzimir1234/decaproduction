import { useState } from "react";
import { Check, X, AlertTriangle, MessageSquare, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConstructionManufacturing {
  stage: string;
  status: string;
}

interface OrderFulfillment {
  welding_status?: string | null;
  assembly_status?: string | null;
  glass_status?: string | null;
  doors_status?: string | null;
  sliding_doors_status?: string | null;
}

interface Construction {
  id: string;
  construction_number: string;
  construction_type: string;
  width_inches: number | null;
  height_inches: number | null;
  manufacturing?: ConstructionManufacturing[];
  notes_count?: number;
  open_issues_count?: number;
}

interface ConstructionQuickActionsProps {
  construction: Construction;
  orderId: string;
  isProductionReady: boolean;
  onViewDetails: () => void;
  onClose: () => void;
  onRefresh: () => void;
  orderFulfillment?: OrderFulfillment | null;
}

const ISSUE_TYPES = [
  { value: 'hardware', label: 'HW' },
  { value: 'glass', label: 'Glass' },
  { value: 'screen', label: 'Scr' },
  { value: 'damage', label: 'Dmg' },
  { value: 'other', label: '...' },
];

const getTypePrefix = (type: string) => {
  switch (type) {
    case 'window': return 'W';
    case 'door': return 'D';
    case 'sliding_door': return 'S';
    default: return 'C';
  }
};

// Determine glass status: prioritize orderFulfillment, fallback to per-construction
const getCurrentGlassStatus = (
  constructionType: string,
  orderFulfillment?: OrderFulfillment | null,
  manufacturing?: ConstructionManufacturing[]
) => {
  // Order-level glass_status applies to all construction types
  if (orderFulfillment?.glass_status === 'complete') {
    return 'complete';
  }
  // Fallback to per-construction data
  if (!manufacturing) return 'not_started';
  const glassStage = manufacturing.find(m => m.stage === 'glass_installation');
  return glassStage?.status || 'not_started';
};

// Determine assembly status: prioritize orderFulfillment based on type
const getCurrentAssemblyStatus = (
  constructionType: string,
  orderFulfillment?: OrderFulfillment | null,
  manufacturing?: ConstructionManufacturing[]
) => {
  if (orderFulfillment) {
    if (constructionType === 'window' && orderFulfillment.assembly_status === 'complete') {
      return 'complete';
    }
    if (constructionType === 'door' && orderFulfillment.doors_status === 'complete') {
      return 'complete';
    }
    if (constructionType === 'sliding_door' && orderFulfillment.sliding_doors_status === 'complete') {
      return 'complete';
    }
  }
  // Fallback to per-construction data
  if (!manufacturing) return 'not_started';
  const assemblyStage = manufacturing.find(m => m.stage === 'assembly');
  return assemblyStage?.status || 'not_started';
};

export function ConstructionQuickActions({
  construction,
  orderId,
  isProductionReady,
  onViewDetails,
  onClose,
  onRefresh,
  orderFulfillment,
}: ConstructionQuickActionsProps) {
  const { toast } = useToast();
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const glassStatus = getCurrentGlassStatus(construction.construction_type, orderFulfillment, construction.manufacturing);
  const assemblyStatus = getCurrentAssemblyStatus(construction.construction_type, orderFulfillment, construction.manufacturing);
  const isGlassInstalled = glassStatus === 'complete';
  const isAssembled = assemblyStatus === 'complete';

  const updateManufacturingStage = async (stage: string, status: string) => {
    setSavingStatus(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from('construction_manufacturing')
      .select('id')
      .eq('construction_id', construction.id)
      .eq('stage', stage)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('construction_manufacturing')
        .update({
          status,
          updated_by: user?.id,
          updated_by_email: user?.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        onRefresh();
      }
    } else {
      const { error } = await supabase
        .from('construction_manufacturing')
        .insert({
          construction_id: construction.id,
          stage,
          status,
          updated_by: user?.id,
          updated_by_email: user?.email,
        });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        onRefresh();
      }
    }
    setSavingStatus(false);
  };

  const handleReportIssue = async () => {
    if (!selectedIssueType) return;

    setSavingIssue(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('construction_issues')
      .insert({
        construction_id: construction.id,
        issue_type: selectedIssueType,
        description: issueDescription.trim() || `${selectedIssueType} issue`,
        created_by: user?.id,
        created_by_email: user?.email,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Issue reported" });
      setSelectedIssueType(null);
      setIssueDescription("");
      onRefresh();
    }
    setSavingIssue(false);
  };

  const handleSendNote = async () => {
    if (!noteText.trim()) return;

    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('construction_notes')
      .insert({
        construction_id: construction.id,
        note_text: noteText.trim(),
        note_type: 'general',
        created_by: user?.id,
        created_by_email: user?.email,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNoteText("");
      onRefresh();
    }
    setSavingNote(false);
  };

  const dimensions = construction.width_inches && construction.height_inches
    ? `${construction.width_inches.toFixed(0)}×${construction.height_inches.toFixed(0)}"`
    : null;

  return (
    <div className="w-56 p-2 space-y-2 max-h-[60vh] overflow-y-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between pb-1 border-b">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm">
            {getTypePrefix(construction.construction_type)}{construction.construction_number}
          </span>
          {dimensions && (
            <span className="text-[10px] text-muted-foreground">{dimensions}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {(construction.open_issues_count || 0) > 0 && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              {construction.open_issues_count}
            </Badge>
          )}
          {(construction.notes_count || 0) > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
              {construction.notes_count}
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Status - Compact Toggle Pills */}
      {isProductionReady && (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            <button
              onClick={() => updateManufacturingStage('glass_installation', isGlassInstalled ? 'not_started' : 'complete')}
              disabled={savingStatus}
              className={`flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                isGlassInstalled 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {savingStatus ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : isGlassInstalled ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
              Glass
            </button>
            <button
              onClick={() => updateManufacturingStage('assembly', isAssembled ? 'not_started' : 'complete')}
              disabled={savingStatus}
              className={`flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                isAssembled 
                  ? 'bg-green-500 text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {savingStatus ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : isAssembled ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
              Assembled
            </button>
          </div>
        </div>
      )}

      {/* Issue Quick Buttons - Single Row */}
      <div className="space-y-1">
        <div className="flex gap-0.5">
          {ISSUE_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => {
                if (selectedIssueType === type.value) {
                  setSelectedIssueType(null);
                } else {
                  setSelectedIssueType(type.value);
                }
              }}
              className={`flex-1 h-5 rounded text-[9px] font-medium transition-colors ${
                selectedIssueType === type.value 
                  ? 'bg-amber-400 text-black' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        {selectedIssueType && (
          <div className="flex gap-1">
            <Input
              placeholder="Details (optional)"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="h-6 text-[10px] flex-1"
            />
            <Button
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={handleReportIssue}
              disabled={savingIssue}
            >
              {savingIssue ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <AlertTriangle className="h-2.5 w-2.5" />}
            </Button>
          </div>
        )}
      </div>

      {/* Note Input - Inline */}
      <div className="flex gap-1">
        <Input
          placeholder="Add note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="h-6 text-[10px] flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0"
          onClick={handleSendNote}
          disabled={!noteText.trim() || savingNote}
        >
          {savingNote ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <MessageSquare className="h-2.5 w-2.5" />}
        </Button>
      </div>

      {/* View Details Link */}
      <button
        onClick={() => {
          onClose();
          onViewDetails();
        }}
        className="w-full h-6 flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 border-t pt-1.5"
      >
        <span>Full Details</span>
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
