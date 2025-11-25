import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Send email via SendGrid
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    
    if (!sendGridApiKey) {
      console.error('SENDGRID_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please email admin@4sighteducation.com directly.' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: 'admin@4sighteducation.com' }],
            subject: `FL4SH Contact: ${subject || 'New Message'}`
          }
        ],
        from: {
          email: 'hello@fl4shcards.com',
          name: 'FL4SH Contact Form'
        },
        reply_to: {
          email: email,
          name: name
        },
        content: [
          {
            type: 'text/html',
            value: `
              <h2>New Contact Form Submission</h2>
              <p><strong>From:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
              <hr>
              <h3>Message:</h3>
              <p>${message.replace(/\n/g, '<br>')}</p>
              <hr>
              <p><em>Received: ${new Date().toLocaleString()}</em></p>
            `
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
    }

    // Send confirmation email to user
    try {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: email }],
              subject: 'We received your message - FL4SH'
            }
          ],
          from: {
            email: 'hello@fl4shcards.com',
            name: 'FL4SH Team'
          },
          content: [
            {
              type: 'text/html',
              value: `
                <h2>Thanks for reaching out!</h2>
                <p>Hi ${name},</p>
                <p>We've received your message and will get back to you within 24 hours.</p>
                <p>In the meantime, feel free to explore <a href="https://www.fl4shcards.com">fl4shcards.com</a> and join our early access list if you haven't already!</p>
                <p>Best regards,<br>
                The FL4SH Team</p>
              `
            }
          ]
        })
      });
    } catch (confirmError) {
      console.error('Confirmation email error:', confirmError);
      // Don't fail if confirmation email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully!'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

