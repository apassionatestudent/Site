// => Email template for login notification
// => username: student's email address
// => loginTime: timestamp of the login
export const loginNotificationTemplate = ({ username, loginTime }) => ({
    subject: 'New Login to Your PrimeEnroll Account',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #111827; margin-bottom: 0.5rem;">Login Detected</h2>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">A new login was recorded on your PrimeEnroll student account.</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                <p style="margin: 0; color: #374151;"><strong>Email:</strong> ${username}</p>
                <p style="margin: 0.5rem 0 0; color: #374151;"><strong>Time:</strong> ${loginTime}</p>
            </div>
            <p style="color: #6b7280; font-size: 0.9rem;">
                If this wasn't you, please contact support immediately and change your password.
            </p>
        </div>
    `,
});