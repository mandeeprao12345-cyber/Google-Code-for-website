export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { fileData, mimeType, fileName } = req.body || {};
    if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing file data' });
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!serviceEmail || !rawPrivateKey || !folderId) {
        return res.status(500).json({ error: 'Google Drive not configured' });
    }

    let privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    try {
        const token = await getAccessToken(serviceEmail, privateKey);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const savedFileName = `${timestamp}_${fileName}`;
        const boundary = 'foo_bar_baz';

        const metadata = JSON.stringify({
            name: savedFileName,
            parents: [folderId]
        });

        // Build multipart body
        const body = [
            `--${boundary}`,
            'Content-Type: application/json; charset=UTF-8',
            '',
            metadata,
            `--${boundary}`,
            `Content-Type: ${mimeType}`,
            'Content-Transfer-Encoding: base64',
            '',
            fileData,
            `--${boundary}--`
        ].join('\r\n');

        const uploadRes = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`,
                    'X-Goog-User-Project': serviceEmail.split('@')[1].split('.')[0]
                },
                body
            }
        );

        const uploadData = await uploadRes.json();

        if (uploadData.error) {
            throw new Error(`${uploadData.error.message} (${uploadData.error.code})`);
        }

        res.status(200).json({ success: true, fileId: uploadData.id, fileName: savedFileName });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getAccessToken(email, privateKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
        iss: email,
        sub: email,
        scope: 'https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    }));

    const signingInput = `${header}.${payload}`;
    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    sign.end();
    const signature = sign.sign(privateKey)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const jwt = `${signingInput}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
        throw new Error(`Auth: ${tokenData.error_description}`);
    }
    return tokenData.access_token;
}

function base64url(str) {
    return Buffer.from(str).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
