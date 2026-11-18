const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve('src/main/resources/static');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
let scripts = 0, links = 0;
const errors = [];
for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.js')) {
    try { new vm.Script(source, { filename: file }); scripts++; } catch (error) { errors.push(error.message); }
  }
  if (!file.endsWith('.html')) continue;
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || /application\/(json|ld\+json)/.test(match[1])) continue;
    try { new vm.Script(match[2], { filename: file }); scripts++; } catch (error) { errors.push(error.message); }
  }
  for (const match of source.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const target = match[1].split(/[?#]/)[0];
    if (!target || /^[a-z]+:|\$\{|^\/\//i.test(target)) continue;
    const resolved = target.startsWith('/') ? path.join(root, target) : path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) errors.push(`${path.relative(root, file)}: missing ${target}`);
    links++;
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Frontend passed: ${scripts} scripts parsed, ${links} local assets/navigation targets checked.`);
