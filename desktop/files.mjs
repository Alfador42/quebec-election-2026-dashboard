import path from 'node:path';
import {existsSync} from 'node:fs';

export function findProject(starts) {
  for (const start of starts.filter(Boolean)) {
    let directory = path.resolve(start);
    for (let i = 0; i < 5; i++) {
      if (['data/state.json','config/election.json','public/data/dashboard.json'].every(file => existsSync(path.join(directory,file)))) return directory;
      directory = path.dirname(directory);
    }
  }
  return null;
}

export function resourcePath(url, assets, project) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'quebec:' || parsed.hostname !== 'dashboard') return null;
  const pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/data/dashboard.json') return path.join(project,'public/data/dashboard.json');
  if (pathname === '/' || pathname === '/index.html') return path.join(assets,'index.html');
  if (pathname === '/favicon.svg') return path.join(assets,'favicon.svg');
  if (!/^\/assets\/[a-zA-Z0-9_.-]+\.(js|css|svg|png|woff2)$/.test(pathname)) return null;
  return path.join(assets,pathname.slice(1));
}
