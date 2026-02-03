import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// Types
export type TicketStatusV2 = 'new' | 'in_progress' | 'waiting_customer' | 'escalated' | 'closed';
export type TicketCategory = 'billing' | 'booking' | 'ops' | 'damage' | 'website_bug' | 'general';
export type TicketPriority = 'low' | 'medium' | 'high';
export type MessageType = 'customer_visible' | 'internal_note';
export type SenderType = 'customer' | 'staff' | 'system';

export interface SupportTicketV2 {
  id: string;
  ticket_id: string;
  status: TicketStatusV2;
  category: TicketCategory;
  priority: TicketPriority;
  is_urgent: boolean;
  assigned_to: string | null;
  customer_id: string | null;
  booking_id: string | null;
  incident_id: string | null;
  damage_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_name: string | null;
  subject: string;
  description: string;
  resolution_note: string | null;
  escalation_note: string | null;
  escalated_at: string | null;
  escalated_by: string | null;
  first_response_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string;
  created_by_type: string;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: { id: string; full_name: string | null; email: string | null; phone: string | null };
  booking?: { id: string; booking_code: string };
  assignee?: { id: string; full_name: string | null; email: string | null };
  incident?: { id: string; incident_type: string; severity: string };
  damage?: { id: string; severity: string; location_on_vehicle: string; description: string; photo_urls: string[] };
  last_message?: { message: string; created_at: string; sender_type: string };
  message_count?: number;
}

export interface TicketMessageV2 {
  id: string;
  ticket_id: string;
  message: string;
  message_type: MessageType;
  sender_id: string;
  sender_type: SenderType;
  macro_id: string | null;
  created_at: string;
  sender?: { full_name: string | null; email: string | null };
}

export interface TicketAuditLog {
  id: string;
  ticket_id: string;
  action: string;
  performed_by: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
  performer?: { full_name: string | null; email: string | null };
}

