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
            console.log(`💬 [Step 1] Attempting standard DM to ${recipientId}...`);
            const response = await axios.post(
                `${GRAPH_API_BASE}/me/messages`,
                {
                    recipient: JSON.stringify({ id: recipientId }),
                    message: JSON.stringify({ text: message })
                },
                {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    timeout: 10000,
                }
            );
            messageId = response.data.message_id;
            console.log(`✅ Standard DM successful: ${messageId}`);
        } catch (dmError) {
            const igError = dmError.response?.data?.error || {};
            const igMsg = igError.message || dmError.message;
            console.log(`ℹ️ [Step 1 Fail] Standard DM blocked: ${igMsg} (Code: ${igError.code}, Subcode: ${igError.error_subcode})`);

            // If not a window error, don't even try fallback
            const isWindowError = igError.code === 10 || igError.error_subcode === 2018278 || igMsg.toLowerCase().includes('window') || igMsg.toLowerCase().includes('policy');

            if (isWindowError && commentId) {
                console.log(`⚠️ Window error detected. Triggering Private Reply Fallback...`);

                // 2. Try Private Reply via Instagram Graph (Endpoint A)
                try {
                    console.log(`💬 [Step 2] Attempting Private Reply (IG Graph) for comment ${commentId}...`);
                    const prRes = await axios.post(
                        `https://graph.instagram.com/v21.0/${commentId}/private_replies`,
                        { message: message },
                        {
                            params: { access_token: token },
                            timeout: 10000,
                        }
                    );
                    messageId = prRes.data.id;
                    usedPrivateReply = true;
                    console.log(`✅ Private Reply (IG Graph) successful: ${messageId}`);
                } catch (prErrorA) {
                    const prMsgA = prErrorA.response?.data?.error?.message || prErrorA.message;
                    console.log(`ℹ️ [Step 2 Fail] IG Private Reply failed: ${prMsgA}`);

                    // 3. Try Private Reply via Facebook Graph (Endpoint B - Final Stand)
                    try {
                        console.log(`💬 [Step 3] Attempting Private Reply (FB Graph) for comment ${commentId}...`);
                        const prResB = await axios.post(
                            `https://graph.facebook.com/v21.0/${commentId}/private_replies`,
                            { message: message },
                            {
                                params: { access_token: token },
                                headers: { 'Content-Type': 'application/json' },
                                timeout: 10000,
                            }
                        );
                        messageId = prResB.data.id;
                        usedPrivateReply = true;
                        console.log(`✅ Private Reply (FB Graph) successful: ${messageId}`);
                    } catch (prErrorB) {
                        const prMsgB = prErrorB.response?.data?.error?.message || prErrorB.message;
                        console.error(`❌ [All Steps Failed] Could not open conversation:`, {
                            standardDM: igMsg,
                            privateReplyIG: prMsgA,
                            privateReplyFB: prMsgB
                        });

                        // Throw a combined error so the USER knows exactly what happened
                        return res.status(400).json({
                            error: 'Impossible to send DM',
                            details: {
                                reason: 'Messaging window is closed and Private Reply failed on all endpoints.',
                                debug: `IG Service says: ${prMsgA} | FB Service says: ${prMsgB}`
                            }
                        });
                    }
                }
            } else {
                // Not a window error or no commentId, rethrow original
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
