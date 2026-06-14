export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { service } = req.body || {};

    const priceMap = {
        "Salary Income": 1499,
        "Capital Gains (Stocks / Property)": 2999,
        "Foreign Income / NRI Tax Filing": 4999,
        "Business / Professional Income": 4999,
        "Tax Consultation": 1499,
        "Notice Response": 4499
    };

    if (!service || !priceMap[service]) {
        return res.status(400).json({ error: 'Invalid service selected' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Payment not configured' });
    }

    try {
        const amount = priceMap[service];
        const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`
            },
            body: JSON.stringify({
                amount: amount * 100,
                currency: 'INR',
                receipt: `receipt_${Date.now()}`,
                notes: { service }
            })
        });

        const order = await response.json();

        if (!response.ok) {
            return res.status(500).json({ error: order.error?.description || 'Unable to create payment order' });
        }

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId,
            service
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
