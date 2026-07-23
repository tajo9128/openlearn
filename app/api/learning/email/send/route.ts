import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { sendEmail, EmailRegistry } from '@/lib/learning/email';
import { createLogger } from '@/lib/logger';

const log = createLogger('Email Send API');

export async function GET() {
  return apiSuccess({ templates: EmailRegistry.getAllIds() });
}

export async function POST(request: NextRequest) {
  try {
    const { template_id, to, fields, from, reply_to, subject } = await request.json();

    if (!template_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing template_id');
    }
    if (!to) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing to');
    }

    const result = await sendEmail(template_id, {
      to,
      fields: fields ?? {},
      from,
      replyTo: reply_to,
      subject,
    });

    if (!result.success) {
      log.error('Email send failed:', result.error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Email send failed', result.error);
    }

    return apiSuccess({ sent: true });
  } catch (error) {
    log.error('Email API failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Email API failed', String(error));
  }
}
