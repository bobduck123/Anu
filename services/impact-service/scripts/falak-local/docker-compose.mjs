import { runDockerCompose } from './common.mjs';

const action = process.argv[2];

switch (action) {
  case 'up':
    runDockerCompose(['up', '-d']);
    break;
  case 'down':
    runDockerCompose(['down']);
    break;
  case 'logs':
    runDockerCompose(['logs', 'falak-postgis']);
    break;
  case 'ps':
    runDockerCompose(['ps']);
    break;
  default:
    throw new Error(`Unsupported docker compose action "${action}". Use up, down, logs, or ps.`);
}
