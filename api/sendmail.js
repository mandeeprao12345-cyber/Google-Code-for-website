import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { name, email, phone, filingType } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.in',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ZOHO_EMAIL,
                pass: process.env.ZOHO_PASSWORD
            }
        });

        // Auto-reply to user
        await transporter.sendMail({
            from: `"InstantTaxFile.com" <${process.env.ZOHO_EMAIL}>`,
            to: email,
            subject: 'We received your details - InstantTaxFile.com',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #0f172a, #0d9488); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0;">⚡ InstantTaxFile.com</h1>
                    </div>
                    <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
                        <h2 style="color: #0d9488;">Dear ${name},</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                            Thank you for reaching out to <strong>InstantTaxFile.com</strong>!
                            We have successfully received your details.
                        </p>
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="color: #0f172a; margin-top: 0;">Your Submitted Details:</h3>
                            <p style="margin: 8px 0;">👤 <strong>Name:</strong> ${name}</p>
                            <p style="margin: 8px 0;">📞 <strong>Phone:</strong> ${phone}</p>
                            <p style="margin: 8px 0;">✉️ <strong>Email:</strong> ${email}</p>
                            <p style="margin: 8px 0;">📋 <strong>Service:</strong> ${filingType}</p>
                        </div>
                        <div style="border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0; background: #f0fdfa;">
                            <p style="color: #0f172a; margin: 0;">
                                ✅ Our <strong>CA team will contact you within 24 hours.</strong>
                            </p>
                        </div>
                        <a href="tel:+917676901038"
                           style="display: inline-block; background: #0d9488; color: white;
                                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                                  font-weight: bold;">
                            📞 Call Us: +91 7676901038
                        </a>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
                            InstantTaxFile.com | Gurgaon, Haryana, India<br>
                            contact@instanttaxfile.com
                        </p>
                    </div>
                </div>
            `
        });

        // Notification to you
        await transporter.sendMail({
            from: `"InstantTaxFile.com" <${process.env.ZOHO_EMAIL}>`,
            to: process.env.ZOHO_EMAIL,
            subject: `🔔 New Lead: ${name} - ${filingType}`,
            html: `
                <h2>New Lead Received!</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Service:</strong> ${filingType}</p>
            `
        });

        res.status(200).json({ success: true });

    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({ error: err.message });
    }
}
