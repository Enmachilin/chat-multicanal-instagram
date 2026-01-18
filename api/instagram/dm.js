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
        const { recipientId, message, commentId } = req.body;

        // Validate input
        if (!recipientId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: recipientId and message'
            });
        }

        // Clean token
        let token = process.env.META_ACCESS_TOKEN?.trim() || '';
        if (token.startsWith('"') && token.endsWith('"')) {
            token = token.substring(1, token.length - 1);
        }

        let messageId = null;
        let usedPrivateReply = false;

        try {
            // 1. Try standard DM (me/messages)
            console.log(`💬 Attempting standard DM to ${recipientId}...`);
            const response = await axios.post(
                `${GRAPH_API_BASE}/me/messages`,
                {
                    recipient: JSON.stringify({ id: recipientId }),
                    message: JSON.stringify({ text: message })
                },
                {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    timeout: 15000,
                }
            );
            messageId = response.data.message_id;
        } catch (dmError) {
            const igError = dmError.response?.data?.error || {};
            const igErrorMsg = igError.message || '';
            const igCode = igError.code;
            const igSubcode = igError.error_subcode;

            // Window error detection: Code 10, subcode 2018278 or message text
            const isWindowError =
                igCode === 10 ||
                igSubcode === 2018278 ||
                igErrorMsg.toLowerCase().includes('window') ||
                igErrorMsg.toLowerCase().includes('policy');

            console.log(`ℹ️ DM Failed. Code: ${igCode}, Subcode: ${igSubcode}, Msg: ${igErrorMsg}`);

            // 2. Fallback: If window is closed and we have a commentId, try Private Reply
            if (isWindowError && commentId) {
                console.log(`⚠️ Window closed for ${recipientId}. Attempting Private Reply for comment ${commentId} via FB Graph...`);
                try {
                    // Use graph.facebook.com for private_replies (standard for integrations)
                    const prResponse = await axios.post(
                        `https://graph.facebook.com/v21.0/${commentId}/private_replies`,
                        { message: message },
                        {
                            params: { access_token: token },
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 15000,
                        }
                    );
                    messageId = prResponse.data.id;
                    usedPrivateReply = true;
                    console.log(`✅ Private Reply Sent! ID: ${messageId}`);
                } catch (prError) {
                    console.error('❌ Private Reply fallback failed:', prError.response?.data || prError.message);
                    throw dmError; // Re-throw the original window error
                }
            } else {
                if (!commentId && isWindowError) {
                    console.log('❌ Window error detected but no commentId provided for fallback.');
                }
                throw dmError;
            }
        }

        // Save sent message to Firestore (Unified History)
        const messageDoc = {
            id: messageId,
            text: message,
            fromMe: true,
            participantId: recipientId,
            igAccountId: process.env.INSTAGRAM_ACCOUNT_ID,
            usedPrivateReply: usedPrivateReply,
            createdAt: FieldValue.serverTimestamp(),
        };

        await db.collection('instagram_messages').doc(messageId).set(messageDoc);

        // Also keep in sent for backwards compat/backup
        await db.collection('instagram_sent_messages').doc(messageId).set({
            ...messageDoc,
            success: true
        });

        // Update conversation
        const conversationId = `${process.env.INSTAGRAM_ACCOUNT_ID}_${recipientId}`;
        await db.collection('instagram_conversations').doc(conversationId).set({
            igAccountId: process.env.INSTAGRAM_ACCOUNT_ID,
            participantId: recipientId,
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
