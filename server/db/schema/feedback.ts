import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

/**
 * Feedback configuration - controlled by super admin
 * Stores the active time window and form configuration
 */
export const feedbackConfig = pgTable('feedback_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Time window control
  isEnabled: boolean('is_enabled').notNull().default(false),
  shownFrom: timestamp('shown_from'),
  shownUntil: timestamp('shown_until'),
  
  // Form configuration
  title: text('title').notNull().default('We value your feedback'),
  description: text('description').default('Help us improve by sharing your thoughts'),
  questions: jsonb('questions').$type<FeedbackQuestion[]>().default([]),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by'), // super admin email
});

export interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'single_choice';
  label: string;
  required: boolean;
  options?: string[]; // for choice types
  maxRating?: number; // for rating type
}

/**
 * Feedback submissions from users
 */
export const feedbackSubmissions = pgTable('feedback_submissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // User info (optional - allow anonymous)
  userId: text('user_id'),
  userEmail: text('user_email'),
  workspaceId: text('workspace_id'),
  
  // Submission content
  responses: jsonb('responses').$type<Record<string, unknown>>().notNull(),
  rating: integer('rating'), // overall rating if provided
  comment: text('comment'), // free text comment
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
});

export type FeedbackConfig = typeof feedbackConfig.$inferSelect;
export type NewFeedbackConfig = typeof feedbackConfig.$inferInsert;
export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;
export type NewFeedbackSubmission = typeof feedbackSubmissions.$inferInsert;
