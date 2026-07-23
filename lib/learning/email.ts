/**
 * Email Infrastructure — adapted from ClassroomIO
 * Source: /opt/classroomio/packages/email/src/
 *
 * Registry pattern: templates auto-register on import.
 * Provider: SMTP via nodemailer (loaded dynamically to avoid build-time dependency).
 */

// Dynamic import — nodemailer is loaded at runtime only when sending email.
// This avoids build failures if nodemailer is not in package.json.
let transporter: any = null;
// ==================== Types ====================

export interface EmailBranding {
  orgName?: string;
  logoUrl?: string;
  themeColor?: string;
}

export interface EmailTemplate {
  id: string;
  subject: string | ((fields: any) => string);
  render: (fields: any) => string;
  from?: string;
  replyTo?: string;
}

export interface SendConfig {
  to: string | string[];
  fields: Record<string, unknown>;
  from?: string;
  replyTo?: string;
  subject?: string;
}

export interface EmailResponse {
  success: boolean;
  error?: string;
  details?: string;
}

// ==================== Registry ====================

class EmailRegistryClass {
  private emails = new Map<string, EmailTemplate>();

  register(template: EmailTemplate): void {
    this.emails.set(template.id, template);
  }

  get(id: string): EmailTemplate | undefined {
    return this.emails.get(id);
  }

  getAllIds(): string[] {
    return Array.from(this.emails.keys());
  }

  has(id: string): boolean {
    return this.emails.has(id);
  }
}

export const EmailRegistry = new EmailRegistryClass();

// ==================== Branding ====================

const NAMED_THEME_HEX: Record<string, string> = {
  default: '#10b981',
  blue: '#1d4ed8',
  green: '#65a30d',
  amber: '#d97706',
  rose: '#e11d48',
  purple: '#9333ea',
  orange: '#ea580c',
  teal: '#0d9488',
  mono: '#57534e',
  red: '#dc2626',
};

export function resolveThemeColor(theme?: string): string | undefined {
  if (!theme) return undefined;
  if (theme.startsWith('#')) return theme;
  return NAMED_THEME_HEX[theme] ?? NAMED_THEME_HEX.default;
}

export function buildEmailBranding(org?: {
  name?: string;
  avatarUrl?: string;
  theme?: string;
}): EmailBranding {
  return {
    orgName: org?.name ?? 'BioDockify Learn',
    logoUrl: org?.avatarUrl,
    themeColor: resolveThemeColor(org?.theme) ?? '#10b981',
  };
}

// ==================== HTML Template Wrapper ====================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getDefaultTemplate(content: string, branding?: EmailBranding): string {
  const themeColor = branding?.themeColor ?? '#10b981';
  const orgName = branding?.orgName ?? 'BioDockify Learn';
  const logoHtml = branding?.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(orgName)}" style="height:32px;max-width:150px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:700;color:${themeColor};">${escapeHtml(orgName)}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(orgName)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;">
          ${logoHtml}
        </td></tr>
        <tr><td style="padding:32px;color:#1e293b;font-size:15px;line-height:1.6;">
          ${content}
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:13px;color:#94a3b8;">
            Sent by ${escapeHtml(orgName)}. If you believe this was sent in error, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ==================== Template Definitions ====================

export function defineEmail(config: {
  id: string;
  subject: string | ((fields: any) => string);
  fields?: Record<string, unknown>;
  render: (fields: any) => string;
  from?: string;
  replyTo?: string;
}): { id: string; template: EmailTemplate } {
  const template: EmailTemplate = {
    id: config.id,
    subject: config.subject,
    render: config.render,
    from: config.from,
    replyTo: config.replyTo,
  };
  EmailRegistry.register(template);
  return { id: config.id, template };
}

