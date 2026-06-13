export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { fileData, mimeType, fileName } = req.body;

    if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing file data' });
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!serviceEmail || !privateKey || !folderId) {
        return res.status(500).json({ error: 'Google Drive not configured' });
    }

    try {
        // Step 1 — Create JWT token
        const token = await getAccessToken(serviceEmail, privateKey);

        // Step 2 — Upload file to Google Drive
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const savedFileName = `${timestamp}_${fileName}`;

        const metadata = JSON.stringify({
            name: savedFileName,
            parents: [folderId]
        });

        const fileBuffer = Buffer.from(fileData, 'base64');

        // Use multipart upload
        const boundary = 'boundary_instanttaxfile';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadataPart = `Content-Type: application/json\r\n\r\n${metadata}`;
        const filePart = `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileData}`;

        const requestBody = delimiter + metadataPart + delimiter + filePart + closeDelimiter;

        const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: requestBody
            }
        );

        const uploadData = await uploadResponse.json();

        if (uploadData.error) {
            throw new Error(uploadData.error.message);
        }

        console.log('File saved to Drive:', uploadData.id);
        res.status(200).json({ success: true, fileId: uploadData.id, fileName: savedFileName });

    } catch (err) {
        console.error('Drive save error:', err.message);
        res.status(500).json({ error: err.message });
    }
}

// Generate Google OAuth2 access token from service account
async function getAccessToken(email, privateKey) {
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: email,
        scope: 'https://www.googleapis.com/auth/drive.file',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Sign with private key
    const signature = await signRS256(signingInput, privateKey);
    const jwt = `${signingInput}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
        throw new Error(`Auth error: ${tokenData.error_description}`);
    }

    return tokenData.access_token;
}

function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

async function signRS256(input, privateKey) {
    const { createSign } = await import('crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(input);
    sign.end();
    const signature = sign.sign(privateKey);
    return signature.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
