export function validateEnvironment(): void {
  const missing: string[] = [];
  
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  // Add other required env vars if needed
  
  if (missing.length > 0) {
    console.error('\n🚨 FATAL: Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }
  
  const mongoUri = process.env.MONGODB_URI || '';
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('\n🚨 FATAL: MONGODB_URI must start with mongodb:// or mongodb+srv://\n');
    process.exit(1);
  }
}
