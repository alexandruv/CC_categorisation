import {mkdir,copyFile,rm,writeFile} from 'node:fs/promises';
// Explicit allowlist: never publish .env, bank statements, caches, or worker data.
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','cloud-client.js','workspace-store.js','transaction-query.js'])await copyFile('public/'+file,'dist/'+file);
for(const file of ['categorizer.mjs','bank.mjs'])await copyFile(file,'dist/'+file);
await writeFile('dist/.nojekyll','');
console.log('Built static website assets.');
