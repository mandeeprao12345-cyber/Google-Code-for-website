export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, answer } = req.body || {};

    if (!question || !answer) {
        return res.status(400).json({ error: 'Missing chat log details' });
    }

    const scriptURL = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!scriptURL) {
        return res.status(500).json({ error: 'Google Apps Script URL not configured' });
    }

    try {
        await fetch(scriptURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'chatLog',
                question,
                answer
            })
        });

        return res.status(200).json({ success: true });

    } catch (err) {
        return res.status(500).json({ error: 'Chat log failed' });
    }
}
