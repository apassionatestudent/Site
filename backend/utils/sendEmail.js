import { resend } from '../config/email.js';

// => Reusable email sender
// => to: recipient email address
// => subject: email subject line
// => html: email body in HTML format
export const sendEmail = async ({ to, subject, html }) => {
    try {
        const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to,
            subject,
            html,
        });
        console.log('Email sent successfully:', result);
        return result;
    } catch (error) {
        // => Log but don't throw — a failed email should never crash the app
        console.error('Email sending error:', error);
    }
};