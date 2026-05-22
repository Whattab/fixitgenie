import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useService } from '../context/ServiceContext';
import { useMessaging } from '../context/MessagingContext';
import { supabase } from '../lib/supabaseClient';
import { acceptBid } from '../lib/jobActions';
import { Clock, MapPin, DollarSign, User, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2, Shield, Star, MessageSquare, Pencil, ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReviewModal from '../components/ReviewModal';
import RequestQnA from '../components/RequestQnA';

export default function HomeownerDashboard() {
    const { user } = useAuth();
    const { deleteRequest } = useService();
    const { getOrCreateConversation } = useMessaging();
    const navigate = useNavigate();
    const [myRequests, setMyRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [expandedRequestId, setExpandedRequestId] = useState(null);

    // Review Modal State
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewTarget, setReviewTarget] = useState({ requestId: null, proId: null });

    // Gallery State
    const [activeTab, setActiveTab] = useState('requests');
    const [completedProjects, setCompletedProjects] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [newProject, setNewProject] = useState({
        before_image: '',
        after_image: '',
        notes: '',
        request_id: ''
    });

    useEffect(() => {
        if (user) {
            if (activeTab === 'requests') {
                fetchMyRequests();
            } else if (activeTab === 'gallery') {
                fetchProjects();
                // Ensure myRequests are loaded to populate the dropdown
                if (myRequests.length === 0) fetchMyRequests();
            }
        }
    }, [user, activeTab]);

    const fetchMyRequests = async () => {
        try {
            setLoading(true);
            // 1. Fetch my requests
            const { data: requests, error: reqError } = await supabase
                .from('service_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;

            // 2. Fetch bids for these requests
            if (requests && requests.length > 0) {
                const requestIds = requests.map(r => r.id);
                // Fetch bids (Raw)
                const { data: bids, error: bidError } = await supabase
                    .from('bids')
                    .select('*')
                    .in('request_id', requestIds);

                if (bidError) throw bidError;

                // 3. Fetch Pro Details Manually (Join Workaround)
                let proDetails = {};
                if (bids.length > 0) {
                    const proIds = [...new Set(bids.map(b => b.pro_id))];
                    const { data: pros, error: proError } = await supabase
                        .from('profiles')
                        .select('id, vetting_status, reviews!reviews_pro_id_fkey(rating)')
                        .in('id', proIds);

                    if (proError) console.error("Error fetching pro details:", proError);

                    if (pros) {
                        pros.forEach(p => {
                            proDetails[p.id] = p;
                        });
                    }
                }

                // Process bids to add avgRating and Vetting
                const processedBids = bids.map(bid => {
                    const profile = proDetails[bid.pro_id];
                    const reviews = profile?.reviews || [];
                    const avgRating = reviews.length > 0
                        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
                        : 0;

                    return {
                        ...bid,
                        avgRating: avgRating.toFixed(1),
                        reviewCount: reviews.length,
                        profiles: profile // Manual Attach
                    };
                });

                // Bind bids to requests
                const requestsWithBids = requests.map(req => ({
                    ...req,
                    bids: processedBids.filter(b => b.request_id === req.id)
                }));

                setMyRequests(requestsWithBids);
            } else {
                setMyRequests([]);
            }

        } catch (error) {
            console.error("Error fetching my requests:", error);
            setFetchError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptBid = async (bidId, requestId) => {
        if (!confirm("Are you sure you want to accept this bid? The professional will receive your contact information.")) return;
        const { success, error } = await acceptBid({ bidId, requestId });
        if (success) {
            alert("Bid accepted! Job started. Contact info is now shared.");
            fetchMyRequests();
        } else {
            alert("Failed to accept bid: " + error);
        }
    };

    const handleDeleteRequest = async (requestId) => {
        if (!confirm("Are you sure you want to DELETE this request? This action cannot be undone and will remove all bids.")) return;

        const { success, message } = await deleteRequest(requestId);
        if (success) {
            setMyRequests(prev => prev.filter(r => r.id !== requestId));
        } else {
            alert("Failed to delete request: " + message);
        }
    };

    const openReviewModal = (requestId, proId) => {
        setReviewTarget({ requestId, proId });
        setIsReviewOpen(true);
    };

    const handleMessagePro = async (requestId, proId) => {
        try {
            const conv = await getOrCreateConversation({
                requestId,
                homeownerId: user.id,
                proId,
            });
            navigate(`/messages?conversation=${conv.id}`);
        } catch (err) {
            console.error('[HomeownerDashboard] handleMessagePro error:', err);
            alert('Could not open conversation. Please try again.');
        }
    };

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('completed_projects')
                .select(`
                    *,
                    service_requests(category, details),
                    profiles:pro_id(name)
                `)
                .eq('homeowner_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setCompletedProjects(data || []);
        } catch (err) {
            console.error("Error fetching projects:", err);
        }
    };

    const handleImageUpload = (e, targetField) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("File is too large. Please select an image under 2MB.");
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewProject(prev => ({ ...prev, [targetField]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const submitProject = async (e) => {
        e.preventDefault();
        if (!newProject.before_image || !newProject.after_image) {
            alert("Please upload both before and after images.");
            return;
        }

        try {
            setIsUploading(true);
            
            // Find pro_id if request is selected
            let proIdToSave = null;
            if (newProject.request_id) {
                const req = myRequests.find(r => r.id.toString() === newProject.request_id);
                if (req && req.bids) {
                    const acceptedBid = req.bids.find(b => b.status === 'accepted');
                    if (acceptedBid) {
                        proIdToSave = acceptedBid.pro_id;
                    }
                }
            }

            const { error } = await supabase
                .from('completed_projects')
                .insert({
                    homeowner_id: user.id,
                    request_id: newProject.request_id || null,
                    pro_id: proIdToSave,
                    before_image: newProject.before_image,
                    after_image: newProject.after_image,
                    notes: newProject.notes
                });

            if (error) throw error;

            alert("Project added successfully!");
            setNewProject({ before_image: '', after_image: '', notes: '', request_id: '' });
            document.getElementById('beforeImageProj').value = '';
            document.getElementById('afterImageProj').value = '';
            fetchProjects();
        } catch (err) {
            console.error(err);
            alert("Failed to add project. Ensure database setup is completed.");
        } finally {
            setIsUploading(false);
        }
    };

    const deleteProject = async (id) => {
        if(!confirm("Delete this completed project?")) return;
        try {
            await supabase.from('completed_projects').delete().eq('id', id);
            setCompletedProjects(prev => prev.filter(p => p.id !== id));
        } catch(err) {
            console.error(err);
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Homeowner Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your requests, bids, and home improvement gallery.</p>
                </div>
                <Link to="/request-repair" className="btn btn-primary" style={{ display: activeTab === 'requests' ? 'block' : 'none' }}>
                    Post a Request
                </Link>
            </div>

            {/* Dashboard Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button 
                    onClick={() => setActiveTab('requests')}
                    style={{
                        padding: '1rem 2rem', background: 'none', border: 'none', color: activeTab === 'requests' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'requests' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    My Requests
                </button>
                <button 
                    onClick={() => setActiveTab('gallery')}
                    style={{
                        padding: '1rem 2rem', background: 'none', border: 'none', color: activeTab === 'gallery' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'gallery' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Project Gallery
                </button>
            </div>

            {activeTab === 'requests' && (
                <>
            {fetchError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <strong>Error loading requests:</strong> {fetchError}
                </div>
            )}

            {myRequests.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>You haven't posted any requests yet.</p>
                    <Link to="/request-repair" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                        Post a Request
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {myRequests.map(req => (
                        <div key={req.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <span style={{ background: 'var(--color-primary)', borderRadius: '12px', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                                            {req.category}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{req.details}</h3>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> {req.city_state || req.zip_code}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {req.urgency}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {(req.status === 'open' || !req.status) && (
                                            <Link
                                                to={`/edit-request/${req.id}`}
                                                title="Edit Request"
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.1)', border: 'none', borderRadius: '50%', width: '30px', height: '30px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#60a5fa', textDecoration: 'none'
                                                }}
                                            >
                                                <Pencil size={15} />
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => handleDeleteRequest(req.id)}
                                            title="Delete Request"
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '50%', width: '30px', height: '30px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <Link
                                            to={`/job/${req.id}`}
                                            title="View Job"
                                            style={{
                                                background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: '50%', width: '30px', height: '30px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary-light)', textDecoration: 'none'
                                            }}
                                        >
                                            <ArrowUpRight size={15} />
                                        </Link>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: req.bids?.length > 0 ? '#4ade80' : 'var(--text-muted)' }}>
                                            {req.bids?.length || 0}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bids Received</div>
                                    </div>
                                </div>
                            </div>

                            {/* Q&A Section */}
                            <RequestQnA requestId={req.id} isOwner={true} />

                            {/* Bids Section */}
                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                <button
                                    onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                                >
                                    {expandedRequestId === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    {expandedRequestId === req.id ? 'Hide Bids' : 'View Bids'}
                                </button>

                                {expandedRequestId === req.id && (
                                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {(!req.bids || req.bids.length === 0) && (
                                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No bids yet. Professionals are reviewing your request.</p>
                                        )}
                                        {req.bids && req.bids.map(bid => (
                                            <div key={bid.id} style={{
                                                background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px',
                                                border: bid.status === 'accepted' ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <User size={16} />
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <strong>{bid.pro_name}</strong>
                                                                {/* Verified Badge */}
                                                                {bid.profiles?.vetting_status === 'approved' && (
                                                                    <div title="Verified Professional" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(74, 222, 128, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '12px', border: '1px solid rgba(74, 222, 128, 0.4)' }}>
                                                                        <Shield size={12} color="#4ade80" fill="#4ade80" />
                                                                        <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 'bold' }}>VERIFIED</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Star Rating */}
                                                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#fbbf24', marginTop: '0.2rem' }}>
                                                                <Star size={12} fill={bid.avgRating > 0 ? "#fbbf24" : "none"} />
                                                                <span style={{ marginLeft: '0.3rem', fontWeight: 'bold' }}>{bid.avgRating}</span>
                                                                <span style={{ marginLeft: '0.3rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({bid.reviewCount})</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24', fontWeight: 'bold' }}>
                                                        <DollarSign size={16} /> {bid.price_estimate}
                                                    </div>
                                                </div>
                                                <p style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                                    "{bid.message}"
                                                </p>

                                                {bid.status === 'accepted' ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ color: '#4ade80', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <CheckCircle size={16} /> Bid Accepted - Contact info revealed
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                            <button
                                                                onClick={() => handleMessagePro(req.id, bid.pro_id)}
                                                                style={{
                                                                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
                                                                    color: '#60a5fa', padding: '0.3rem 0.8rem', borderRadius: '4px',
                                                                    cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                                }}
                                                            >
                                                                <MessageSquare size={14} /> Message
                                                            </button>
                                                            <button
                                                                onClick={() => openReviewModal(req.id, bid.pro_id)}
                                                                style={{
                                                                    background: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-primary)',
                                                                    padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem'
                                                                }}
                                                            >
                                                                Rate Experience
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => handleMessagePro(req.id, bid.pro_id)}
                                                            style={{
                                                                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
                                                                color: '#60a5fa', padding: '0.4rem 0.8rem', borderRadius: '4px',
                                                                cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                                                            }}
                                                        >
                                                            <MessageSquare size={14} /> Message {bid.pro_name?.split(' ')[0]}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptBid(bid.id, req.id)}
                                                            className="btn"
                                                            style={{
                                                                padding: '0.4rem 1rem', fontSize: '0.8rem', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            Accept Quote
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
            )}

            {activeTab === 'gallery' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Showcase a Completed Project</h2>
                        <form onSubmit={submitProject} style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Link to Finished Request (Optional)</label>
                                <select 
                                    value={newProject.request_id} 
                                    onChange={(e) => setNewProject({...newProject, request_id: e.target.value})}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                >
                                    <option value="">-- Standalone Home Improvement --</option>
                                    {myRequests.filter(req => req.status === 'assigned' || req.bids?.some(b => b.status === 'accepted')).map(req => (
                                        <option key={req.id} value={req.id}>
                                            {req.category} - {req.details.substring(0, 30)}...
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>"Before" Photo</label>
                                    <input type="file" id="beforeImageProj" accept="image/*" onChange={(e) => handleImageUpload(e, 'before_image')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>"After" Photo</label>
                                    <input type="file" id="afterImageProj" accept="image/*" onChange={(e) => handleImageUpload(e, 'after_image')} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} required />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Project Notes</label>
                                <textarea 
                                    value={newProject.notes} 
                                    onChange={(e) => setNewProject({...newProject, notes: e.target.value})}
                                    placeholder="Write about the repair, how it turned out, or who helped..."
                                    style={{ width: '100%', minHeight: '100px', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isUploading} style={{ maxWidth: '200px' }}>
                                {isUploading ? 'Saving...' : 'Add to Gallery'}
                            </button>
                        </form>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Your Project Gallery</h2>
                        {completedProjects.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>You haven't added any completed projects to your gallery yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {completedProjects.map(item => (
                                    <div key={item.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', height: '200px' }}>
                                            <div style={{ flex: 1, borderRight: '2px solid rgba(0,0,0,0.5)', position: 'relative' }}>
                                                <img src={item.before_image} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Before</span>
                                            </div>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <img src={item.after_image} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(34,197,94,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>After</span>
                                            </div>
                                        </div>
                                        <div style={{ padding: '1.5rem', position: 'relative' }}>
                                            {item.service_requests?.category && (
                                                <div style={{ display: 'inline-block', background: 'var(--color-primary-dark)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                                    {item.service_requests.category}
                                                </div>
                                            )}
                                            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: '1.5' }}>{item.notes}</p>
                                            
                                            {item.profiles?.name && (
                                                <p style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', marginBottom: '1rem' }}>
                                                    <Star size={12} style={{ marginRight: '4px', display: 'inline-block' }} /> 
                                                    Completed by {item.profiles.name}
                                                </p>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString()}</span>
                                                <button onClick={() => deleteProject(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer' }}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ReviewModal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                requestId={reviewTarget.requestId}
                proId={reviewTarget.proId}
                onReviewSubmitted={fetchMyRequests}
            />
        </div>
    );
}
