import crypto from 'crypto';
import axios from 'axios';
import { db } from '../lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Instagram Webhook Handler
 * 
 * GET: Webhook verification (Meta challenge)
 * POST: Process incoming events (comments + DMs)
 */
export default async function handler(req, res) {
    // ===================================
    // GET: Webhook Verification
    // ===================================
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
            console.log('✅ Webhook verification successful');
            return res.status(200).send(challenge);
        }

        console.error('❌ Webhook verification failed: Invalid token');
        return res.status(403).json({ error: 'Verification failed' });
    }

    // ===================================
    // POST: Process Events (Comments + DMs)
    // ===================================
    if (req.method === 'POST') {
        try {
            // TEMPORALMENTE DESACTIVADO - descomentar cuando META_APP_SECRET esté correcto
            // if (process.env.META_APP_SECRET) {
            //     const signature = req.headers['x-hub-signature-256'];
            //     if (!verifySignature(req.body, signature)) {
            //         console.error('❌ Invalid signature');
            //         return res.status(401).json({ error: 'Invalid signature' });
            //     }
            // }

            const body = req.body;

            // Check if Firebase is initialized
            if (!db) {
                console.error('❌ Firestore not initialized. Check your environment variables.');
                return res.status(500).json({ error: 'Firestore connection failed' });
            }

            // Check if it's an Instagram event
            if (body.object !== 'instagram') {
                return res.status(200).json({ received: true, ignored: true });
            }

            // Process each entry
            for (const entry of body.entry || []) {
                // Process comment changes (from changes array)
                for (const change of entry.changes || []) {
                    if (change.field === 'comments') {
                        await processComment(change.value, entry.id);
                    }
                }

                // Process DMs (from messaging array)
                for (const messagingEvent of entry.messaging || []) {
                    await processDirectMessage(messagingEvent, entry.id);
                }
            }

            return res.status(200).json({ received: true });

        } catch (error) {
            console.error('❌ Error processing webhook:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Verify the X-Hub-Signature-256 header
 */
function verifySignature(payload, signature) {
    if (!signature) return false;

    const payloadString = typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', process.env.META_APP_SECRET)
        .update(payloadString)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Process and store a comment in Firestore
 */
async function processComment(commentData, igAccountId) {
    const commentId = commentData.id;
    const parentId = commentData.parent_id || null;
    const isFromOwner = commentData.from?.id === igAccountId || commentData.from?.username === 'mundocuarzos'; // Fallback check

    // Check if comment already exists (idempotency)
    const existingDoc = await db.collection('instagram_comments').doc(commentId).get();
    if (existingDoc.exists) {
        console.log(`⏭️ Comment ${commentId} already exists, skipping`);
        return;
    }

    // Build comment document
    const commentDoc = {
        id: commentId,
        type: 'comment',
        text: commentData.text || '',
        mediaId: commentData.media?.id || null,
        mediaProductType: commentData.media?.media_product_type || null,
        from: {
            id: commentData.from?.id || null,
            username: commentData.from?.username || null,
        },
        parentId: parentId,
        igAccountId: igAccountId,
        replied: isFromOwner, // If the owner is commenting, it doesn't need a reply status
        isAdmin: isFromOwner,
        createdAt: FieldValue.serverTimestamp(),
        receivedAt: FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await db.collection('instagram_comments').doc(commentId).set(commentDoc);
    console.log(`✅ Saved comment ${commentId} from @${commentDoc.from?.username}`);

    // LOGIC FOR NESTING AND STATUS:
    if (parentId) {
        // 1. Mark parent as replied
        await db.collection('instagram_comments').doc(parentId).update({
            replied: true,
            updatedAt: FieldValue.serverTimestamp()
        }).catch(err => console.log('Parent comment not found for status update'));

        // 2. If it's a reply from Instagram app (not our dashboard)
        // ensure it's linked correctly in the UI
    }
}

/**
 * Process and store a Direct Message in Firestore
 */
async function processDirectMessage(messagingEvent, igAccountId) {
    // Only process incoming messages (not echo of sent messages)
    if (!messagingEvent.message || messagingEvent.message.is_echo) {
        return;
    }

    const messageId = messagingEvent.message.mid;
    const senderId = messagingEvent.sender?.id;
    const recipientId = messagingEvent.recipient?.id;

    // Check if message already exists (idempotency)
    const existingDoc = await db.collection('instagram_messages').doc(messageId).get();
    if (existingDoc.exists) {
        console.log(`⏭️ Message ${messageId} already exists, skipping`);
        return;
    }

    // Try to fetch username from Meta
    let username = null;
    try {
        let token = process.env.META_ACCESS_TOKEN?.trim() || '';
        if (token.startsWith('"') && token.endsWith('"')) {
            token = token.substring(1, token.length - 1);
        }

        const userResponse = await axios.get(`https://graph.instagram.com/v21.0/${senderId}`, {
            params: {
                fields: 'username',
                access_token: token
            }
        });
        username = userResponse.data.username;
    } catch (err) {
        console.error(`⚠️ Could not fetch username for ${senderId}:`, err.message);
    }

    // Build message document (Unified History)
    const messageDoc = {
        id: messageId,
        type: 'dm',
        text: messagingEvent.message.text || '',
        fromMe: false,
        participantId: senderId,
        participantUsername: username,
        attachments: messagingEvent.message.attachments || [],
        from: {
            id: senderId,
            username: username
        },
        recipientId: recipientId,
        igAccountId: igAccountId,
        timestamp: messagingEvent.timestamp ? new Date(messagingEvent.timestamp) : null,
        createdAt: FieldValue.serverTimestamp(),
        receivedAt: FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await db.collection('instagram_messages').doc(messageId).set(messageDoc);
    console.log(`✅ Saved DM ${messageId} from ${username || senderId}`);

    // Also update/create conversation thread
    await updateConversation(senderId, username, igAccountId, messageDoc);
}

/**
 * Update or create a conversation thread for DMs
 */
async function updateConversation(senderId, username, igAccountId, messageDoc) {
    const conversationId = `${igAccountId}_${senderId}`;
    const conversationRef = db.collection('instagram_conversations').doc(conversationId);

    const updateData = {
        igAccountId: igAccountId,
        participantId: senderId,
        lastMessage: {
            text: messageDoc.text,
            timestamp: messageDoc.createdAt,
            fromUs: false,
        },
        unreadCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (username) {
        updateData.participantUsername = username;
    }

    await conversationRef.set(updateData, { merge: true });
}

