import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, applicantName, taskName, status, taskGiverName, taskGiverPhone } = await request.json();

    // Validate required fields
    if (!email || !applicantName || !taskName || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const isAccepted = status === 'accepted';

    const subject = isAccepted
      ? `Your application for "${taskName}" has been accepted!`
      : `Application Update: "${taskName}"`;

    const html = isAccepted
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22C55E;">Congratulations ${applicantName}!</h2>
          <p>Great news! Your application for <strong>${taskName}</strong> has been accepted.</p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 12px 0; font-size: 16px;">Task Giver Contact Details:</h3>
            <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${taskGiverName || 'Not provided'}</p>
            <p style="margin: 0;"><strong>Phone:</strong> ${taskGiverPhone ? `+91 ${taskGiverPhone}` : 'Not provided'}</p>
          </div>

          <p style="color: #666;">Please reach out to the task giver to discuss the task details and next steps. If you don't hear from them within 24-48 hours, feel free to contact them using the details above.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 14px;">Best regards,<br/>The Sayzo Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hi ${applicantName},</h2>
          <p>Thank you for your interest in <strong>${taskName}</strong>.</p>
          <p>Unfortunately, your application was not selected this time. Don't be discouraged - there are many other opportunities waiting for you!</p>
          <p>Keep applying and we're sure you'll find the perfect match soon.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 14px;">Best regards,<br/>The Sayzo Team</p>
        </div>
      `;

    const { data, error } = await resend.emails.send({
      from: 'Sayzo <onboarding@resend.dev>', // Use your verified domain in production
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Email notification error:', err);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
