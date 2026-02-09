#!/usr/bin/env node

/**
 * Password Hashing Utility
 *
 * This script generates bcrypt hashes for passwords.
 * Use the generated hash as the value for CONFERENCE_*_PASSWORD environment variables.
 *
 * Usage:
 *   node scripts/hash-password.js <password>
 *
 * Example:
 *   node scripts/hash-password.js "mySecurePassword123"
 *
 * Then update your .env.local:
 *   CONFERENCE_DEMO_CONF_PASSWORD=$2b$12$...generatedHash...
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function hashPassword(password) {
  if (!password) {
    console.error('❌ Error: Password is required');
    console.log('\nUsage: node scripts/hash-password.js <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.warn('⚠️  Warning: Password is less than 8 characters. Consider using a stronger password.');
  }

  try {
    console.log('🔐 Generating bcrypt hash...');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    console.log('\n✅ Password hashed successfully!');
    console.log('\n📋 Copy this hash to your .env.local file:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(hash);
    console.log('─────────────────────────────────────────────────────────────');
    console.log('\nExample .env.local entry:');
    console.log(`CONFERENCE_DEMO_CONF_PASSWORD=${hash}`);
    console.log('\n⚠️  Important: Keep this hash secure and never commit it to version control!');
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
}

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.error('❌ Error: No password provided');
  console.log('\nUsage: node scripts/hash-password.js <password>');
  console.log('Example: node scripts/hash-password.js "mySecurePassword123"');
  process.exit(1);
}

hashPassword(password);
