import { useState } from "react";
import { Check, X, AlertTriangle, MessageSquare, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConstructionManufacturing {
  stage: string;
  status: string;
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
}

const ISSUE_TYPES = [
  { value: 'hardware', label: 'Hardware', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { value: 'glass', label: 'Glass', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'screen', label: 'Screen', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { value: 'damage', label: 'Damage', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'window': return 'Window';
    case 'door': return 'Door';
    case 'sliding_door': return 'Sliding Door';
    default: return 'Construction';
  }
};

const getCurrentGlassStatus = (manufacturing?: ConstructionManufacturing[]) => {
  if (!manufacturing) return 'not_started';
  const glassStage = manufacturing.find(m => m.stage === 'glass_installation');
  return glassStage?.status || 'not_started';
};

const getCurrentAssemblyStatus = (manufacturing?: ConstructionManufacturing[]) => {
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
}: ConstructionQuickActionsProps) {
  const { toast } = useToast();
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const glassStatus = getCurrentGlassStatus(construction.manufacturing);
  const assemblyStatus = getCurrentAssemblyStatus(construction.manufacturing);
  const isGlassInstalled = glassStatus === 'complete';
  const isAssembled = assemblyStatus === 'complete';

  const updateManufacturingStage = async (stage: string, status: string) => {
    setSavingStatus(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Check if record exists
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
        toast({ title: "Status updated", description: `${stage === 'glass_installation' ? 'Glass' : 'Assembly'} marked as ${status === 'complete' ? 'installed' : 'not installed'}` });
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
        toast({ title: "Status updated" });
        onRefresh();
      }
    }
    setSavingStatus(false);
  };

  const handleReportIssue = async () => {
    if (!selectedIssueType || !issueDescription.trim()) return;

    setSavingIssue(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('construction_issues')
      .insert({
        construction_id: construction.id,
        issue_type: selectedIssueType,
        description: issueDescription.trim(),
        created_by: user?.id,
        created_by_email: user?.email,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Issue reported", description: `${selectedIssueType} issue logged` });
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
      toast({ title: "Note added" });
      setNoteText("");
      onRefresh();
    }
    setSavingNote(false);
  };

  const dimensions = construction.width_inches && construction.height_inches
    ? `${construction.width_inches.toFixed(1)}×${construction.height_inches.toFixed(1)}"`
    : null;

  return (
    <div className="w-72 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">#{construction.construction_number}</span>
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(construction.construction_type)}
            </Badge>
          </div>
          {dimensions && (
            <p className="text-xs text-muted-foreground">{dimensions}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(construction.open_issues_count || 0) > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {construction.open_issues_count}
            </Badge>
          )}
          {(construction.notes_count || 0) > 0 && (
            <Badge variant="secondary" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              {construction.notes_count}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Quick Status Toggles */}
      {isProductionReady && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick Status</p>
          
          {/* Glass Installation */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isGlassInstalled ? "default" : "outline"}
              className={`flex-1 text-xs ${isGlassInstalled ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
              onClick={() => updateManufacturingStage('glass_installation', 'complete')}
              disabled={savingStatus}
            >
              {savingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Glass Installed
            </Button>
            <Button
              size="sm"
              variant={!isGlassInstalled ? "default" : "outline"}
              className={`flex-1 text-xs ${!isGlassInstalled ? 'bg-green-500 hover:bg-green-600' : ''}`}
              onClick={() => updateManufacturingStage('glass_installation', 'not_started')}
              disabled={savingStatus}
            >
              <X className="h-3 w-3 mr-1" />
              Not Installed
            </Button>
          </div>

          {/* Assembly Status */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isAssembled ? "default" : "outline"}
              className={`flex-1 text-xs ${isAssembled ? 'bg-green-500 hover:bg-green-600' : ''}`}
              onClick={() => updateManufacturingStage('assembly', 'complete')}
              disabled={savingStatus}
            >
              {savingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Assembled
            </Button>
            <Button
              size="sm"
              variant={!isAssembled ? "default" : "outline"}
              className={`flex-1 text-xs ${!isAssembled ? 'bg-amber-400 hover:bg-amber-500 text-black' : ''}`}
              onClick={() => updateManufacturingStage('assembly', 'not_started')}
              disabled={savingStatus}
            >
              <X className="h-3 w-3 mr-1" />
              Not Assembled
            </Button>
          </div>
        </div>
      )}

      <Separator />

      {/* Quick Issue Report */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Report Issue</p>
        <div className="flex flex-wrap gap-1">
          {ISSUE_TYPES.map(type => (
            <Button
              key={type.value}
              size="sm"
              variant="ghost"
              className={`text-xs h-7 px-2 ${selectedIssueType === type.value ? type.color + ' ring-1 ring-offset-1' : ''}`}
              onClick={() => setSelectedIssueType(selectedIssueType === type.value ? null : type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>
        {selectedIssueType && (
          <div className="space-y-2">
            <Textarea
              placeholder="Describe the issue..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={2}
              className="text-xs"
            />
            <Button
              size="sm"
              className="w-full text-xs"
              onClick={handleReportIssue}
              disabled={!issueDescription.trim() || savingIssue}
            >
              {savingIssue ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              Report Issue
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Quick Note */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Leave Note</p>
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={1}
            className="text-xs flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendNote}
            disabled={!noteText.trim() || savingNote}
          >
            {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      <Separator />

      {/* View Full Details */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs justify-between"
        onClick={() => {
          onClose();
          onViewDetails();
        }}
      >
        View Full Details
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
