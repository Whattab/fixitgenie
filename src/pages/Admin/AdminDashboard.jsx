import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Trash2, Shield, User, Search, ArrowUpCircle, ArrowDownCircle, CheckCircle, XCircle, FileText, AlertCircle, Edit, Mail, Star } from 'lucide-react';

export default function AdminDashboard() {
    const { allUsers, deleteUser, promoteUser, demoteUser, user, fetchAllUsers, resetPassword } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [verifications, setVerifications] = useState([]);
    const [loadingVerifications, setLoadingVerifications] = useState(false);
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'verifications'

    // Redirect or show access denied if not admin
    if (!user || user.role !== 'admin') {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center', color: 'white' }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    useEffect(() => {
        if (activeTab === 'verifications') {
            fetchPendingVerifications();
        }
    }, [activeTab]);

    const fetchPendingVerifications = async () => {
        setLoadingVerifications(true);
        try {
            // 1. Get profiles with 'pending' status
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('vetting_status', 'pending');

            if (error) throw error;

            // 2. For each profile, list their files in the 'vetting_docs' bucket
            const profilesWithDocs = await Promise.all(profiles.map(async (p) => {
                const { data: files } = await supabase.storage
                    .from('vetting_docs')
                    .list(p.id);

                // Generate signed URLs for viewing
                const docsWithUrls = await Promise.all((files || []).map(async (f) => {
                    const { data: signedData } = await supabase.storage
                        .from('vetting_docs')
                        .createSignedUrl(`${p.id}/${f.name}`, 3600); // 1 hour link
                    return { ...f, url: signedData?.signedUrl };
                }));

                return { ...p, docs: docsWithUrls };
            }));

            setVerifications(profilesWithDocs);
        } catch (error) {
            console.error("Error fetching verifications:", error);
            alert("Failed to load verifications.");
        } finally {
            setLoadingVerifications(false);
        }
    };

    const handleVerificationDecision = async (userId, status) => {
        const confirmMsg = status === 'approved'
            ? "Approve this professional? They will be able to bid immediately."
            : "Reject this application?";

        if (!window.confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ vetting_status: status })
                .eq('id', userId);

            if (error) throw error;

            // Also update the secondary onboarding data table
            const { error: detailsError } = await supabase
                .from('professional_details')
                .update({ status: status })
                .eq('pro_id', userId);

            if (detailsError) {
                console.error("Error updating professional_details status:", detailsError);
            }

            // Remove from local list
            setVerifications(prev => prev.filter(v => v.id !== userId));
            fetchAllUsers(); // Refresh the main users list immediately
            alert(`User ${status} successfully.`);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Action failed: " + error.message);
        }
    };

    const filteredUsers = allUsers.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id, email) => {
        if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
            deleteUser(id);
        }
    };

    const handlePromote = (id, name) => {
        if (window.confirm(`Are you sure you want to promote ${name} to Admin?`)) {
            promoteUser(id);
        }
    };

    const handleDemote = (id, name) => {
        if (window.confirm(`Are you sure you want to demote ${name} from Admin?`)) {
            demoteUser(id);
        }
    };

    const handlePasswordReset = async (email) => {
        if (window.confirm(`Send password reset email to ${email}?`)) {
            const result = await resetPassword(email);
            if (result.success) {
                alert(`Password reset email sent to ${email}`);
            } else {
                alert(`Failed to send reset email: ${result.message}`);
            }
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white' }}>Admin Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage users and platform activity</p>
                </div>

                {/* Stats / Toggles */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
                        style={{ border: activeTab !== 'users' ? '1px solid rgba(255,255,255,0.2)' : 'none' }}
                    >
                        <User size={18} style={{ marginRight: '0.5rem' }} /> Users
                    </button>
                    <button
                        onClick={() => setActiveTab('verifications')}
                        className={`btn ${activeTab === 'verifications' ? 'btn-primary' : ''}`}
                        style={{ border: activeTab !== 'verifications' ? '1px solid rgba(255,255,255,0.2)' : 'none', position: 'relative' }}
                    >
                        <Shield size={18} style={{ marginRight: '0.5rem' }} />
                        Verifications
                        {/* Badge number could go here if we fetched count globally */}
                    </button>
                </div>
            </div>

            {/* --- VERIFICATIONS TAB --- */}
            {activeTab === 'verifications' && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={24} style={{ color: '#fbbf24' }} /> Pending Reviews
                    </h2>

                    {loadingVerifications ? (
                        <p>Loading requests...</p>
                    ) : verifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>No pending verifications. All caught up!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {verifications.map(v => (
                                <div key={v.id} style={{
                                    background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{v.name}</h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{v.email}</p>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                                                Pending Review
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button
                                                onClick={() => handleVerificationDecision(v.id, 'rejected')}
                                                className="btn"
                                                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.5rem 1rem' }}
                                            >
                                                <XCircle size={18} style={{ marginRight: '0.5rem' }} /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleVerificationDecision(v.id, 'approved')}
                                                className="btn"
                                                style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem' }}
                                            >
                                                <CheckCircle size={18} style={{ marginRight: '0.5rem' }} /> Approve
                                            </button>
                                        </div>
                                    </div>

                                    {/* Documents */}
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Submitted Documents:</h4>
                                        {v.docs && v.docs.length > 0 ? (
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                {v.docs.map((doc, idx) => (
                                                    <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1rem', borderRadius: '8px',
                                                        color: 'var(--color-primary-light)', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        <FileText size={16} /> {doc.name}
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                                                <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                                                No documents found in folder.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- USERS TAB (Existing Functionality) --- */}
            {activeTab === 'users' && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>User</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Type</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Premium</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Vetting</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Email</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: u.role === 'admin' ? '#ef4444' : 'var(--color-primary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                                }}>
                                                    {u.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
                                                </div>
                                                <div style={{ fontWeight: '600', color: 'white' }}>{u.name}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem',
                                                background: u.type === 'professional' ? 'rgba(234, 88, 12, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                color: u.type === 'professional' ? '#fdba74' : '#93c5fd'
                                            }}>
                                                {u.role === 'admin' ? 'Administrator' : (u.type === 'professional' ? 'Professional' : 'Homeowner')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {u.is_premium ? (
                                                <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
                                                    <Star size={14} fill="#fbbf24" /> Premium
                                                </span>
                                            ) : (
                                                <span style={{ opacity: 0.5 }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {u.vetting_status === 'approved' && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} /> Verified</span>}
                                            {u.vetting_status === 'pending' && <span style={{ color: '#fbbf24' }}>Pending</span>}
                                            {u.vetting_status === 'rejected' && <span style={{ color: '#ef4444' }}>Rejected</span>}
                                            {u.vetting_status === 'none' && <span style={{ opacity: 0.5 }}>-</span>}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                {u.role !== 'admin' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handlePasswordReset(u.email)}
                                                            style={{
                                                                background: 'rgba(59, 130, 246, 0.1)',
                                                                color: '#60a5fa',
                                                                border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer'
                                                            }}
                                                            title="Send Password Reset"
                                                        >
                                                            <Mail size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handlePromote(u.id, u.name)}
                                                            style={{
                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                color: '#34d399',
                                                                border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer'
                                                            }}
                                                            title="Promote to Admin"
                                                        >
                                                            <ArrowUpCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(u.id, u.email)}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                color: '#f87171',
                                                                border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer'
                                                            }}
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    u.id !== user.id && (
                                                        <button
                                                            onClick={() => handleDemote(u.id, u.name)}
                                                            style={{
                                                                background: 'rgba(234, 88, 12, 0.1)',
                                                                color: '#fb923c',
                                                                border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer'
                                                            }}
                                                            title="Demote from Admin"
                                                        >
                                                            <ArrowDownCircle size={18} />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No users found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
