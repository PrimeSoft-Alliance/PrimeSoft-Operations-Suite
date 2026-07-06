export function validateEnvironment(): void {
  // Silent check, logging only if necessary for developers but no fatal exits
  if (!process.env.MONGODB_URI) {
    // We just log it silently once
    console.log('[System] Database connection string not found. Persistence disabled.');
  }
}
