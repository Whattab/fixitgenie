import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Send, CornerDownRight, CheckCircle, Lock } from 'lucide-react';

export default function RequestQnA({ requestId, isOwner }) {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState('');
    const [answeringId, setAnsweringId] = useState(null);
    const [answerText, setAnswerText] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, [requestId]);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('service_request_questions')
                .select(`
                    *,
                    pro:profiles!pro_id (name)
                `)
                .eq('request_id', requestId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setQuestions(data || []);
        } catch (error) {
            console.error("Error fetching questions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAskQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;

        try {
            const { error } = await supabase
                .from('service_request_questions')
                .insert({
                    request_id: requestId,
                    pro_id: user.id,
                    question: newQuestion.trim()
                });

            if (error) throw error;

            setNewQuestion('');
            fetchQuestions(); // Refresh list
        } catch (error) {
            alert("Failed to post question: " + error.message);
        }
    };

    const handleAnswerQuestion = async (questionId) => {
        if (!answerText.trim()) return;

        try {
            const { error } = await supabase
                .from('service_request_questions')
                .update({
                    answer: answerText.trim(),
                    answered_at: new Date().toISOString()
                })
                .eq('id', questionId);

            if (error) throw error;

            setAnsweringId(null);
            setAnswerText('');
            fetchQuestions();
        } catch (error) {
            alert("Failed to submit answer: " + error.message);
        }
    };

    // Calculate badge stats
    const questionCount = questions.length;
    const unansweredCount = questions.filter(q => !q.answer).length;

    return (
        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="btn"
                style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    padding: '0.5rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                <MessageCircle size={16} />
                Q&A ({questionCount})
                {isOwner && unansweredCount > 0 && (
                    <span style={{
                        background: '#ef4444', color: 'white', fontSize: '0.7rem',
                        padding: '0.1rem 0.4rem', borderRadius: '10px'
                    }}>
                        {unansweredCount} New
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="animate-fade-in" style={{ padding: '0.5rem 0' }}>

                    {/* List Questions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                        {loading ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading Q&A...</div>
                        ) : questions.length === 0 ? (
                            <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', opacity: 0.7 }}>
                                No questions asked yet.
                            </div>
                        ) : (
                            questions.map(q => (
                                <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem' }}>
                                    {/* Question */}
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ minWidth: '24px', paddingTop: '2px' }}>
                                            <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>Q</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '0.2rem' }}>
                                                {q.question}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Asked by {q.pro?.name || 'Professional'} • {new Date(q.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Answer */}
                                    {q.answer ? (
                                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ minWidth: '24px', paddingTop: '2px' }}>
                                                <CornerDownRight size={16} style={{ color: '#4ade80' }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                                    {q.answer}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#4ade80', marginTop: '0.2rem' }}>
                                                    Answered by Homeowner
                                                </div>
                                            </div>
                                        </div>
                                    ) : isOwner ? (
                                        /* Owner Answer Form */
                                        <div style={{ marginTop: '0.75rem', paddingLeft: '2rem' }}>
                                            {answeringId === q.id ? (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={answerText}
                                                        onChange={(e) => setAnswerText(e.target.value)}
                                                        placeholder="Type your answer..."
                                                        style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #4ade80', background: 'transparent', color: 'white' }}
                                                    />
                                                    <button onClick={() => handleAnswerQuestion(q.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Save</button>
                                                    <button onClick={() => setAnsweringId(null)} className="btn" style={{ padding: '0.4rem', background: 'transparent', color: 'var(--text-muted)' }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setAnsweringId(q.id); setAnswerText(''); }}
                                                    style={{ color: '#4ade80', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Answer this question
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '0.5rem', paddingLeft: '2.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            Waiting for answer...
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Ask Form (Only for Pros) */}
                    {!isOwner && user?.type === 'professional' && (
                        <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder="Ask a clarification question..."
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white'
                                }}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={!newQuestion.trim()}
                                style={{ padding: '0 1.5rem' }}
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    )}

                    {!user && (
                        <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <Link to="/login" style={{ color: 'var(--color-primary)' }}>Log in</Link> to ask a question.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
