import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Shield, CheckCircle, Clock, AlertTriangle, FileText, Upload, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Verification() {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('ID'); // ID, License, Insurance, Other
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // If somehow a non-pro gets here
    if (!user || user.type !== 'professional') {
        return (
            <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
                <h2>Access Restricted</h2>
                <p>This page is only for Service Professionals.</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</Link>
            </div>
        );
    }

    useEffect(() => {
        fetchUploadedFiles();
    }, [user.id]);

    const fetchUploadedFiles = async () => {
        try {
            const { data, error } = await supabase.storage
                .from('vetting_docs')
                .list(user.id);

            if (error) throw error;
            setUploadedFiles(data || []);
        } catch (err) {
            console.error("Error fetching files:", err);
            // Don't block UI, just empty list
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            // Naming convention: [Type]_[Timestamp].[ext]
            const fileName = `${user.id}/${docType}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('vetting_docs')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Refresh list
            await fetchUploadedFiles();
            setFile(null); // Clear input

            // Reset file input value manually if needed, but react state unmount key trick is easier
            // or just rely on setFile(null) and controlled input (hard with file input). 
            // We'll just alert success.

        } catch (err) {
            console.error("Verification upload failed:", err);
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitApplication = async () => {
        if (uploadedFiles.length === 0) {
            setError("Please upload at least one document.");
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    vetting_status: 'pending',
                    vetting_notes: `Application with ${uploadedFiles.length} documents submitted.`
                })
                .eq('id', user.id);

            if (error) throw error;

            alert("Application submitted successfully!");
            window.location.reload(); // Refresh to update status context
        } catch (err) {
            console.error("Error submitting application:", err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const status = user.vetting_status || 'none';

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <Shield size={64} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Professional Verification</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Upload your credentials (ID, License, Insurance) to get verified.
                    </p>
                </div>

                {/* --- READ ONLY STATUSES --- */}
                {status === 'approved' && (
                    <div style={{
                        background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80',
                        padding: '2rem', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem'
                    }}>
                        <CheckCircle size={48} style={{ color: '#4ade80', marginBottom: '1rem' }} />
                        <h2 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>You are Verified!</h2>
                        <Link to="/my-bids" className="btn btn-primary">Go to Dashboard</Link>
                    </div>
                )}

                {status === 'pending' && (
                    <div style={{
                        background: 'rgba(251, 191, 36, 0.1)', border: '1px solid #f59e0b',
                        padding: '2rem', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem'
                    }}>
                        <Clock size={48} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
                        <h2 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Under Review</h2>
                        <p>We are reviewing your {uploadedFiles.length} documents.</p>
                    </div>
                )}

                {/* --- UPLOAD SECTION (Visible if Not Approved, or if Rejected/None/Pending allows adding more?) 
                    Let's allow adding more even if pending. 
                --- */}
                {status !== 'approved' && (
                    <div>
                        {status === 'rejected' && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
                                padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem'
                            }}>
                                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                                <div>
                                    <strong style={{ color: '#ef4444' }}>Application Rejected</strong>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                        Please review the admin's notes and upload corrected documents.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Your Documents</h3>
                            {uploadedFiles.length === 0 ? (
                                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No documents uploaded yet.
                                </div>
                            ) : (
                                <ul style={{ display: 'grid', gap: '0.5rem' }}>
                                    {uploadedFiles.map((f, idx) => (
                                        <li key={idx} style={{
                                            background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <FileText size={18} style={{ color: 'var(--color-secondary)' }} />
                                                <span>{f.name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {(f.metadata?.size / 1024).toFixed(1)} KB
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Upload Form */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Add New Document</h3>
                            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* Doc Type Selector */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Document Type</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {['ID', 'License', 'Insurance', 'Cert', 'Other'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setDocType(type)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '20px',
                                                    border: docType === type ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.2)',
                                                    background: docType === type ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                    color: docType === type ? '#60a5fa' : 'var(--text-muted)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* File Input */}
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/*,application/pdf"
                                    style={{ color: 'var(--text-muted)' }}
                                />

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="submit"
                                        className="btn"
                                        disabled={!file || uploading}
                                        style={{ background: 'var(--color-secondary)', color: 'white', opacity: (!file || uploading) ? 0.5 : 1 }}
                                    >
                                        {uploading ? 'Uploading...' : 'Upload Document'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Submit Application Button */}
                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Once you have uploaded all required files (ID + License), submit your application.
                            </p>
                            <button
                                onClick={handleSubmitApplication}
                                disabled={uploadedFiles.length === 0 || submitting || status === 'pending'}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: (uploadedFiles.length === 0 || status === 'pending') ? 0.5 : 1 }}
                            >
                                {status === 'pending' ? 'Application Under Review' : 'Submit Application for Review'}
                            </button>
                        </div>

                        {error && (
                            <div style={{ marginTop: '1rem', color: '#ef4444', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
