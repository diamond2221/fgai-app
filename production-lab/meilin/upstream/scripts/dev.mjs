// Runs the orchestration server and the Vite dev server together.
import { spawn } from 'node:child_process';
const opts = { stdio: 'inherit', shell: process.platform === 'win32' };
const api = spawn('node', ['server/index.mjs'], opts);
const web = spawn('npx', ['vite'], opts);
const stop = () => { api.kill(); web.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
