import { Component } from 'react';
import { Link } from 'react-router-dom';
import * as Sentry from "@sentry/react";

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to Sentry
        Sentry.captureException(error, { extra: errorInfo });
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handeReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        // Optionally redirect to home or reload
        window.location.href = '/';
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: '#0f172a',
                    color: 'white',
                    textAlign: 'center',
                    padding: '2rem'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>Oops! Something went wrong.</h1>
                    <p style={{ maxWidth: '600px', marginBottom: '2rem', color: '#94a3b8' }}>
                        We encountered an unexpected error. Please try refreshing the page or return home.
                    </p>

                    {/* Show technical details in dev only, or simplified in prod */}
                    <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '2rem',
                        textAlign: 'left',
                        maxWidth: '800px',
                        overflow: 'auto',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <code style={{ color: '#fbbf24', display: 'block', marginBottom: '0.5rem' }}>{this.state.error && this.state.error.toString()}</code>
                        {/* <pre style={{ fontSize: '0.8rem', opacity: 0.6 }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre> */}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn"
                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Refresh Page
                        </button>
                        <button
                            onClick={this.handeReset}
                            className="btn"
                            style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
