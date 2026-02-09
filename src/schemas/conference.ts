import { z } from 'zod';

/**
 * Schema for Attendee attributes validation
 * - Max 5 attributes per attendee
 * - Max 50 characters per attribute
 */
export const AttendeeAttributesSchema = z
  .array(
    z.string()
      .max(50, 'Each attribute must be 50 characters or less')
      .min(1, 'Attributes cannot be empty strings')
  )
  .max(5, 'Maximum 5 attributes per attendee')
  .optional();

/**
 * Schema for Sheet Column Mapping configuration
 */
export const SheetColumnMappingSchema = z.object({
  sheetName: z.string().min(1, 'Sheet name is required'),
  startRow: z.number().int().min(1, 'Start row must be >= 1'),
  columns: z.object({
    id: z.number().int().min(0),
    affiliation: z.number().int().min(0),
    name: z.number().int().min(0),
    items: z.number().int().min(0),
    checkedIn: z.number().int().min(0),
    checkedInAt: z.number().int().min(0),
    staffName: z.number().int().min(0),
    // Optional columns
    attribute: z.number().int().min(0).optional(),
    nameKana: z.number().int().min(0).optional(),
    bodySize: z.number().int().min(0).optional(),
    novelties: z.number().int().min(0).optional(),
    memo: z.number().int().min(0).optional(),
    attendsReception: z.number().int().min(0).optional(),
  }),
});

/**
 * Schema for Conference Configuration
 */
export const ConferenceConfigSchema = z.object({
  id: z.string()
    .min(1, 'Conference ID is required')
    .regex(/^[a-z0-9-]+$/, 'Conference ID must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(1, 'Conference name is required'),
  passwordEnvVar: z.string()
    .min(1, 'Password environment variable name is required')
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Environment variable name must be uppercase with underscores'),
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
  sheetConfig: SheetColumnMappingSchema.optional(),
});

/**
 * Schema for the conferences configuration file
 */
export const ConferencesConfigFileSchema = z.object({
  conferences: z.array(ConferenceConfigSchema).min(1, 'At least one conference is required'),
});

/**
 * Validate conferences array and check for duplicate IDs
 */
export function validateConferences(conferences: unknown) {
  // Parse with Zod schema
  const result = ConferencesConfigFileSchema.safeParse({ conferences });

  if (!result.success) {
    const errors = result.error.issues.map(err =>
      `  - ${err.path.join('.')}: ${err.message}`
    ).join('\n');

    throw new Error(`Invalid conference configuration:\n${errors}`);
  }

  // Check for duplicate conference IDs
  const ids = result.data.conferences.map(c => c.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate conference IDs found: ${duplicates.join(', ')}\n` +
      'Each conference must have a unique ID.'
    );
  }

  return result.data.conferences;
}

export type ConferenceConfigInput = z.infer<typeof ConferenceConfigSchema>;
export type SheetColumnMappingInput = z.infer<typeof SheetColumnMappingSchema>;
