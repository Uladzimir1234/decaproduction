import { useState, useEffect, useRef } from "react";
import { Check, X, AlertTriangle, MessageSquare, ChevronRight, Loader2, FileText, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  pdf_file_path?: string | null;
}

interface ConstructionQuickActionsProps {
  construction: Construction;
  orderId: string;
  isProductionReady: boolean;
  onViewDetails: () => void;
  onClose: () => void;
  onRefresh: (updatedConstruction?: { id: string; manufacturing: ConstructionManufacturing[] }) => void;
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
  const [savingIssue, setSavingIssue] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optimistic local state for instant feedback
  const [localGlassStatus, setLocalGlassStatus] = useState<string>('not_started');
  const [localAssemblyStatus, setLocalAssemblyStatus] = useState<string>('not_started');

  // Initialize local state from construction data
  useEffect(() => {
    const glassStage = construction.manufacturing?.find(m => m.stage === 'glass_installation');
    const assemblyStage = construction.manufacturing?.find(m => m.stage === 'assembly');
    
    if (glassStage) {
      setLocalGlassStatus(glassStage.status);
    } else if (orderFulfillment?.glass_status === 'complete') {
      setLocalGlassStatus('complete');
    } else {
      setLocalGlassStatus('not_started');
    }
    
    if (assemblyStage) {
      setLocalAssemblyStatus(assemblyStage.status);
    } else if (construction.construction_type === 'window' && orderFulfillment?.assembly_status === 'complete') {
      setLocalAssemblyStatus('complete');
    } else if (construction.construction_type === 'door' && orderFulfillment?.doors_status === 'complete') {
      setLocalAssemblyStatus('complete');
    } else if (construction.construction_type === 'sliding_door' && orderFulfillment?.sliding_doors_status === 'complete') {
      setLocalAssemblyStatus('complete');
    } else {
      setLocalAssemblyStatus('not_started');
    }
  }, [construction, orderFulfillment]);

  const isGlassInstalled = localGlassStatus === 'complete';
  const isAssembled = localAssemblyStatus === 'complete';

  const updateManufacturingStage = async (stage: string, newStatus: string) => {
    // Optimistic update - change color INSTANTLY
    if (stage === 'glass_installation') {
      setLocalGlassStatus(newStatus);
    } else if (stage === 'assembly') {
      setLocalAssemblyStatus(newStatus);
    }

    // Build optimistic manufacturing array for parent
    // Include BOTH glass and assembly status to ensure card color is correct
    const updatedManufacturing: { stage: string; status: string }[] = [];
    
    // Add glass_installation status
    if (stage === 'glass_installation') {
      updatedManufacturing.push({ stage: 'glass_installation', status: newStatus });
    } else {
      updatedManufacturing.push({ stage: 'glass_installation', status: localGlassStatus });
    }
    
    // Add assembly status
    if (stage === 'assembly') {
      updatedManufacturing.push({ stage: 'assembly', status: newStatus });
    } else {
      updatedManufacturing.push({ stage: 'assembly', status: localAssemblyStatus });
    }
    
    // Preserve welding and other stages from existing data
    const existingManufacturing = construction.manufacturing || [];
    existingManufacturing.forEach(m => {
      if (m.stage !== 'glass_installation' && m.stage !== 'assembly') {
        updatedManufacturing.push(m);
      }
    });
    
    // Notify parent immediately for instant card color update
    onRefresh({ id: construction.id, manufacturing: updatedManufacturing });

    // Now save to database in background
    try {
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
            status: newStatus,
            updated_by: user?.id,
            updated_by_email: user?.email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('construction_manufacturing')
          .insert({
            construction_id: construction.id,
            stage,
            status: newStatus,
            updated_by: user?.id,
            updated_by_email: user?.email,
          });

        if (error) throw error;
      }
    } catch (error: any) {
      // Revert optimistic update on error
      if (stage === 'glass_installation') {
        setLocalGlassStatus(isGlassInstalled ? 'complete' : 'not_started');
      } else if (stage === 'assembly') {
        setLocalAssemblyStatus(isAssembled ? 'complete' : 'not_started');
      }
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      // Trigger full refresh to restore correct state
      onRefresh();
    }
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

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Error", description: "Please select a PDF file", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "File must be less than 10MB", variant: "destructive" });
      return;
    }

    setUploadingPdf(true);
    try {
      const fileExt = 'pdf';
      const fileName = `${construction.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('construction-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('order_constructions')
        .update({ pdf_file_path: filePath })
        .eq('id', construction.id);

      if (updateError) throw updateError;

      toast({ title: "PDF uploaded" });
      onRefresh();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [viewingPdf, setViewingPdf] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);

  const handleViewPdf = async () => {
    if (!construction.pdf_file_path || viewingPdf) return;

    setViewingPdf(true);

    // Extract file path if it's a full URL
    let filePath = construction.pdf_file_path;
    if (filePath.includes('/')) {
      const parts = filePath.split('/');
      filePath = parts[parts.length - 1];
    }

    const { data, error } = await supabase.storage
      .from('construction-pdfs')
      .createSignedUrl(filePath, 3600);

    if (data?.signedUrl) {
      setPdfSignedUrl(data.signedUrl);
      setPdfDialogOpen(true);
    } else {
      toast({ title: "Error", description: error?.message || "Could not load PDF", variant: "destructive" });
    }

    setViewingPdf(false);
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
              className={`flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                isGlassInstalled 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {isGlassInstalled ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
              Glass
            </button>
            <button
              onClick={() => updateManufacturingStage('assembly', isAssembled ? 'not_started' : 'complete')}
              className={`flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                isAssembled 
                  ? 'bg-green-500 text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {isAssembled ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
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

      {/* PDF Quick Access */}
      <div className="flex gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfUpload}
          className="hidden"
        />
        {construction.pdf_file_path ? (
          <button
            onClick={handleViewPdf}
            disabled={viewingPdf}
            className="flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center gap-1 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            {viewingPdf ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Eye className="h-2.5 w-2.5" />}
            {viewingPdf ? 'Opening...' : 'View PDF'}
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf}
            className="flex-1 h-6 rounded text-[10px] font-medium flex items-center justify-center gap-1 bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            {uploadingPdf ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Upload className="h-2.5 w-2.5" />
            )}
            {uploadingPdf ? 'Uploading...' : 'Upload PDF'}
          </button>
        )}
        {construction.pdf_file_path && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf}
            className="h-6 w-6 rounded text-[10px] flex items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
            title="Replace PDF"
          >
            {uploadingPdf ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5" />}
          </button>
        )}
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

      {/* PDF Viewer Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="text-sm">
              {getTypePrefix(construction.construction_type)}{construction.construction_number} — PDF
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfSignedUrl && (
              <iframe
                src={pdfSignedUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
