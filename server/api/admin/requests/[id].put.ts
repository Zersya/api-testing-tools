import { db } from '../../../db';
import { savedRequests, type HttpMethod, type RequestHeaders, type RequestBody, type RequestAuth } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';

interface UpdateRequestBody {
  name?: string;
  method?: HttpMethod;
  url?: string;
  headers?: RequestHeaders;
  body?: RequestBody;
  auth?: RequestAuth;
  order?: number;
}

const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request ID is required'
    });
  }

  const body = await readBody<UpdateRequestBody>(event);

  // Validate that at least one field is provided
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one field must be provided for update'
    });
  }

  try {
    // Check if request exists
    const existing = (await db
      .select()
      .from(savedRequests)
      .where(eq(savedRequests.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found'
      });
    }

    // Prepare update data
    const updateData: Partial<{
      name: string;
      method: HttpMethod;
      url: string;
      headers: RequestHeaders | null;
      body: RequestBody;
      auth: RequestAuth;
      order: number;
      updatedAt: Date;
    }> = {
      updatedAt: new Date()
    };

    // Validate and set name
    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Request name must be a string'
        });
      }

      const trimmedName = body.name.trim();

      if (trimmedName.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Request name cannot be empty'
        });
      }

      if (trimmedName.length > 200) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Request name cannot exceed 200 characters'
        });
      }

      updateData.name = trimmedName;
    }

    // Validate and set method
    if (body.method !== undefined) {
      if (typeof body.method !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'HTTP method must be a string'
        });
      }

      const method = body.method.toUpperCase() as HttpMethod;
      if (!validMethods.includes(method)) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid HTTP method. Must be one of: ${validMethods.join(', ')}`
        });
      }

      updateData.method = method;
    }

    // Validate and set URL
    if (body.url !== undefined) {
      if (typeof body.url !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'URL must be a string'
        });
      }

      const trimmedUrl = body.url.trim();
      if (trimmedUrl.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'URL cannot be empty'
        });
      }

      updateData.url = trimmedUrl;
    }

    // Set headers (can be null or object)
    if (body.headers !== undefined) {
      updateData.headers = body.headers;
    }

    // Set body (can be null, string, or object)
    if (body.body !== undefined) {
      updateData.body = body.body;
    }

    // Set auth (can be null or object)
    if (body.auth !== undefined) {
      updateData.auth = body.auth;
    }

    // Validate and set order
    if (body.order !== undefined) {
      if (typeof body.order !== 'number' || !Number.isInteger(body.order)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Order must be an integer'
        });
      }
      updateData.order = body.order;
    }

    // Update the request
    const updatedRequest = (await db
      .update(savedRequests)
      .set(updateData)
      .where(eq(savedRequests.id, id))
      .returning())[0];

    return updatedRequest;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error updating request:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update request'
    });
  }
});