// Register all templates on import
defineEmail({
  id: 'courseCompletion',
  subject: 'Congratulations — you completed the course!',
  render: (f) => {
    const certBlock = f.certificateUrl
      ? `<div style="margin:24px 0;text-align:center;"><a href="${escapeHtml(String(f.certificateUrl))}" style="display:inline-block;padding:12px 32px;background:${f.branding?.themeColor ?? '#10b981'};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">View Certificate</a></div>`
      : '';
    const msgBlock = f.customMessage
      ? `<div style="margin:16px 0;padding:12px;border-left:3px solid ${f.branding?.themeColor ?? '#10b981'};background:#f8fafc;">${escapeHtml(String(f.customMessage))}</div>`
      : '';
    return getDefaultTemplate(
      `<p style="margin:0 0 16px;">Hi ${escapeHtml(String(f.studentName ?? 'Student'))},</p>
       <p style="margin:0 0 16px;">Congratulations! You have successfully completed all requirements for <strong>${escapeHtml(String(f.courseName))}</strong>.</p>
       ${msgBlock}
       ${certBlock}
       <p style="margin:0;color:#64748b;font-size:14px;">Keep up the great work!</p>`,
      f.branding,
    );
  },
});

defineEmail({
  id: 'cohortGoalReminder',
  subject: (f) => {
    const prefix = f.daysUntilDue <= 0 ? 'OVERDUE' : f.daysUntilDue === 1 ? 'Due Tomorrow' : 'Due in ' + f.daysUntilDue + ' days';
    return prefix + ': ' + f.goalTitle;
  },
  render: (f) => {
    const dayWord = f.daysUntilDue === 1 ? 'day' : 'days';
    const dueText = f.daysUntilDue <= 0
      ? '<p style="color:#dc2626;font-weight:600;">This goal is now overdue.</p>'
      : '<p>This goal is due in <strong>' + f.daysUntilDue + ' ' + dayWord + '</strong>.</p>';
    return getDefaultTemplate(
      `<p style="margin:0 0 16px;">Hi,</p>
       <p style="margin:0 0 8px;">You have a training goal that needs attention:</p>
       <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;">
         <p style="margin:0 0 4px;font-weight:600;">${escapeHtml(String(f.goalTitle))}</p>
         <p style="margin:0;color:#64748b;font-size:14px;">Cohort: ${escapeHtml(String(f.cohortName))}</p>
         <p style="margin:4px 0 0;color:#64748b;font-size:14px;">Progress: ${f.completedCount}/${f.requiredCount} completed</p>
       </div>
       ${dueText}
       <div style="margin:24px 0;text-align:center;"><a href="${escapeHtml(String(f.loginUrl ?? '#'))}" style="display:inline-block;padding:12px 32px;background:${f.branding?.themeColor ?? '#10b981'};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Go to Training</a></div>`,
      f.branding,
    );
  },
});

defineEmail({
  id: 'complianceReminder',
  subject: (f) =>
    `Action required: ${f.courseName} recertification ${f.daysUntilDue <= 0 ? 'overdue' : `due in ${f.daysUntilDue} days`}`,
  render: (f) => {
    const expiryText = f.daysUntilDue <= 0
      ? 'has <span style="color:#dc2626;font-weight:600;">expired</span>. Please complete recertification immediately.'
      : 'will expire in <strong>' + f.daysUntilDue + ' day' + (f.daysUntilDue === 1 ? '' : 's') + '</strong>. Please complete recertification before it expires.';
    return getDefaultTemplate(
      '<p style="margin:0 0 16px;">Hi ' + escapeHtml(String(f.studentName ?? 'Student')) + ',</p>' +
      '<p style="margin:0 0 16px;">Your compliance certification for <strong>' + escapeHtml(String(f.courseName)) + '</strong> ' + expiryText + '</p>' +
      '<div style="margin:24px 0;text-align:center;"><a href="' + escapeHtml(String(f.loginUrl ?? '#')) + '" style="display:inline-block;padding:12px 32px;background:' + (f.branding?.themeColor ?? '#10b981') + ';color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Start Recertification</a></div>',
      f.branding,
    );
  },
});

