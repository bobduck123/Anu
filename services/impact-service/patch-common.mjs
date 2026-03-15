const c=fs.readFileSync(p,'utf8'
const start=c.indexOf('export function runCommand(command, args, options = {}) {');
if (start < 0) throw new Error('runCommand not found');
const end=c.indexOf('export function runDockerCompose(args) {');
if (end < 0) throw new Error('runDockerCompose not found');
const replacement=`export function runCommand(command, args, options = {}) {n  const executable = resolveExecutable(command);nn  const result = process.platform === 'win32'n    ? spawnSync('cmd.exe', ['/d', '/s', '/c', executable, ...args], {n        cwd: projectRoot,n        stdio: 'inherit',n        env: process.env,n        shell: false,n        ...optionsn      })n    : spawnSync(executable, args, {n        cwd: projectRoot,n        stdio: 'inherit',n        env: process.env,n        shell: false,n        ...optionsn      });nn  if (result.error) {n    throw result.error;n  }nn  if (result.status !== 0) {n    throw new Error(`${process.platform === 'win32' ? 'cmd.exe /d /s /c ' : ''}${executable} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);n  }n}nn`;
fs.writeFileSync(p, c.slice(0,start) + replacement + c.slice(end));
