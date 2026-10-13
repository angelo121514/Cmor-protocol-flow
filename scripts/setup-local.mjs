import {writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {localStatus} from './local-status.mjs';
const status=localStatus();
// Exclusive writes prevent replacing a developer's existing configuration.
await writeFile('.env',[
  `VITE_SUPABASE_URL=${status.API_URL}`,
  `VITE_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  'VITE_SENTRY_DSN=',
  'VITE_SUPPORT_EMAIL=support@example.test',
  'VITE_SALES_EMAIL=sales@example.test',
  'VITE_PRIVACY_EMAIL=privacy@example.test',
  'VITE_OPERATOR_NAME=Operador de demostración',
].join('\n')+'\n',{flag:'wx',mode:0o600});
await mkdir('.local-test',{recursive:true});
await writeFile('.local-test/development-edge.env',[
  'LOCAL_TEST_ONLY=true',
  'PUBLIC_APP_URL=http://localhost:5173',
  'APP_URL=http://localhost:5173',
  `PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `INTERNAL_FUNCTION_SECRET=${randomBytes(32).toString('hex')}`,
].join('\n')+'\n',{flag:'wx',mode:0o600});
console.log('Local .env and ignored Edge settings created. No credentials were printed.');
