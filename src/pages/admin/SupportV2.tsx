import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
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
  type SupportTicketV2,
} from "@/hooks/use-support-v2";
import { useAuth } from "@/hooks/use-auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  History,
  AlertCircle,
  AlertTriangle,
  Flame,
  RefreshCw,
  Plus,
  FileText,
  Phone,
  Mail,
  ArrowUpRight,
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

export default function SupportV2Page() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  const queueFilter = searchParams.get("queue") as TicketStatusV2 | "urgent" | "all" || "all";

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [macroPopoverOpen, setMacroPopoverOpen] = useState(false);

  // Form state
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(true); // Default to internal
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
  const { data: queueCounts } = useTicketQueueCounts();
  const { data: tickets, isLoading, refetch } = useSupportTicketsV2({
    status: statusFilter as TicketStatusV2 | "all",
    category: categoryFilter,
    priority: priorityFilter,
    urgent: urgentOnly,
    assignedTo: assignedFilter,
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

  const handleQueueChange = (queue: string) => {
    const params = new URLSearchParams();
    if (queue !== "all") {
      params.set("queue", queue);
    }
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
    if (!newTicketForm.guest_email && !newTicketForm.guest_phone) {
      toast.error("Either email or phone is required");
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
    // Replace variables with placeholders
    let content = macro.content;
    if (selectedTicket) {
      content = content
        .replace(/\{customer_name\}/g, selectedTicket.customer?.full_name || selectedTicket.guest_name || "Customer")
        .replace(/\{booking_code\}/g, selectedTicket.booking?.booking_code || "[BOOKING_CODE]")
        .replace(/\{return_time\}/g, "[RETURN_TIME]")
        .replace(/\{pickup_time\}/g, "[PICKUP_TIME]")
        .replace(/\{location\}/g, "[LOCATION]");
    }
    setReplyMessage(content);
    setIsInternalNote(false); // Macros are typically customer-visible
    setMacroPopoverOpen(false);
  };

  // Queue sidebar items
  const queueItems = [
    { key: "all", label: "All Tickets", count: queueCounts?.total || 0, icon: MessageSquare },
    { key: "new", label: "New", count: queueCounts?.new || 0, icon: AlertCircle },
    { key: "in_progress", label: "In Progress", count: queueCounts?.in_progress || 0, icon: Play },
    { key: "waiting_customer", label: "Waiting", count: queueCounts?.waiting_customer || 0, icon: HelpCircle },
    { key: "escalated", label: "Escalated", count: queueCounts?.escalated || 0, icon: AlertTriangle },
    { key: "urgent", label: "Urgent", count: queueCounts?.urgent || 0, icon: Flame },
    { key: "closed", label: "Closed", count: queueCounts?.closed || 0, icon: CheckCircle },
  ];

  return (
    <AdminShell>
      <div className="flex h-[calc(100vh-100px)]">
        {/* Queue Sidebar */}
        <div className="w-48 border-r pr-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Queues</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {queueItems.map((item) => {
              const Icon = item.icon;
              const isActive = queueFilter === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleQueueChange(item.key)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                  <Badge variant={isActive ? "secondary" : "outline"} className="h-5 text-xs">
                    {item.count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col pl-4 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket ID, subject, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh tickets</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Ticket List */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full overflow-auto">
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
            {selectedTicket && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {CATEGORY_LABELS[selectedTicket.category]}
                </span>
                <Badge variant="outline" className={PRIORITY_CONFIG[selectedTicket.priority]?.className}>
                  {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
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
              {/* Customer/Booking Info */}
              <div className="px-4 py-2 border-b bg-muted/30 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {selectedTicket.customer?.full_name || selectedTicket.guest_name || "Guest"}
                  </span>
                  {(selectedTicket.customer?.email || selectedTicket.guest_email) && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedTicket.customer?.email || selectedTicket.guest_email}
                    </span>
                  )}
                  {(selectedTicket.customer?.phone || selectedTicket.guest_phone) && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedTicket.customer?.phone || selectedTicket.guest_phone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {selectedTicket.booking && (
                    <Link
                      to={`/admin/bookings/${selectedTicket.booking_id}/ops`}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Booking: {selectedTicket.booking.booking_code}
                    </Link>
                  )}
                  {selectedTicket.incident && (
                    <Link
                      to={`/admin/incidents?id=${selectedTicket.incident_id}`}
                      className="flex items-center gap-1 text-sm text-destructive hover:underline"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Incident: {selectedTicket.incident.incident_type}
                    </Link>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-4 py-2 border-b flex flex-wrap gap-2">
                {!selectedTicket.assigned_to && (
                  <Button size="sm" variant="outline" onClick={handleAssignToMe}>
                    <UserPlus className="w-3 h-3 mr-1" /> Assign to me
                  </Button>
                )}
                {selectedTicket.status === "new" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange("in_progress")}>
                    <Play className="w-3 h-3 mr-1" /> Start
                  </Button>
                )}
                {["new", "in_progress"].includes(selectedTicket.status) && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange("waiting_customer")}>
                    <HelpCircle className="w-3 h-3 mr-1" /> Wait Customer
                  </Button>
                )}
                {selectedTicket.status !== "escalated" && selectedTicket.status !== "closed" && (
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => setEscalateDialogOpen(true)}>
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Escalate
                  </Button>
                )}
                {selectedTicket.status !== "closed" && (
                  <Button size="sm" onClick={() => setCloseDialogOpen(true)}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Close
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-4 mt-2 bg-muted/50 w-fit">
                  <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">
                    <History className="w-3 h-3 mr-1" /> History
                  </TabsTrigger>
                </TabsList>

                {/* Messages Tab */}
                <TabsContent value="messages" className="flex-1 overflow-hidden m-0 p-0">
                  <ScrollArea className="flex-1 p-4 h-[300px]">
                    <div className="space-y-3">
                      {selectedTicket.messages?.map((message) => {
                        const isInternal = message.message_type === "internal_note";
                        const isStaff = message.sender_type === "staff";
                        
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-2",
                              isStaff && "flex-row-reverse"
                            )}
                          >
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "text-xs",
                                  isInternal
                                    ? "bg-amber-500/20 text-amber-600"
                                    : isStaff
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                              >
                                {isStaff ? "S" : "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn("flex-1 max-w-[80%]", isStaff && "text-right")}>
                              {isInternal && (
                                <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                                  <EyeOff className="h-3 w-3" />
                                  Internal Note
                                </div>
                              )}
                              <div
                                className={cn(
                                  "rounded-xl px-3 py-2 inline-block text-left text-sm",
                                  isInternal
                                    ? "bg-amber-500/10 border border-amber-500/20"
                                    : isStaff
                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                    : "bg-muted rounded-tl-sm"
                                )}
                              >
                                <p className="whitespace-pre-wrap">{message.message}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {message.sender?.full_name || (isStaff ? "Staff" : "Customer")} •{" "}
                                {format(new Date(message.created_at), "MMM d, HH:mm")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="flex-1 overflow-hidden m-0 p-0">
                  <ScrollArea className="p-4 h-[300px]">
                    {!selectedTicket.audit_log?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No history yet</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedTicket.audit_log.map((entry) => (
                          <div key={entry.id} className="flex gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium capitalize">
                                {entry.action.replace(/_/g, " ")}
                              </p>
                              {entry.note && (
                                <p className="text-muted-foreground text-xs mt-0.5">{entry.note}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {entry.performer?.full_name || "System"} •{" "}
                                {format(new Date(entry.created_at), "MMM d, HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Reply Box */}
              <div className="p-3 border-t mt-auto">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="internal-toggle"
                      checked={!isInternalNote}
                      onCheckedChange={(checked) => setIsInternalNote(!checked)}
                    />
                    <Label htmlFor="internal-toggle" className="text-xs cursor-pointer">
                      {isInternalNote ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <EyeOff className="h-3 w-3" /> Internal Note
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-primary">
                          <Eye className="h-3 w-3" /> Customer Visible
                        </span>
                      )}
                    </Label>
                  </div>
                  <div className="flex-1" />
                  <Popover open={macroPopoverOpen} onOpenChange={setMacroPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Zap className="h-3 w-3" /> Macros
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="end">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Insert Macro</p>
                      <div className="space-y-1 max-h-48 overflow-auto">
                        {macros?.map((macro) => (
                          <button
                            key={macro.id}
                            onClick={() => handleInsertMacro(macro)}
                            className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
                          >
                            {macro.name}
                          </button>
                        ))}
                        {!macros?.length && (
                          <p className="text-xs text-muted-foreground py-2 text-center">No macros available</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Textarea
                  placeholder={isInternalNote ? "Add internal note (not visible to customer)..." : "Type your reply to the customer..."}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className={cn(
                    "min-h-[60px] resize-none text-sm",
                    isInternalNote && "border-amber-500/30 focus-visible:ring-amber-500"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) {
                      handleSendReply();
                    }
                  }}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">⌘+Enter to send</span>
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sendMessage.isPending}
                    className={isInternalNote ? "bg-amber-600 hover:bg-amber-700" : ""}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    {sendMessage.isPending ? "Sending..." : isInternalNote ? "Add Note" : "Send Reply"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a new ticket on behalf of a customer or for internal tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                id="urgent-toggle"
                checked={newTicketForm.is_urgent}
                onCheckedChange={(checked) => setNewTicketForm({ ...newTicketForm, is_urgent: checked })}
              />
              <Label htmlFor="urgent-toggle" className="text-sm">Mark as Urgent</Label>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief description of the issue"
                value={newTicketForm.subject}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Detailed description..."
                value={newTicketForm.description}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newTicketForm.guest_email}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, guest_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={newTicketForm.guest_phone}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, guest_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                placeholder="John Doe"
                value={newTicketForm.guest_name}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, guest_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
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
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Escalate Ticket
            </DialogTitle>
            <DialogDescription>
              This will notify Ops/Admin and mark the ticket as escalated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Escalation Reason *</Label>
              <Textarea
                placeholder="Why is this ticket being escalated?"
                value={escalationNote}
                onChange={(e) => setEscalationNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEscalate}
              disabled={!escalationNote.trim() || escalateTicket.isPending}
            >
              {escalateTicket.isPending ? "Escalating..." : "Escalate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Ticket</DialogTitle>
            <DialogDescription>
              Provide a resolution summary. This will be visible in the ticket history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resolution Note *</Label>
              <Textarea
                placeholder="How was this issue resolved?"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleClose}
              disabled={!resolutionNote.trim() || closeTicket.isPending}
            >
              {closeTicket.isPending ? "Closing..." : "Close Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

// Ticket Row Component
function TicketRow({
  ticket,
  onClick,
  isSelected,
}: {
  ticket: SupportTicketV2;
  onClick: () => void;
  isSelected: boolean;
}) {
  const statusConfig = STATUS_CONFIG[ticket.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
        isSelected && "bg-muted"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-xs text-muted-foreground">{ticket.ticket_id}</code>
            {ticket.is_urgent && (
              <Flame className="h-3.5 w-3.5 text-red-500" />
            )}
            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[ticket.category]}
            </Badge>
          </div>
          <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.customer?.full_name || ticket.guest_name || ticket.guest_email || "Guest"}
            </span>
            {ticket.booking && (
              <code className="bg-muted px-1 py-0.5 rounded">
                {ticket.booking.booking_code}
              </code>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
            </span>
            {ticket.message_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket.message_count}
              </span>
            )}
          </div>
        </div>
        {ticket.assignee && (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary/10">
              {ticket.assignee.full_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
