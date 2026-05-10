import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import ImageLightbox from './ImageLightbox';
import ReviewModal from './ReviewModal';
import ContactInfoModal from './ContactInfoModal';
import { acceptBid, declineBid, markRequestComplete } from '../lib/jobActions';
import {
  Send, Paperclip, X, MapPin, Clock, AlertTriangle,
  CheckCheck, Lock, ChevronLeft, Image as ImageIcon, Trash2,
  CheckCircle, XCircle, Phone, Star,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** Strip EXIF by re-encoding through an offscreen canvas. Returns a Blob. */
async function stripExif(file) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const map = {
    open:      { bg: 'rgba(59,130,246,0.2)', color: '#60a5fa', label: 'Open' },
    assigned:  { bg: 'rgba(168,85,247,0.2)', color: '#c084fc', label: 'Assigned' },
    completed: { bg: 'rgba(34,197,94,0.2)',  color: '#4ade80', label: 'Completed' },
    pending:   { bg: 'rgba(251,191,36,0.2)', color: '#fbbf24', label: 'Pending' },
    accepted:  { bg: 'rgba(34,197,94,0.2)',  color: '#4ade80', label: 'Accepted' },
    rejected:  { bg: 'rgba(239,68,68,0.2)',  color: '#f87171', label: 'Rejected' },
  };
  const s = map[status] ?? { bg: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)', label: status };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.color}`,
      borderRadius: '999px', padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Signed-URL image helper (fetches on mount)
// Accepts optional onClick so a parent can open a lightbox.
// ---------------------------------------------------------------------------
function SecureImage({ storagePath, alt, onClick }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!storagePath) return;
    supabase.storage
      .from('chat-attachments')
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) { setErr(true); return; }
        setSrc(data.signedUrl);
      });
  }, [storagePath]);

  if (err) return (
    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <ImageIcon size={14} /> Image unavailable
    </span>
  );
  if (!src) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading image…</span>;
  return (
    <img
      src={src}
      alt={alt || 'Attachment'}
      onClick={onClick ? () => onClick(src) : undefined}
      style={{
        maxWidth: '240px', maxHeight: '240px', borderRadius: '8px',
        objectFit: 'cover', display: 'block',
        cursor: onClick ? 'zoom-in' : undefined,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ConversationThread({ conversation, onBack }) {
  const { user } = useAuth();
  const { sendMessage, markConversationRead, uploadAttachment, softDeleteMessage } = useMessaging();

  // Derived from props — must be declared before any useState that references them
  const isHomeowner = conversation.homeowner_id === user?.id;
  const otherParty = isHomeowner ? conversation.pro : conversation.homeowner;
  const sr = conversation.service_request;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState(null);
  const [frozen, setFrozen] = useState(false);
  const [frozenReason, setFrozenReason] = useState('');
  const [text, setText] = useState('');
  const [pickedFile, setPickedFile] = useState(null);  // { file, previewUrl }
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Per-message hover / confirm-delete state: { [msgId]: 'idle' | 'confirm' }
  const [msgUiState, setMsgUiState] = useState({});

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const channelRef = useRef(null);

  // Banner action state — sr is defined above so this is safe
  const [srStatus, setSrStatus] = useState(sr?.status ?? 'open');

  // ReviewModal state
  const [reviewOpen, setReviewOpen] = useState(false);

  // ContactInfoModal state
  const [contactOpen, setContactOpen] = useState(false);
  // 'homeowner' = pro viewing homeowner info; 'pro' = homeowner viewing pro info
  const [contactMode, setContactMode] = useState('pro');

  // -------------------------------------------------------------------------
  // Fetch messages
  // -------------------------------------------------------------------------
  async function fetchMessages() {
    // NOTE: we do NOT filter out deleted_at rows — we render them as placeholders.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (error) { console.error('[ConversationThread] fetchMessages error:', error); return; }
    setMessages(data ?? []);
    setLoading(false);
  }

  // -------------------------------------------------------------------------
  // Fetch bid state to determine frozen/active
  // -------------------------------------------------------------------------
  async function fetchBidState() {
    if (!sr?.id) { setFrozen(true); setFrozenReason('Service request no longer exists — this thread is read-only.'); return; }

    const { data, error } = await supabase
      .from('bids')
      .select('id, status, price_estimate')
      .eq('request_id', sr.id)
      .eq('pro_id', conversation.pro_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) { console.error('[ConversationThread] fetchBidState error:', error); return; }

    if (!data) {
      setFrozen(true);
      setFrozenReason('No bid found for this conversation — thread is read-only.');
      return;
    }

    setBid(data);
    setSrStatus(sr?.status ?? 'open'); // keep in sync with conversation prop

    if (data.status === 'rejected') {
      setFrozen(true);
      setFrozenReason('This bid was rejected — read-only.');
    } else if (sr.status === 'completed') {
      setFrozen(true);
      setFrozenReason('Job marked completed — archived 30 days after job completion — read-only.');
    } else {
      setFrozen(false);
      setFrozenReason('');
    }
  }

  // -------------------------------------------------------------------------
  // Re-fetch bid + request status after a banner action so the UI updates
  // -------------------------------------------------------------------------
  async function refreshBannerState() {
    if (!sr?.id) return;

    const [{ data: bidData }, { data: reqData }] = await Promise.all([
      supabase
        .from('bids')
        .select('id, status, price_estimate')
        .eq('request_id', sr.id)
        .eq('pro_id', conversation.pro_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('service_requests')
        .select('status')
        .eq('id', sr.id)
        .maybeSingle(),
    ]);

    if (bidData) {
      setBid(bidData);
      const newSrStatus = reqData?.status ?? srStatus;
      setSrStatus(newSrStatus);

      if (bidData.status === 'rejected') {
        setFrozen(true);
        setFrozenReason('This bid was rejected — read-only.');
      } else if (newSrStatus === 'completed') {
        setFrozen(true);
        setFrozenReason('Job marked completed — archived 30 days after job completion — read-only.');
      } else {
        setFrozen(false);
        setFrozenReason('');
      }
    }

    // Also re-fetch messages so the system message from the trigger appears
    fetchMessages();
  }

  // -------------------------------------------------------------------------
  // Mount / cleanup
  // -------------------------------------------------------------------------
  useEffect(() => {
    setLoading(true);
    fetchMessages();
    fetchBidState();

    // Mark as read immediately
    markConversationRead(conversation.id);

    // Realtime subscription for this specific thread
    const channel = supabase
      .channel(`thread:${conversation.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, () => {
        fetchMessages();
        markConversationRead(conversation.id);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -------------------------------------------------------------------------
  // Soft-delete helpers
  // -------------------------------------------------------------------------
  const showTrash = useCallback((msgId) => {
    setMsgUiState((prev) => ({ ...prev, [msgId]: prev[msgId] === 'confirm' ? 'confirm' : 'hover' }));
  }, []);

  const hideTrash = useCallback((msgId) => {
    setMsgUiState((prev) => {
      if (prev[msgId] === 'confirm') return prev; // keep confirm visible
      return { ...prev, [msgId]: 'idle' };
    });
  }, []);

  const askConfirm = useCallback((msgId) => {
    setMsgUiState((prev) => ({ ...prev, [msgId]: 'confirm' }));
  }, []);

  const cancelDelete = useCallback((msgId) => {
    setMsgUiState((prev) => ({ ...prev, [msgId]: 'idle' }));
  }, []);

  const confirmDelete = useCallback(async (msgId) => {
    setMsgUiState((prev) => ({ ...prev, [msgId]: 'idle' }));
    const { wasDeleted } = await softDeleteMessage(msgId);
    if (wasDeleted) {
      // Optimistic UI: mark deleted locally right away (realtime will confirm)
      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m)
      );
    } else {
      // Not the sender — update was a no-op. Re-fetch to restore real state.
      console.warn('[ConversationThread] softDelete: not the sender or already deleted — skipping.');
      fetchMessages();
    }
  }, [softDeleteMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Send handler
  // -------------------------------------------------------------------------
  async function handleSend(e) {
    e.preventDefault();
    if (frozen || sending) return;
    if (!text.trim() && !pickedFile) return;

    setSending(true);
    setSendError('');

    try {
      let attachmentUrl = null;
      let kind = 'text';

      if (pickedFile) {
        // Generate a temporary message ID placeholder to build storage path
        const tempMsgId = crypto.randomUUID();
        const stripped = await stripExif(pickedFile.file);

        const { path, error: upErr } = await uploadAttachment({
          conversationId: conversation.id,
          messageId: tempMsgId,
          file: stripped,
        });

        if (upErr) throw upErr;
        attachmentUrl = path;
        kind = 'image';

        // Send with the storage path; body can be the caption or null
        await sendMessage({
          conversationId: conversation.id,
          body: text.trim() || null,
          attachmentUrl,
          kind,
        });
      } else {
        await sendMessage({
          conversationId: conversation.id,
          body: text.trim(),
          attachmentUrl: null,
          kind: 'text',
        });
      }

      setText('');
      setPickedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // fetchMessages will be triggered by the realtime subscription
    } catch (err) {
      console.error('[ConversationThread] send error:', err);
      setSendError(err.message || 'Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  }

  // -------------------------------------------------------------------------
  // File picker
  // -------------------------------------------------------------------------
  function handleFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(heic|heif)$/i)) {
      setSendError('Only JPEG, PNG, or HEIC images are supported.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      setSendError('Image must be under 5 MB.');
      e.target.value = '';
      return;
    }
    setSendError('');
    const previewUrl = URL.createObjectURL(file);
    setPickedFile({ file, previewUrl });
  }

  function clearFile() {
    if (pickedFile?.previewUrl) URL.revokeObjectURL(pickedFile.previewUrl);
    setPickedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // -------------------------------------------------------------------------
  // Find the last read message sent by me (for "Seen" receipt)
  // -------------------------------------------------------------------------
  const lastReadByOther = [...messages]
    .reverse()
    .find((m) => m.sender_id === user?.id && m.read_at);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Mobile back button ── */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'none', border: 'none', color: 'var(--color-primary-light)',
            padding: '0.75rem 1rem', fontSize: '0.9rem', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <ChevronLeft size={18} /> Back to Inbox
        </button>
      )}

      {/* ── Job-context banner ── */}
      {sr && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0.75rem 1rem',
          flexShrink: 0,
        }}>
          {/* Top row: meta chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <span style={{
              background: 'var(--color-primary-dark)', color: '#fff',
              borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 700,
            }}>
              {sr.category}
            </span>
            {sr.city_state && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <MapPin size={12} /> {sr.city_state}
              </span>
            )}
            {sr.urgency && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Clock size={12} /> {sr.urgency}
              </span>
            )}
            <StatusBadge status={srStatus} />
            {bid && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>·</span>
                <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>
                  ${bid.price_estimate}
                </span>
                <StatusBadge status={bid.status} />
              </>
            )}
          </div>

          {/* Second row: other party */}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: bid ? '0.65rem' : 0 }}>
            Conversation with <strong style={{ color: 'var(--text-main)' }}>{otherParty?.name ?? 'Unknown'}</strong>
          </div>

          {/* ── Action buttons row ── */}
          {bid && (() => {
            const btnBase = {
              border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            };
            const mutedNote = (text) => (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{text}</span>
            );

            if (isHomeowner) {
              if (bid.status === 'pending') {
                return (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      style={{ ...btnBase, background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }}
                      onClick={async () => {
                        if (!confirm('Accept this quote? The professional will receive your contact information.')) return;
                        const { success, error } = await acceptBid({ bidId: bid.id, requestId: sr.id });
                        if (success) {
                          await refreshBannerState();
                        } else {
                          alert('Failed to accept bid: ' + error);
                        }
                      }}
                    >
                      <CheckCircle size={14} /> Accept Quote
                    </button>
                    <button
                      style={{ ...btnBase, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
                      onClick={async () => {
                        if (!confirm('Decline this bid? The conversation will become read-only.')) return;
                        const { success, error } = await declineBid({ bidId: bid.id });
                        if (success) {
                          await refreshBannerState();
                        } else {
                          alert('Failed to decline bid: ' + error);
                        }
                      }}
                    >
                      <XCircle size={14} /> Decline
                    </button>
                  </div>
                );
              }

              if (bid.status === 'accepted') {
                return (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      style={{ ...btnBase, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' }}
                      onClick={() => { setContactMode('pro'); setContactOpen(true); }}
                    >
                      <Phone size={14} /> View Pro Contact
                    </button>
                    {srStatus === 'assigned' && (
                      <button
                        style={{ ...btnBase, background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }}
                        onClick={async () => {
                          if (!confirm('Mark this job as complete?')) return;
                          const { success, error } = await markRequestComplete({ requestId: sr.id });
                          if (success) {
                            await refreshBannerState();
                          } else {
                            alert('Failed to mark complete: ' + error);
                          }
                        }}
                      >
                        <CheckCircle size={14} /> Mark Job Complete
                      </button>
                    )}
                    <button
                      style={{ ...btnBase, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}
                      onClick={() => setReviewOpen(true)}
                    >
                      <Star size={14} /> Rate Experience
                    </button>
                  </div>
                );
              }

              if (bid.status === 'rejected') {
                return mutedNote('This bid was declined.');
              }
            } else {
              // PRO view
              if (bid.status === 'pending') {
                return mutedNote('Waiting for the homeowner\'s response…');
              }
              if (bid.status === 'accepted') {
                return (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{ ...btnBase, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' }}
                      onClick={() => { setContactMode('homeowner'); setContactOpen(true); }}
                    >
                      <Phone size={14} /> View Homeowner Contact
                    </button>
                  </div>
                );
              }
              if (bid.status === 'rejected') {
                return mutedNote('Bid declined.');
              }
            }
            return null;
          })()}
        </div>
      )}

      {/* ── Message list ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {loading && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{ fontSize: '2.5rem' }}>💬</div>
            <p>No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === user?.id;
          const isSystem = msg.kind === 'system';
          const isDeleted = !!msg.deleted_at;
          const showDayLabel = idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at);
          const isLastRead = msg.id === lastReadByOther?.id;
          const uiState = msgUiState[msg.id] ?? 'idle';
          // Trash icon eligibility: own non-system, not yet deleted
          const canDelete = isMine && !isSystem && !isDeleted;

          return (
            <div key={msg.id}>
              {/* Day separator */}
              {showDayLabel && (
                <div style={{
                  textAlign: 'center', margin: '0.5rem 0',
                  fontSize: '0.75rem', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  {dayLabel(msg.created_at)}
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>
              )}

              {/* System message */}
              {isSystem ? (
                <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
                  <span style={{
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.05)', borderRadius: '999px',
                    padding: '0.2rem 0.75rem', display: 'inline-block',
                  }}>
                    {msg.body}
                  </span>
                </div>
              ) : (
                /* Regular (or deleted) message bubble */
                <div
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                  }}
                  onMouseEnter={canDelete ? () => showTrash(msg.id) : undefined}
                  onMouseLeave={canDelete ? () => hideTrash(msg.id) : undefined}
                >
                  {/* Bubble + trash icon wrapper */}
                  <div style={{ position: 'relative', maxWidth: '72%' }}>

                    {/* Trash icon (hover, own non-deleted messages) */}
                    {canDelete && (uiState === 'hover') && (
                      <button
                        onClick={() => askConfirm(msg.id)}
                        title="Delete message"
                        style={{
                          position: 'absolute', top: '-10px', right: '-10px', zIndex: 2,
                          background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(239,68,68,0.5)',
                          borderRadius: '50%', width: '26px', height: '26px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#f87171', cursor: 'pointer', padding: 0,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {/* Inline confirm prompt */}
                    {canDelete && uiState === 'confirm' && (
                      <div style={{
                        position: 'absolute', top: '-36px',
                        right: isMine ? 0 : undefined, left: isMine ? undefined : 0,
                        background: 'rgba(17,24,39,0.95)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: '8px', padding: '0.3rem 0.6rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.78rem', color: 'var(--text-main)',
                        whiteSpace: 'nowrap', zIndex: 3,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      }}>
                        <span>Delete?</span>
                        <button
                          onClick={() => confirmDelete(msg.id)}
                          style={{
                            background: '#ef4444', border: 'none', color: 'white',
                            borderRadius: '4px', padding: '0.15rem 0.5rem',
                            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                          }}
                        >Yes</button>
                        <button
                          onClick={() => cancelDelete(msg.id)}
                          style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-muted)',
                            borderRadius: '4px', padding: '0.15rem 0.5rem',
                            cursor: 'pointer', fontSize: '0.78rem',
                          }}
                        >Cancel</button>
                      </div>
                    )}

                    {/* The bubble itself */}
                    {isDeleted ? (
                      /* Deleted placeholder */
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '0.5rem 0.9rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        fontSize: '0.88rem',
                      }}>
                        {msg.kind === 'image' ? '\uD83D\uDDBC\uFE0F [Photo deleted by sender]' : '[Message deleted]'}
                      </div>
                    ) : (
                      <div style={{
                        background: isMine
                          ? 'var(--color-primary)'
                          : 'rgba(255,255,255,0.07)',
                        border: isMine ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: isMine
                          ? '18px 18px 4px 18px'
                          : '18px 18px 18px 4px',
                        padding: '0.5rem 0.9rem',
                        color: 'var(--text-main)',
                        backdropFilter: isMine ? undefined : 'blur(8px)',
                      }}>
                        {msg.kind === 'image' && msg.attachment_url && (
                          <div style={{ marginBottom: msg.body ? '0.5rem' : 0 }}>
                            <SecureImage
                              storagePath={msg.attachment_url}
                              alt="Attachment"
                              onClick={(signedSrc) => setLightboxSrc(signedSrc)}
                            />
                          </div>
                        )}
                        {msg.body && (
                          <p style={{ margin: 0, fontSize: '0.93rem', lineHeight: 1.45, wordBreak: 'break-word' }}>
                            {msg.body}
                          </p>
                        )}
                        <div style={{
                          fontSize: '0.68rem', color: isMine ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)',
                          textAlign: 'right', marginTop: '0.25rem',
                        }}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Seen receipt under last-read sent message */}
                  {isLastRead && (
                    <div style={{
                      fontSize: '0.68rem', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem',
                    }}>
                      <CheckCheck size={12} color="var(--color-primary-light)" />
                      Seen {formatTime(msg.read_at)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Full size attachment"
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {/* ── Frozen banner ── */}
      {frozen && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(239,68,68,0.1)', borderTop: '1px solid rgba(239,68,68,0.3)',
          padding: '0.6rem 1rem', color: '#f87171', fontSize: '0.82rem', flexShrink: 0,
        }}>
          <Lock size={14} />
          {frozenReason}
        </div>
      )}

      {/* ── Composer ── */}
      {!frozen && (
        <form
          onSubmit={handleSend}
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '0.75rem 1rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0,
          }}
        >
          {/* Image preview strip */}
          {pickedFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.4rem 0.6rem',
            }}>
              <img
                src={pickedFile.previewUrl}
                alt="Preview"
                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flex: 1 }}>
                {pickedFile.file.name}
              </span>
              <button
                type="button"
                onClick={clearFile}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Error */}
          {sendError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              color: '#f87171', fontSize: '0.8rem',
            }}>
              <AlertTriangle size={14} /> {sendError}
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
              style={{ display: 'none' }}
              onChange={handleFilePick}
              id="chat-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '50%', width: '38px', height: '38px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: pickedFile ? 'var(--color-primary-light)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <Paperclip size={16} />
            </button>

            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              style={{
                flex: 1, resize: 'none', overflowY: 'auto', maxHeight: '120px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '18px', padding: '0.55rem 0.9rem', color: 'var(--text-main)',
                fontSize: '0.93rem', lineHeight: 1.4, fontFamily: 'inherit', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />

            <button
              type="submit"
              disabled={sending || (!text.trim() && !pickedFile)}
              style={{
                background: 'var(--color-primary)', border: 'none',
                borderRadius: '50%', width: '38px', height: '38px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer', opacity: (sending || (!text.trim() && !pickedFile)) ? 0.45 : 1,
                transition: 'opacity 0.2s, transform 0.15s',
              }}
              onMouseEnter={(e) => { if (!sending) e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Placeholder composer when frozen */}
      {frozen && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <Lock size={14} /> This conversation is read-only.
        </div>
      )}

      {/* ── ReviewModal ── */}
      <ReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        requestId={sr?.id}
        proId={conversation.pro_id}
        onReviewSubmitted={() => setReviewOpen(false)}
      />

      {/* ── ContactInfoModal ── */}
      <ContactInfoModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        mode={contactMode}
        requestId={sr?.id}
        proId={conversation.pro_id}
      />
    </div>
  );
}
