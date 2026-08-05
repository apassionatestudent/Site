// => Email sent right after enrollment submission - link expires in 10
// => minutes, matching the InformationModal's mockup copy on the frontend.
// => enrollmentStatus reflects the REAL status assigned at insert time
// => ('Pending' if a batch/class was selected, 'Reserved' if not yet) -
// => never hardcoded, since it varies per submission.
export const passwordSetupTemplate = ({ link, enrollmentStatus }) => {
    const status = enrollmentStatus || 'Pending';
    // => Amber for Pending (awaiting staff review), gray for Reserved
    // => (no open batch yet) - purely visual, no logic depends on this
    const badge = status === 'Reserved'
        ? { bg: '#f3f4f6', text: '#374151' }
        : { bg: '#fef3c7', text: '#92400e' };

    return {
        subject: 'Set Up Your PrimeEnroll Account Password',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #111827; margin-bottom: 0.5rem;">Welcome to PrimeEnroll</h2>
                <p style="color: #6b7280; margin-bottom: 0.75rem;">Your enrollment was received. Current status:</p>
                <div style="display: inline-block; background: ${badge.bg}; color: ${badge.text}; font-weight: 600; font-size: 0.8rem; padding: 0.3rem 0.85rem; border-radius: 20px; margin-bottom: 1.5rem;">
                    ${status}
                </div>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">
                    Set your password below to access your student dashboard, where you can check your enrollment status in real time as our staff reviews your submission, no need to wait for another email.
                </p>
                <a href="${link}" style="display: inline-block; background: #660911; color: #fff; text-decoration: none; padding: 0.8rem 1.6rem; border-radius: 8px; font-weight: 600;">Set Your Password</a>
                <p style="color: #6b7280; font-size: 0.9rem; margin-top: 1.5rem;">
                    This link expires in 10 minutes. If it expires before you get to it, submit a support ticket or call the office and staff can send a new one.
                </p>
            </div>
        `,
    };
};

// => Email sent from the forgot-password flow - same 10-minute window
export const passwordResetTemplate = ({ link }) => ({
    subject: 'Reset Your PrimeEnroll Account Password',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #111827; margin-bottom: 0.5rem;">Password Reset Requested</h2>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">Someone requested a password reset for your PrimeEnroll account. If this wasn't you, you can ignore this email.</p>
            <a href="${link}" style="display: inline-block; background: #660911; color: #fff; text-decoration: none; padding: 0.8rem 1.6rem; border-radius: 8px; font-weight: 600;">Reset Your Password</a>
            <p style="color: #6b7280; font-size: 0.9rem; margin-top: 1.5rem;">
                This link expires in 10 minutes.
            </p>
        </div>
    `,
});