export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    try {
        const geminiPayload = req.body;
        
        // Convert Gemini format to Groq format
        const messages = geminiPayload.contents.map(c => ({
            role: c.role === 'user' ? 'user' : 'assistant',
            content: c.parts.map(p => p.text).join(' ')
        }));

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        
        // Convert Groq response back to Gemini format
        // so your index.html code doesn't need to change
        const text = data.choices?.[0]?.message?.content || "I'm having trouble connecting.";
        res.status(200).json({
            candidates: [{
                content: {
                    parts: [{ text: text }]
                }
            }]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
