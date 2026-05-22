import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import { useService } from '../context/ServiceContext';
import { acceptBid, declineBid, markRequestComplete } from '../lib/jobActions';
import ReviewModal from '../components/ReviewModal';
import ContactInfoModal from '../components/ContactInfoModal';
import RequestQnA from '../components/RequestQnA';
import {
  MapPin, Clock, CheckCircle, XCircle, Phone, Star, MessageSquare,
  ArrowRight, Shield, User, Home, Calendar, Wrench, AlertTriangle,
  Pencil, Trash2, ArrowUpRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const map = {
    open:      { bg: 'rgba(59,130,246,0.2)',  color: '#60a5fa', label: 'Open' },
    assigned:  { bg: 'rgba(168,85,247,0.2)',  color: '#c084fc', label: 'Assigned' },
    completed: { bg: 'rgba(34,197,94,0.2)',   color: '#4ade80', label: 'Completed' },
    pending:   { bg: 'rgba(251,191,36,0.2)',  color: '#fbbf24', label: 'Pending' },
    accepted:  { bg: 'rgba(34,197,94,0.2)',   color: '#4ade80', label: 'Accepted' },
    rejected:  { bg: 'rgba(239,68,68,0.2)',   color: '#f87171', label: 'Declined' },
  };
  const s = map[status] ?? { bg: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)', label: status };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.color}`,
      borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700,
      display: 'inline-block',
    }}>
      {s.label}
    </span>
  );
}

