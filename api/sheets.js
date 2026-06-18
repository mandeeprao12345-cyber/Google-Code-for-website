export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const scriptURL = process.env.GOOGLE_APPS_SCRIPT_URL;
    
    if (!scriptURL) {
        return res.status(500).json({ error: 'Not configured' });
    }

    try {
        await fetch(scriptURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        res.status(200).json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
