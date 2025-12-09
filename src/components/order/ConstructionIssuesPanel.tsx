import { useState } from "react";
import { AlertTriangle, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ConstructionIssue {
  id: string;
  issue_type: string;
  description: string;
  status: string;
  created_by_email: string | null;
  resolved_by_email: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface ConstructionIssuesPanelProps {
  constructionId: string;
  issues: ConstructionIssue[];
  onIssuesChange: (issues: ConstructionIssue[]) => void;
  canEdit: boolean;
}

const ISSUE_TYPES = [
  { value: 'hardware', label: 'Hardware Missing' },
  { value: 'glass', label: 'Glass Issue' },
  { value: 'screen', label: 'Screen Issue' },
  { value: 'profile', label: 'Profile Issue' },
  { value: 'damage', label: 'Damage/Defect' },
  { value: 'other', label: 'Other' },
];

const ISSUE_TYPE_COLORS: Record<string, string> = {
  hardware: 'bg-orange-100 text-orange-800 border-orange-200',
  glass: 'bg-blue-100 text-blue-800 border-blue-200',
  screen: 'bg-purple-100 text-purple-800 border-purple-200',
  profile: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  damage: 'bg-red-100 text-red-800 border-red-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function ConstructionIssuesPanel({
  constructionId,
  issues,
  onIssuesChange,
  canEdit,
}: ConstructionIssuesPanelProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newIssueType, setNewIssueType] = useState<string>("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const openIssues = issues.filter(i => i.status === 'open');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');

  const handleAddIssue = async () => {
    if (!newIssueType || !newDescription.trim()) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('construction_issues')
      .insert({
        construction_id: constructionId,
        issue_type: newIssueType,
        description: newDescription.trim(),
        created_by: user?.id,
        created_by_email: user?.email,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      onIssuesChange([data, ...issues]);
      setNewIssueType("");
      setNewDescription("");
      setIsAdding(false);
      toast({ title: "Issue reported", description: "Issue has been logged for this construction" });
    }
    setSaving(false);
  };

  const handleResolveIssue = async (issueId: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('construction_issues')
      .update({
        status: 'resolved',
        resolved_by: user?.id,
        resolved_by_email: user?.email,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', issueId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onIssuesChange(issues.map(i => 
        i.id === issueId 
          ? { ...i, status: 'resolved', resolved_by_email: user?.email || null, resolved_at: new Date().toISOString() }
          : i
      ));
      toast({ title: "Issue resolved" });
    }
  };

  const handleReopenIssue = async (issueId: string) => {
    const { error } = await supabase
      .from('construction_issues')
      .update({
        status: 'open',
        resolved_by: null,
        resolved_by_email: null,
        resolved_at: null,
      })
      .eq('id', issueId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onIssuesChange(issues.map(i => 
        i.id === issueId 
          ? { ...i, status: 'open', resolved_by_email: null, resolved_at: null }
          : i
      ));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Issues ({openIssues.length} open)
        </h3>
        {canEdit && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Report Issue
          </Button>
        )}
      </div>

      {/* Add new issue form */}
      {isAdding && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
          <Select value={newIssueType} onValueChange={setNewIssueType}>
            <SelectTrigger>
              <SelectValue placeholder="Select issue type..." />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Describe the issue (e.g., 'Missing tilt-turn handle, need size 35mm')"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddIssue} disabled={!newIssueType || !newDescription.trim() || saving}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Report
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewIssueType(""); setNewDescription(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Open issues */}
      {openIssues.length > 0 && (
        <div className="space-y-2">
          {openIssues.map(issue => (
            <div key={issue.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={ISSUE_TYPE_COLORS[issue.issue_type]}>
                      {ISSUE_TYPES.find(t => t.value === issue.issue_type)?.label || issue.issue_type}
                    </Badge>
                  </div>
                  <p className="text-sm">{issue.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Reported by {issue.created_by_email?.split('@')[0]} • {format(new Date(issue.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleResolveIssue(issue.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved issues (collapsed) */}
      {resolvedIssues.length > 0 && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            {resolvedIssues.length} resolved issue{resolvedIssues.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {resolvedIssues.map(issue => (
              <div key={issue.id} className="bg-muted/50 rounded p-2 opacity-60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      ✓ {ISSUE_TYPES.find(t => t.value === issue.issue_type)?.label}
                    </Badge>
                    <p className="text-sm mt-1 line-through">{issue.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Resolved by {issue.resolved_by_email?.split('@')[0]} • {issue.resolved_at && format(new Date(issue.resolved_at), 'MMM d')}
                    </p>
                  </div>
                  {canEdit && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleReopenIssue(issue.id)}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {issues.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground">No issues reported</p>
      )}
    </div>
  );
}
