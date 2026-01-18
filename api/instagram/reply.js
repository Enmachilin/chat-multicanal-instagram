import axios from 'axios';
import { db } from '../../lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Reply to an Instagram comment
 * 
 * POST body: { commentId: string, message: string }
 */
export default async function handler(req, res) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { commentId, message } = req.body;

        // Validate input
        if (!commentId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: commentId and message'
            });
        }

        if (message.length > 8000) {
            return res.status(400).json({
                error: 'Message exceeds maximum length of 8000 characters'
            });
        }

        // Clean token (Vercel sometimes adds quotes)
        let token = process.env.META_ACCESS_TOKEN?.trim() || '';
        if (token.startsWith('"') && token.endsWith('"')) {
            token = token.substring(1, token.length - 1);
        }

        // Check if original comment exists
        const commentRef = db.collection('instagram_comments').doc(commentId);
        const commentDoc = await commentRef.get();

        if (!commentDoc.exists) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Send reply to Instagram Graph API
        const response = await axios.post(
            `${GRAPH_API_BASE}/${commentId}/replies`,
            null,
            {
                params: {
                    message: message,
                },
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 15000,
            }
        );

        const replyId = response.data.id;

        // Save response to Firestore
        const responseDoc = {
            originalCommentId: commentId,
            replyId: replyId,
            message: message,
            sentAt: FieldValue.serverTimestamp(),
            success: true,
        };

        await db.collection('instagram_responses').doc(replyId).set(responseDoc);

        // Update original comment as replied
        await commentRef.update({
            replied: true,
            repliedAt: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Reply sent to comment ${commentId}, reply ID: ${replyId}`);

        return res.status(200).json({
            success: true,
            replyId: replyId,
        });

    } catch (error) {
        console.error('❌ Error sending reply:', error.response?.data || error.message);

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