export interface SupportMacro {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: Array<{ name: string; label: string }>;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface TicketFiltersV2 {
  status?: TicketStatusV2 | 'all';
  category?: TicketCategory | 'all';
  priority?: TicketPriority | 'all';
  urgent?: boolean;
  assignedTo?: string | 'all' | 'unassigned';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Queue counts for sidebar
export function useTicketQueueCounts() {
  return useQuery({
    queryKey: ["ticket-queue-counts-v2"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("support_tickets_v2") as any)
        .select("status, is_urgent");

      if (error) throw error;

      const counts = {
        new: 0,
        in_progress: 0,
        waiting_customer: 0,
        escalated: 0,
        closed: 0,
        urgent: 0,
        total: data.length,
      };

      data.forEach((t: any) => {
        counts[t.status as TicketStatusV2]++;
        if (t.is_urgent) counts.urgent++;
      });

      return counts;
    },
    staleTime: 30000,
  });
}

// Fetch tickets with filters
export function useSupportTicketsV2(filters: TicketFiltersV2 = {}) {
  return useQuery({
    queryKey: ["support-tickets-v2", filters],
    queryFn: async () => {
      let query = (supabase
        .from("support_tickets_v2") as any)
        .select(`*`)
        .order("is_urgent", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters.category && filters.category !== 'all') {
        query = query.eq("category", filters.category);
      }
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq("priority", filters.priority);
      }
      if (filters.urgent) {
        query = query.eq("is_urgent", true);
      }
      if (filters.assignedTo && filters.assignedTo !== 'all') {
        if (filters.assignedTo === 'unassigned') {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", filters.assignedTo);
        }
      }
      if (filters.search) {
        query = query.or(`ticket_id.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,guest_email.ilike.%${filters.search}%,guest_phone.ilike.%${filters.search}%`);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      // Fetch related data
      const customerIds = [...new Set((data || []).filter((t: any) => t.customer_id).map((t: any) => t.customer_id))] as string[];
      const assigneeIds = [...new Set((data || []).filter((t: any) => t.assigned_to).map((t: any) => t.assigned_to))] as string[];
      const bookingIds = [...new Set((data || []).filter((t: any) => t.booking_id).map((t: any) => t.booking_id))] as string[];

      const [customersRes, assigneesRes, bookingsRes, messagesRes] = await Promise.all([
        customerIds.length > 0
          ? supabase.from("profiles").select("id, full_name, email, phone").in("id", customerIds)
          : { data: [] },
        assigneeIds.length > 0
          ? supabase.from("profiles").select("id, full_name, email").in("id", assigneeIds)
          : { data: [] },
        bookingIds.length > 0
          ? supabase.from("bookings").select("id, booking_code").in("id", bookingIds)
          : { data: [] },
        (supabase
          .from("ticket_messages_v2") as any)
          .select("ticket_id, message, created_at, sender_type")
          .in("ticket_id", (data || []).map((t: any) => t.id))
          .order("created_at", { ascending: false }),
      ]);

      const customerMap = new Map((customersRes.data || []).map(c => [c.id, c]));
      const assigneeMap = new Map((assigneesRes.data || []).map(a => [a.id, a]));
      const bookingMap = new Map((bookingsRes.data || []).map(b => [b.id, b]));
      
      const lastMessageMap = new Map<string, { message: string; created_at: string; sender_type: string }>();
      const messageCountMap = new Map<string, number>();
      (messagesRes.data || []).forEach((m: any) => {
        messageCountMap.set(m.ticket_id, (messageCountMap.get(m.ticket_id) || 0) + 1);
        if (!lastMessageMap.has(m.ticket_id)) {
          lastMessageMap.set(m.ticket_id, m);
        }
      });

      return (data || []).map((t: any) => ({
        ...t,
        customer: customerMap.get(t.customer_id),
        assignee: assigneeMap.get(t.assigned_to),
        booking: bookingMap.get(t.booking_id),
        last_message: lastMessageMap.get(t.id),
        message_count: messageCountMap.get(t.id) || 0,
      })) as SupportTicketV2[];
    },
    staleTime: 30000,
  });
}

// Fetch single ticket with all details
export function useSupportTicketById(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-ticket-v2", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;

      const { data, error } = await (supabase
        .from("support_tickets_v2") as any)
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch related data
      const [customerRes, assigneeRes, bookingRes, incidentRes, damageRes, messagesRes, auditRes] = await Promise.all([
        data.customer_id
          ? supabase.from("profiles").select("id, full_name, email, phone").eq("id", data.customer_id).maybeSingle()
          : { data: null },
        data.assigned_to
          ? supabase.from("profiles").select("id, full_name, email").eq("id", data.assigned_to).maybeSingle()
          : { data: null },
        data.booking_id
          ? supabase.from("bookings").select("id, booking_code, start_at, end_at, status").eq("id", data.booking_id).maybeSingle()
          : { data: null },
        data.incident_id
          ? (supabase.from("incident_cases") as any).select("id, incident_type, severity, status").eq("id", data.incident_id).maybeSingle()
          : { data: null },
        data.damage_id
          ? supabase.from("damage_reports").select("id, severity, location_on_vehicle, description, photo_urls").eq("id", data.damage_id).maybeSingle()
          : { data: null },
        (supabase
          .from("ticket_messages_v2") as any)
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true }),
        (supabase
          .from("ticket_audit_log") as any)
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true }),
      ]);

      // Get sender profiles for messages
      const senderIds = [...new Set((messagesRes.data || []).map((m: any) => m.sender_id))] as string[];
      const performerIds = [...new Set((auditRes.data || []).map((a: any) => a.performed_by))] as string[];
      const allUserIds = [...new Set([...senderIds, ...performerIds])];
      
      const profilesRes = allUserIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", allUserIds)
        : { data: [] };
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      return {
        ...data,
        customer: customerRes.data,
        assignee: assigneeRes.data,
        booking: bookingRes.data,
        incident: incidentRes.data,
        damage: damageRes.data ? {
          id: damageRes.data.id,
          severity: damageRes.data.severity,
          location_on_vehicle: damageRes.data.location_on_vehicle,
          description: damageRes.data.description,
          photo_urls: Array.isArray(damageRes.data.photo_urls) ? damageRes.data.photo_urls : [],
        } : null,
        messages: (messagesRes.data || []).map((m: any) => ({
          ...m,
          sender: profileMap.get(m.sender_id),
        })) as TicketMessageV2[],
        audit_log: (auditRes.data || []).map((a: any) => ({
          ...a,
          performer: profileMap.get(a.performed_by),
        })) as TicketAuditLog[],
      };
    },
    enabled: !!ticketId,
  });
}

