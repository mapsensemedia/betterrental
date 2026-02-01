import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useTickets, useTicketById, useUpdateTicketStatus, useSendTicketMessage } from "@/hooks/use-tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MessageSquare, 
  Search, 
  Send, 
  Clock,
  User,
  ExternalLink,
  UserPlus,
  Play,
  HelpCircle,
  CheckCircle,
  XCircle,
  FileText,
  History,
  Paperclip,
  AlertCircle,
  Upload,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { useUploadTicketAttachment, useDeleteTicketAttachment } from "@/hooks/use-ticket-attachments";

type TicketStatus = Database["public"]["Enums"]["ticket_status"] | "assigned" | "waiting_customer";

const STATUS_STYLES: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  open: { label: "New", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertCircle },
  assigned: { label: "Assigned", className: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: UserPlus },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Play },
  waiting_customer: { label: "Waiting Customer", className: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: HelpCircle },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

const STATUS_ORDER: TicketStatus[] = ["open", "assigned", "in_progress", "waiting_customer", "resolved", "closed"];

// Hook to fetch ticket timeline
function useTicketTimeline(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket-timeline", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_timeline")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      
      // Fetch user names
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email]) || []);
      
      return data.map(entry => ({
        ...entry,
        userName: profileMap.get(entry.user_id) || "Unknown",
      }));
    },
    enabled: !!ticketId,
  });
}

// Hook to fetch ticket attachments
function useTicketAttachments(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket-attachments", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_attachments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}

// Hook to resolve ticket
function useResolveTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ticketId, 
      resolutionSummary 
    }: { 
      ticketId: string; 
      resolutionSummary: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update ticket
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status: "resolved",
          resolution_summary: resolutionSummary,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Add timeline entry
      await supabase.from("ticket_timeline").insert({
        ticket_id: ticketId,
        user_id: user.id,
        action: "resolved",
        old_status: "in_progress",
        new_status: "resolved",
        note: resolutionSummary,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline"] });
      toast.success("Ticket resolved");
    },
    onError: (error: Error) => {
      toast.error("Failed to resolve ticket: " + error.message);
    },
  });
}

// Hook to add timeline entry
function useAddTimelineEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ticketId, 
      action,
      oldStatus,
      newStatus,
      note 
    }: { 
      ticketId: string; 
      action: string;
      oldStatus?: string;
      newStatus?: string;
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("ticket_timeline").insert({
        ticket_id: ticketId,
        user_id: user.id,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        note,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline"] });
    },
  });
}

