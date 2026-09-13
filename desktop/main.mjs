import {app,BrowserWindow,Menu,protocol,session,shell,dialog} from 'electron';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {findProject,resourcePath} from './files.mjs';

protocol.registerSchemesAsPrivileged([{scheme:'quebec',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const smoke = process.argv.includes('--smoke-test');

let window;
if (!smoke && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{window?.restore();window?.focus();});
  app.whenReady().then(async()=>{
    let project = findProject([process.env.PORTABLE_EXECUTABLE_DIR,path.dirname(app.getPath('exe')),app.getAppPath()]);
    if (!project) {
      const chosen = await dialog.showOpenDialog({title:'Select the Québec polling project folder',properties:['openDirectory']});
      project = findProject(chosen.filePaths);
    }
    if (!project) { dialog.showErrorBox('Project not found','Select a project containing data/state.json and public/data/dashboard.json.');app.exit(1);return; }
    const assets = path.join(app.getAppPath(),'dist');
    const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
    protocol.handle('quebec',async request=>{
      try {
        const file = resourcePath(request.url,assets,project);
        if (!file || request.method !== 'GET') return new Response('Not found',{status:404});
        return new Response(await readFile(file),{headers:{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'"}});
      } catch { return new Response('Dataset or asset unavailable',{status:503}); }
    });
    session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    window = new BrowserWindow({width:1380,height:940,minWidth:760,minHeight:600,title:'Québec 2026 — Polling Desk',backgroundColor:'#f8fafc',show:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
    const external = url=>{try {if(new URL(url).protocol==='https:') void shell.openExternal(url);}catch{}};
    window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
    window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==new URL('quebec://dashboard/').origin || !url.startsWith('quebec://dashboard/')) {event.preventDefault();external(url);}});
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'Dashboard',submenu:[{label:'Refresh displayed data',accelerator:'CmdOrCtrl+R',click:()=>window.reload()},{label:'Open project folder',click:()=>shell.openPath(project)},{type:'separator'},{role:'quit'}]},
      {label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'togglefullscreen'}]},
      {label:'Help',submenu:[{label:'About this dashboard',click:()=>dialog.showMessageBox(window,{title:'Québec 2026',message:'Independent polling desk',detail:'The desktop app reads the project’s verified dataset. Data checks run through the separately configured daily automation. Displayed data refreshes every 60 seconds. Source links open in your default browser.'})}]}
    ]));
    await window.loadURL('quebec://dashboard/');
    if (smoke) {
      await new Promise(resolve=>setTimeout(resolve,2000));
      const result = await window.webContents.executeJavaScript(`({title:document.title,text:document.body.innerText,isolated:typeof process==='undefined',url:location.href})`);
      const output = path.join(project,'tmp/desktop');await mkdir(output,{recursive:true});
      await writeFile(path.join(output,'smoke.json'),JSON.stringify(result,null,2));
      try { await writeFile(path.join(output,'desktop.png'),(await window.webContents.capturePage()).toPNG()); }
      catch(error) { console.warn('Screenshot unavailable:',error.message); }
      app.exit(result.text.includes('Dashboard polling average')&&result.text.includes('Latest verified polls')&&result.isolated?0:1);
    }
  }).catch(error=>{console.error(error);app.exit(1);});
  app.on('window-all-closed',()=>app.quit());
}