// Create new ticket
export function useCreateTicketV2() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      subject: string;
      description: string;
      category?: TicketCategory;
      priority?: TicketPriority;
      is_urgent?: boolean;
      customer_id?: string;
      booking_id?: string;
      incident_id?: string;
      guest_email?: string;
      guest_phone?: string;
      guest_name?: string;
      created_by_type?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const insertData = {
        subject: params.subject,
        description: params.description,
        category: params.category || 'general',
        priority: params.priority || 'medium',
        is_urgent: params.is_urgent || false,
        customer_id: params.customer_id || null,
        booking_id: params.booking_id || null,
        incident_id: params.incident_id || null,
        guest_email: params.guest_email || null,
        guest_phone: params.guest_phone || null,
        guest_name: params.guest_name || null,
        created_by: user.id,
        created_by_type: params.created_by_type || 'support',
      };

      const { data, error } = await (supabase
        .from("support_tickets_v2") as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Add initial message if description provided
      if (params.description) {
        await (supabase.from("ticket_messages_v2") as any).insert({
          ticket_id: data.id,
          message: params.description,
          message_type: 'customer_visible',
          sender_id: user.id,
          sender_type: params.created_by_type === 'customer' ? 'customer' : 'staff',
        });
      }

      // Add audit log
      await (supabase.from("ticket_audit_log") as any).insert({
        ticket_id: data.id,
        action: 'created',
        performed_by: user.id,
        new_value: { status: data.status, category: data.category, priority: data.priority },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });
      toast.success("Ticket created");
    },
    onError: (error) => {
      console.error("Failed to create ticket:", error);
      toast.error("Failed to create ticket");
    },
  });
}

// Update ticket
export function useUpdateTicketV2() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportTicketV2> & { id: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Get current ticket for audit
      const { data: current } = await (supabase
        .from("support_tickets_v2") as any)
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await (supabase
        .from("support_tickets_v2") as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Determine audit action
      let action = 'updated';
      if (updates.status && updates.status !== current?.status) {
        action = 'status_changed';
      }
      if (updates.assigned_to !== undefined && updates.assigned_to !== current?.assigned_to) {
        action = current?.assigned_to ? 'reassigned' : 'assigned';
      }
      if (updates.escalation_note) {
        action = 'escalated';
      }

      // Add audit log
      await (supabase.from("ticket_audit_log") as any).insert({
        ticket_id: id,
        action,
        performed_by: user.id,
        old_value: { status: current?.status, assigned_to: current?.assigned_to },
        new_value: updates,
        note: updates.resolution_note || updates.escalation_note || undefined,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });
      toast.success("Ticket updated");
    },
    onError: (error) => {
      console.error("Failed to update ticket:", error);
      toast.error("Failed to update ticket");
    },
  });
}

// Send message
export function useSendMessageV2() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      message,
      messageType = 'customer_visible',
      macroId,
    }: {
      ticketId: string;
      message: string;
      messageType?: MessageType;
      macroId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase
        .from("ticket_messages_v2") as any)
        .insert({
          ticket_id: ticketId,
          message,
          message_type: messageType,
          sender_id: user.id,
          sender_type: 'staff',
          macro_id: macroId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket status if needed
      await (supabase
        .from("support_tickets_v2") as any)
        .update({
          updated_at: new Date().toISOString(),
          status: 'in_progress',
        })
        .eq("id", ticketId)
        .eq("status", "new");

      // Add audit log
      await (supabase.from("ticket_audit_log") as any).insert({
        ticket_id: ticketId,
        action: messageType === 'internal_note' ? 'internal_note_added' : 'reply_sent',
        performed_by: user.id,
        note: messageType === 'internal_note' ? 'Internal note added' : 'Customer-visible reply sent',
      });

      // Update macro usage count if used
      if (macroId) {
        // Get current count and increment
        const { data: macroData } = await (supabase
          .from("support_macros") as any)
          .select("usage_count")
          .eq("id", macroId)
          .single();
        
        if (macroData) {
          await (supabase
            .from("support_macros") as any)
            .update({ usage_count: (macroData.usage_count || 0) + 1 })
            .eq("id", macroId);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });
      toast.success(variables.messageType === 'internal_note' ? "Note added" : "Reply sent");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    },
  });
}

// Escalate ticket
export function useEscalateTicketV2() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, note }: { ticketId: string; note: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase
        .from("support_tickets_v2") as any)
        .update({
          status: 'escalated',
          escalation_note: note,
          escalated_at: new Date().toISOString(),
          escalated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;

      // Create admin alert
      await supabase.from("admin_alerts").insert({
        alert_type: 'customer_issue',
        title: 'Ticket Escalated',
        message: `Ticket ${data.ticket_id} escalated: ${note}`,
        booking_id: data.booking_id,
        status: 'pending',
      });

      // Add audit log
      await (supabase.from("ticket_audit_log") as any).insert({
        ticket_id: ticketId,
        action: 'escalated',
        performed_by: user.id,
        new_value: { status: 'escalated' },
        note,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });
      toast.success("Ticket escalated");
    },
    onError: (error) => {
      console.error("Failed to escalate ticket:", error);
      toast.error("Failed to escalate ticket");
    },
  });
}

