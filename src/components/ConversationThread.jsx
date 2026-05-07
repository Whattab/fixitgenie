import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import {
  Send, Paperclip, X, MapPin, Clock, AlertTriangle,
  CheckCheck, Lock, ChevronLeft, Image as ImageIcon,
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
// ---------------------------------------------------------------------------
function SecureImage({ storagePath, alt }) {
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
      style={{ maxWidth: '240px', maxHeight: '240px', borderRadius: '8px', objectFit: 'cover', display: 'block' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ConversationThread({ conversation, onBack }) {
  const { user } = useAuth();
  const { sendMessage, markConversationRead, uploadAttachment } = useMessaging();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState(null);
  const [frozen, setFrozen] = useState(false);
  const [frozenReason, setFrozenReason] = useState('');
  const [text, setText] = useState('');
  const [pickedFile, setPickedFile] = useState(null);  // { file, previewUrl }
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const channelRef = useRef(null);

  const isHomeowner = conversation.homeowner_id === user?.id;
  const otherParty = isHomeowner ? conversation.pro : conversation.homeowner;
  const sr = conversation.service_request;

  // -------------------------------------------------------------------------
  // Fetch messages
  // -------------------------------------------------------------------------
  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .is('deleted_at', null)
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
            <StatusBadge status={sr.status} />
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
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Conversation with <strong style={{ color: 'var(--text-main)' }}>{otherParty?.name ?? 'Unknown'}</strong>
          </div>
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
          const showDayLabel = idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at);
          const isLastRead = msg.id === lastReadByOther?.id;

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
                /* Regular message bubble */
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '72%',
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
                        <SecureImage storagePath={msg.attachment_url} alt="Attachment" />
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
    </div>
  );
}
