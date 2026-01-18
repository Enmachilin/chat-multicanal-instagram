import crypto from 'crypto';
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
        parentId: commentData.parent_id || null,
        igAccountId: igAccountId,
        replied: false,
        createdAt: FieldValue.serverTimestamp(),
        receivedAt: FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await db.collection('instagram_comments').doc(commentId).set(commentDoc);
    console.log(`✅ Saved comment ${commentId} from @${commentDoc.from.username}`);
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

    // Build message document
    const messageDoc = {
        id: messageId,
        type: 'dm',
        text: messagingEvent.message.text || '',
        attachments: messagingEvent.message.attachments || [],
        from: {
            id: senderId,
            // Username not available in DM webhook, will need to fetch separately
        },
        recipientId: recipientId,
        igAccountId: igAccountId,
        replied: false,
        timestamp: messagingEvent.timestamp ? new Date(messagingEvent.timestamp) : null,
        createdAt: FieldValue.serverTimestamp(),
        receivedAt: FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await db.collection('instagram_messages').doc(messageId).set(messageDoc);
    console.log(`✅ Saved DM ${messageId} from ${senderId}`);

    // Also update/create conversation thread
    await updateConversation(senderId, igAccountId, messageDoc);
}

/**
 * Update or create a conversation thread for DMs
 */
async function updateConversation(senderId, igAccountId, messageDoc) {
    const conversationId = `${igAccountId}_${senderId}`;
    const conversationRef = db.collection('instagram_conversations').doc(conversationId);

    await conversationRef.set({
        igAccountId: igAccountId,
        participantId: senderId,
        lastMessage: {
            text: messageDoc.text,
            timestamp: messageDoc.createdAt,
            fromUs: false,
        },
        unreadCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}

