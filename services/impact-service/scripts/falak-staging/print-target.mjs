import { assertSafeHostedStagingTarget, loadFalakStagingEnv, required, stageInfo } from './common.mjs';

loadFalakStagingEnv();
assertSafeHostedStagingTarget('falak:target:staging');

const baseUrl = required('STAGING_BASE_URL').replace(/\/+$/, '');

stageInfo('Staging base URL', baseUrl);
stageInfo('Primary health', `${baseUrl}/health`);
stageInfo('Falak operational health', `${baseUrl}/v1/falak/health`);
stageInfo('Falak readiness', `${baseUrl}/v1/falak/readiness`);
stageInfo('Smoke verification command', 'npm run falak:smoke:staging');
stageInfo('One-shot verification command', 'npm run falak:verify:staging');
