import axios from 'axios';
import { db } from '../../lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

/**
 * Send a Direct Message to an Instagram user
 * 
 * POST body: { recipientId: string, message: string }
 */
export default async function handler(req, res) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { recipientId, message } = req.body;

        // Validate input
        if (!recipientId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: recipientId and message'
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                error: 'Message exceeds maximum length of 1000 characters'
            });
        }

        // Send DM via Instagram API (matching the user's working curl)
        const response = await axios.post(
            `${GRAPH_API_BASE}/me/messages`,
            {
                // Note: The user's curl uses stringified JSON for these fields
                recipient: JSON.stringify({ id: recipientId }),
                message: JSON.stringify({ text: message })
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN?.trim()}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000,
            }
        );

        const messageId = response.data.message_id;

        // Save sent message to Firestore
        const sentMessageDoc = {
            id: messageId,
            recipientId: recipientId,
            message: message,
            sentAt: FieldValue.serverTimestamp(),
            success: true,
        };

        await db.collection('instagram_sent_messages').doc(messageId).set(sentMessageDoc);

        // Update conversation
        const conversationId = `${process.env.INSTAGRAM_ACCOUNT_ID}_${recipientId}`;
        await db.collection('instagram_conversations').doc(conversationId).set({
            lastMessage: {
                text: message,
                timestamp: FieldValue.serverTimestamp(),
                fromUs: true,
            },
            unreadCount: 0, // Reset unread since we responded
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`✅ DM sent to ${recipientId}, message ID: ${messageId}`);

        return res.status(200).json({
            success: true,
            messageId: messageId,
        });

    } catch (error) {
        console.error('❌ Error sending DM:', error.response?.data || error.message);

        // Handle Instagram API errors
        if (error.response?.data?.error) {
            const igError = error.response.data.error;
            return res.status(400).json({
                error: 'Instagram API error',
                code: igError.code,
                message: igError.message,
            });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}
