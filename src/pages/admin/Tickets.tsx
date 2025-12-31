import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useTickets, useTicketById, useUpdateTicketStatus, useSendTicketMessage } from "@/hooks/use-tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Search, 
  Send, 
  Clock,
  User,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];

const STATUS_STYLES: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
};

export default function AdminTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [hasBookingFilter, setHasBookingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: tickets, isLoading } = useTickets({
    status: statusFilter as TicketStatus | "all",
    hasBooking: hasBookingFilter === "all" ? null : hasBookingFilter === "yes",
    search: searchQuery || undefined,
  });
  const { data: selectedTicket, isLoading: isLoadingDetail } = useTicketById(selectedId);
  const updateStatus = useUpdateTicketStatus();
  const sendMessage = useSendTicketMessage();

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
    sendMessage.mutate({ ticketId: selectedId, message: replyMessage.trim() });
    setReplyMessage("");
  };

  const handleStatusChange = (status: TicketStatus) => {
    if (!selectedId) return;
    updateStatus.mutate({ ticketId: selectedId, status });
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-muted-foreground">Manage customer support requests</p>
          </div>
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
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
                  const statusStyle = STATUS_STYLES[ticket.status];
                  
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
                        <Button variant="ghost" size="sm">
                          Open
                        </Button>
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
        <SheetContent className="sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="text-left">
              {selectedTicket?.subject || "Ticket Details"}
            </SheetTitle>
            {selectedTicket && (
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline" className={STATUS_STYLES[selectedTicket.status as TicketStatus]?.className}>
                  {STATUS_STYLES[selectedTicket.status as TicketStatus]?.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  from {selectedTicket.profile?.full_name || selectedTicket.profile?.email || "Customer"}
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
                <div className="px-6 py-3 border-b bg-muted/50">
                  <Link 
                    to={`/admin/bookings?id=${selectedTicket.booking_id}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View linked booking: {selectedTicket.bookings.booking_code}
                  </Link>
                </div>
              )}

              {/* Messages Thread */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {selectedTicket.messages?.map((message) => (
                    <div 
                      key={message.id} 
                      className={cn(
                        "flex gap-3",
                        message.isStaff && "flex-row-reverse"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={message.isStaff ? "bg-primary text-primary-foreground" : "bg-muted"}>
                          {message.isStaff ? "S" : (message.sender?.fullName?.[0] || "C")}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "flex-1 max-w-[80%]",
                        message.isStaff && "text-right"
                      )}>
                        <div className={cn(
                          "rounded-2xl px-4 py-2 inline-block text-left",
                          message.isStaff 
                            ? "bg-primary text-primary-foreground rounded-tr-sm" 
                            : "bg-muted rounded-tl-sm"
                        )}>
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(message.createdAt), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Status Actions */}
              <div className="px-6 py-3 border-t bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Change status:</span>
                  {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedTicket.status === status ? "default" : "outline"}
                      onClick={() => handleStatusChange(status)}
                      disabled={updateStatus.isPending}
                      className="text-xs"
                    >
                      {STATUS_STYLES[status].label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.metaKey) {
                        handleSendReply();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    Press ⌘+Enter to send
                  </span>
                  <Button 
                    onClick={handleSendReply} 
                    disabled={!replyMessage.trim() || sendMessage.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}
