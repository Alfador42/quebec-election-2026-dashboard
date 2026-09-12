import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export const readJSON=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
export async function writeJSON(p,value) {
  const target=path.join(root,p); await fs.mkdir(path.dirname(target),{recursive:true});
  const bytes=JSON.stringify(value,null,2)+'\n';
  try {if(await fs.readFile(target,'utf8')===bytes) return;} catch(e) {if(e.code!=='ENOENT') throw e;}
  await fs.writeFile(target+'.tmp',bytes); await fs.rename(target+'.tmp',target);
}
export async function withLock(fn) {
  const lock=path.join(root,'data/.update.lock'); await fs.mkdir(path.dirname(lock),{recursive:true});
  let handle;
  try {handle=await fs.open(lock,'wx');} catch(e) {if(e.code==='EEXIST') throw new Error('Another update is running; inspect data/.update.lock before removing a stale lock');throw e;}
  try {await handle.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()})); return await fn();}
  finally {await handle.close();await fs.unlink(lock);}
}
