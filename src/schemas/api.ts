import { z } from 'zod';

/**
 * Login request schema
 */
export const LoginRequestSchema = z.object({
  conferenceId: z
    .string()
    .min(1, 'Conference ID is required')
    .max(100, 'Conference ID must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Conference ID must contain only lowercase letters, numbers, and hyphens'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(200, 'Password must be less than 200 characters'),
  staffName: z
    .string()
    .min(1, 'Staff name is required')
    .max(100, 'Staff name must be less than 100 characters')
    .trim(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Check-in request schema
 */
export const CheckInRequestSchema = z.object({
  rowId: z
    .string()
    .min(1, 'Row ID is required')
    .regex(/^\d+$/, 'Row ID must be a valid number'),
});

export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;

/**
 * Check-out request schema
 */
export const CheckOutRequestSchema = z.object({
  rowId: z
    .string()
    .min(1, 'Row ID is required')
    .regex(/^\d+$/, 'Row ID must be a valid number'),
});

export type CheckOutRequest = z.infer<typeof CheckOutRequestSchema>;
