import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import { LogOut, User, Shield, Home as HomeIcon, MessageSquare, Wrench, Search, Info } from 'lucide-react';

const Header = () => {
    const { user, logout } = useAuth();
    const { totalUnread } = useMessaging();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
            paddingBottom: '1.5rem',
            zIndex: 100,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(10, 10, 20, 0.8)',
            backdropFilter: 'blur(10px)'
        }}>
            <div className="container header-layout" style={{ maxWidth: '95%' }}>
                <Link to="/" style={{ textDecoration: 'none', marginRight: '1rem' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#fff', whiteSpace: 'nowrap' }}>
                        <img src="/logo.png" alt="Fixit Genie Logo" style={{ height: '40px', width: 'auto' }} />
                        <span><span style={{ color: 'var(--color-primary)' }}>Fixit</span> Genie</span>
                    </div>
                </Link>
                <nav className="header-nav">
                    <Link to="/" className="nav-link" style={{ color: 'var(--text-main)' }}>
                        <HomeIcon className="nav-icon" size={24} />
                        <span className="nav-text">Home</span>
                    </Link>
                    <Link to="/forum" className="nav-link" style={{ color: 'var(--text-main)' }}>
                        <MessageSquare className="nav-icon" size={24} />
                        <span className="nav-text">Community Forum</span>
                    </Link>
                    <Link to="/services" className="nav-link" style={{ color: 'var(--text-main)' }}>
                        <Wrench className="nav-icon" size={24} />
                        <span className="nav-text">Service Requests</span>
                    </Link>
                    <Link to="/professionals" className="nav-link" style={{ color: 'var(--text-main)' }}>
                        <Search className="nav-icon" size={24} />
                        <span className="nav-text">Professional Directory</span>
                    </Link>
                    <Link to="/about" className="nav-link" style={{ color: 'var(--text-muted)' }}>
                        <Info className="nav-icon" size={24} />
                        <span className="nav-text">About</span>
                    </Link>
                    {user && (
                        <Link to="/messages" className="nav-link" style={{ color: 'var(--text-main)', position: 'relative' }}>
                            <MessageSquare className="nav-icon" size={24} />
                            <span className="nav-text">Messages</span>
                            {totalUnread > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-4px', right: '-6px',
                                    background: '#ef4444', color: 'white',
                                    fontSize: '0.65rem', fontWeight: 700,
                                    padding: '0.1rem 0.35rem', borderRadius: '10px',
                                    lineHeight: 1.2, minWidth: '16px', textAlign: 'center',
                                }}>
                                    {totalUnread > 9 ? '9+' : totalUnread}
                                </span>
                            )}
                        </Link>
                    )}
                </nav>
                <div className="header-actions">
                    {user ? (
                        <>
                            {user.role === 'admin' && (
                                <Link to="/admin" style={{ color: '#ef4444', fontWeight: '600', marginRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Shield size={16} /> Admin Panel
                                </Link>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginRight: '0.5rem' }}>
                                <div style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', overflow: 'hidden' }}>
                                    {user.avatar ? (
                                        <img src={user.avatar} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={16} />
                                    )}
                                </div>
                                <span style={{ whiteSpace: 'nowrap', fontSize: '0.9rem' }}>Welcome, <strong>{user.name}</strong></span>
                            </div>
                            {user.type === 'professional' ? (
                                <Link to="/my-bids" style={{ color: 'var(--text-main)', marginRight: '0.5rem', fontWeight: '500' }}>
                                    Pro Dashboard
                                </Link>
                            ) : (
                                <Link to="/my-requests" style={{ color: 'var(--text-main)', marginRight: '0.5rem', fontWeight: '500' }}>
                                    My Requests
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="btn"
                                style={{
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">
                                <button className="btn" style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                    Log In
                                </button>
                            </Link>
                            <Link to="/signup">
                                <button className="btn btn-primary">
                                    Signup
                                </button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
