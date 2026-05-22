/**
 * Environment Variable Validation
 * Runs at server startup to ensure all required vars are set
 */

export function validateEnvironment(): void {
  const requiredVars = [
    'MONGODB_URI',
    'NODE_ENV',
  ];

  const optionalVars = [
    'GROQ_API_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'JWT_SECRET',
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  for (const envVar of optionalVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('\n🚨 FATAL: Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease set these variables and restart the server.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Missing optional environment variables (some features may be limited):');
    warnings.forEach(v => console.warn(`  - ${v}`));
    console.warn();
  }

  // Validate MongoDB URI format
  const mongoUri = process.env.MONGODB_URI || '';
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('\n🚨 FATAL: MONGODB_URI must start with mongodb:// or mongodb+srv://\n');
    process.exit(1);
  }

  console.log('✓ Environment validation passed');
}
