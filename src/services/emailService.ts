import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  spaceName: string;
  workspaceName: string;
  invitationLink: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    // Only initialize if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        // Create transporter with Gmail or custom SMTP
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        // Verify connection configuration
        this.transporter.verify((error, success) => {
          if (error) {
            console.error('❌ Email service error:', error);
            this.isConfigured = false;
          } else {
            console.log('✅ Email service is ready to send messages');
            this.isConfigured = true;
          }
        });
      } catch (error) {
        console.error('❌ Failed to initialize email service:', error);
        this.isConfigured = false;
      }
    } else {
      console.log('ℹ️  Email service not configured (SMTP credentials missing). Invitations will work without email notifications.');
      this.isConfigured = false;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      console.log('ℹ️  Email service not configured. Skipping email to:', options.to);
      return;
    }

    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'ClickUp Clone'}" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send space invitation email
   */
  async sendSpaceInvitation(data: InvitationEmailData): Promise<void> {
    const subject = `${data.inviterName} invited you to join ${data.spaceName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Space Invitation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 10px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #3b82f6;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              text-align: center;
            }
            .button:hover {
              background-color: #2563eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 14px;
              color: #6b7280;
            }
            .info-box {
              background-color: #f3f4f6;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${process.env.APP_NAME || 'ClickUp Clone'}</div>
            </div>
            
            <div class="content">
              <h2>You've been invited! 🎉</h2>
              <p>Hi${data.recipientName ? ` ${data.recipientName}` : ''},</p>
              <p>
                <strong>${data.inviterName}</strong> has invited you to join the 
                <strong>${data.spaceName}</strong> space in the <strong>${data.workspaceName}</strong> workspace.
              </p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>Workspace:</strong> ${data.workspaceName}</p>
                <p style="margin: 5px 0 0 0;"><strong>Space:</strong> ${data.spaceName}</p>
              </div>
              
              <p>Click the button below to accept the invitation and start collaborating:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.invitationLink}" class="button">Accept Invitation</a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${data.invitationLink}" style="color: #3b82f6; word-break: break-all;">${data.invitationLink}</a>
              </p>
            </div>
            
            <div class="footer">
              <p>This invitation was sent by ${data.inviterName}.</p>
              <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      You've been invited!
      
      ${data.inviterName} has invited you to join the ${data.spaceName} space in the ${data.workspaceName} workspace.
      
      Click the link below to accept the invitation:
      ${data.invitationLink}
      
      If you weren't expecting this invitation, you can safely ignore this email.
    `;

    await this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
