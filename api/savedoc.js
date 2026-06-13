export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { fileData, mimeType, fileName } = req.body || {};
    
    if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing file data' });
    }

    try {
        const scriptURL = process.env.GOOGLE_APPS_SCRIPT_URL;
        
        if (!scriptURL) {
            return res.status(500).json({ error: 'Script URL not configured' });
        }

        const response = await fetch(scriptURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'fileUpload',
                fileData: fileData,
                mimeType: mimeType,
                fileName: `${new Date().toISOString().replace(/[:.]/g, '-')}_${fileName}`
            })
        });

        const result = await response.json();
        
        if (result.success) {
            res.status(200).json({ success: true, fileId: result.fileId });
        } else {
            res.status(500).json({ error: result.error || 'Upload failed' });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
