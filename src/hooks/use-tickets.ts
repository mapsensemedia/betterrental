import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./use-admin";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: string | null;
  userId: string;
  bookingId: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  user: {
    fullName: string | null;
    email: string | null;
  } | null;
  booking: {
    bookingCode: string;
  } | null;
  lastMessage: {
    message: string;
    createdAt: string;
    isStaff: boolean;
  } | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  sender: {
    fullName: string | null;
    email: string | null;
  } | null;
}

export interface TicketFilters {
  status?: TicketStatus | "all";
  hasBooking?: boolean | null;
  search?: string;
}

export function useTickets(filters: TicketFilters = {}) {
  return useQuery<Ticket[]>({
    queryKey: ["admin-tickets", filters],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          bookings (booking_code)
        `)
        .order("updated_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.hasBooking === true) {
        query = query.not("booking_id", "is", null);
      } else if (filters.hasBooking === false) {
        query = query.is("booking_id", null);
      }

      if (filters.search) {
        query = query.ilike("subject", `%${filters.search}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error("Error fetching tickets:", error);
        throw error;
      }

      // Fetch profiles
      const userIds = [...new Set((data || []).map(t => t.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Fetch last messages for each ticket
      const ticketIds = (data || []).map(t => t.id);
      const { data: messagesData } = await supabase
        .from("ticket_messages")
        .select("ticket_id, message, created_at, is_staff")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false });

      const lastMessageMap = new Map<string, { message: string; createdAt: string; isStaff: boolean }>();
      (messagesData || []).forEach(m => {
        if (!lastMessageMap.has(m.ticket_id)) {
          lastMessageMap.set(m.ticket_id, {
            message: m.message,
            createdAt: m.created_at,
            isStaff: m.is_staff || false,
          });
        }
      });

      return (data || []).map((t: any) => {
        const profile = profilesMap.get(t.user_id);
        return {
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          userId: t.user_id,
          bookingId: t.booking_id,
          assignedTo: t.assigned_to,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          user: profile ? {
            fullName: profile.full_name,
            email: profile.email,
          } : null,
          booking: t.bookings ? {
            bookingCode: t.bookings.booking_code,
          } : null,
          lastMessage: lastMessageMap.get(t.id) || null,
        };
      });
    },
    staleTime: 30000,
  });
}

export function useTicketById(id: string | null) {
  return useQuery({
    queryKey: ["admin-ticket", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          bookings (id, booking_code, start_at, end_at)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", data.user_id)
        .maybeSingle();

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      // Fetch sender profiles for messages
      const senderIds = [...new Set((messagesData || []).map(m => m.sender_id))];
      const { data: sendersData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds);

      const sendersMap = new Map((sendersData || []).map(s => [s.id, s]));

      const messages: TicketMessage[] = (messagesData || []).map(m => {
        const sender = sendersMap.get(m.sender_id);
        return {
          id: m.id,
          ticketId: m.ticket_id,
          senderId: m.sender_id,
          message: m.message,
          isStaff: m.is_staff || false,
          createdAt: m.created_at,
          sender: sender ? {
            fullName: sender.full_name,
            email: sender.email,
          } : null,
        };
      });

      return {
        ...data,
        profile: profileData,
        messages,
      };
    },
    enabled: !!id,
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const { data, error } = await supabase
        .from("tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;

      await logAction("ticket_status_change", "ticket", ticketId, { new_status: status });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket"] });
      toast.success("Ticket status updated");
    },
    onError: (error) => {
      console.error("Failed to update ticket:", error);
      toast.error("Failed to update ticket status");
    },
  });
}

export function useSendTicketMessage() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ ticketId, message, isStaff = true }: { ticketId: string; message: string; isStaff?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ticket_messages")
        .insert([{
          ticket_id: ticketId,
          sender_id: user.id,
          message,
          is_staff: isStaff,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update ticket updated_at and set to in_progress if open (only for staff)
      if (isStaff) {
        await supabase
          .from("tickets")
          .update({ 
            updated_at: new Date().toISOString(),
            status: "in_progress",
          })
          .eq("id", ticketId)
          .eq("status", "open");
      } else {
        await supabase
          .from("tickets")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      }

      await logAction("ticket_reply", "ticket", ticketId, { message_id: data.id });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ticket"] });
      queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["customer-ticket"] });
      toast.success("Message sent");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    },
  });
}

// Customer: Create a new ticket
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      subject, 
      message, 
      bookingId 
    }: { 
      subject: string; 
      message: string; 
      bookingId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          user_id: user.id,
          subject,
          booking_id: bookingId || null,
          status: "open",
          priority: "normal",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create first message
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message,
          is_staff: false,
        });

      if (messageError) throw messageError;

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Support ticket created");
    },
    onError: (error) => {
      console.error("Failed to create ticket:", error);
      toast.error("Failed to create ticket");
    },
  });
}

// Customer: Fetch their tickets
export function useCustomerTickets() {
  return useQuery({
    queryKey: ["customer-tickets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          bookings (booking_code)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch last message for each ticket
      const ticketIds = data.map(t => t.id);
      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("ticket_id, message, created_at, is_staff")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false });

      const lastMessageMap = new Map<string, { message: string; createdAt: string; isStaff: boolean }>();
      (messages || []).forEach(m => {
        if (!lastMessageMap.has(m.ticket_id)) {
          lastMessageMap.set(m.ticket_id, {
            message: m.message,
            createdAt: m.created_at,
            isStaff: m.is_staff || false,
          });
        }
      });

      return data.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        bookingId: t.booking_id,
        bookingCode: t.bookings?.booking_code || null,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        lastMessage: lastMessageMap.get(t.id) || null,
      }));
    },
  });
}

// Customer: Fetch a single ticket with messages
export function useCustomerTicketById(ticketId: string | null) {
  return useQuery({
    queryKey: ["customer-ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: ticket, error } = await supabase
        .from("tickets")
        .select(`*, bookings (booking_code)`)
        .eq("id", ticketId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!ticket) return null;

      // Fetch messages
      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      // Get sender names
      const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
      const { data: senders } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds);
      const senderMap = new Map(senders?.map(s => [s.id, s.full_name]) || []);

      return {
        ...ticket,
        bookingCode: ticket.bookings?.booking_code || null,
        messages: (messages || []).map(m => ({
          id: m.id,
          message: m.message,
          isStaff: m.is_staff || false,
          createdAt: m.created_at,
          senderName: senderMap.get(m.sender_id) || (m.is_staff ? "Support Team" : "You"),
        })),
      };
    },
    enabled: !!ticketId,
  });
}
