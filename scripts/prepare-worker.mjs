import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseStatement} from '../categorizer.mjs';
import {parseBank,reconcile} from '../bank.mjs';
import {reviewedDecision} from '../reviewed.mjs';
await mkdir('worker',{recursive:true});
const name='Lista_operacji_20260927_152250.txt';
const saved=JSON.parse(await readFile('worker/initial-categories.json','utf8'));
const rows=reconcile(parseStatement(await readFile(name,'utf8')),parseBank(await readFile('Lista_operacji_20260927_153225.csv','utf8')));
const transactions=rows.map(t=>{
 const key=createHash('sha256').update(JSON.stringify([t.merchant,t.title,t.type])).digest('hex')+':'+t.bankCategory;
 if(!saved[key])throw Error('The built-in statement needs saved results. Categorise it locally before changing the bundled sample.');
 return {...t,...saved[key],...reviewedDecision(t)};
});
await writeFile('worker/sample.json',JSON.stringify({name,transactions}));
console.log('Prepared protected sample: '+transactions.length+' previously categorised transactions; no inference needed.');
