import { Link } from 'react-router-dom';
import { MessageCircle, Wrench, DollarSign, Zap, Mail, HelpCircle, Briefcase } from 'lucide-react';

export default function About() {
    return (
        <div className="container" style={{ padding: '2rem 1rem 4rem 1rem' }}>

            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
                padding: '4rem 2rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                marginBottom: '3rem',
                position: 'relative',
                overflow: 'hidden'
            }} className="animate-fade-in">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>About Fixit Genie</h1>
                    <p style={{ fontSize: '1.25rem', opacity: '0.9', maxWidth: '700px', margin: '0 auto' }}>
                        Your trusted community for home repair advice and professional services.
                    </p>
                </div>
            </div>

            {/* Mission Section */}
            <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--color-secondary)', fontSize: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    Our Mission
                </h2>
                <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
                    <p style={{ marginBottom: '1rem' }}>
                        Fixit Genie was created to solve a common problem every homeowner faces: <strong>Where do you turn when something breaks?</strong> Whether you need quick DIY advice or a trusted professional, finding the right help shouldn't be complicated or expensive.
                    </p>
                    <p>
                        We've built a platform that connects homeowners with both community wisdom and qualified professionals, all in one convenient place. Get free advice from fellow homeowners who've been there, or receive competitive bids from verified pros ready to help.
                    </p>
                </div>
            </div>

            {/* How It Works */}
            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>How It Works</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                    {/* Step 1 */}
                    <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', fontWeight: '800',
                            opacity: '0.05', color: 'white', pointerEvents: 'none'
                        }}>1</div>
                        <h3 style={{ color: 'var(--color-primary-light)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ background: 'var(--color-primary)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'white' }}>1</span>
                            Ask the Community
                        </h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Post your home repair questions in our Community Forum and get advice from experienced homeowners who've tackled similar projects.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', fontWeight: '800',
                            opacity: '0.05', color: 'white', pointerEvents: 'none'
                        }}>2</div>
                        <h3 style={{ color: 'var(--color-primary-light)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ background: 'var(--color-primary)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'white' }}>2</span>
                            Request Professional Help
                        </h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Need a pro? Post a Service Request with details about your project and receive competitive bids from qualified professionals.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', fontWeight: '800',
                            opacity: '0.05', color: 'white', pointerEvents: 'none'
                        }}>3</div>
                        <h3 style={{ color: 'var(--color-primary-light)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ background: 'var(--color-primary)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'white' }}>3</span>
                            Compare & Choose
                        </h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Review multiple bids, compare prices and credentials, then hire the professional that's the best fit for your project and budget.
                        </p>
                    </div>
                </div>
            </div>

            {/* Who We Serve */}
            <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Who We Serve</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div>
                        <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageCircle size={24} /> Homeowners
                        </h3>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                            Whether you're a DIY enthusiast looking for guidance or need professional help with a repair, Fixit Genie connects you with the resources you need. Get free community advice, or post service requests to receive competitive bids from local professionals.
                        </p>
                    </div>
                    <div>
                        <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Wrench size={24} /> Professional Traders
                        </h3>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                            Licensed contractors, plumbers, electricians, and other home service professionals use Fixit Genie to find new clients. Bid on projects that match your expertise and grow your business with qualified leads.
                        </p>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div style={{ marginBottom: '4rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>What Makes Us Different</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>

                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'transform 0.2s', cursor: 'default' }}>
                        <div style={{ color: 'var(--color-primary-light)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                            <MessageCircle size={40} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Community-Driven</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Get free advice from community homeowners</p>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        <div style={{ color: 'var(--color-primary-light)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                            <Wrench size={40} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Professional Network</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Connect with qualified pros for any job</p>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        <div style={{ color: 'var(--color-primary-light)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                            <DollarSign size={40} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Competitive Bidding</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Compare quotes to get the best value</p>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        <div style={{ color: 'var(--color-primary-light)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                            <Zap size={40} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>All-in-One</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>DIY advice and professional services </p>
                    </div>

                </div>
            </div>

            {/* Contact & Support */}
            <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '3rem', borderLeft: '4px solid var(--color-secondary)' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Contact & Support</h2>
                <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Have questions about Fixit Genie? We're here to help!</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', items: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                        <Mail size={20} style={{ color: 'var(--color-secondary)' }} />
                        <span><strong>Email:</strong> support@fixitgenie.com</span>
                    </div>
                    <div style={{ display: 'flex', items: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                        <HelpCircle size={20} style={{ color: 'var(--color-secondary)' }} />
                        <span><strong>FAQ:</strong> Visit our Help Center</span>
                    </div>
                    <div style={{ display: 'flex', items: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                        <Briefcase size={20} style={{ color: 'var(--color-secondary)' }} />
                        <span><strong>Business:</strong> partnerships@fixitgenie.com</span>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div style={{
                background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
                padding: '3rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ready to Get Started?</h2>
                <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: '0.9' }}>
                    Join thousands of homeowners and professionals already using Fixit Genie.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/signup">
                        <button className="btn" style={{ background: 'white', color: 'var(--color-primary-dark)', padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                            Get Started Today
                        </button>
                    </Link>
                    <Link to="/login">
                        <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '1rem 2.5rem', fontSize: '1.1rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                            Log In
                        </button>
                    </Link>
                </div>
            </div>

        </div>
    );
}
