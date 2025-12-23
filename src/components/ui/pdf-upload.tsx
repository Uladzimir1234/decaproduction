import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PdfUploadProps {
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  folder?: string;
  disabled?: boolean;
}

const extractFilePath = (value: string): string | null => {
  if (!value) return null;
  
  try {
    // Check if it's a full URL
    if (value.includes('construction-pdfs')) {
      const match = value.match(/construction-pdfs\/(.+)/);
      if (match) return match[1];
    }
    // Otherwise assume it's already a path
    return value;
  } catch {
    return value;
  }
};

export function PdfUpload({ value, onChange, folder = "", disabled = false }: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!value) {
        setSignedUrl(null);
        setFileName(null);
        return;
      }

      setLoadingUrl(true);
      const filePath = extractFilePath(value);
      
      if (!filePath) {
        setLoadingUrl(false);
        return;
      }

      // Extract filename from path
      const name = filePath.split('/').pop() || 'document.pdf';
      setFileName(name);

      try {
        const { data, error } = await supabase.storage
          .from('construction-pdfs')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) {
          console.error('Error getting signed URL:', error);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setSignedUrl(null);
      }
      setLoadingUrl(false);
    };

    getSignedUrl();
  }, [value]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "PDF file must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from('construction-pdfs')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      onChange(filePath);
      toast({
        title: "PDF uploaded",
        description: "Manufacturing details PDF has been attached",
      });
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    const filePath = extractFilePath(value);
    if (!filePath) return;

    try {
      const { error } = await supabase.storage
        .from('construction-pdfs')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      onChange(null);
      setSignedUrl(null);
      setFileName(null);
      toast({
        title: "PDF removed",
        description: "Manufacturing details PDF has been removed",
      });
    } catch (error: any) {
      console.error('Error removing PDF:', error);
      toast({
        title: "Remove failed",
        description: error.message || "Failed to remove PDF",
        variant: "destructive",
      });
    }
  };

  const handleViewPdf = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  if (loadingUrl) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading PDF...</span>
      </div>
    );
  }

  if (value && signedUrl) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
        <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName || 'document.pdf'}</p>
          <p className="text-xs text-muted-foreground">PDF Document</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewPdf}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View
          </Button>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="application/pdf"
        className="hidden"
        disabled={disabled || uploading}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="w-full justify-start gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload Manufacturing PDF
          </>
        )}
      </Button>
    </div>
  );
}
