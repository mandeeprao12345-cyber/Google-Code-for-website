export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { fileData, mimeType, fileName } = req.body || {};
    
   if (!fileData || !fileName) {
    return res.status(400).json({ error: 'Missing file data' });
}

const allowedMimeTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
];

if (!allowedMimeTypes.includes(mimeType)) {
    return res.status(400).json({
        error: 'Only PDF, PNG, JPG, JPEG and WEBP files are allowed.'
    });
}

const approxFileSizeBytes = Math.ceil((fileData.length * 3) / 4);

const maxFileSizeBytes = 5 * 1024 * 1024;

if (approxFileSizeBytes > maxFileSizeBytes) {
    return res.status(400).json({
        error: 'File too large. Maximum 5MB.'
    });
}

const safeFileName = String(fileName || 'uploaded-file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
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
                fileName: `${new Date().toISOString().replace(/[:.]/g, '-')}_${safeFileName}`
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
