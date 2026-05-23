import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Star, X } from 'lucide-react';

/**
 * ReviewModal — submit OR edit the homeowner's review for a specific job.
 * One review per (request_id, reviewer_id) is enforced at the DB level
 * by a unique constraint added in reviews_v2_constraints.sql.
 */
export default function ReviewModal({ isOpen, onClose, requestId, proId, onReviewSubmitted }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [existingReviewId, setExistingReviewId] = useState(null);
    const [loading, setLoading] = useState(false);

    // When the modal opens, check if this user has already reviewed this job.
    // If yes, pre-fill the form and switch into "edit" mode.
    useEffect(() => {
        if (!isOpen || !requestId) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setLoading(false); return; }

                const { data, error } = await supabase
                    .from('reviews')
                    .select('id, rating, comment')
                    .eq('request_id', requestId)
                    .eq('reviewer_id', user.id)
                    .maybeSingle();

                if (cancelled) return;
                if (error) { console.error('[ReviewModal] check existing error:', error); }

                if (data) {
                    setExistingReviewId(data.id);
                    setRating(data.rating ?? 0);
                    setComment(data.comment ?? '');
                } else {
                    setExistingReviewId(null);
                    setRating(0);
                    setComment('');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [isOpen, requestId]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            alert("Please select a star rating.");
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (existingReviewId) {
                // Edit existing review (UPDATE)
                const { error } = await supabase
                    .from('reviews')
                    .update({ rating, comment })
                    .eq('id', existingReviewId);
                if (error) throw error;
                alert('Your review has been updated.');
            } else {
                // New review (INSERT). The unique constraint will reject duplicates.
                const { error } = await supabase
                    .from('reviews')
                    .insert({
                        request_id: requestId,
                        pro_id: proId,
                        reviewer_id: user.id,
                        rating,
                        comment,
                    });
                if (error) {
                    // If a duplicate slipped through (e.g. concurrent insert), surface clearly.
                    if (error.code === '23505') {
                        alert('You have already reviewed this job. Reopen the modal to edit it.');
                    } else {
                        throw error;
                    }
                } else {
                    alert('Review submitted! Thank you.');
                }
            }

            onReviewSubmitted();
            onClose();
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const headerTitle = existingReviewId ? 'Edit Your Review' : 'Rate Your Experience';
    const submitLabel = existingReviewId ? 'Save Changes' : 'Submit Review';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{headerTitle}</h2>

                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</p>
                ) : (
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    transform: (hoverRating || rating) >= star ? 'scale(1.2)' : 'scale(1)',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                <Star
                                    size={32}
                                    fill={(hoverRating || rating) >= star ? "#fbbf24" : "none"}
                                    color={(hoverRating || rating) >= star ? "#fbbf24" : "#4b5563"}
                                />
                            </button>
                        ))}
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Comments (Optional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="How was the service? Would you recommend this pro?"
                            rows={4}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-main)', resize: 'vertical'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                    >
                        {submitting ? 'Submitting...' : submitLabel}
                    </button>
                </form>
                )}
            </div>
        </div>
    );
}
