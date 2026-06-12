import { google } from 'googleapis';
import { Readable } from 'stream';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { fileData, mimeType, fileName } = req.body;

    if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing file data' });
    }

    try {
        // Setup Google Auth
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        const drive = google.drive({ version: 'v3', auth });

        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, 'base64');
        const stream = Readable.from(buffer);

        // Create timestamp for filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const savedFileName = `${timestamp}_${fileName}`;

        // Upload to Google Drive
        const response = await drive.files.create({
            requestBody: {
                name: savedFileName,
                mimeType: mimeType,
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
            },
            media: {
                mimeType: mimeType,
                body: stream
            }
        });

        console.log('File saved to Drive:', response.data.id);

        res.status(200).json({
            success: true,
            fileId: response.data.id,
            fileName: savedFileName
        });

    } catch (err) {
        console.error('Drive save error:', err);
        res.status(500).json({ error: err.message });
    }
}
