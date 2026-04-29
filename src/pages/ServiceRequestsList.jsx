import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useService } from '../context/ServiceContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import BidModal from '../components/BidModal';
import RequestQnA from '../components/RequestQnA';
import { Clock, MapPin, Wrench, User, ChevronDown, ChevronUp, Phone, Mail, Shield, Trash2, Filter } from 'lucide-react';

const ServiceRequestCard = ({ request }) => {
    const { user } = useAuth();
    const { deleteRequest } = useService();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [showBidModal, setShowBidModal] = useState(false);

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this service request?")) return;
        const { success, message } = await deleteRequest(request.id);
        if (!success) alert("Failed to delete request: " + message);
    };

    // Determines if the current viewer is the owner of the request
    const isOwner = user && user.id === request.userId;
    // In a future step, we'll also check if the viewer is an ACCEPTED pro to show info

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{
                        background: 'var(--color-primary)', color: 'white',
                        padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                    }}>
                        {request.category}
                    </span>
                    {user?.role === 'admin' && (
                        <button
                            onClick={handleDelete}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                            title="Delete Request"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(request.createdAt).toLocaleDateString()}
                </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', lineHeight: '1.4' }}>{request.details}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <Clock size={16} />
                    <span>Urgency: <strong style={{ color: request.urgency === 'Emergency' ? '#ef4444' : 'var(--text-main)' }}>{request.urgency}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <MapPin size={16} />
                    <span>{request.cityState || request.zipCode}</span>
                </div>
                {/* Hide Name if not owner, for extra privacy, or show generic "Homeowner" */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <User size={16} />
                    <span>{isOwner ? request.contactName : 'Homeowner (Private)'}</span>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div style={{
                    marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)',
                    animation: 'fadeIn 0.3s'
                }}>
                    {/* Additional Job Details */}
                    <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Property Details</h4>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
                                <li>Type: <strong>{request.propertyType}</strong></li>
                                <li>Age: <strong>{request.homeAge}</strong></li>
                                <li>Primary Residence: <strong>{request.primaryResidence}</strong></li>
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Service Preferences</h4>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
                                <li>Goal: <strong>{request.serviceGoal}</strong></li>
                                <li>Timing: <strong>{request.serviceTime}</strong></li>
                                <li>Problem Started: <strong>{request.startTime}</strong></li>
                            </ul>
                        </div>
                    </div>

                    {/* Q&A Section */}
                    <RequestQnA requestId={request.id} isOwner={isOwner} />

                    {/* Contact Info / Privacy Shield */}
                    <div style={{ marginTop: '1rem' }}>
                        {isOwner ? (
                            <>
                                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>data (Visible only to you)</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <Mail size={16} />
                                        <span>{request.contactEmail}</span>
                                    </div>
                                    {request.contactPhone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Phone size={16} />
                                            <span>{request.contactPhone}</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--color-primary)' }}>
                                    Waiting for bids from professionals...
                                </div>
                            </>
                        ) : (
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px dashed #3b82f6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#60a5fa' }}>
                                    <Shield size={18} /> <strong>Private Request</strong>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, marginBottom: '1rem' }}>
                                    Contact details are hidden to protect privacy. Place a bid below to introduce yourself.
                                </p>
                                {user?.type === 'homeowner' ? (
                                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                            <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            Bidding is reserved for Professionals.
                                        </p>
                                    </div>
                                ) : user?.type === 'professional' && user?.vetting_status !== 'approved' ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                            Verification Required to Bid
                                        </p>
                                        <Link to="/verification" className="btn" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', justifyContent: 'center' }}>
                                            Verify Account
                                        </Link>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                navigate('/login', { state: { from: `/services` } });
                                                return;
                                            }
                                            setShowBidModal(true);
                                        }}
                                        className="btn btn-primary"
                                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Mail size={18} /> Place Bid / Contact
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={() => setExpanded(!expanded)}
                className="btn"
                style={{
                    width: '100%',
                    marginTop: expanded ? '0.5rem' : 'auto',
                    padding: '0.75rem',
                    background: expanded ? 'rgba(255,255,255,0.05)' : 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                }}
            >
                {expanded ? (
                    <>Close Details <ChevronUp size={18} /></>
                ) : (
                    <>Review Details & Bid <ChevronDown size={18} /></>
                )}
            </button>

            {/* Bid Modal */}
            {showBidModal && (
                <BidModal request={request} onClose={() => setShowBidModal(false)} />
            )}
        </div>
    );
};

const ServiceRequestsList = () => {
    const { requests } = useService();
    const { user } = useAuth();
    
    // Zipcode matching state
    const [filterByZip, setFilterByZip] = useState(false);
    const [userZip, setUserZip] = useState('');

    useEffect(() => {
        if (user && (user.type === 'professional' || user.role === 'admin')) {
            const fetchZip = async () => {
                try {
                    const { data } = await supabase.from('profiles').select('active_zipcode').eq('id', user.id).single();
                    if (data && data.active_zipcode) {
                        setUserZip(data.active_zipcode);
                    }
                } catch(e) {
                    console.error("Failed to fetch zip", e);
                }
            };
            fetchZip();
        }
    }, [user]);

    // In a real app, we might filter this so only pros can see it, 
    // but for now we'll let everyone see it or just warn.
    const isPro = user?.type === 'professional' || user?.role === 'admin';

    // Apply Filters
    let displayedRequests = requests;
    if (filterByZip && userZip) {
        displayedRequests = requests.filter(req => req.zipCode === userZip || (req.cityState && req.cityState.includes(userZip)));
    }

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Available Service Requests</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isPro
                            ? "Browse requests from homeowners in your area."
                            : "Here are the current requests posted by homeowners."}
                    </p>
                </div>
                
                {isPro && userZip && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={18} color="var(--color-primary-light)" />
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Work Area</div>
                                <strong>{userZip}</strong>
                            </div>
                        </div>
                        <button 
                            onClick={() => setFilterByZip(!filterByZip)} 
                            className={`btn ${filterByZip ? 'btn-primary' : ''}`}
                            style={{ 
                                padding: '0.5rem 1rem', fontSize: '0.9rem', 
                                background: filterByZip ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', 
                                border: '1px solid ' + (filterByZip ? 'transparent' : 'rgba(255,255,255,0.1)'),
                                color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <Filter size={16} />
                            {filterByZip ? 'Showing Local Jobs' : 'Filter Local Jobs'}
                        </button>
                    </div>
                )}
            </div>

            {displayedRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>No Requests Found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {filterByZip ? `There are currently no active service requests in zipcode ${userZip}.` : 'There are currently no active service requests.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {displayedRequests.map(request => (
                        <ServiceRequestCard key={request.id} request={request} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ServiceRequestsList;
