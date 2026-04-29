import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const ResetPassword = () => {
    // Note: With Supabase, the user arrives here via an email link which authenticates them.
    // So we just need to let them set a new password for the current session.
    const navigate = useNavigate();
    const { updatePassword } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        // Debug information to see if URL contains tokens or codes
        console.log("ResetPassword Loaded. Hash:", window.location.hash, "Search:", window.location.search);

        // Log current session state
        supabase.auth.getSession().then(({ data }) => {
            console.log("Current Supabase Auth Session on Load:", data.session);
            if (!data.session) {
                // Wait briefly, as PKCE exchange or hash parsing might take a moment.
                setTimeout(async () => {
                    const { data: delayedData } = await supabase.auth.getSession();
                    console.log("Delayed Session Check:", delayedData.session);
                    if (!delayedData.session) {
                        setError("No active session found. If you opened this link in a different browser than where you requested it, please copy the link and paste it into the original browser.");
                    }
                }, 2000);
            }
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setStatus('loading');

        const result = await updatePassword(newPassword);

        if (result.success) {
            setStatus('success');
        } else {
            setStatus('error');
            setError(result.message || "Failed to update password");
        }
    };

    if (status === 'success') {
        return (
            <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
                    <div style={{ color: '#10b981', marginBottom: '1.5rem' }}>
                        <CheckCircle size={48} style={{ margin: '0 auto' }} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Password Updated!</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Your password has been successfully changed.
                    </p>
                    <Link to="/" className="btn btn-primary" style={{ display: 'block', textDecoration: 'none' }}>
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textDecoration: 'none' }}>
                    <ArrowLeft size={18} /> Back to Login
                </Link>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem auto', color: '#3b82f6'
                    }}>
                        <Lock size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Set New Password</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Enter your new password below.</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="newPassword" style={{ display: 'block', marginBottom: '0.5rem' }}>New Password</label>
                        <input
                            type="password"
                            id="newPassword"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem' }}>Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem' }}
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
