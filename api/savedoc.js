export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    // Step 1 - Check request body
    const { fileData, mimeType, fileName } = req.body || {};
    console.log('Request received:', { hasFileData: !!fileData, mimeType, fileName });

    if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing file data or filename' });
    }

    // Step 2 - Check environment variables
    const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log('Env check:', {
        hasEmail: !!serviceEmail,
        hasKey: !!rawPrivateKey,
        hasFolder: !!folderId,
        emailValue: serviceEmail?.substring(0, 20) + '...',
        folderValue: folderId?.substring(0, 10) + '...'
    });

    if (!serviceEmail || !rawPrivateKey || !folderId) {
        return res.status(500).json({ 
            error: 'Google Drive not configured',
            details: {
                hasEmail: !!serviceEmail,
                hasKey: !!rawPrivateKey,
                hasFolder: !!folderId
            }
        });
    }

    // Step 3 - Fix private key formatting
    let privateKey = rawPrivateKey;
    if (!privateKey.includes('\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }
    console.log('Private key starts with:', privateKey.substring(0, 30));

    try {
        // Step 4 - Get access token
        console.log('Getting access token...');
        const token = await getAccessToken(serviceEmail, privateKey);
        console.log('Token obtained successfully');

        // Step 5 - Upload to Drive
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const savedFileName = `${timestamp}_${fileName}`;
        const boundary = 'boundary_itf_2026';

        const metadata = JSON.stringify({
            name: savedFileName,
            parents: [folderId]
        });

        const requestBody = [
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

        console.log('Uploading to Drive folder:', folderId);

        const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: requestBody
            }
        );

        const uploadData = await uploadResponse.json();
        console.log('Upload response:', JSON.stringify(uploadData));

        if (uploadData.error) {
            throw new Error(`Drive error: ${uploadData.error.message} (${uploadData.error.code})`);
        }

        console.log('SUCCESS - File saved:', uploadData.id);
        res.status(200).json({ 
            success: true, 
            fileId: uploadData.id,
            fileName: savedFileName
        });

    } catch (err) {
        console.error('FULL ERROR:', err.message, err.stack);
        res.status(500).json({ 
            error: err.message,
            stack: err.stack?.substring(0, 200)
        });
    }
}

async function getAccessToken(email, privateKey) {
    const now = Math.floor(Date.now() / 1000);

    const headerB64 = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payloadB64 = base64url(JSON.stringify({
        iss: email,
        scope: 'https://www.googleapis.com/auth/drive.file',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    }));

    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = await signRS256(signingInput, privateKey);
    const jwt = `${signingInput}.${signature}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);

    if (tokenData.error) {
        throw new Error(`Auth failed: ${tokenData.error} - ${tokenData.error_description}`);
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
    return sign.sign(privateKey)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
