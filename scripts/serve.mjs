import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root = resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const server = http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Outside root');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const data = await readFile(path);
    res.writeHead(200, {'Content-Type':types[extname(path)] || 'application/octet-stream','Cache-Control':'no-cache'}); res.end(data);
  } catch {res.writeHead(404, {'Content-Type':'text/plain'});res.end('Page not found');}
});
server.listen(Number(process.env.PORT || 4173),'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
