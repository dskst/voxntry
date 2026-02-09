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

/**
 * OCR request schema (multipart/form-data validation)
 */
export const OcrRequestSchema = z.object({
  image: z.instanceof(Blob, { message: 'Image file is required' })
    .refine((file) => file.size > 0, 'Image file cannot be empty')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Image file must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Image must be JPEG, PNG, or WebP format'
    ),
});

export type OcrRequest = z.infer<typeof OcrRequestSchema>;

/**
 * Transcribe request schema (multipart/form-data validation)
 */
export const TranscribeRequestSchema = z.object({
  audio: z.instanceof(Blob, { message: 'Audio file is required' })
    .refine((file) => file.size > 0, 'Audio file cannot be empty')
    .refine((file) => file.size <= 50 * 1024 * 1024, 'Audio file must be less than 50MB')
    .refine(
      (file) => ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg'].includes(file.type),
      'Audio must be WebM, OGG, WAV, or MP3 format'
    ),
});

export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;
