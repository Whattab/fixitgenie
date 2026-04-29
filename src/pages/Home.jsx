import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


export default function Home() {
    const navigate = useNavigate();
    const { user } = useAuth();
    console.log('Home Render - User:', user);
    console.log('User Type:', user?.type);

    return (
        <section className="hero" style={{
            minHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Ambient Glow */}
            <div className="hero-bg-blur-1"></div>
            <div className="hero-bg-blur-2"></div>

            <div className="container hero-layout">
                <div className="animate-fade-in">
                    <span style={{
                        color: 'var(--color-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        marginBottom: '1rem',
                        display: 'block'
                    }}>
                        HOME REPAIRS • REAL ANSWERS • TRUSTED PROS
                    </span>
                    <h1 className="hero-title">
                        Fix Your Home <br />
                        <span style={{
                            background: 'linear-gradient(to right, var(--color-primary-light), var(--color-secondary))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>with Confidence</span>
                    </h1>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '1.25rem',
                        marginBottom: '2.5rem',
                        maxWidth: '500px',
                        lineHeight: '1.6'
                    }}>
                        Get expert advice, real homeowner insights, or hire a professional—whatever your home repair needs.
                    </p>
                    <div className="hero-buttons">
                        {user?.type === 'professional' ? (
                            <button onClick={() => navigate('/services')} className="btn btn-primary hero-btn">
                                Find Jobs
                            </button>
                        ) : (
                            <button onClick={() => navigate('/request-repair')} className="btn btn-primary hero-btn">
                                Request Service
                            </button>
                        )}
                        <button onClick={() => navigate('/forum')} className="btn hero-btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            Ask a Question
                        </button>
                    </div>
                </div>

                <div className="glass-panel animate-fade-in" style={{
                    padding: '2rem',
                    minHeight: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    animationDelay: '0.2s'
                }}>
                    {/* Placeholder for Hero Image or 3D element */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            margin: '0 auto 1.5rem',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            borderRadius: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '3rem',
                            boxShadow: '0 20px 50px -10px var(--color-primary)'
                        }}>
                            🛠️
                        </div>
                        <h3>Quick Service</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Trusted by 10k+ customers</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
