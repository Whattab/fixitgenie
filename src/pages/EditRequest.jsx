import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';

/**
 * EditRequest — lets a homeowner edit their own service request after posting.
 *
 * Rules:
 *  - Only the request's owner can edit (enforced by RLS + a UI guard)
 *  - Editing is blocked once the request status moves to 'assigned' or 'completed'
 *  - If existing bids exist, a warning is shown but the edit is still allowed
 *  - Existing bids stay as-is (per Option A); pros can re-bid manually if needed
 *
 * Editable fields:  category, details, urgency, city_state, zipcode,
 *                   service_goal, start_time, service_time
 * Locked fields:    property_type, home_age, primary_residence,
 *                   contact info (lives on /my-profile)
 */
export default function EditRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ─── Form state ────────────────────────────────────────────────────────────
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bidCount, setBidCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    category: '',
    details: '',
    urgency: '',
    city_state: '',  // City, State only — no ZIP. Combined on save.
    zip: '',         // 5-digit ZIP. Combined into city_state on save.
    service_goal: '',
    start_time: '',
    service_time: '',
  });

  const [isFetchingZip, setIsFetchingZip] = useState(false);

  // ─── Options (mirror RepairRequest.jsx) ────────────────────────────────────
  const categories = [
    'Plumbing', 'Electrical', 'HVAC / Heating & Cooling', 'Appliance Repair',
    'Roofing', 'Flooring', 'Painting', 'Drywall', 'Carpentry',
    'Windows & Doors', 'Landscaping / Outdoor', 'Pest Control',
    'General Handyman', 'Other',
  ];

  const urgencyOptions = [
    { value: 'Emergency', label: '🚨 Emergency (immediate attention)' },
    { value: 'Urgent',    label: '⏱ Urgent (24–48 hours)' },
    { value: 'Soon',      label: '📅 Soon (within a week)' },
    { value: 'Not urgent', label: '🧘 Not urgent / flexible' },
  ];

  const startTimeOptions = [
    'Today', 'Last few days', 'Over a week ago', 'Ongoing / recurring',
  ];

  const serviceGoalOptions = [
    'Get advice or estimates',
    'Request on-site service',
    'Compare multiple professionals',
  ];

  const serviceTimeOptions = ['Morning', 'Afternoon', 'Evening', 'Flexible'];

  // ─── Auth + load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.type === 'professional') {
      navigate('/my-bids', { replace: true });
      return;
    }
    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function fetchRequest() {
    setLoading(true);
    setError(null);

    const { data, error: fetchErr } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !data) {
      setError('Request not found or you do not have access to it.');
      setLoading(false);
      return;
    }

    if (data.user_id !== user.id) {
      setError('You can only edit your own requests.');
      setLoading(false);
      return;
    }

    if (data.status === 'assigned' || data.status === 'completed') {
      setError(
        data.status === 'completed'
          ? 'This request has been marked complete and can no longer be edited.'
          : 'This request has an accepted bid and can no longer be edited. Cancel the accepted bid first if you need to make changes.'
      );
      setRequest(data);
      setLoading(false);
      return;
    }

    setRequest(data);

    // Parse the stored city_state (format: "City, ST 12345" or just "12345").
    // Split out the trailing 5-digit ZIP so we can pre-fill BOTH inputs.
    const stored = (data.city_state || '').trim();
    const zipMatch = stored.match(/(\d{5})\s*$/);
    const extractedZip = zipMatch ? zipMatch[1] : '';
    const cityStateOnly = zipMatch
      ? stored.slice(0, zipMatch.index).trim().replace(/[,\s]+$/, '')
      : stored;

    setForm({
      category: data.category || '',
      details: data.details || '',
      urgency: data.urgency || '',
      city_state: cityStateOnly,
      zip: extractedZip,
      service_goal: data.service_goal || '',
      start_time: data.start_time || '',
      service_time: data.service_time || '',
    });

    // Count existing bids so we can warn the user
    const { count } = await supabase
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', id);
    setBidCount(count ?? 0);

    setLoading(false);
  }

  // ─── Save handler ──────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    if (!request) return;
    if (saving) return;

    // Minimal client-side validation
    if (!form.category || !form.details.trim()) {
      setToast({ type: 'error', text: 'Category and Description are required.' });
      return;
    }

    setSaving(true);
    setToast(null);

    // Combine city_state and zip back into a single field that matches the
    // original create-form storage format: "City, ST 12345" — or just one
    // of them if the other is missing.
    const cityStateClean = form.city_state.trim();
    const zipClean = form.zip.trim();
    const combinedLocation = cityStateClean && zipClean
      ? `${cityStateClean} ${zipClean}`
      : (cityStateClean || zipClean);

    const payload = {
      category: form.category,
      details: form.details.trim(),
      urgency: form.urgency,
      city_state: combinedLocation,
      service_goal: form.service_goal,
      start_time: form.start_time,
      service_time: form.service_time,
    };

    const { error: updateErr } = await supabase
      .from('service_requests')
      .update(payload)
      .eq('id', id);

    setSaving(false);

    if (updateErr) {
      console.error('Update error:', updateErr);
      setToast({ type: 'error', text: 'Failed to save: ' + updateErr.message });
      return;
    }

    setToast({ type: 'success', text: 'Request updated successfully.' });
    // brief pause so the user sees the toast, then back to dashboard
    setTimeout(() => navigate('/my-requests'), 900);
  }

  // ─── Styles (match the existing app aesthetic) ─────────────────────────────
  const styles = {
    page: { padding: '2rem 1rem', maxWidth: '780px', margin: '0 auto' },
    field: { marginBottom: '1.25rem' },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' },
    input: { width: '100%', padding: '0.75rem 0.9rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.95rem' },
    textarea: { width: '100%', minHeight: '110px', padding: '0.75rem 0.9rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.95rem', resize: 'vertical' },
    row: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' },
    select: { width: '100%', padding: '0.75rem 0.9rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.95rem' },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.75rem 1.25rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' },
    btnGhost: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '0.75rem 1.25rem', fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'none' },
    warning: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start', color: '#fbbf24', fontSize: '0.88rem', lineHeight: 1.45 },
    blockedNotice: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '1rem', color: '#f87171', textAlign: 'center', marginTop: '1.5rem' },
    toast: (type) => ({
      position: 'fixed', bottom: '2rem', right: '2rem',
      background: type === 'success' ? 'rgba(34,197,94,0.92)' : 'rgba(239,68,68,0.92)',
      color: 'white', padding: '0.75rem 1.1rem', borderRadius: '8px', zIndex: 1000,
      fontSize: '0.9rem', boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
    }),
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={styles.page}><p style={{ color: 'var(--text-muted)' }}>Loading…</p></div>;
  }

  if (error) {
    return (
      <div style={styles.page}>
        <Link to="/my-requests" style={styles.btnGhost}>
          <ArrowLeft size={16} /> Back to My Requests
        </Link>
        <div style={styles.blockedNotice}>
          <AlertTriangle size={20} style={{ marginBottom: '0.4rem' }} /><br />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link to="/my-requests" style={styles.btnGhost}>
          <ArrowLeft size={16} /> Back to My Requests
        </Link>
      </div>

      <h1 style={{ marginBottom: '0.4rem' }}>Edit Request</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Update the details of your service request. Contact information is managed on your{' '}
        <Link to="/my-profile" style={{ color: 'var(--color-primary-light)' }}>profile page</Link>.
      </p>

      {bidCount > 0 && (
        <div style={styles.warning}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <strong>This request already has {bidCount} bid{bidCount === 1 ? '' : 's'}.</strong>{' '}
            Existing bids will remain in place after you save. Pros may need to update their bid
            if your changes affect the scope or location of the work.
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '1.75rem' }}>
        {/* Category */}
        <div style={styles.field}>
          <label style={styles.label}>Category *</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={styles.select}
            required
          >
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Details */}
        <div style={styles.field}>
          <label style={styles.label}>Description *</label>
          <textarea
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            placeholder="Describe what needs to be done..."
            style={styles.textarea}
            required
          />
        </div>

        {/* Urgency */}
        <div style={styles.field}>
          <label style={styles.label}>Urgency</label>
          <select
            value={form.urgency}
            onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            style={styles.select}
          >
            <option value="">Select urgency</option>
            {urgencyOptions.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        {/* Location: ZIP triggers auto-lookup of city + state */}
        <div style={styles.field}>
          <label style={styles.label}>
            ZIP code
            {isFetchingZip && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--color-primary-light)', fontWeight: 400 }}>
                Looking up…
              </span>
            )}
          </label>
          <input
            type="text"
            value={form.zip}
            onChange={async (e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 5);
              setForm((prev) => ({ ...prev, zip: value }));
              if (/^\d{5}$/.test(value)) {
                setIsFetchingZip(true);
                try {
                  const response = await fetch(`https://api.zippopotam.us/us/${value}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.places && data.places.length > 0) {
                      const place = data.places[0];
                      const newCityState = `${place['place name']}, ${place['state abbreviation']}`;
                      setForm((prev) => ({ ...prev, city_state: newCityState }));
                    }
                  }
                } catch (err) {
                  console.error('ZIP lookup failed:', err);
                } finally {
                  setIsFetchingZip(false);
                }
              }
            }}
            placeholder="5-digit ZIP"
            style={styles.input}
            maxLength={5}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Changing the ZIP changes which pros see your request.
          </small>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>City &amp; State</label>
          <input
            type="text"
            value={form.city_state}
            onChange={(e) => setForm({ ...form, city_state: e.target.value })}
            placeholder={isFetchingZip ? 'Loading…' : 'Auto-fills from ZIP, or enter manually'}
            style={styles.input}
          />
        </div>

        {/* Service goal */}
        <div style={styles.field}>
          <label style={styles.label}>What are you looking for?</label>
          <select
            value={form.service_goal}
            onChange={(e) => setForm({ ...form, service_goal: e.target.value })}
            style={styles.select}
          >
            <option value="">(no preference)</option>
            {serviceGoalOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Start time */}
        <div style={styles.field}>
          <label style={styles.label}>When did this issue start?</label>
          <select
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            style={styles.select}
          >
            <option value="">(no preference)</option>
            {startTimeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Service time */}
        <div style={styles.field}>
          <label style={styles.label}>Preferred service time</label>
          <select
            value={form.service_time}
            onChange={(e) => setForm({ ...form, service_time: e.target.value })}
            style={styles.select}
          >
            <option value="">(no preference)</option>
            {serviceTimeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <Link to="/my-requests" style={styles.btnGhost}>Cancel</Link>
          <button type="submit" style={styles.btnPrimary} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      {toast && (
        <div style={styles.toast(toast.type)}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
