export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const { fileData, mimeType, fileName } = req.body;

    if (!fileData) return res.status(400).json({ error: 'No file data provided' });

    try {
        const isPDF = mimeType === 'application/pdf';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 2048,
                system: `You are an expert Indian tax document analyzer for InstantTaxFile.com. 
Analyze the uploaded document and provide:
1. Document type identification
2. Key financial details (income, TDS, deductions)
3. Important fields and amounts
4. Any action items the taxpayer should note
5. Which ITR form they should file
Be clear, structured and helpful. Use ₹ symbol for amounts.`,
                messages: [{
                    role: 'user',
                    content: [
                        isPDF ? {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: fileData
                            }
                        } : {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mimeType,
                                data: fileData
                            }
                        },
                        {
                            type: 'text',
                            text: `Please analyze this Indian tax document (${fileName}) and provide a clear summary of all important tax-related information.`
                        }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Analysis failed');
        }

        const text = data.content?.[0]?.text || "Could not analyze document.";

        res.status(200).json({
            text: text + "\n\n📞 For help with your filing, call +91 7676901038 or visit InstantTaxFile.com"
        });

    } catch (err) {
        console.error('Analysis error:', err);
        res.status(500).json({ error: err.message });
    }
}
