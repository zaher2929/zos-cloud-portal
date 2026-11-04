import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{const url=new URL(req.url,'http://preview');
if(url.pathname==='/preview-views.js'){
 const code=fs.readFileSync(path.join(root,'views.js'),'utf8').replace("from './documents.js'", "from './preview-documents.js'");res.setHeader('content-type','text/javascript');res.end(code);return;
}
if(url.pathname==='/preview-documents.js'){
 res.setHeader('content-type','text/javascript');res.end("export {validateDocument,verifyUploadReceipt} from './documents.js';export const documentDigest=async()=> 'f'.repeat(64);");return;
}
if(url.pathname==='/preview.html'){res.setHeader('content-type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('./app.js','./preview-app.js'));return;}
if(url.pathname==='/preview-app.js'){
 let code=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=code.indexOf('async function call('),end=code.indexOf('const messages=',start);
 code=code.slice(0,start)+'const call=previewCall;\n'+code.slice(end);
 code="import {previewCall,fixtureControls} from './preview-fixtures.js';\n"+code;
 code=code.replace("from './views.js'","from './preview-views.js'");
 code=code.replace(/\nbindLogin\(\);/,"\ndeadline=Date.now()+1800000;await openApp();fixtureControls();");
 code=code.replace("if('serviceWorker' in navigator)",'if(false)');
 res.setHeader('content-type','text/javascript');res.end(code);return;
}
const name=decodeURIComponent(new URL(req.url,'http://preview').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}try{res.setHeader('content-type',types[path.extname(file)]||'text/plain');res.setHeader('cache-control','no-store');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}}).listen(4173,'0.0.0.0');