defineEmail({
  id: 'submissionGraded',
  subject: (f) => `Your submission for ${f.exerciseName} has been graded`,
  render: (f) =>
    getDefaultTemplate(
      `<p style="margin:0 0 16px;">Hi ${escapeHtml(String(f.studentName ?? 'Student'))},</p>
       <p style="margin:0 0 16px;">Your submission for <strong>${escapeHtml(String(f.exerciseName))}</strong> in <strong>${escapeHtml(String(f.courseName))}</strong> has been graded.</p>
       <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;text-align:center;">
         <p style="margin:0;font-size:28px;font-weight:700;color:${f.branding?.themeColor ?? '#10b981'};">${f.score}/${f.maxScore}</p>
         <p style="margin:4px 0 0;color:#64748b;">${f.percentage}% ${f.percentage >= 80 ? '— Passed!' : ''}</p>
       </div>`,
      f.branding,
    ),
});

defineEmail({
  id: 'courseEnrollment',
  subject: (f) => `Welcome to ${f.courseName}!`,
  render: (f) =>
    getDefaultTemplate(
      `<p style="margin:0 0 16px;">Hi ${escapeHtml(String(f.studentName ?? 'Student'))},</p>
       <p style="margin:0 0 16px;">You have been enrolled in <strong>${escapeHtml(String(f.courseName))}</strong>.</p>
       <p style="margin:0 0 16px;color:#64748b;">${escapeHtml(String(f.courseDescription ?? ''))}</p>
       <div style="margin:24px 0;text-align:center;"><a href="${escapeHtml(String(f.courseUrl ?? '#'))}" style="display:inline-block;padding:12px 32px;background:${f.branding?.themeColor ?? '#10b981'};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Start Learning</a></div>`,
      f.branding,
    ),
});

defineEmail({
  id: 'newsfeedPost',
  subject: (f) => `New announcement: ${f.courseName}`,
  render: (f) =>
    getDefaultTemplate(
      `<p style="margin:0 0 16px;">A new announcement was posted in <strong>${escapeHtml(String(f.courseName))}</strong>:</p>
       <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;">
         <p style="margin:0 0 8px;font-size:13px;color:#64748b;">By ${escapeHtml(String(f.authorName ?? 'Instructor'))}</p>
         <p style="margin:0;">${escapeHtml(String(f.content?.substring(0, 200) ?? ''))}${f.content?.length > 200 ? '...' : ''}</p>
       </div>
       <div style="margin:24px 0;text-align:center;"><a href="${escapeHtml(String(f.postUrl ?? '#'))}" style="display:inline-block;padding:12px 32px;background:${f.branding?.themeColor ?? '#10b981'};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Read More</a></div>`,
      f.branding,
    ),
});

// ==================== Send Email ====================

async function getTransporter(): Promise<any> {
  if (transporter) return transporter;

  try {
    const nodemailer = await import('nodemailer');
    const host = process.env.SMTP_HOST ?? 'smtp.hostinger.com';
    const port = parseInt(process.env.SMTP_PORT ?? '465', 10);
    const user = process.env.SMTP_USER ?? 'info@biodockify.com';
    const pass = process.env.SMTP_PASSWORD ?? '';

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  } catch {
    throw new Error('nodemailer not installed — email sending disabled');
  }
}

function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n\t]/g, ' ').trim();
}

export async function sendEmail(
  emailId: string,
  config: SendConfig,
): Promise<EmailResponse> {
  try {
    const template = EmailRegistry.get(emailId);
    if (!template) {
      return {
        success: false,
        error: `Email template "${emailId}" not found. Available: ${EmailRegistry.getAllIds().join(', ')}`,
      };
    }

    const subject = sanitizeSubject(
      typeof template.subject === 'function'
        ? template.subject(config.fields)
        : template.subject,
    );

    const html = template.render(config.fields);
    const from = config.from ?? template.from ?? process.env.SMTP_SENDER ?? 'BioDockify Learn <info@biodockify.com>';
    const to = Array.isArray(config.to) ? config.to.join(',') : config.to;

    const transport = await getTransporter();
    await transport.sendMail({
      from,
      to,
      subject: config.subject ?? subject,
      html,
      replyTo: config.replyTo ?? template.replyTo,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
