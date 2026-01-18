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

        // Query messages where participantId matches (either as sender or recipient)
        const q = query(
            collection(db, 'instagram_messages'),
            where('participantId', '==', selectedConversation.participantId),
            orderBy('createdAt', 'asc'), // Order by date ASC for natural chat flow
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const history = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            }));

            setMessages(history);
        }, (error) => {
            console.error('Error fetching messages:', error);
            // If index error occurs, we might need to fallback to client-side filtering temporarily
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
                                    {conv.participantUsername ? conv.participantUsername.slice(0, 2).toUpperCase() : '??'}
                                </div>
                                <div className="conv-info">
                                    <span className="conv-id">@{conv.participantUsername || `ID: ${conv.participantId?.slice(0, 10)}...`}</span>
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
                            <span>Chat con <strong>@{selectedConversation.participantUsername || selectedConversation.participantId}</strong></span>
                        </div>

                        <div className="chat-messages">
                            {messages.length === 0 ? (
                                <p className="chat-empty">No hay mensajes</p>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`message-bubble ${msg.fromMe ? 'outgoing' : 'incoming'}`}>
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
