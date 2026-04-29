import { useState, useEffect } from 'react';
import QuestionForm from '../components/QuestionForm';
import { MessageSquare, ThumbsUp, User, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function Forum() {
    const [questions, setQuestions] = useState([]);
    const [activeReplyId, setActiveReplyId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const { user } = useAuth();

    // Edit states
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");

    useEffect(() => {
        fetchQuestions();

        // Subscribe to changes for both questions and replies
        const qChannel = supabase.channel('public:forum_questions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_questions' }, () => fetchQuestions())
            .subscribe();

        const rChannel = supabase.channel('public:forum_replies')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_replies' }, () => fetchQuestions())
            .subscribe();

        return () => {
            supabase.removeChannel(qChannel);
            supabase.removeChannel(rChannel);
        };
    }, []);

    const fetchQuestions = async () => {
        // Fetch questions AND their replies
        const { data, error } = await supabase
            .from('forum_questions')
            .select(`
                *,
                forum_replies (
                    id,
                    user_name,
                    text,
                    created_at,
                    user_id,
                    upvotes
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching forum data:", error);
        } else {
            // Transform data to match UI expectations
            // Supabase returns replies as 'forum_replies' property.
            // We map it to 'replies' and ensure variable names match.
            const formatted = data.map(q => ({
                id: q.id,
                name: q.name,
                email: q.email,
                category: q.category,
                question: q.question,
                timestamp: new Date(q.created_at).toLocaleString(), // Simple formatting
                upvotes: q.upvotes,
                media: q.media_url,
                mediaType: q.media_type,
                replies: q.forum_replies ? q.forum_replies.map(r => ({
                    id: r.id,
                    user: r.user_name,
                    userId: r.user_id,
                    text: r.text,
                    timestamp: new Date(r.created_at).toLocaleString(),
                    upvotes: r.upvotes || 0
                })).sort((a, b) => b.upvotes - a.upvotes) : []
            }));
            setQuestions(formatted);
        }
    };

    const handleNewQuestion = async (data) => {
        if (!user) {
            alert("You must be logged in to post.");
            return;
        }

        const createQuestion = async (mediaUrl = null, mediaType = null) => {
            const newQ = {
                user_id: user.id,
                name: user.name || data.name,
                email: user.email,
                category: data.category,
                question: data.question,
                media_url: mediaUrl,
                media_type: mediaType
            };

            const { error } = await supabase.from('forum_questions').insert([newQ]);
            if (error) {
                console.error("Error creating question:", error);
                alert("Failed to post question.");
            } else {
                fetchQuestions();
            }
        };

        if (data.media) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // WARNING: Storing base64 in DB text column is not ideal for large files.
                // For production, use Supabase Storage. For now, this mimics previous behavior.
                createQuestion(reader.result, data.media.type);
            };
            reader.readAsDataURL(data.media);
        } else {
            createQuestion();
        }
    };

    const handleUpvote = async (id) => {
        if (!user) {
            alert("Please log in to upvote.");
            return;
        }

        const q = questions.find(item => item.id === id);
        if (!q) return;

        if (user.email === q.email) {
            alert("You cannot upvote your own question.");
            return;
        }

        // Optimistic update
        setQuestions(prev => prev.map(item =>
            item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item
        ));

        const { error } = await supabase
            .from('forum_questions')
            .update({ upvotes: q.upvotes + 1 })
            .eq('id', id);

        if (error) {
            console.error("Upvote failed:", error);
            fetchQuestions(); // Revert on failure
        }
    };

    const handleReplyUpvote = async (replyId) => {
        if (!user) {
            alert("Please log in to upvote.");
            return;
        }

        let currentUpvotes = 0;
        let questionId = null;
        let replyOwnerId = null;
        for (const q of questions) {
            const reply = q.replies?.find(r => r.id === replyId);
            if (reply) {
                currentUpvotes = reply.upvotes;
                questionId = q.id;
                replyOwnerId = reply.userId;
                break;
            }
        }

        if (replyOwnerId && user.id === replyOwnerId) {
            alert("You cannot upvote your own reply.");
            return;
        }

        // Optimistic update
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    replies: q.replies.map(r =>
                        r.id === replyId ? { ...r, upvotes: currentUpvotes + 1 } : r
                    ).sort((a, b) => b.upvotes - a.upvotes)
                };
            }
            return q;
        }));

        const { error } = await supabase
            .from('forum_replies')
            .update({ upvotes: currentUpvotes + 1 })
            .eq('id', replyId);

        if (error) {
            console.error("Reply upvote failed:", error);
            fetchQuestions(); // Revert on failure
        }
    };

    const toggleReplyBox = (id) => {
        if (activeReplyId === id) {
            setActiveReplyId(null);
        } else {
            setActiveReplyId(id);
            setReplyText("");
        }
    };

    const submitReply = async (questionId) => {
        if (!replyText.trim()) return;
        if (!user) {
            alert("Please log in to reply.");
            return;
        }

        const newReply = {
            question_id: questionId,
            user_id: user.id,
            user_name: user.name || "User",
            text: replyText
        };

        const { error } = await supabase.from('forum_replies').insert([newReply]);

        if (error) {
            console.error("Reply failed:", error);
        } else {
            setReplyText("");
            // Refresh explicitly just in case remote subscription is disabled for replies table
            await fetchQuestions();
        }
    };

    const deleteQuestion = async (id) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            // Optimistic update for instant UI response
            setQuestions(prev => prev.filter(q => q.id !== id));
            
            const { error } = await supabase.from('forum_questions').delete().eq('id', id);
            if (error) {
                console.error("Delete failed:", error);
                fetchQuestions(); // Revert on failure
            }
        }
    };

    const deleteReply = async (id) => {
        if (window.confirm("Are you sure you want to delete this reply?")) {
            // Optimistic update for instant UI response
            setQuestions(prev => prev.map(q => ({
                ...q,
                replies: q.replies ? q.replies.filter(r => r.id !== id) : []
            })));

            const { error } = await supabase.from('forum_replies').delete().eq('id', id);
            if (error) {
                console.error("Delete reply failed:", error);
                fetchQuestions(); // Revert on failure
            }
        }
    };

    const startEdit = (q) => {
        setEditingId(q.id);
        setEditText(q.question);
    };

    const saveEdit = async (id) => {
        // Optimistic update for UI to feel instant
        setQuestions(prev => prev.map(q => 
            q.id === id ? { ...q, question: editText } : q
        ));
        setEditingId(null);

        const { error } = await supabase
            .from('forum_questions')
            .update({ question: editText })
            .eq('id', id);

        if (error) {
            console.error("Edit failed:", error);
            fetchQuestions(); // Revert on failure
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Community <span style={{ color: 'var(--color-primary-light)' }}>Forum</span></h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                    Ask questions, share advice, and connect with local homeowners and pros.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem' }}>
                {/* Left Column: Questions List */}
                <div>
                    <h2 style={{ marginBottom: '2rem', fontSize: '1.75rem' }}>Recent Questions</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {questions.length === 0 && (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No questions yet. Be the first to ask!
                            </div>
                        )}
                        {questions.map(q => (
                            <div key={q.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'transform 0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary-dark)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <User size={20} color="var(--color-primary-light)" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{q.name}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{q.timestamp}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <span style={{
                                            background: 'rgba(255,255,255,0.1)',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem',
                                            height: 'fit-content'
                                        }}>
                                            {q.category}
                                        </span>

                                        {user && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {user.email === q.email && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startEdit(q); }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                        title="Edit Question"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {(user.email === q.email || user.role === 'admin') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}
                                                        title="Delete Question"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {editingId === q.id ? (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.8rem', borderRadius: '8px',
                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                                                color: 'white', minHeight: '100px', marginBottom: '0.5rem'
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => saveEdit(q.id)}
                                                className="btn btn-primary"
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                style={{
                                                    padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'none',
                                                    border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>{q.question}</h4>
                                )}

                                {q.media && !editingId && (
                                    <div style={{ marginTop: '1rem', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                        {q.mediaType && q.mediaType.startsWith('video') ? (
                                            <video src={q.media} controls style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                                        ) : (
                                            <img src={q.media} alt="Question attachment" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleUpvote(q.id); }}
                                        style={{
                                            background: 'none', border: 'none', color: 'inherit',
                                            cursor: user?.email === q.email ? 'not-allowed' : 'pointer',
                                            opacity: user?.email === q.email ? 0.5 : 1,
                                            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.5rem',
                                            borderRadius: '4px', transition: 'background 0.2s'
                                        }}
                                        disabled={user?.email === q.email}
                                        onMouseOver={(e) => { if (user?.email !== q.email) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                        title={user?.email === q.email ? "You cannot upvote your own question" : "Upvote"}
                                    >
                                        <ThumbsUp size={16} /> {q.upvotes} Upvotes
                                    </button>
                                    <button
                                        onClick={() => toggleReplyBox(q.id)}
                                        style={{
                                            background: 'none', border: 'none', color: activeReplyId === q.id ? 'var(--color-primary-light)' : 'inherit', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.5rem',
                                            borderRadius: '4px', transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <MessageSquare size={16} /> {q.replies ? q.replies.length : 0} Replies
                                    </button>
                                </div>

                                {/* Replies Section */}
                                {(activeReplyId === q.id) && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        {/* Existing Replies */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                            {(q.replies && q.replies.length > 0) ? (
                                                q.replies.map(reply => (
                                                    <div key={reply.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                                                            <strong style={{ color: 'var(--color-primary-light)' }}>{reply.user}</strong>
                                                            <span style={{ color: 'var(--text-muted)' }}>{reply.timestamp}</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.95rem', lineHeight: '1.4', marginBottom: '0.5rem' }}>{reply.text}</p>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleReplyUpvote(reply.id); }}
                                                                style={{
                                                                    background: 'none', border: 'none', color: 'var(--text-muted)',
                                                                    cursor: user?.id === reply.userId ? 'not-allowed' : 'pointer',
                                                                    opacity: user?.id === reply.userId ? 0.5 : 1,
                                                                    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.5rem',
                                                                    borderRadius: '4px', transition: 'background 0.2s', fontSize: '0.85rem'
                                                                }}
                                                                disabled={user?.id === reply.userId}
                                                                onMouseOver={(e) => { if (user?.id !== reply.userId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                                                title={user?.id === reply.userId ? "You cannot upvote your own reply" : "Upvote"}
                                                            >
                                                                <ThumbsUp size={14} /> {reply.upvotes}
                                                            </button>
                                                            {user?.role === 'admin' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); deleteReply(reply.id); }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444', marginLeft: '0.5rem' }}
                                                                    title="Delete Reply"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No replies yet. Be the first!</p>
                                            )}
                                        </div>

                                        {/* Reply Input */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write a reply..."
                                                style={{
                                                    flex: 1, padding: '0.8rem', borderRadius: '8px',
                                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                                    color: 'white'
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') submitReply(q.id);
                                                }}
                                            />
                                            <button
                                                onClick={() => submitReply(q.id)}
                                                className="btn btn-primary"
                                                style={{ padding: '0 1.2rem', fontSize: '0.9rem' }}
                                            >
                                                Reply
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Key Info or Sidebar */}
                <div>
                    <div style={{ position: 'sticky', top: '100px' }}>
                        <QuestionForm onSubmit={handleNewQuestion} />
                    </div>
                </div>
            </div>
        </div>
    );
}
