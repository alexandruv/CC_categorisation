import http from 'node:http';
import {reviewedDecision} from './reviewed.mjs';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {categories,parseStatement,makeRequest} from './categorizer.mjs';
import {parseBank,reconcile,comparisonRequest} from './bank.mjs';
await mkdir('data',{recursive:true});
const env=await readFile('.env','utf8').catch(()=>'');
const key=process.env.TYPESAFE_API_KEY||env.match(/(?:typesafeai_api_key|TYPESAFE_API_KEY)\s*=\s*["']?([^\s"']+)/)?.[1];
let cache=JSON.parse(await readFile('data/cache.json','utf8').catch(()=>'{}'));
const jobs=new Map();
let compared=JSON.parse(await readFile('data/compared.json','utf8').catch(()=>'{}'));
const comparisonKey=t=>signature(t)+':'+t.bankCategory;
async function bankRows(){const files=(await readdir('.')).filter(n=>n.toLowerCase().endsWith('.csv'));return (await Promise.all(files.map(async n=>parseBank(await readFile(n,'utf8'))))).flat();}
const signature=t=>createHash('sha256').update(JSON.stringify([t.merchant,t.title,t.type])).digest('hex');
async function classify(job){
 try{
 const unique=[...new Map(job.transactions.filter(t=>t.amount<0&&!cache[signature(t)]).map(t=>[signature(t),t])).values()];
 if(unique.length&&!key)throw new Error('TypeSafe API key is missing. Add TYPESAFE_API_KEY to .env and restart.');
 for(let offset=0;offset<unique.length;offset+=12){
  const batch=unique.slice(offset,offset+12); let response;
  for(let attempt=0;attempt<4;attempt++){
   response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(makeRequest(batch)),signal:AbortSignal.timeout(90000)});
   if(![429,529,503].includes(response.status))break;
   if(attempt<3)await new Promise(r=>setTimeout(r,1500*2**attempt));
  }
  if(!response.ok)throw new Error(`Jev returned HTTP ${response.status}. Check your API access and retry.`);
  const result=await response.json();
  for(let i=0;i<batch.length;i++){
   const a=result.answers?.['t'+i];
   if(!a||!categories[a.choice]||!Number.isFinite(a.confidence))throw new Error('Jev returned an incomplete answer. Please retry.');
   cache[signature(batch[i])]={category:a.choice,confidence:a.confidence,probabilities:a.probabilities,model:result.model};
  }
  await writeFile('data/cache.json',JSON.stringify(cache));
  hydrate(job);
 }
 hydrate(job);job.phase='comparison';
 const candidates=[...new Map(job.transactions.filter(t=>t.amount<0&&t.bankCategory&&!compared[comparisonKey(t)]).map(t=>[comparisonKey(t),t])).values()];
 for(let offset=0;offset<candidates.length;offset+=12){
 const batch=candidates.slice(offset,offset+12);let response;
 for(let attempt=0;attempt<4;attempt++){
 response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(comparisonRequest(batch)),signal:AbortSignal.timeout(90000)});
 if(![429,529,503].includes(response.status))break;
 if(attempt<3)await new Promise(r=>setTimeout(r,1500*2**attempt));
 }
 if(!response.ok)throw new Error('Jev comparison returned HTTP '+response.status+'. Please retry.');
 const result=await response.json();
 for(let i=0;i<batch.length;i++){
 const a=result.answers?.['t'+i];if(!a||!categories[a.choice]||!Number.isFinite(a.confidence))throw new Error('Incomplete Jev comparison. Please retry.');
 compared[comparisonKey(batch[i])]={category:a.choice,confidence:a.confidence,probabilities:a.probabilities,model:result.model,compared:true};
 }
 await writeFile('data/compared.json',JSON.stringify(compared));hydrate(job);
 }
 hydrate(job);job.status='complete';
 }catch(e){job.status='error';job.error=e.message;}
}
function hydrate(job){job.transactions=job.transactions.map(t=>({...t,...(t.amount>=0?{category:'income',confidence:1}:cache[signature(t)]||{}),initialCategory:cache[signature(t)]?.category,...(t.bankCategory?compared[comparisonKey(t)]||{}:{}),...reviewedDecision(t)}));job.done=job.transactions.filter(t=>t.category).length;job.comparedCount=job.transactions.filter(t=>t.compared).length;job.bankMatched=job.transactions.filter(t=>t.bankCategory).length;job.changedCount=job.transactions.filter(t=>t.compared&&t.category!==t.initialCategory).length;}
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/api/sample'){const name=(await readdir('.')).find(n=>n.endsWith('.txt'));return json(res,{name,text:await readFile(name,'utf8')});}
 if(req.method==='GET'&&url.pathname==='/api/categories')return json(res,categories);
 if(req.method==='GET'&&url.pathname.startsWith('/api/jobs/')){const job=jobs.get(url.pathname.split('/').pop());return json(res,job||{error:'Import not found'},job?200:404);}
 if(req.method==='POST'&&url.pathname==='/api/import'){
  if(req.headers.origin&&!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin))return json(res,{error:'Invalid origin'},403);
  let body='';for await(const chunk of req){body+=chunk;if(body.length>2000000)return json(res,{error:'File is too large. Maximum 2 MB.'},413);}
  const input=JSON.parse(body);const transactions=reconcile(input.name?.toLowerCase().endsWith('.csv')?parseBank(input.text).map((t,i)=>({...t,id:String(i),category:null,confidence:null})):parseStatement(input.text),await bankRows());
  if(transactions.length>3000)return json(res,{error:'Please import fewer than 3,000 transactions.'},400);
  const id=crypto.randomUUID();const job={id,name:String(input.name||'Pasted statement'),transactions,status:'processing',done:0};hydrate(job);jobs.set(id,job);classify(job);return json(res,job);
 }
 const paths={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/cloud-client.js':'cloud-client.js','/workspace-store.js':'workspace-store.js','/transaction-query.js':'transaction-query.js','/categorizer.mjs':'../categorizer.mjs','/bank.mjs':'../bank.mjs'};
 if(req.method!=='GET'||!paths[url.pathname])return json(res,{error:'Not found'},404);
 const file=paths[url.pathname];res.writeHead(200,{'Content-Type':(file.endsWith('.js')||file.endsWith('.mjs'))?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(await readFile('public/'+file));
 }catch(e){json(res,{error:e.message},400);}
});
server.listen(3000,'127.0.0.1',()=>console.log('Folio running at http://localhost:3000'));
