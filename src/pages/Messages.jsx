import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import ConversationThread from '../components/ConversationThread';
import { MessageCircle, Inbox, Archive, User as UserIcon, ArrowLeft } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Avatar bubble
// ---------------------------------------------------------------------------
function Avatar({ profile, size = 40 }) {
  if (profile?.avatar) {
    return (
      <img
        src={profile.avatar}
        alt={profile.name || 'User'}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  const initials = (profile?.name ?? '?').charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--color-primary-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.4, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single conversation row in the list
// ---------------------------------------------------------------------------
function ConvRow({ conv, isActive, unread, onClick, isHomeowner }) {
  const otherParty = isHomeowner ? conv.pro : conv.homeowner;
  const sr = conv.service_request;
  const hasUnread = (unread ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        width: '100%', textAlign: 'left', background: isActive
          ? 'rgba(var(--primary-hue), 85%, 60%, 0.15)'
          : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
        padding: '0.9rem 1rem', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar with unread dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar profile={otherParty} size={44} />
        {hasUnread && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            width: '11px', height: '11px', borderRadius: '50%',
            background: '#ef4444', border: '2px solid var(--bg-dark)',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span style={{
            fontWeight: hasUnread ? 700 : 500, fontSize: '0.93rem',
            color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {otherParty?.name ?? 'Unknown'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {formatRelativeTime(conv.last_message_at)}
          </span>
        </div>
        {sr && (
          <div style={{
            fontSize: '0.77rem', color: 'var(--color-primary-light)',
            marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {sr.category}{sr.city_state ? ` · ${sr.city_state}` : ''}
          </div>
        )}
        {hasUnread && (
          <span style={{
            background: '#ef4444', color: 'white', borderRadius: '999px',
            fontSize: '0.68rem', fontWeight: 700, padding: '0.05rem 0.45rem',
          }}>
            {unread} new
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty-state placeholder
// ---------------------------------------------------------------------------
function EmptyState({ tab }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 2rem', color: 'var(--text-muted)', gap: '1rem',
    }}>
      {tab === 'archived'
        ? <Archive size={48} style={{ opacity: 0.35 }} />
        : <MessageCircle size={48} style={{ opacity: 0.35 }} />}
      <p style={{ fontSize: '1rem', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>
        {tab === 'archived'
          ? 'No archived conversations.'
          : 'No active conversations yet. Start one from a service request bid.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder "select a conversation" panel
// ---------------------------------------------------------------------------
function SelectPrompt() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem', padding: '2rem',
    }}>
      <MessageCircle size={52} style={{ opacity: 0.25 }} />
      <p style={{ fontSize: '0.95rem' }}>Select a conversation to start messaging</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Messages() {
  const { user } = useAuth();
  const { conversations, unreadCounts } = useMessaging();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  // Mobile: true = show thread, false = show list
  const [mobileView, setMobileView] = useState('list');

  // Auto-select conversation from ?conversation= query param
  useEffect(() => {
    const paramId = searchParams.get('conversation');
    if (paramId && conversations.length > 0) {
      const match = conversations.find((c) => c.id === paramId);
      if (match) {
        setSelectedId(paramId);
        setMobileView('thread');
      }
    }
  // Only run when conversations load in (not on every re-render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, conversations.length]);

  // Determine side (homeowner vs pro) for each conversation
  function isHomeowner(conv) { return conv.homeowner_id === user?.id; }

  // Filter by tab — must be called before any early return to satisfy hooks rules
  const filtered = useMemo(() => {
    if (!user) return [];
    return conversations.filter((c) => {
      const archived = c.homeowner_id === user.id ? c.homeowner_archived : c.pro_archived;
      return tab === 'archived' ? archived : !archived;
    });
  }, [conversations, tab, user]);

  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <MessageCircle size={56} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.75rem' }}>Sign in to view messages</h2>
        <Link to="/login" className="btn btn-primary">Log In</Link>
      </div>
    );
  }

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  function handleSelectConv(convId) {
    setSelectedId(convId);
    setMobileView('thread');
  }

  function handleBack() {
    setMobileView('list');
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Conversation list pane ── */}
      <aside
        style={{
          width: '320px',
          minWidth: '260px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
          // On mobile, hide when viewing thread
          ...(mobileView === 'thread' ? { display: 'none' } : {}),
        }}
        className="messages-sidebar"
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1rem 0',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={20} /> Inbox
          </h1>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0' }}>
            {['active', 'archived'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.6rem 0',
                  color: tab === t ? 'var(--color-primary-light)' : 'var(--text-muted)',
                  borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
                  fontWeight: tab === t ? 700 : 400, fontSize: '0.88rem', textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'active' ? 'Active' : 'Archived'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0
            ? <EmptyState tab={tab} />
            : filtered.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                isActive={conv.id === selectedId}
                unread={unreadCounts[conv.id] ?? 0}
                isHomeowner={isHomeowner(conv)}
                onClick={() => handleSelectConv(conv.id)}
              />
            ))
          }
        </div>
      </aside>

      {/* ── Thread pane ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          // On mobile, hide when viewing list
          ...(mobileView === 'list' ? { display: 'none' } : {}),
        }}
        className="messages-thread"
      >
        {selectedConv ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Thread-level header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.02)',
              flexShrink: 0,
            }}>
              {/* Mobile back — only visible on small screens via CSS class trick */}
              <button
                onClick={handleBack}
                className="mobile-back-btn"
                style={{
                  background: 'none', border: 'none', color: 'var(--color-primary-light)',
                  display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.2rem',
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar profile={isHomeowner(selectedConv) ? selectedConv.pro : selectedConv.homeowner} size={36} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {isHomeowner(selectedConv) ? selectedConv.pro?.name : selectedConv.homeowner?.name}
                </div>
                {selectedConv.service_request && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {selectedConv.service_request.category}
                  </div>
                )}
              </div>
            </div>

            <ConversationThread
              conversation={selectedConv}
            />
          </div>
        ) : (
          <SelectPrompt />
        )}
      </main>

      {/* Responsive styles via a <style> tag */}
      <style>{`
        @media (max-width: 700px) {
          .messages-sidebar {
            display: flex !important;
            width: 100% !important;
          }
          .messages-thread {
            display: flex !important;
            width: 100% !important;
          }
          /* When thread is visible on mobile, hide sidebar */
          .messages-sidebar.mobile-hidden {
            display: none !important;
          }
          .messages-thread.mobile-hidden {
            display: none !important;
          }
          .mobile-back-btn {
            display: flex !important;
          }
        }
        @media (min-width: 701px) {
          .messages-sidebar {
            display: flex !important;
          }
          .messages-thread {
            display: flex !important;
          }
          .mobile-back-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
