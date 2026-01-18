export default function handler(req, res) {
    res.status(200).json({
        status: "online",
        timestamp: new Date().toISOString(),
        version: "v2-forced-sync",
        envCheck: {
            hasToken: !!process.env.META_ACCESS_TOKEN,
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID
        }
    });
}
