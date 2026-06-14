const fs = require('fs');
const files = [
  'src/api/routes/public.ts',
  'src/api/routes/chat.ts',
  'src/api/routes/dashboard.ts',
  'src/api/utils/resolveClient.ts',
  'src/api/auth.ts',
  'src/api/models.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{.*PlatformSettings.*\} from '\.\.\/models';/g, '');
  content = content.replace(/const platformSettings = await PlatformSettings\.findOne\(\);/g, 'const platformSettings = null;');
  content = content.replace(/const pSettings = await PlatformSettings\.findOne\(\);/g, 'const pSettings = null;');
  content = content.replace(/let pSettings = await PlatformSettings\.findOne\(\);/g, 'let pSettings = null;');
  
  if (file.includes('models.ts')) {
     content = content.replace(/export const PlatformSettings = .*/g, '');
     content = content.replace(/export const PlatformNotification = .*/g, '');
     content = content.replace(/export const OnboardingRequest = .*/g, '');
     content = content.replace(/export const AuditLog = .*/g, '');
     content = content.replace(/export const PromptHistory = .*/g, '');
  }
  
  fs.writeFileSync(file, content);
}
console.log('Done');