// Close ticket
export function useCloseTicketV2() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, resolutionNote }: { ticketId: string; resolutionNote: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase
        .from("support_tickets_v2") as any)
        .update({
          status: 'closed',
          resolution_note: resolutionNote,
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;

      // Add audit log
      await (supabase.from("ticket_audit_log") as any).insert({
        ticket_id: ticketId,
        action: 'closed',
        performed_by: user.id,
        new_value: { status: 'closed' },
        note: resolutionNote,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets-v2"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-v2", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-queue-counts-v2"] });
      toast.success("Ticket closed");
    },
    onError: (error) => {
      console.error("Failed to close ticket:", error);
      toast.error("Failed to close ticket");
    },
  });
}

// Fetch macros
export function useSupportMacros(category?: string) {
  return useQuery({
    queryKey: ["support-macros", category],
    queryFn: async () => {
      let query = (supabase
        .from("support_macros") as any)
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false });

      if (category && category !== 'all') {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        variables: Array.isArray(m.variables) ? m.variables : [],
      })) as SupportMacro[];
    },
    staleTime: 60000,
  });
}

// Support Analytics
export function useSupportAnalytics(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ["support-analytics-v2", dateRange],
    queryFn: async () => {
      let query = (supabase.from("support_tickets_v2") as any).select("*");

      if (dateRange?.from) {
        query = query.gte("created_at", dateRange.from);
      }
      if (dateRange?.to) {
        query = query.lte("created_at", dateRange.to);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tickets = data || [];
      
      // Calculate KPIs
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => ['new', 'in_progress', 'waiting_customer', 'escalated'].includes(t.status)).length;
      const escalatedCount = tickets.filter(t => t.status === 'escalated').length;
      const urgentCount = tickets.filter(t => t.is_urgent).length;

      // Calculate avg response time (only for tickets with first_response_at)
      const withResponse = tickets.filter(t => t.first_response_at);
      const avgFirstResponseMs = withResponse.length > 0
        ? withResponse.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime();
            const response = new Date(t.first_response_at!).getTime();
            return sum + (response - created);
          }, 0) / withResponse.length
        : 0;
      const avgFirstResponseMins = Math.round(avgFirstResponseMs / 60000);

      // Calculate avg resolution time (only for closed tickets)
      const closedTickets = tickets.filter(t => t.status === 'closed' && t.closed_at);
      const avgResolutionMs = closedTickets.length > 0
        ? closedTickets.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime();
            const closed = new Date(t.closed_at!).getTime();
            return sum + (closed - created);
          }, 0) / closedTickets.length
        : 0;
      const avgResolutionHours = Math.round(avgResolutionMs / 3600000);

      // Tickets by category
      const byCategory = tickets.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Tickets by status
      const byStatus = tickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Tickets by priority
      const byPriority = tickets.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Aging tickets (open for more than 24h, 48h, 7d)
      const now = Date.now();
      const aging24h = tickets.filter(t => 
        ['new', 'in_progress', 'waiting_customer'].includes(t.status) &&
        (now - new Date(t.created_at).getTime()) > 24 * 3600000
      ).length;
      const aging48h = tickets.filter(t => 
        ['new', 'in_progress', 'waiting_customer'].includes(t.status) &&
        (now - new Date(t.created_at).getTime()) > 48 * 3600000
      ).length;
      const aging7d = tickets.filter(t => 
        ['new', 'in_progress', 'waiting_customer'].includes(t.status) &&
        (now - new Date(t.created_at).getTime()) > 7 * 24 * 3600000
      ).length;

      // Unassigned tickets
      const unassigned = tickets.filter(t => 
        !t.assigned_to && ['new', 'in_progress'].includes(t.status)
      ).length;

      return {
        kpis: {
          totalTickets,
          openTickets,
          escalatedCount,
          urgentCount,
          avgFirstResponseMins,
          avgResolutionHours,
        },
        byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
        operational: {
          aging24h,
          aging48h,
          aging7d,
          unassigned,
        },
      };
    },
    staleTime: 60000,
  });
}

// Create ticket from incident (for damage linking)
export function useCreateTicketFromIncident() {
  const createTicket = useCreateTicketV2();

  return useMutation({
    mutationFn: async ({
      incidentId,
      bookingId,
      customerId,
      incidentType,
      severity,
    }: {
      incidentId: string;
      bookingId?: string;
      customerId?: string;
      incidentType: string;
      severity: string;
    }) => {
      const priorityMap: Record<string, TicketPriority> = {
        minor: 'low',
        moderate: 'medium',
        major: 'high',
      };

      return createTicket.mutateAsync({
        subject: `Damage Report: ${incidentType}`,
        description: `A ${severity} incident has been reported and requires follow-up with the customer.`,
        category: 'damage',
        priority: priorityMap[severity] || 'high',
        is_urgent: severity === 'major',
        customer_id: customerId,
        booking_id: bookingId,
        incident_id: incidentId,
        created_by_type: 'system',
      });
    },
  });
}
