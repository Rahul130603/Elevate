import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const NEWS_TARGET = `http://127.0.0.1:${process.env.NEWS_PORT || '5002'}`;
let child;
export async function startNewsWorker() {
  if (process.env.NEWS_WORKER_EXTERNAL === '1') return;
  try {
    const response = await fetch(`${NEWS_TARGET}/health`, { signal: AbortSignal.timeout(1000) });
    const health = await response.json();
    if (health.service === 'meeetly-news') return;
    throw new Error('News port occupied by another service');
  } catch (error) {
    if (error.message === 'News port occupied by another service') throw error;
  }
  const script = fileURLToPath(new URL('../news/app.py', import.meta.url));
  child = spawn(process.env.NEWS_PYTHON_EXE || 'python', [script], { windowsHide: true, stdio: ['ignore','inherit','inherit'], env: process.env });
  child.on('error', () => console.error('News worker could not start. Install server/news/requirements.txt and configure NEWS_PYTHON_EXE.'));
  child.on('exit', code => { if (code) console.error(`News worker stopped (${code}). Calendar services remain available.`); });
  process.once('exit', () => child?.kill());
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => { child?.kill(); process.exit(0); });
}
