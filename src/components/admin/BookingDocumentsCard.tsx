/**
 * Additional documents attached to a booking.
 *
 * Used by the handover "Additional Documents" step, the booking detail page and
 * the active rental page. Files are private; viewing goes through a short-lived
 * signed URL. Uploader names come only from `staff_assignments` (never profiles).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  FileImage,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useBookingDocuments,
  useUploadBookingDocument,
  useDeleteBookingDocument,
  getBookingDocumentUrl,
  ACCEPTED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  type BookingDocument,
} from "@/hooks/use-booking-documents";

interface BookingDocumentsCardProps {
  bookingId: string;
  /** Hide the upload form (read-only contexts). */
  allowUpload?: boolean;
  /** Render without the outer Card shell. */
  bare?: boolean;
  title?: string;
  description?: string;
}

function useUploaderNames(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))].sort();
  return useQuery({
    queryKey: ["doc-uploader-names", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_assignments")
        .select("user_id, display_name, is_active")
        .in("user_id", ids);
      const map = new Map<string, string>();
      for (const id of ids) {
        const row =
          (data ?? []).find((a) => a.user_id === id && a.is_active) ??
          (data ?? []).find((a) => a.user_id === id);
        map.set(id, row?.display_name || "Staff account");
      }
      return map;
    },
  });
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentRow({
  doc,
  uploaderName,
  onDelete,
  bookingCode,
}: {
  doc: BookingDocument;
  uploaderName?: string;
  onDelete?: () => void;
  bookingCode?: string | null;
}) {
  const [opening, setOpening] = useState(false);
  const isImage = (doc.mime_type || "").startsWith("image/");

  const open = async () => {
    setOpening(true);
    try {
      const url = await getBookingDocumentUrl(doc.storage_path);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open document");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        {isImage ? (
          <FileImage className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium truncate">{doc.label}</p>
          {bookingCode && (
            <Badge variant="outline" className="font-mono text-[10px]">
              {bookingCode}
            </Badge>
          )}
        </div>
        {doc.notes && <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>}
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {doc.file_name}
          {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {uploaderName ? `${uploaderName} · ` : ""}
          {format(new Date(doc.created_at), "MMM d, yyyy h:mm a")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={open} disabled={opening}>
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        </Button>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function BookingDocumentsCard({
  bookingId,
  allowUpload = true,
  bare = false,
  title = "Additional documents",
  description = "Extra paperwork provided by the customer or required before releasing the vehicle.",
}: BookingDocumentsCardProps) {
  const { data: documents, isLoading } = useBookingDocuments(bookingId);
  const upload = useUploadBookingDocument();
  const remove = useDeleteBookingDocument();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pendingDelete, setPendingDelete] = useState<BookingDocument | null>(null);

  const { data: uploaderNames } = useUploaderNames((documents ?? []).map((d) => d.uploaded_by || ""));

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_DOCUMENT_BYTES) {
        toast.error(`${file.name} is larger than 20MB`);
        continue;
      }
      accepted.push(file);
    }
    setFiles((prev) => [...prev, ...accepted]);
  };

  const handleUpload = async () => {
    if (!label.trim()) {
      toast.error("Enter a document label");
      return;
    }
    if (!files.length) {
      toast.error("Choose at least one file");
      return;
    }
    let ok = 0;
    for (const file of files) {
      try {
        await upload.mutateAsync({ bookingId, file, label, notes });
        ok += 1;
      } catch {
        /* toast handled in hook */
      }
    }
    if (ok > 0) {
      toast.success(ok === 1 ? "Document uploaded" : `${ok} documents uploaded`);
      setLabel("");
      setNotes("");
      setFiles([]);
      setShowForm(false);
    }
  };

  const body = (
    <>
      {allowUpload && (
        <div className="mb-4">
          {!showForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add document
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="space-y-1.5">
                <Label htmlFor="doc-label">Document label *</Label>
                <Input
                  id="doc-label"
                  placeholder="e.g. Passport, Employer letter, Utility bill"
                  value={label}
                  maxLength={120}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-notes">Notes (optional)</Label>
                <Textarea
                  id="doc-notes"
                  rows={2}
                  maxLength={1000}
                  placeholder="Any context worth recording"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-files">Files *</Label>
                <Input
                  id="doc-files"
                  type="file"
                  multiple
                  accept={ACCEPTED_DOCUMENT_TYPES}
                  onChange={(e) => {
                    pickFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Images or PDF, up to 20MB each. On phones and tablets you can take a photo.
                </p>
              </div>
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1 text-xs"
                    >
                      <span className="truncate">
                        {file.name} · {formatSize(file.size)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpload} disabled={upload.isPending}>
                  {upload.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setFiles([]);
                  }}
                  disabled={upload.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : !documents?.length ? (
        <p className="text-sm text-muted-foreground">No additional documents on file yet.</p>
      ) : (
        <div>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              uploaderName={doc.uploaded_by ? uploaderNames?.get(doc.uploaded_by) : undefined}
              onDelete={allowUpload ? () => setPendingDelete(doc) : undefined}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.label}" will be removed from this booking. The removal is recorded
              in the activity history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) {
                  remove.mutate({ documentId: pendingDelete.id, bookingId });
                }
                setPendingDelete(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (bare) return <div>{body}</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          {title}
          {documents?.length ? (
            <Badge variant="secondary" className="ml-1">
              {documents.length}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
