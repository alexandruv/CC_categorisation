import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseStatement} from '../categorizer.mjs';
import {parseBank,reconcile} from '../bank.mjs';
await mkdir('worker',{recursive:true});
const name='Lista_operacji_20260927_152250.txt';
const transactions=reconcile(parseStatement(await readFile(name,'utf8')),parseBank(await readFile('Lista_operacji_20260927_153225.csv','utf8')));
await writeFile('worker/sample.json',JSON.stringify({name,transactions}));
console.log('Prepared protected sample: '+transactions.length+' transactions.');
