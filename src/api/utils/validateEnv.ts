export function validateEnvironment(): void {
  const missing: string[] = [];
  
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  
  if (missing.length > 0) {
    console.error('\n⚠️ WARNING: Missing recommended environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.warn('Some features will not work until these are configured.');
  }
  
  const mongoUri = process.env.MONGODB_URI || '';
  if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('\n⚠️ WARNING: MONGODB_URI format seems invalid. It should start with mongodb:// or mongodb+srv://\n');
  }
}
