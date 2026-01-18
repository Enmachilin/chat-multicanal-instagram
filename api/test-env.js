export default function handler(req, res) {
    res.status(200).json({
        projectId: process.env.FIREBASE_PROJECT_ID || 'missing',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'missing',
        privateKeySet: !!process.env.FIREBASE_PRIVATE_KEY,
        privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
        accessTokenSet: !!process.env.META_ACCESS_TOKEN,
        accessTokenLength: process.env.META_ACCESS_TOKEN?.length || 0,
        verifyToken: process.env.VERIFY_TOKEN || 'missing'
    });
}
