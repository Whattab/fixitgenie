import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const MessagingContext = createContext(null);

// Internal constant — not exported so react-refresh stays happy
const CONVERSATION_SELECT = `
  id,
  request_id,
  homeowner_id,
  pro_id,
  created_at,
  last_message_at,
  homeowner_archived,
  pro_archived,
  homeowner:profiles!conversations_homeowner_id_fkey (
    id, name, avatar
  ),
  pro:profiles!conversations_pro_id_fkey (
    id, name, avatar
  ),
  service_request:service_requests!conversations_request_id_fkey (
    id, category, city_state, urgency, status
  )
`;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [conversations, setConversations] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Stable ref for the realtime channel — avoids stale closure problems
  const channelRef = useRef(null);

  // Derived: sum of all unread counts
  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  // -------------------------------------------------------------------------
  // fetchUnreadCounts — plain async function, not memoized to avoid
  // react-hooks/preserve-manual-memoization errors with the React Compiler.
  // Called only from within fetchConversations and the effect below.
  // -------------------------------------------------------------------------
  async function fetchUnreadCounts(uid, convIds) {
    if (!uid || !convIds.length) return;

    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .neq('sender_id', uid)
      .is('read_at', null);

    if (error) {
      console.error('[MessagingContext] fetchUnreadCounts error:', error);
      return;
    }

    const counts = (data ?? []).reduce((acc, row) => {
      acc[row.conversation_id] = (acc[row.conversation_id] ?? 0) + 1;
      return acc;
    }, {});

    setUnreadCounts(counts);
  }

  // -------------------------------------------------------------------------
  // fetchConversations — plain async function called from the effect
  // -------------------------------------------------------------------------
  async function fetchConversations(uid) {
    if (!uid) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .or(`homeowner_id.eq.${uid},pro_id.eq.${uid}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('[MessagingContext] fetchConversations error:', error);
      return;
    }

    setConversations(data ?? []);

    if (data && data.length > 0) {
      await fetchUnreadCounts(uid, data.map((c) => c.id));
    }
  }

  // -------------------------------------------------------------------------
  // Main effect: runs when userId changes (login / logout)
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Removed: avoid calling setState directly inside effect body.
    // Instead we guard on userId in all setters and skip work when null.

    if (!userId) {
      // Tear down channel on logout; state stays as-is until next login
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setConversations([]);
      setUnreadCounts({});
      return;
    }

    let cancelled = false;

    // Fetch conversations, then wire up realtime
    fetchConversations(userId).then(async () => {
      if (cancelled) return;

      // Re-fetch conversation IDs for the channel filter
      const { data: idRows } = await supabase
        .from('conversations')
        .select('id')
        .or(`homeowner_id.eq.${userId},pro_id.eq.${userId}`);

      if (cancelled) return;
      const convIds = (idRows ?? []).map((c) => c.id);

      // Remove any existing channel before creating a new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(`messaging:${userId}`);

      // Messages: server-side filters work only with simple equality, so we
      // subscribe to the full table and filter client-side.
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const msgConvId =
            payload.new?.conversation_id ?? payload.old?.conversation_id;
          if (!convIds.length || convIds.includes(msgConvId)) {
            fetchConversations(userId);
          }
        }
      );

      // Conversations: pick up new conversations or archive changes
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          const isOurs =
            payload.new?.homeowner_id === userId ||
            payload.new?.pro_id === userId ||
            payload.old?.homeowner_id === userId ||
            payload.old?.pro_id === userId;
          if (isOurs) {
            fetchConversations(userId);
          }
        }
      );

      channel.subscribe();

      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -------------------------------------------------------------------------
  // last_seen_at heartbeat — updates every 60 s while tab is visible.
  // The Edge Function uses this to decide whether to skip emailing the user.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    async function pingLastSeen() {
      if (document.visibilityState !== 'visible') return;
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) {
        console.warn('[MessagingContext] last_seen_at heartbeat error:', error);
      }
    }

    // Fire immediately on mount / login
    pingLastSeen();

    const intervalId = setInterval(pingLastSeen, 60_000);

    // Pause/resume based on tab visibility
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        pingLastSeen();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  // -------------------------------------------------------------------------
  // getOrCreateConversation
  // -------------------------------------------------------------------------
  async function getOrCreateConversation({ requestId, homeownerId, proId }) {
    // 1. Look for existing
    const { data: existing, error: selectError } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('request_id', requestId)
      .eq('homeowner_id', homeownerId)
      .eq('pro_id', proId)
      .maybeSingle();

    if (selectError) {
      console.error('[MessagingContext] getOrCreateConversation select error:', selectError);
      return { data: null, error: selectError };
    }

    if (existing) return { data: existing, error: null };

    // 2. Insert new
    const { data: inserted, error: insertError } = await supabase
      .from('conversations')
      .insert([{ request_id: requestId, homeowner_id: homeownerId, pro_id: proId }])
      .select(CONVERSATION_SELECT)
      .single();

    if (insertError) {
      console.error('[MessagingContext] getOrCreateConversation insert error:', insertError);
      return { data: null, error: insertError };
    }

    if (userId) fetchConversations(userId);
    return { data: inserted, error: null };
  }

  // -------------------------------------------------------------------------
  // sendMessage
  // -------------------------------------------------------------------------
  async function sendMessage({ conversationId, body, attachmentUrl = null, kind = 'text' }) {
    if (!userId) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: userId,
          kind,
          body: body ?? null,
          attachment_url: attachmentUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[MessagingContext] sendMessage error:', error);
    }

    return { data, error };
  }

  // -------------------------------------------------------------------------
  // markConversationRead
  // -------------------------------------------------------------------------
  async function markConversationRead(conversationId) {
    if (!userId) return;

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('[MessagingContext] markConversationRead error:', error);
      return;
    }

    setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
  }

  // -------------------------------------------------------------------------
  // archiveConversation
  // -------------------------------------------------------------------------
  async function archiveConversation(conversationId) {
    if (!userId) return;

    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    const field = conv.homeowner_id === userId ? 'homeowner_archived' : 'pro_archived';

    const { error } = await supabase
      .from('conversations')
      .update({ [field]: true })
      .eq('id', conversationId);

    if (error) {
      console.error('[MessagingContext] archiveConversation error:', error);
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, [field]: true } : c))
    );
  }

  // -------------------------------------------------------------------------
  // uploadAttachment
  // -------------------------------------------------------------------------
  async function uploadAttachment({ conversationId, messageId, file }) {
    const path = `${conversationId}/${messageId}/${file.name}`;

    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file, { upsert: false });

    if (error) {
      console.error('[MessagingContext] uploadAttachment error:', error);
      return { path: null, error };
    }

    return { path, error: null };
  }

  // -------------------------------------------------------------------------
  // softDeleteMessage — sets deleted_at; storage file is retained
  // -------------------------------------------------------------------------
  async function softDeleteMessage(messageId) {
    if (!userId) return { error: new Error('Not authenticated'), wasDeleted: false };

    // Use .select() so we can check how many rows were actually updated.
    // If sender_id doesn't match (non-sender calling this), Supabase updates
    // 0 rows and returns an empty array — no error, but wasDeleted = false.
    const { data, error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId) // belt-and-suspenders; RLS also enforces this
      .select('id');

    if (error) {
      console.error('[MessagingContext] softDeleteMessage error:', error);
      return { error, wasDeleted: false };
    }

    const wasDeleted = Array.isArray(data) && data.length > 0;
    return { error: null, wasDeleted };
  }

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------
  const value = {
    conversations,
    unreadCounts,
    totalUnread,
    getOrCreateConversation,
    sendMessage,
    markConversationRead,
    archiveConversation,
    uploadAttachment,
    softDeleteMessage,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook — exported alongside the provider (same pattern as AuthContext.jsx and
// ServiceContext.jsx; the react-refresh/only-export-components warning is a
// pre-existing project-wide issue, not introduced here).
// ---------------------------------------------------------------------------
export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};
