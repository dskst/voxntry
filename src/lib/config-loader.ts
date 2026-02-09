import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ConferenceConfig } from '@/types';
import { validateConferences, type ConferenceConfigInput } from '@/schemas/conference';

/**
 * Validate required environment variable
 */
const validateEnvVar = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n\n` +
      `Please ensure the environment variable is set in your .env.local file or environment.`
    );
  }
  return value;
};

/**
 * Load conference configuration from JSON file
 */
function loadConferencesFromFile(): ConferenceConfigInput[] {
  const configPath = join(process.cwd(), 'config', 'conferences.json');

  if (!existsSync(configPath)) {
    throw new Error(
      `❌ Conference configuration file not found: ${configPath}\n\n` +
      `📝 Initial setup required:\n` +
      `   1. Copy config/conferences.example.json to config/conferences.json\n` +
      `   2. Edit config/conferences.json with your conference settings\n` +
      `   3. Set required environment variables in .env.local\n\n` +
      `📖 See README.md for detailed setup instructions`
    );
  }

  try {
    const fileContent = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(fileContent);

    if (!parsed.conferences || !Array.isArray(parsed.conferences)) {
      throw new Error(
        `Invalid configuration file format. Expected { "conferences": [...] }`
      );
    }

    // Validate with Zod schema
    return validateConferences(parsed.conferences);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `❌ Invalid JSON in conference configuration file:\n` +
        `   ${error.message}\n\n` +
        `🔧 Please check config/conferences.json for syntax errors`
      );
    }
    throw error;
  }
}

/**
 * Enrich conference configuration with environment variables
 */
function enrichWithEnvVars(configs: ConferenceConfigInput[]): ConferenceConfig[] {
  return configs.map(config => {
    // Get password from environment variable
    const password = validateEnvVar(
      config.passwordEnvVar,
      process.env[config.passwordEnvVar]
    );

    return {
      id: config.id,
      name: config.name,
      password,
      spreadsheetId: config.spreadsheetId,
      sheetConfig: config.sheetConfig,
    };
  });
}

/**
 * Load and validate conference configurations
 * Combines JSON configuration with environment variables
 */
export function loadConferences(): ConferenceConfig[] {
  try {
    const configs = loadConferencesFromFile();
    return enrichWithEnvVars(configs);
  } catch (error) {
    // Log error to console for debugging
    console.error('Failed to load conference configuration:', error);
    throw error;
  }
}

/**
 * Get conference by ID
 */
export function getConference(id: string, conferences: ConferenceConfig[]): ConferenceConfig | undefined {
  return conferences.find(c => c.id === id);
}

// Cache loaded conferences in production for performance
let cachedConferences: ConferenceConfig[] | null = null;

/**
 * Get conferences with caching in production
 */
export function getConferences(): ConferenceConfig[] {
  if (process.env.NODE_ENV === 'production' && cachedConferences) {
    return cachedConferences;
  }

  const conferences = loadConferences();

  if (process.env.NODE_ENV === 'production') {
    cachedConferences = conferences;
  }

  return conferences;
}
