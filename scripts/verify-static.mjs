import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve('src/main/resources/static');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);
let scripts=0, links=0, failures=[];
const files=walk(root);
for(const file of files) {
 const source=fs.readFileSync(file,'utf8');
 const relative=path.relative(root,file);
 if(/\.(?:js|html|css)$/.test(file) && /^(?:<{7}|={7}|>{7})(?:\s|$)/m.test(source)) failures.push(`${relative}: conflict marker`);
 function compile(code){try{new vm.Script(code,{filename:relative});scripts++;}catch(error){failures.push(error.message);}}
 if(file.endsWith('.js')) compile(source);
 if(file.endsWith('.html')) {
   for(const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if(!/\bsrc=/.test(match[1])&&!/application\/ld\+json/.test(match[1])) compile(match[2]);
 }
 if(/\.(?:html|css)$/.test(file)) {
   const refs=file.endsWith('.html')?[...source.matchAll(/\b(?:href|src)=["']([^"']*)["']/g)].map(m=>m[1]):[...source.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(m=>m[1]);
   for(const ref of refs) {
     if(!ref||/^(?:[a-z]+:|#|\/\/|\$\{)/i.test(ref)||ref.includes('${')) continue;
     const local=ref.split(/[?#]/)[0];
     if(!local)continue;
     const target=local.startsWith('/')?path.join(root,local):path.resolve(path.dirname(file),local);
     links++;
     if(!fs.existsSync(target)) failures.push(`${relative}: missing ${ref}`);
   }
 }
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
console.log(`Checked ${files.length} files, ${scripts} scripts, ${links} local references; ${failures.length} failures.`);
