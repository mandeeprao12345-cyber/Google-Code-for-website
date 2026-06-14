import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        name,
        phone,
        email,
        filingType
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification details' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
        return res.status(500).json({ error: 'Payment verification not configured' });
    }

    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
    }

    try {
        const scriptURL = process.env.GOOGLE_APPS_SCRIPT_URL;

        if (scriptURL) {
            await fetch(scriptURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    phone,
                    email,
                    filingType,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    status: 'PAID_VERIFIED'
                })
            });
        }

        return res.status(200).json({
            success: true,
            paymentId: razorpay_payment_id
        });

    } catch (err) {
        return res.status(200).json({
            success: true,
            paymentId: razorpay_payment_id,
            warning: 'Payment verified, but lead logging failed'
        });
    }
}