export default function AdminTickets() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [hasBookingFilter, setHasBookingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentInternal, setAttachmentInternal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: tickets, isLoading, refetch } = useTickets({
    status: statusFilter as any,
    hasBooking: hasBookingFilter === "all" ? null : hasBookingFilter === "yes",
    search: searchQuery || undefined,
  });
  const { data: selectedTicket, isLoading: isLoadingDetail } = useTicketById(selectedId);
  const { data: timeline } = useTicketTimeline(selectedId);
  const { data: attachments } = useTicketAttachments(selectedId);
  const updateStatus = useUpdateTicketStatus();
  const sendMessage = useSendTicketMessage();
  const resolveTicket = useResolveTicket();
  const addTimeline = useAddTimelineEntry();
  const uploadAttachment = useUploadTicketAttachment();
  const deleteAttachment = useDeleteTicketAttachment();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Tickets refreshed");
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    
    setUploadingAttachment(true);
    try {
      await uploadAttachment.mutateAsync({
        ticketId: selectedId,
        file,
        isInternal: attachmentInternal,
      });
      addTimeline.mutate({
        ticketId: selectedId,
        action: "attachment_added",
        note: `Added ${attachmentInternal ? "internal " : ""}attachment: ${file.name}`,
      });
    } finally {
      setUploadingAttachment(false);
      e.target.value = "";
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedTicket?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket?.messages]);

  const openDetail = (id: string) => {
    setSearchParams({ id });
    setReplyMessage("");
  };

  const closeDetail = () => {
    setSearchParams({});
  };

  const handleSendReply = () => {
    if (!selectedId || !replyMessage.trim()) return;
    sendMessage.mutate(
      { ticketId: selectedId, message: replyMessage.trim(), isStaff: true },
      {
        onSuccess: () => {
          setReplyMessage("");
          addTimeline.mutate({
            ticketId: selectedId,
            action: "reply_sent",
            note: "Staff replied to ticket",
          });
        },
      }
    );
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedId || !selectedTicket) return;
    
    // Check if trying to close without resolution - require resolved status first
    if (status === "closed") {
      if (selectedTicket.status !== "resolved") {
        toast.error("Ticket must be resolved before closing. Click 'Resolve' first.");
        return;
      }
    }
    
    const oldStatus = selectedTicket.status;
    
    // Add timeline entry
    await addTimeline.mutateAsync({
      ticketId: selectedId,
      action: "status_changed",
      oldStatus,
      newStatus: status,
    });
    
    updateStatus.mutate({ ticketId: selectedId, status: status as any });
  };

  const handleResolve = () => {
    if (!selectedId || !resolutionSummary.trim()) return;
    
    const hasProof = (attachments?.length || 0) > 0 || (selectedTicket?.messages?.length || 0) > 1;
    if (!hasProof) {
      toast.error("At least one proof item (attachment or reply) is required");
      return;
    }
    
    resolveTicket.mutate(
      { ticketId: selectedId, resolutionSummary: resolutionSummary.trim() },
      {
        onSuccess: () => {
          setResolveDialogOpen(false);
          setResolutionSummary("");
        },
      }
    );
  };

  const handleQuickAction = (action: string) => {
    if (!selectedId || !selectedTicket) return;
    
    const oldStatus = selectedTicket.status;
    
    switch (action) {
      case "assign":
        updateStatus.mutate({ ticketId: selectedId, status: "assigned" as any });
        addTimeline.mutate({ ticketId: selectedId, action: "assigned", oldStatus, newStatus: "assigned" });
        break;
      case "start":
        updateStatus.mutate({ ticketId: selectedId, status: "in_progress" as any });
        addTimeline.mutate({ ticketId: selectedId, action: "started", oldStatus, newStatus: "in_progress" });
        break;
      case "wait_customer":
        updateStatus.mutate({ ticketId: selectedId, status: "waiting_customer" as any });
        addTimeline.mutate({ ticketId: selectedId, action: "waiting_customer", oldStatus, newStatus: "waiting_customer", note: "Requested info from customer" });
        break;
      case "resolve":
        setResolveDialogOpen(true);
        break;
    }
  };

  const hasProof = (attachments?.length || 0) > 0 || (selectedTicket?.messages?.length || 0) > 1;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage customer support requests</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh tickets</TooltipContent>
          </Tooltip>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_STYLES[status]?.label || status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={hasBookingFilter} onValueChange={setHasBookingFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Booking Link" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="yes">With Booking</SelectItem>
              <SelectItem value="no">Without Booking</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ticket List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !tickets?.length ? (
              <div className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No tickets found.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets.map((ticket) => {
                  const statusStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
                  const StatusIcon = statusStyle.icon;
                  
                  return (
                    <div 
                      key={ticket.id} 
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => openDetail(ticket.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{ticket.subject}</h3>
                            <Badge variant="outline" className={statusStyle.className}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusStyle.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.user?.fullName || ticket.user?.email || "Customer"}
                            </span>
                            {ticket.booking && (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {ticket.booking.bookingCode}
                              </code>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                          {ticket.lastMessage && (
                            <p className="text-sm text-muted-foreground mt-2 truncate">
                              {ticket.lastMessage.isStaff && <span className="font-medium">You: </span>}
                              {ticket.lastMessage.message}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">Open</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent className="sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="p-4 pb-3 border-b">
            <SheetTitle className="text-left text-base">
              {selectedTicket?.subject || "Ticket Details"}
            </SheetTitle>
            {selectedTicket && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className={STATUS_STYLES[selectedTicket.status as TicketStatus]?.className}>
                  {STATUS_STYLES[selectedTicket.status as TicketStatus]?.label || selectedTicket.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedTicket.profile?.full_name || selectedTicket.profile?.email}
                </span>
              </div>
            )}
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : selectedTicket ? (
            <>
              {/* Booking Link */}
              {selectedTicket.bookings && (
                <div className="px-4 py-2 border-b bg-muted/50">
                  <Link 
                    to={`/admin/bookings/${selectedTicket.booking_id}/ops`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View booking: {selectedTicket.bookings.booking_code}
                  </Link>
                </div>
              )}

              {/* Quick Actions */}
              <div className="px-4 py-2 border-b bg-muted/30 flex flex-wrap gap-2">
                {selectedTicket.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction("assign")}>
                    <UserPlus className="w-3 h-3 mr-1" /> Assign
                  </Button>
                )}
                {(selectedTicket.status === "open" || selectedTicket.status === "assigned") && (
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction("start")}>
                    <Play className="w-3 h-3 mr-1" /> Start
                  </Button>
                )}
                {selectedTicket.status === "in_progress" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleQuickAction("wait_customer")}>
                      <HelpCircle className="w-3 h-3 mr-1" /> Wait Customer
                    </Button>
                    <Button size="sm" onClick={() => handleQuickAction("resolve")}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                    </Button>
                  </>
                )}
                {selectedTicket.status === "resolved" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange("closed")}>
                    <XCircle className="w-3 h-3 mr-1" /> Close
                  </Button>
                )}
              </div>

              <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-4 mt-2 bg-muted/50 w-fit">
                  <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">
                    <History className="w-3 h-3 mr-1" />Timeline
                  </TabsTrigger>
                  <TabsTrigger value="evidence" className="text-xs">
                    <Paperclip className="w-3 h-3 mr-1" />Evidence
                  </TabsTrigger>
                </TabsList>

                {/* Messages Tab */}
                <TabsContent value="messages" className="flex-1 overflow-hidden m-0 p-0">
                  <ScrollArea className="flex-1 p-4 h-[350px]">
                    <div className="space-y-3">
                      {selectedTicket.messages?.map((message) => (
                        <div 
                          key={message.id} 
                          className={cn("flex gap-2", message.isStaff && "flex-row-reverse")}
                        >
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className={cn("text-xs", message.isStaff ? "bg-primary text-primary-foreground" : "bg-muted")}>
                              {message.isStaff ? "S" : (message.sender?.fullName?.[0] || "C")}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("flex-1 max-w-[80%]", message.isStaff && "text-right")}>
                            <div className={cn(
                              "rounded-xl px-3 py-2 inline-block text-left text-sm",
                              message.isStaff 
                                ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                : "bg-muted rounded-tl-sm"
                            )}>
                              <p className="whitespace-pre-wrap">{message.message}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(message.createdAt), "MMM d, HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="flex-1 overflow-hidden m-0 p-0">
                  <ScrollArea className="p-4 h-[350px]">
                    {!timeline?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No timeline entries yet</p>
                    ) : (
                      <div className="space-y-3">
                        {timeline.map((entry) => (
                          <div key={entry.id} className="flex gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">
                                {entry.action.replace(/_/g, " ")}
                                {entry.old_status && entry.new_status && (
                                  <span className="font-normal text-muted-foreground">
                                    {" "}({entry.old_status} → {entry.new_status})
                                  </span>
                                )}
                              </p>
                              {entry.note && (
                                <p className="text-muted-foreground text-xs mt-0.5">{entry.note}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {entry.userName} • {format(new Date(entry.created_at), "MMM d, HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Evidence Tab */}
                <TabsContent value="evidence" className="flex-1 overflow-hidden m-0 p-0">
                  <ScrollArea className="p-4 h-[350px]">
                    <div className="space-y-4">
                      {/* Proof status */}
                      <div className={cn(
                        "p-3 rounded-lg border text-sm",
                        hasProof ? "bg-green-500/5 border-green-500/20" : "bg-amber-500/5 border-amber-500/20"
                      )}>
                        {hasProof ? (
                          <p className="text-green-600 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Proof requirements met ({attachments?.length || 0} attachments, {selectedTicket.messages?.length || 0} messages)
                          </p>
                        ) : (
                          <p className="text-amber-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Proof required before closing (add attachment or send reply)
                          </p>
                        )}
                      </div>

                      {/* Resolution summary */}
                      {selectedTicket.resolution_summary && (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Resolution Summary</p>
                          <p className="text-sm">{selectedTicket.resolution_summary}</p>
                        </div>
                      )}

                      {/* Upload attachment */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Add Attachment</p>
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                              {uploadingAttachment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {uploadingAttachment ? "Uploading..." : "Click to upload"}
                              </span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              onChange={handleAttachmentUpload}
                              disabled={uploadingAttachment}
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="internal-only"
                            checked={attachmentInternal}
                            onChange={(e) => setAttachmentInternal(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="internal-only" className="text-xs text-muted-foreground cursor-pointer">
                            Internal only (not visible to customer)
                          </Label>
                        </div>
                      </div>

                      {/* Attachments list */}
                      {attachments && attachments.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Attachments ({attachments.length})</p>
                          {attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm truncate flex-1">{att.file_name}</span>
                              {att.is_internal && (
                                <Badge variant="outline" className="text-xs">Internal</Badge>
                              )}
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteAttachment.mutate(att.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No attachments yet</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Reply Box */}
              <div className="p-3 border-t mt-auto">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.metaKey) {
                        handleSendReply();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">⌘+Enter to send</span>
                  <Button 
                    size="sm"
                    onClick={handleSendReply} 
                    disabled={!replyMessage.trim() || sendMessage.isPending}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    {sendMessage.isPending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Provide a resolution summary. This will be visible to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Describe how the issue was resolved..."
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              className="min-h-[100px]"
            />
            {!hasProof && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600">
                  At least one proof item (attachment or reply) is required to resolve.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={!resolutionSummary.trim() || !hasProof || resolveTicket.isPending}
            >
              {resolveTicket.isPending ? "Resolving..." : "Resolve Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
