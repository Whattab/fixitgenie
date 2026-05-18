import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Upload, Save, CheckCircle, AlertCircle, User } from 'lucide-react';

// ─── constants ────────────────────────────────────────────────────────────────
const MAX_BIO = 200;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// ─── component ────────────────────────────────────────────────────────────────
const HomeownerProfile = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    state: '',
    zipcode: '',
    bio: '',
    avatar: null,
    notify_email_on_message: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  // ── guard: homeowners only ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.type === 'professional') {
      navigate('/my-bids');
    }
  }, [user, navigate]);

  // ── load existing profile ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, city, state, zipcode, bio, avatar, notify_email_on_message')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          city: data.city || '',
          state: data.state || '',
          zipcode: data.zipcode || '',
          bio: data.bio || '',
          avatar: data.avatar || null,
          notify_email_on_message:
            data.notify_email_on_message !== false, // default true
        });
      }
    };

    fetchProfile();
  }, [user]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBioChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_BIO) {
      setForm((prev) => ({ ...prev, bio: val }));
    }
  };

  /** Match the pattern from ProOnboarding.jsx lines 163-172 */
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      state: form.state,
      zipcode: form.zipcode.trim(),
      bio: form.bio.trim(),
      notify_email_on_message: form.notify_email_on_message,
    };

    // Only include avatar when it has a value (avoid accidentally clearing it)
    if (form.avatar !== null) {
      payload.avatar = form.avatar;
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    setIsSaving(false);

    if (error) {
      console.error('Profile save error:', error);
      showToast('error', 'Failed to save: ' + error.message);
    } else {
      // Refresh the in-memory user so the header avatar + welcome name
      // update immediately, no page refresh needed.
      await refreshUser();
      showToast('success', 'Profile saved successfully!');
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────
  if (!user) return null;

  return (
    <div style={styles.page}>
      {/* ── ambient blobs ────────────────────────────────────────────────── */}
      <div style={styles.blobTL} />
      <div style={styles.blobBR} />

      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.pageHeader}>
          <div style={styles.pageHeaderIcon}>
            <User size={28} color="#a78bfa" />
          </div>
          <div>
            <h1 style={styles.pageTitle}>My Profile</h1>
            <p style={styles.pageSubtitle}>
              Manage your personal info — visible only to you, not to pros.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} style={styles.card}>

          {/* ── Profile photo ──────────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Profile Photo</h2>
            <div style={styles.uploadBox}>
              {form.avatar ? (
                <div style={styles.uploadSuccess}>
                  <img
                    src={form.avatar}
                    alt="Profile"
                    style={styles.avatarPreview}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, avatar: null }))}
                    style={styles.removeBtn}
                  >
                    Remove &amp; Re-upload
                  </button>
                </div>
              ) : (
                <div style={styles.uploadContent}>
                  <Upload size={32} color="#6b7280" />
                  <p style={styles.uploadLabel}>
                    <strong>Upload a profile photo</strong>
                  </p>
                  <small style={styles.uploadHint}>JPG or PNG · Square crop preferred</small>
                  <input
                    id="hp-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={styles.fileInput}
                  />
                </div>
              )}
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Display name ───────────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Basic Info</h2>

            <div style={styles.inputGroup}>
              <label htmlFor="hp-name" style={styles.label}>
                Display name
              </label>
              <input
                id="hp-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Sarah M."
                style={styles.input}
              />
            </div>

            {/* ── Phone (private) ─────────────────────────────────────── */}
            <div style={{ ...styles.inputGroup, marginTop: '1.25rem' }}>
              <label htmlFor="hp-phone" style={styles.label}>
                Phone number
                <span style={styles.privateTag}>private — never shown to pros</span>
              </label>
              <input
                id="hp-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                style={styles.input}
              />
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Default location ───────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Default Location</h2>
            <div style={styles.locationGrid}>
              <div style={styles.inputGroup}>
                <label htmlFor="hp-city" style={styles.label}>City</label>
                <input
                  id="hp-city"
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. Austin"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label htmlFor="hp-state" style={styles.label}>State</label>
                <select
                  id="hp-state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="">Select state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label htmlFor="hp-zip" style={styles.label}>ZIP code</label>
                <input
                  id="hp-zip"
                  type="text"
                  name="zipcode"
                  value={form.zipcode}
                  onChange={handleChange}
                  placeholder="e.g. 78701"
                  maxLength={10}
                  style={styles.input}
                />
              </div>
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Bio ────────────────────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Short Bio</h2>
            <div style={styles.inputGroup}>
              <label htmlFor="hp-bio" style={styles.label}>
                Tell us a little about yourself (optional)
              </label>
              <textarea
                id="hp-bio"
                name="bio"
                rows={4}
                value={form.bio}
                onChange={handleBioChange}
                placeholder="e.g. Homeowner in Austin, TX. Love DIY projects but sometimes need a pro touch!"
                style={styles.textarea}
              />
              <div style={styles.charCounter}>
                <span
                  style={{
                    color: form.bio.length >= MAX_BIO ? '#ef4444' : 'var(--text-muted)',
                  }}
                >
                  {form.bio.length}/{MAX_BIO} characters
                </span>
              </div>
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Notifications ──────────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Notifications</h2>
            <div style={styles.toggleRow}>
              <div style={styles.toggleInfo}>
                <div style={styles.toggleTitle}>Email notifications for new messages</div>
                <small style={styles.toggleHint}>
                  Get an email when a pro sends you a message while you&apos;re offline.
                </small>
              </div>
              <label style={styles.switchLabel}>
                <input
                  id="hp-notify-toggle"
                  type="checkbox"
                  name="notify_email_on_message"
                  checked={form.notify_email_on_message}
                  onChange={handleChange}
                  style={styles.switchInput}
                />
                <span
                  style={{
                    ...styles.slider,
                    background: form.notify_email_on_message
                      ? '#22c55e'
                      : 'rgba(255,255,255,0.2)',
                  }}
                >
                  <span
                    style={{
                      ...styles.sliderThumb,
                      transform: form.notify_email_on_message
                        ? 'translateX(20px)'
                        : 'translateX(0)',
                    }}
                  />
                </span>
              </label>
            </div>
          </section>

          <div style={styles.divider} />

          {/* ── Save button ────────────────────────────────────────────── */}
          <div style={styles.footer}>
            <button
              id="hp-save-btn"
              type="submit"
              disabled={isSaving}
              style={{
                ...styles.saveBtn,
                opacity: isSaving ? 0.7 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={18} />
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === 'success'
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            borderColor: toast.type === 'success'
              ? 'rgba(34, 197, 94, 0.4)'
              : 'rgba(239, 68, 68, 0.4)',
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={18} color="#22c55e" />
          ) : (
            <AlertCircle size={18} color="#ef4444" />
          )}
          <span style={{ marginLeft: '0.5rem' }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    padding: '2rem 1rem 4rem',
    position: 'relative',
    overflow: 'hidden',
  },
  blobTL: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'hsl(250, 85%, 60%)',
    filter: 'blur(120px)',
    opacity: 0.12,
    pointerEvents: 'none',
    zIndex: 0,
  },
  blobBR: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'hsl(180, 90%, 50%)',
    filter: 'blur(120px)',
    opacity: 0.08,
    pointerEvents: 'none',
    zIndex: 0,
  },
  wrapper: {
    maxWidth: '680px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  pageHeaderIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'rgba(167, 139, 250, 0.12)',
    border: '1px solid rgba(167, 139, 250, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#fff',
    margin: 0,
    lineHeight: 1.1,
  },
  pageSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.25rem',
  },
  card: {
    background: 'rgba(30, 30, 50, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '16px',
    padding: '2rem',
  },
  section: {
    marginBottom: '0.25rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '1.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.07)',
    margin: '1.75rem 0',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  privateTag: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#94a3b8',
    background: 'rgba(148, 163, 184, 0.1)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '6px',
    padding: '0.1rem 0.45rem',
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  charCounter: {
    textAlign: 'right',
    fontSize: '0.8rem',
    marginTop: '0.35rem',
  },
  locationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
  },
  // Upload box — mirrors ProOnboarding
  uploadBox: {
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    padding: '2rem',
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    position: 'relative',
    transition: 'border-color 0.2s',
  },
  uploadContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    position: 'relative',
  },
  uploadLabel: {
    color: '#e2e8f0',
    margin: 0,
  },
  uploadHint: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  fileInput: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    cursor: 'pointer',
    width: '100%',
    height: '100%',
  },
  uploadSuccess: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.5rem',
  },
  avatarPreview: {
    maxHeight: '130px',
    maxWidth: '130px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    objectFit: 'cover',
  },
  removeBtn: {
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '8px',
    padding: '0.5rem 1.1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  // Toggle switch — mirrors ProOnboarding.css pattern
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 0',
    gap: '1rem',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontWeight: 600,
    color: '#f1f5f9',
    fontSize: '0.95rem',
  },
  toggleHint: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    lineHeight: 1.4,
    display: 'block',
    marginTop: '0.25rem',
  },
  switchLabel: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
    flexShrink: 0,
    cursor: 'pointer',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
    position: 'absolute',
  },
  slider: {
    position: 'absolute',
    inset: 0,
    borderRadius: '24px',
    transition: 'background 0.3s',
    display: 'block',
  },
  sliderThumb: {
    position: 'absolute',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#fff',
    top: '3px',
    left: '3px',
    transition: 'transform 0.3s',
    display: 'block',
  },
  // Save button
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'hsl(250, 85%, 60%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.75rem',
    fontSize: '1rem',
    fontWeight: 700,
    transition: 'opacity 0.2s, transform 0.2s',
    fontFamily: 'inherit',
    boxShadow: '0 4px 18px -4px hsl(250, 85%, 45%)',
  },
  // Toast
  toast: {
    position: 'fixed',
    bottom: '2rem',
    right: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    border: '1px solid',
    backdropFilter: 'blur(12px)',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#f1f5f9',
    zIndex: 9999,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    animation: 'fadeIn 0.3s ease',
  },
};

export default HomeownerProfile;
