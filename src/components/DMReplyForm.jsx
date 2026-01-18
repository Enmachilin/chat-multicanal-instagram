import { useState } from 'react';
import './DMReplyForm.css';

/**
 * Form to send a DM reply to an Instagram user
 */
export default function DMReplyForm({ recipientId, commentId, onSuccess }) {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!message.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/instagram/dm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientId: recipientId,
                    commentId: commentId,
                    message: message.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Error al enviar mensaje');
            }

            setMessage('');
            onSuccess?.();

        } catch (err) {
            console.error('DM error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="dm-form" onSubmit={handleSubmit}>
            {error && (
                <div className="dm-error">
                    <span>⚠️</span> {error}
                </div>
            )}

            <div className="dm-input-row">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    maxLength={1000}
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !message.trim()}
                >
                    {loading ? (
                        <span className="btn-spinner"></span>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
                        </svg>
                    )}
                </button>
            </div>
        </form>
    );
}
