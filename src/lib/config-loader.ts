import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ConferenceConfig } from '@/types';
import { validateConferences, type ConferenceConfigInput } from '@/schemas/conference';

/**
 * File system interface for dependency injection
 */
export interface FileSystem {
  readFileSync: (path: string, encoding: BufferEncoding) => string;
  existsSync: (path: string) => boolean;
}

/**
 * Environment interface for dependency injection
 */
export interface Environment {
  NODE_ENV?: string;
  [key: string]: string | undefined;
}

/**
 * Default file system implementation
 */
export const defaultFileSystem: FileSystem = {
  readFileSync: (path: string, encoding: BufferEncoding) => readFileSync(path, encoding),
  existsSync: (path: string) => existsSync(path),
};

/**
 * Default environment implementation
 */
export const defaultEnvironment: Environment = process.env;

/**
 * Validate required environment variable
 */
export const validateEnvVar = (
  name: string,
  value: string | undefined
): string => {
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
function loadConferencesFromFile(
  fs: FileSystem = defaultFileSystem,
  cwd: string = process.cwd()
): ConferenceConfigInput[] {
  const configPath = join(cwd, 'config', 'conferences.json');

  if (!fs.existsSync(configPath)) {
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
    const fileContent = fs.readFileSync(configPath, 'utf-8');
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
function enrichWithEnvVars(
  configs: ConferenceConfigInput[],
  env: Environment = defaultEnvironment
): ConferenceConfig[] {
  return configs.map(config => {
    // Get password from environment variable
    const password = validateEnvVar(
      config.passwordEnvVar,
      env[config.passwordEnvVar]
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
export function loadConferences(
  fs: FileSystem = defaultFileSystem,
  env: Environment = defaultEnvironment,
  cwd: string = process.cwd()
): ConferenceConfig[] {
  try {
    const configs = loadConferencesFromFile(fs, cwd);
    return enrichWithEnvVars(configs, env);
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
export function getConferences(
  fs: FileSystem = defaultFileSystem,
  env: Environment = defaultEnvironment,
  cwd: string = process.cwd()
): ConferenceConfig[] {
  if (env.NODE_ENV === 'production' && cachedConferences) {
    return cachedConferences;
  }

  const conferences = loadConferences(fs, env, cwd);

  if (env.NODE_ENV === 'production') {
    cachedConferences = conferences;
  }

  return conferences;
}
