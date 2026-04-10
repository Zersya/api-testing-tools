/**
 * cURL Command Parser Endpoint
 * POST /api/utils/parse-curl
 * 
 * Accepts a curl command string and returns parsed HTTP request components.
 * This is a utility endpoint for pre-filling request forms.
 */

import { parseCurlCommand } from '../../utils/curl-parser';

interface ParseRequestBody {
  command: string;
}

interface ParseSuccessResponse {
  success: true;
  data: {
    name: string;
    description?: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
    auth: {
      type: string;
      credentials?: Record<string, string>;
    } | null;
    queryParams: Array<{ key: string; value: string; description?: string }>;
    contentType?: string;
    formData?: Array<{ key: string; value: string; type: 'text' | 'file' }>;
    cookies?: Record<string, string>;
  };
}

interface ParseErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
  };
}

export default defineEventHandler(async (event): Promise<ParseSuccessResponse | ParseErrorResponse> => {
  try {
    const body = await readBody<ParseRequestBody>(event);

    if (!body || !body.command) {
      return {
        success: false,
        error: {
          message: 'Curl command is required',
          code: 'MISSING_COMMAND'
        }
      };
    }

    const result = parseCurlCommand(body.command);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: 'Failed to parse curl command',
          code: 'PARSE_ERROR'
        }
      };
    }

    return {
      success: true,
      data: {
        name: result.data!.name,
        method: result.data!.method,
        url: result.data!.url,
        headers: result.data!.headers,
        body: result.data!.body,
        auth: result.data!.auth,
        queryParams: result.data!.queryParams,
        contentType: result.data!.contentType,
        formData: result.data!.formData,
        cookies: result.data!.cookies
      }
    };
  } catch (error: any) {
    console.error('Error parsing curl command:', error);
    
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      }
    };
  }
});
