export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { amount, service } = req.body;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Payment not configured' });
    }

    try {
        // Create Razorpay order
        const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`
            },
            body: JSON.stringify({
                amount: amount * 100, // Razorpay needs paise
                currency: 'INR',
                receipt: `receipt_${Date.now()}`,
                notes: { service: service }
            })
        });

        const order = await response.json();
        
        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: keyId
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
