import { useState, useEffect } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReplyForm from './ReplyForm';
import './CommentsList.css';

/**
 * Real-time list of Instagram comments from Firestore
 */
export default function CommentsList() {
    const [comments, setComments] = useState([]);
    const [responses, setResponses] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'replied'
    const [selectedComment, setSelectedComment] = useState(null);

    // Load responses once
    useEffect(() => {
        const q = query(collection(db, 'instagram_responses'), orderBy('sentAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const resMap = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!resMap[data.originalCommentId]) {
                    resMap[data.originalCommentId] = [];
                }
                resMap[data.originalCommentId].push({
                    id: doc.id,
                    ...data,
                    sentAt: data.sentAt?.toDate?.() || new Date()
                });
            });
            setResponses(resMap);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Build query based on filter (only for top-level comments or all based on logic)
        // Note: In Instagram, comments with parentId are already replies. 
        // We usually want to show top-level comments and nest their replies.
        let q = query(
            collection(db, 'instagram_comments'),
            orderBy('createdAt', 'desc')
        );

        if (filter === 'pending') {
            q = query(
                collection(db, 'instagram_comments'),
                where('replied', '==', false),
                orderBy('createdAt', 'desc')
            );
        } else if (filter === 'replied') {
            q = query(
                collection(db, 'instagram_comments'),
                where('replied', '==', true),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            }));
            setComments(commentsData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching comments:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filter]);

    const handleReplySuccess = () => {
        setSelectedComment(null);
    };

    if (loading) {
        return (
            <div className="comments-loading">
                <div className="spinner"></div>
                <p>Cargando comentarios...</p>
            </div>
        );
    }

    return (
        <div className="comments-container">
            {/* Filter Tabs */}
            <div className="comments-filters">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    Todos
                </button>
                <button
                    className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Pendientes
                </button>
                <button
                    className={`filter-btn ${filter === 'replied' ? 'active' : ''}`}
                    onClick={() => setFilter('replied')}
                >
                    Respondidos
                </button>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
                <div className="comments-empty">
                    <p>No hay comentarios {filter !== 'all' ? `(${filter})` : ''}</p>
                </div>
            ) : (
                <div className="comments-list">
                    {comments.map(comment => (
                        <div key={comment.id} className="comment-group">
                            <div
                                className={`comment-card ${comment.replied ? 'replied' : 'pending'}`}
                            >
                                <div className="comment-header">
                                    <span className="comment-username">
                                        @{comment.from?.username || 'usuario'}
                                    </span>
                                    <span className="comment-time">
                                        {formatDate(comment.createdAt)}
                                    </span>
                                    <span className={`comment-status ${comment.replied ? 'replied' : 'pending'}`}>
                                        {comment.replied ? '✓ Respondido' : '• Pendiente'}
                                    </span>
                                </div>

                                <p className="comment-text">{comment.text}</p>

                                {!comment.replied && (
                                    <button
                                        className="reply-btn"
                                        onClick={() => setSelectedComment(comment)}
                                    >
                                        Responder
                                    </button>
                                )}
                            </div>

                            {/* Grouped Replies from our system */}
                            {responses[comment.id] && responses[comment.id].map(reply => (
                                <div key={reply.id} className="comment-reply-card">
                                    <div className="reply-connector"></div>
                                    <div className="reply-content">
                                        <div className="comment-header">
                                            <span className="comment-username admin-name">
                                                Tú (Respuesta)
                                            </span>
                                            <span className="comment-time">
                                                {formatDate(reply.sentAt)}
                                            </span>
                                        </div>
                                        <p className="comment-text">{reply.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Reply Modal */}
            {selectedComment && (
                <div className="reply-modal-overlay" onClick={() => setSelectedComment(null)}>
                    <div className="reply-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedComment(null)}>
                            ×
                        </button>
                        <ReplyForm
                            comment={selectedComment}
                            onSuccess={handleReplySuccess}
                            onCancel={() => setSelectedComment(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDate(date) {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;

    return date.toLocaleDateString('es', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}
