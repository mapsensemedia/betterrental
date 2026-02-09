/**
 * Support Panel - Tickets Page
 * 
 * Main ticket management interface for support agents
 */

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TicketBookingSummary } from "@/components/support/TicketBookingSummary";
import { SupportShell } from "@/components/layout/SupportShell";
import {
  useSupportTicketsV2,
  useSupportTicketById,
  useUpdateTicketV2,
  useSendMessageV2,
  useEscalateTicketV2,
  useCloseTicketV2,
  useCreateTicketV2,
  useSupportMacros,
  useTicketQueueCounts,
  type TicketStatusV2,
  type TicketCategory,
  type TicketPriority,
} from "@/hooks/use-support-v2";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  AlertCircle,
  AlertTriangle,
  Flame,
  RefreshCw,
  Plus,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Zap,
  Tag,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

// Status config
const STATUS_CONFIG: Record<TicketStatusV2, { label: string; icon: typeof Clock; className: string }> = {
  new: { label: "New", icon: AlertCircle, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  in_progress: { label: "In Progress", icon: Play, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  waiting_customer: { label: "Waiting", icon: HelpCircle, className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  escalated: { label: "Escalated", icon: AlertTriangle, className: "bg-red-500/10 text-red-600 border-red-500/20" },
  closed: { label: "Closed", icon: CheckCircle, className: "bg-muted text-muted-foreground border-border" },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: "Billing",
  booking: "Booking",
  ops: "Operations",
  damage: "Damage",
  website_bug: "Website Bug",
  general: "General",
  incident: "Incident",
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-600" },
  high: { label: "High", className: "bg-red-500/10 text-red-600" },
};

// Ticket row component
function TicketRow({
  ticket,
  onClick,
  isSelected,
}: {
  ticket: any;
  onClick: () => void;
  isSelected: boolean;
}) {
  const statusConfig = STATUS_CONFIG[ticket.status as TicketStatusV2] || STATUS_CONFIG.new;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        "p-4 cursor-pointer transition-colors border-l-4",
        isSelected ? "bg-primary/5 border-l-primary" : "hover:bg-muted/50 border-l-transparent"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {ticket.ticket_id}
            </code>
            {ticket.is_urgent && (
              <Badge variant="destructive" className="h-5 gap-1 text-xs">
                <Flame className="h-3 w-3" /> Urgent
              </Badge>
            )}
          </div>
          <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.customer?.full_name || ticket.guest_name || ticket.guest_email || "Unknown"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>
    </div>
  );
}

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  const queueFilter = (searchParams.get("queue") as TicketStatusV2 | "urgent" | "all") || "all";

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [macroPopoverOpen, setMacroPopoverOpen] = useState(false);

  // Form state
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [escalationNote, setEscalationNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    description: "",
    category: "general" as TicketCategory,
    priority: "medium" as TicketPriority,
    is_urgent: false,
    guest_email: "",
    guest_phone: "",
    guest_name: "",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine status filter from queue
  const statusFilter = queueFilter === "urgent" ? "all" : queueFilter;
  const urgentOnly = queueFilter === "urgent";

  // Queries
  const { data: tickets, isLoading, refetch } = useSupportTicketsV2({
    status: statusFilter as TicketStatusV2 | "all",
    category: categoryFilter,
    priority: priorityFilter,
    urgent: urgentOnly,
    search: searchQuery || undefined,
  });
  const { data: selectedTicket, isLoading: isLoadingDetail } = useSupportTicketById(selectedId);
  const { data: macros } = useSupportMacros(selectedTicket?.category);

  // Mutations
  const updateTicket = useUpdateTicketV2();
  const sendMessage = useSendMessageV2();
  const escalateTicket = useEscalateTicketV2();
  const closeTicket = useCloseTicketV2();
  const createTicket = useCreateTicketV2();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedTicket?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket?.messages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Tickets refreshed");
  };

  const openDetail = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("id", id);
    setSearchParams(params);
    setReplyMessage("");
    setIsInternalNote(true);
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("id");
    setSearchParams(params);
  };

  const handleSendReply = () => {
    if (!selectedId || !replyMessage.trim()) return;
    sendMessage.mutate(
      {
        ticketId: selectedId,
        message: replyMessage.trim(),
        messageType: isInternalNote ? "internal_note" : "customer_visible",
      },
      {
        onSuccess: () => {
          setReplyMessage("");
        },
      }
    );
  };

  const handleAssignToMe = () => {
    if (!selectedId || !user) return;
    updateTicket.mutate({
      id: selectedId,
      assigned_to: user.id,
      status: selectedTicket?.status === "new" ? "in_progress" : selectedTicket?.status,
    });
  };

  const handleStatusChange = (status: TicketStatusV2) => {
    if (!selectedId) return;
    if (status === "escalated") {
      setEscalateDialogOpen(true);
      return;
    }
    if (status === "closed") {
      setCloseDialogOpen(true);
      return;
    }
    updateTicket.mutate({ id: selectedId, status });
  };

  const handleEscalate = () => {
    if (!selectedId || !escalationNote.trim()) return;
    escalateTicket.mutate(
      { ticketId: selectedId, note: escalationNote.trim() },
      {
        onSuccess: () => {
          setEscalateDialogOpen(false);
          setEscalationNote("");
        },
      }
    );
  };

  const handleClose = () => {
    if (!selectedId || !resolutionNote.trim()) return;
    closeTicket.mutate(
      { ticketId: selectedId, resolutionNote: resolutionNote.trim() },
      {
        onSuccess: () => {
          setCloseDialogOpen(false);
          setResolutionNote("");
        },
      }
    );
  };

  const handleCreateTicket = () => {
    if (!newTicketForm.subject.trim() || !newTicketForm.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    createTicket.mutate(newTicketForm, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setNewTicketForm({
          subject: "",
          description: "",
          category: "general",
          priority: "medium",
          is_urgent: false,
          guest_email: "",
          guest_phone: "",
          guest_name: "",
        });
      },
    });
  };

  const handleInsertMacro = (macro: { content: string; id: string }) => {
    let content = macro.content;
    if (selectedTicket) {
      content = content
        .replace(/\{customer_name\}/g, selectedTicket.customer?.full_name || selectedTicket.guest_name || "Customer")
        .replace(/\{booking_code\}/g, selectedTicket.booking?.booking_code || "[BOOKING_CODE]");
    }
    setReplyMessage(content);
    setIsInternalNote(false);
    setMacroPopoverOpen(false);
  };

  return (
    <SupportShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Support Tickets</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Ticket
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, subject, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TicketCategory | "all")}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TicketPriority | "all")}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ticket List */}
        <Card className="overflow-hidden">
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
                {tickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => openDetail(ticket.id)}
                    isSelected={ticket.id === selectedId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent className="sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="p-4 pb-3 border-b">
            <div className="flex items-start justify-between">
              <div>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded mb-1 inline-block">
                  {selectedTicket?.ticket_id}
                </code>
                <SheetTitle className="text-left text-base">
                  {selectedTicket?.subject || "Ticket Details"}
                </SheetTitle>
              </div>
              {selectedTicket && (
                <div className="flex items-center gap-2">
                  {selectedTicket.is_urgent && (
                    <Badge variant="destructive" className="gap-1">
                      <Flame className="h-3 w-3" /> Urgent
                    </Badge>
                  )}
                  <Badge variant="outline" className={STATUS_CONFIG[selectedTicket.status]?.className}>
                    {STATUS_CONFIG[selectedTicket.status]?.label}
                  </Badge>
                </div>
              )}
            </div>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-40" />
            </div>
          ) : selectedTicket ? (
            <>
              {/* Customer Info */}
              <div className="p-4 border-b bg-muted/30 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {selectedTicket.customer?.full_name || selectedTicket.guest_name || "Guest"}
                  </span>
                  {(selectedTicket.customer?.email || selectedTicket.guest_email) && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedTicket.customer?.email || selectedTicket.guest_email}
                    </span>
                  )}
                  {(selectedTicket.customer?.phone || selectedTicket.guest_phone) && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedTicket.customer?.phone || selectedTicket.guest_phone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{CATEGORY_LABELS[selectedTicket.category]}</Badge>
                  <Badge variant="outline" className={PRIORITY_CONFIG[selectedTicket.priority]?.className}>
                    {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                  </Badge>
                </div>
              </div>

              {/* Booking Summary Card */}
              {selectedTicket.booking_id && (
                <div className="px-4 py-3 border-b">
                  <TicketBookingSummary bookingId={selectedTicket.booking_id} />
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedTicket.messages?.map((msg: any) => {
                    const isStaff = msg.sender_type === "staff";
                    const isInternal = msg.message_type === "internal_note";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          isStaff && "flex-row-reverse"
                        )}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {isStaff ? "S" : "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                            isStaff
                              ? isInternal
                                ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800"
                                : "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {isInternal && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mb-1">
                              <EyeOff className="h-3 w-3" />
                              Internal Note
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Actions */}
              {selectedTicket.status !== "closed" && (
                <div className="p-4 border-t space-y-3">
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!selectedTicket.assigned_to && (
                      <Button size="sm" variant="outline" onClick={handleAssignToMe}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Assign to me
                      </Button>
                    )}
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(v) => handleStatusChange(v as TicketStatusV2)}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {macros && macros.length > 0 && (
                      <Popover open={macroPopoverOpen} onOpenChange={setMacroPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Zap className="h-3.5 w-3.5 mr-1" />
                            Macros
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2">
                          <div className="space-y-1">
                            {macros.map((macro) => (
                              <Button
                                key={macro.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => handleInsertMacro(macro)}
                              >
                                {macro.name}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {/* Reply Form */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="internal-note"
                        checked={isInternalNote}
                        onCheckedChange={setIsInternalNote}
                      />
                      <Label htmlFor="internal-note" className="text-sm flex items-center gap-1">
                        {isInternalNote ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Internal Note
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Customer Reply
                          </>
                        )}
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder={isInternalNote ? "Add internal note..." : "Reply to customer..."}
                        className="min-h-[60px] resize-none"
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyMessage.trim() || sendMessage.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
            <DialogDescription>Create a new support ticket on behalf of a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Guest Name</Label>
              <Input
                value={newTicketForm.guest_name}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, guest_name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newTicketForm.guest_email}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, guest_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newTicketForm.guest_phone}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, guest_phone: e.target.value })}
                  placeholder="+1 555 0123"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={newTicketForm.subject}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                placeholder="Brief description of the issue"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTicketForm.description}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                placeholder="Full details of the issue..."
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newTicketForm.category}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, category: v as TicketCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTicketForm.priority}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, priority: v as TicketPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="urgent"
                checked={newTicketForm.is_urgent}
                onCheckedChange={(v) => setNewTicketForm({ ...newTicketForm, is_urgent: v })}
              />
              <Label htmlFor="urgent" className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-destructive" />
                Mark as Urgent
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={createTicket.isPending}>
              {createTicket.isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Ticket</DialogTitle>
            <DialogDescription>Provide a reason for escalating this ticket.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={escalationNote}
            onChange={(e) => setEscalationNote(e.target.value)}
            placeholder="Escalation reason..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEscalate} disabled={!escalationNote.trim() || escalateTicket.isPending}>
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Ticket</DialogTitle>
            <DialogDescription>Provide a resolution summary for this ticket.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Resolution summary..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleClose} disabled={!resolutionNote.trim() || closeTicket.isPending}>
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupportShell>
  );
}