function SectionCard({ title, children, style }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.25rem', ...style }}>
      {title && (
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)', letterSpacing: '0.01em' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function FactRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteRequest } = useService();
  const { conversations, getOrCreateConversation } = useMessaging();

  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState('');

  // Review / contact modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMode, setContactMode] = useState('pro'); // 'pro' | 'homeowner'

  // Review existence check
  const [hasReview, setHasReview] = useState(false);

  // Conversation linking state
  const [convLoading, setConvLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchJob = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setActionError('');

    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        owner:profiles!service_requests_user_id_fkey(id, name, avatar),
        bids(
          id, pro_id, status, price_estimate, message, created_at,
          pro:profiles!bids_pro_id_fkey(
            id, name, avatar, vetting_status,
            reviews!reviews_pro_id_fkey(rating)
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[JobDetail] fetch error:', error);
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (!data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setReq(data);
    setLoading(false);

    // Check if a review exists for this request
    const { data: reviewRow } = await supabase
      .from('reviews')
      .select('id')
      .eq('request_id', data.id)
      .maybeSingle();
    setHasReview(!!reviewRow);
  }, [id, user?.id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const isHomeowner = req?.user_id === user?.id;
  const myBid = req?.bids?.find((b) => b.pro_id === user?.id);
  const isPro = !!myBid;

  const acceptedBid = req?.bids?.find((b) => b.status === 'accepted');

  // Average rating helper
  function avgRating(pro) {
    const reviews = pro?.reviews ?? [];
    if (!reviews.length) return null;
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    return { avg: avg.toFixed(1), count: reviews.length };
  }

  // Find existing conversation for conversation card
  const existingConv = conversations.find((c) => {
    if (c.service_request?.id !== req?.id && c.request_id !== req?.id) return false;
    if (isHomeowner) return true; // homeowner — show any conv
    if (isPro) return c.pro_id === user?.id;
    return false;
  });

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------
  async function handleAcceptBid(bidId) {
    if (!confirm('Accept this quote? The professional will receive your contact information.')) return;
    const { success, error } = await acceptBid({ bidId, requestId: req.id });
    if (success) {
      await fetchJob();
    } else {
      setActionError('Failed to accept bid: ' + error);
    }
  }

  async function handleDeclineBid(bidId) {
    if (!confirm('Decline this bid?')) return;
    const { success, error } = await declineBid({ bidId });
    if (success) {
      await fetchJob();
    } else {
      setActionError('Failed to decline bid: ' + error);
    }
  }

  async function handleMarkComplete() {
    if (!confirm('Mark this job as complete?')) return;
    const { success, error } = await markRequestComplete({ requestId: req.id });
    if (success) {
      await fetchJob();
    } else {
      setActionError('Failed to mark complete: ' + error);
    }
  }

  async function handleDeleteRequest() {
    if (!confirm('Delete this request? This cannot be undone and will remove all bids.')) return;
    const { success, message } = await deleteRequest(req.id);
    if (success) {
      navigate('/my-requests');
    } else {
      setActionError('Failed to delete: ' + message);
    }
  }

  async function handleGoToConversation() {
    if (!req) return;

    if (existingConv) {
      navigate(`/messages?conversation=${existingConv.id}`);
      return;
    }

    // Need to know the other party IDs to create/find a conversation
    let homeownerId = req.user_id;
    let proId;

    if (isHomeowner && acceptedBid) {
      proId = acceptedBid.pro_id;
    } else if (isPro) {
      proId = user.id;
    } else {
      return;
    }

    if (!proId) return;
    setConvLoading(true);
    try {
      const { data: conv, error } = await getOrCreateConversation({
        requestId: req.id,
        homeownerId,
        proId,
      });
      if (conv) {
        navigate(`/messages?conversation=${conv.id}`);
      } else {
        setActionError('Could not open conversation: ' + (error?.message ?? 'unknown error'));
      }
    } finally {
      setConvLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render: loading / not found
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Loading job…</div>
      </div>
    );
  }

  if (notFound || !req) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 2rem' }}>
          <AlertTriangle size={40} style={{ color: '#f87171', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>Job not found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            This job doesn&apos;t exist, or you don&apos;t have permission to view it.<br />
            Only the homeowner and professionals who placed a bid can access this page.
          </p>
          <Link to="/" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const titleText = req.details?.length > 60
    ? req.details.slice(0, 60).trimEnd() + '…'
    : req.details;

  const ownerName = req.owner?.name ?? 'Unknown';
  const location = req.city_state ?? req.zip_code ?? '';

  const btnBase = {
    border: 'none', borderRadius: '8px', padding: '0.45rem 1rem',
    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    transition: 'opacity 0.15s',
  };

  // ---------------------------------------------------------------------------
  // Status timeline items
  // ---------------------------------------------------------------------------
  const timeline = [];

  timeline.push({
    label: `Posted`,
    date: formatDate(req.created_at),
    filled: true,
  });

  const bidCount = req.bids?.length ?? 0;
  if (bidCount > 0) {
    timeline.push({
      label: `${bidCount} bid${bidCount !== 1 ? 's' : ''} received`,
      date: null,
      filled: true,
    });
  }

  if (acceptedBid) {
    timeline.push({
      label: 'Bid accepted',
      date: formatDate(acceptedBid.created_at),
      filled: true,
    });
  }

  timeline.push({
    label: 'Marked complete',
    date: req.completed_at ? formatDate(req.completed_at) : null,
    filled: !!req.completed_at,
  });

  timeline.push({
    label: 'Reviewed',
    date: null,
    filled: hasReview,
  });

  // ---------------------------------------------------------------------------
  // Action buttons block
  // ---------------------------------------------------------------------------
  function renderActionButtons() {
    const mutedNote = (text) => (
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{text}</span>
    );

    if (isHomeowner) {
      if (req.status === 'open') {
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              to={`/edit-request/${req.id}`}
              style={{
                ...btnBase,
                background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.4)', textDecoration: 'none',
              }}
            >
              <Pencil size={14} /> Edit Request
            </Link>
            <button
              onClick={handleDeleteRequest}
              style={{ ...btnBase, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        );
      }

      if (req.status === 'assigned') {
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              style={{ ...btnBase, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' }}
              onClick={() => { setContactMode('pro'); setContactOpen(true); }}
            >
              <Phone size={14} /> View Pro Contact
            </button>
            <button
              style={{ ...btnBase, background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }}
              onClick={handleMarkComplete}
            >
              <CheckCircle size={14} /> Mark Job Complete
            </button>
            <button
              style={{ ...btnBase, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}
              onClick={() => setReviewOpen(true)}
            >
              <Star size={14} /> Rate Experience
            </button>
          </div>
        );
      }

      if (req.status === 'completed') {
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              style={{ ...btnBase, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' }}
              onClick={() => { setContactMode('pro'); setContactOpen(true); }}
            >
              <Phone size={14} /> View Pro Contact
            </button>
            <button
              style={{ ...btnBase, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}
              onClick={() => setReviewOpen(true)}
            >
              <Star size={14} /> Rate Experience
            </button>
          </div>
        );
      }

      return mutedNote('No actions available for this request.');
    }

    if (isPro && myBid) {
      if (myBid.status === 'pending') {
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              style={{ ...btnBase, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' }}
              onClick={handleGoToConversation}
            >
              <MessageSquare size={14} /> Message Homeowner
            </button>
            <button
              style={{ ...btnBase, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
              onClick={() => {
                if (!confirm('Withdraw your bid? This cannot be undone.')) return;
                handleDeclineBid(myBid.id);
              }}
            >
              <XCircle size={14} /> Withdraw Bid
            </button>
          </div>
        );
      }

      if (myBid.status === 'accepted') {
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              style={{ ...btnBase, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' }}
              onClick={handleGoToConversation}
            >
              <MessageSquare size={14} /> Message Homeowner
            </button>
            <button
              style={{ ...btnBase, background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }}
              onClick={() => { setContactMode('homeowner'); setContactOpen(true); }}
            >
              <Phone size={14} /> View Homeowner Contact
            </button>
          </div>
        );
      }

      if (myBid.status === 'rejected') {
        return mutedNote('Your bid was declined.');
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Accepted bid card (for left column)
  // ---------------------------------------------------------------------------
  function renderAcceptedBidCard() {
    if (!acceptedBid) return null;
    if (req.status !== 'assigned' && req.status !== 'completed') return null;

    const pro = acceptedBid.pro;
    const rating = avgRating(pro);

    return (
      <SectionCard title="Accepted Bid">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          {/* Avatar */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(99,102,241,0.3)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {pro?.avatar
              ? <img src={pro.avatar} alt={pro.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
              : <User size={20} />
            }
          </div>

          <div style={{ flex: 1 }}>
            {/* Name + verified badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <strong style={{ fontSize: '1rem' }}>{pro?.name ?? 'Unknown Pro'}</strong>
              {pro?.vetting_status === 'approved' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                  background: 'rgba(74,222,128,0.15)', padding: '0.1rem 0.4rem',
                  borderRadius: '12px', border: '1px solid rgba(74,222,128,0.4)',
                }}>
                  <Shield size={11} color="#4ade80" fill="#4ade80" />
                  <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700 }}>VERIFIED</span>
                </span>
              )}
            </div>

            {/* Stars */}
            {rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.4rem', fontSize: '0.82rem', color: '#fbbf24' }}>
                <Star size={13} fill="#fbbf24" />
                <span style={{ fontWeight: 700 }}>{rating.avg}</span>
                <span style={{ color: 'var(--text-muted)' }}>({rating.count} review{rating.count !== 1 ? 's' : ''})</span>
              </div>
            )}

            {/* Price + accepted badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fbbf24' }}>
                ${acceptedBid.price_estimate}
              </span>
              <StatusBadge status="accepted" />
            </div>

            {/* Message */}
            {acceptedBid.message && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                &ldquo;{acceptedBid.message}&rdquo;
              </p>
            )}
          </div>
        </div>
      </SectionCard>
    );
  }

  // ---------------------------------------------------------------------------
  // All bids card (homeowner + open status only)
  // ---------------------------------------------------------------------------
  function renderAllBidsCard() {
    if (!isHomeowner) return null;
    if (req.status !== 'open') return null;

    const pendingBids = req.bids?.filter((b) => b.status === 'pending') ?? [];

    return (
      <SectionCard title={`All Bids (${pendingBids.length})`}>
        {pendingBids.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
            No bids yet. Professionals are reviewing your request.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingBids.map((bid) => {
              const pro = bid.pro;
              const rating = avgRating(pro);
              return (
                <div key={bid.id} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                  padding: '1rem', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <User size={15} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{pro?.name ?? bid.pro_id}</strong>
                          {pro?.vetting_status === 'approved' && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.15rem',
                              background: 'rgba(74,222,128,0.15)', padding: '0.05rem 0.35rem',
                              borderRadius: '10px', border: '1px solid rgba(74,222,128,0.4)',
                            }}>
                              <Shield size={10} color="#4ade80" fill="#4ade80" />
                              <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>VERIFIED</span>
                            </span>
                          )}
                        </div>
                        {rating && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem', color: '#fbbf24' }}>
                            <Star size={11} fill="#fbbf24" />
                            <span style={{ fontWeight: 700 }}>{rating.avg}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({rating.count})</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24' }}>
                      ${bid.price_estimate}
                    </span>
                  </div>

                  {bid.message && (
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                      &ldquo;{bid.message}&rdquo;
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{ ...btnBase, background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)', fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                      onClick={() => handleAcceptBid(bid.id)}
                    >
                      <CheckCircle size={13} /> Accept
                    </button>
                    <button
                      style={{ ...btnBase, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)', fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                      onClick={() => handleDeclineBid(bid.id)}
                    >
                      <XCircle size={13} /> Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    );
  }

  // ---------------------------------------------------------------------------
  // Property & schedule facts
  // ---------------------------------------------------------------------------
  function renderPropertyCard() {
    const facts = [
      { label: 'Property type', value: req.property_type },
      { label: 'Home age', value: req.home_age },
      { label: 'Primary residence', value: req.primary_residence != null ? (req.primary_residence ? 'Yes' : 'No') : null },
      { label: 'Service goal', value: req.service_goal },
      { label: 'Start time', value: req.start_time ?? req.urgency },
      { label: 'Service time', value: req.service_time ?? req.timeframe },
    ].filter((f) => f.value != null);

    if (!facts.length) return null;

    return (
      <SectionCard title="Property & Schedule">
        {facts.map((f) => (
          <FactRow key={f.label} label={f.label} value={f.value} />
        ))}
      </SectionCard>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — main
  // ---------------------------------------------------------------------------
  const proId = acceptedBid?.pro_id ?? myBid?.pro_id ?? null;

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1100px' }}>

      {/* ── Header card ── */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        {/* Top row: chips + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
          <span style={{
            background: 'var(--color-primary-dark)', color: '#fff',
            borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.8rem', fontWeight: 700,
          }}>
            {req.category}
          </span>
          <StatusBadge status={req.status} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
            Posted {daysAgo(req.created_at)}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem', lineHeight: 1.2 }}>
          {titleText}
        </h1>

        {/* Subtitle */}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span>Posted by <strong style={{ color: 'var(--text-main)' }}>{ownerName}</strong></span>
          {location && (
            <>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <MapPin size={13} /> {location}
              </span>
            </>
          )}
        </p>

        {/* Action buttons */}
        {renderActionButtons()}

        {/* Error feedback */}
        {actionError && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.85rem' }}>
            <AlertTriangle size={14} /> {actionError}
          </div>
        )}
      </div>

      {/* ── Two-column body ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: '1.25rem',
        alignItems: 'start',
      }}
        className="job-detail-grid"
      >
        {/* LEFT column */}
        <div>
          {/* Description */}
          <SectionCard title="Description">
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
              {req.details}
            </p>
          </SectionCard>

          {/* Property & Schedule */}
          {renderPropertyCard()}

          {/* Accepted bid */}
          {renderAcceptedBidCard()}

          {/* All bids (homeowner + open) */}
          {renderAllBidsCard()}

          {/* Q&A */}
          <SectionCard title="Questions & Answers">
            <RequestQnA requestId={req.id} isOwner={isHomeowner} />
          </SectionCard>
        </div>

        {/* RIGHT column */}
        <div>
          {/* Status timeline */}
          <SectionCard title="Status Timeline">
            <div style={{ position: 'relative' }}>
              {timeline.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: idx < timeline.length - 1 ? '1.1rem' : 0 }}>
                  {/* Dot + connector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      border: item.filled ? 'none' : '2px solid rgba(255,255,255,0.3)',
                      background: item.filled ? 'var(--color-primary)' : 'transparent',
                      boxShadow: item.filled ? '0 0 8px var(--color-primary)' : 'none',
                      flexShrink: 0, marginTop: '2px',
                    }} />
                    {idx < timeline.length - 1 && (
                      <div style={{
                        width: '2px', flex: 1, minHeight: '24px',
                        background: item.filled ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.1)',
                        marginTop: '3px',
                      }} />
                    )}
                  </div>

                  {/* Label */}
                  <div style={{ paddingBottom: idx < timeline.length - 1 ? '0' : 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: item.filled ? 600 : 400, color: item.filled ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {item.label}
                    </div>
                    {item.date && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {item.date}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Conversation card */}
          <SectionCard title="Conversation">
            {existingConv ? (
              <button
                onClick={handleGoToConversation}
                style={{ ...btnBase, background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(99,102,241,0.4)', width: '100%', justifyContent: 'center' }}
              >
                View Conversation <ArrowRight size={14} />
              </button>
            ) : (isPro || (isHomeowner && acceptedBid)) ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  No conversation started yet.
                </p>
                <button
                  onClick={handleGoToConversation}
                  disabled={convLoading}
                  style={{ ...btnBase, background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(99,102,241,0.4)', opacity: convLoading ? 0.5 : 1 }}
                >
                  <MessageSquare size={14} /> {convLoading ? 'Opening…' : 'Start a Conversation'}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Conversations become available after a bid is accepted.
              </p>
            )}
          </SectionCard>

          {/* My bid card for pros */}
          {isPro && myBid && (
            <SectionCard title="Your Bid">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fbbf24' }}>${myBid.price_estimate}</span>
                <StatusBadge status={myBid.status} />
              </div>
              {myBid.message && (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  &ldquo;{myBid.message}&rdquo;
                </p>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Placed {formatDate(myBid.created_at)}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        requestId={req.id}
        proId={proId}
        onReviewSubmitted={() => { setReviewOpen(false); fetchJob(); }}
      />

      <ContactInfoModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        mode={contactMode}
        requestId={req.id}
        proId={proId}
      />

      {/* Responsive style for two-column grid */}
      <style>{`
        @media (max-width: 700px) {
          .job-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
