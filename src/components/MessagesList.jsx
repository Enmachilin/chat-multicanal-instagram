import { useState, useEffect } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import DMReplyForm from './DMReplyForm';
import './MessagesList.css';

/**
 * Real-time list of Instagram DMs (conversations) from Firestore
 */
export default function MessagesList() {
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load conversations
    useEffect(() => {
        const q = query(
            collection(db, 'instagram_conversations'),
            orderBy('updatedAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
            }));
            setConversations(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Load messages for selected conversation
    useEffect(() => {
        if (!selectedConversation) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, 'instagram_messages'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            }));

            // Filter by conversation participant
            const filtered = allMessages.filter(
                m => m.from?.id === selectedConversation.participantId
            );
            setMessages(filtered);
        });

        return () => unsubscribe();
    }, [selectedConversation]);

    const handleReplySuccess = () => {
        // Message sent, list will update via Firestore listener
    };

    if (loading) {
        return (
            <div className="messages-loading">
                <div className="spinner"></div>
                <p>Cargando conversaciones...</p>
            </div>
        );
    }

    return (
        <div className="messages-container">
            {/* Conversations Sidebar */}
            <div className="conversations-sidebar">
                <h3 className="sidebar-title">Conversaciones</h3>
                {conversations.length === 0 ? (
                    <p className="sidebar-empty">No hay mensajes</p>
                ) : (
                    <div className="conversations-list">
                        {conversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                                onClick={() => setSelectedConversation(conv)}
                            >
                                <div className="conv-avatar">
                                    {conv.participantId?.slice(-2) || '??'}
                                </div>
                                <div className="conv-info">
                                    <span className="conv-id">ID: {conv.participantId?.slice(0, 10)}...</span>
                                    <p className="conv-preview">{conv.lastMessage?.text?.slice(0, 40)}...</p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <span className="unread-badge">{conv.unreadCount}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className="chat-area">
                {!selectedConversation ? (
                    <div className="chat-placeholder">
                        <p>Selecciona una conversación</p>
                    </div>
                ) : (
                    <>
                        <div className="chat-header">
                            <span>Usuario ID: {selectedConversation.participantId}</span>
                        </div>

                        <div className="chat-messages">
                            {messages.length === 0 ? (
                                <p className="chat-empty">No hay mensajes</p>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className="message-bubble incoming">
                                        <p>{msg.text}</p>
                                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <DMReplyForm
                            recipientId={selectedConversation.participantId}
                            onSuccess={handleReplySuccess}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

function formatTime(date) {
    if (!date) return '';
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
