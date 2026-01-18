import { useState } from 'react';
import './ReplyForm.css';

/**
 * Form to reply to an Instagram comment
 */
export default function ReplyForm({ comment, onSuccess, onCancel }) {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!message.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/instagram/reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commentId: comment.id,
                    message: message.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Error al enviar respuesta');
            }

            setMessage('');
            onSuccess?.();

        } catch (err) {
            console.error('Reply error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="reply-form" onSubmit={handleSubmit}>
            <h3 className="reply-form-title">Responder comentario</h3>

            {/* Original Comment Preview */}
            <div className="original-comment">
                <span className="original-username">@{comment.from?.username}</span>
                <p className="original-text">{comment.text}</p>
            </div>

            {/* Reply Input */}
            <div className="reply-input-group">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={3}
                    maxLength={8000}
                    disabled={loading}
                    autoFocus
                />
                <span className="char-count">{message.length}/8000</span>
            </div>

            {/* Error Message */}
            {error && (
                <div className="reply-error">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* Actions */}
            <div className="reply-actions">
                <button
                    type="button"
                    className="btn-cancel"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn-submit"
                    disabled={loading || !message.trim()}
                >
                    {loading ? (
                        <>
                            <span className="btn-spinner"></span>
                            Enviando...
                        </>
                    ) : (
                        'Enviar respuesta'
                    )}
                </button>
            </div>
        </form>
    );
}
