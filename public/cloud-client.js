import {categories,parseStatement} from './categorizer.mjs';
import {parseBank,reconcile} from './bank.mjs';
import {loadWorkspace,saveWorkspace} from './workspace-store.js';
const base='https://cc-api.pomeloapps.com';
export const cloud=location.hostname!=='localhost'&&location.hostname!=='127.0.0.1';
let token=sessionStorage.getItem('folio-access')||'',current=null,generation=0,reference=[];
const cache=new Map();
const key=t=>JSON.stringify([t.merchant,t.title,t.type,t.bankCategory]);
export function forgetSession(){token='';sessionStorage.removeItem('folio-access');generation++;current=null;reference=[];cache.clear();}
async function request(path,options={}){let res;try{res=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...options.headers}})}catch{throw Error('Cannot reach the categorisation service. Please check your connection and try again.')}const data=await res.json();if(res.status===401)forgetSession();if(!res.ok)throw Error(data.error||'Service unavailable');return data;}
export async function unlock(value){token=value.trim();try{await request('/api/session');sessionStorage.setItem('folio-access',token)}catch(e){forgetSession();throw e}}
export function hasSession(){return !!token;}
function counts(job){job.done=job.transactions.filter(t=>t.category).length;job.comparedCount=job.transactions.filter(t=>t.compared).length;job.bankMatched=job.transactions.filter(t=>t.bankCategory).length;job.changedCount=job.transactions.filter(t=>t.compared&&t.initialCategory!==t.category).length;}
async function checkpoint(job,secret){await saveWorkspace('cloud',{job,reference},secret);}
async function process(job,run,secret){try{
 const unique=[...new Map(job.transactions.filter(t=>t.amount<0&&!t.category).map(t=>[key(t),t])).values()];
 for(let i=0;i<unique.length;i+=12){if(run!==generation)return;const group=unique.slice(i,i+12),pending=group.filter(t=>!cache.has(key(t)));
 if(pending.length){const {results}=await request('/api/classify',{method:'POST',body:JSON.stringify({transactions:pending.map(({merchant,title,type,bankCategory})=>({merchant,title,type,bankCategory}))})});if(run!==generation)return;for(let j=0;j<pending.length;j++)cache.set(key(pending[j]),results[j]);}
 job.transactions=job.transactions.map(t=>t.amount>=0?{...t,category:'income',confidence:1}:cache.has(key(t))?{...t,...cache.get(key(t))}:t);counts(job);
 // Commit this batch before asking Jev for the next one.
 await checkpoint(job,secret);
 }
 job.transactions=job.transactions.map(t=>t.amount>=0?{...t,category:'income',confidence:1}:t);counts(job);
 const completed={...job,status:'complete',savedAt:new Date().toISOString()};await checkpoint(completed,secret);if(run===generation)Object.assign(job,completed);
 }catch(e){if(run!==generation)return;job.status='error';job.error=e.message;try{await checkpoint(job,secret)}catch{} } }
export async function cloudApi(path,options){
 if(path==='/api/categories')return categories;
 if(path==='/api/workspace'){
  await request('/api/session');
  const saved=await loadWorkspace('cloud',token);if(!saved)return null;
  current=saved.job;reference=saved.reference||[];cache.clear();
  for(const t of current.transactions)if(t.category&&t.amount<0)cache.set(key(t),Object.fromEntries(['category','confidence','model','initialCategory','compared','reviewed','reviewReason','reviewSource'].filter(k=>k in t).map(k=>[k,t[k]])));
  if(current.status==='processing'&&current.transactions.every(t=>t.category)){current.status='complete';}
  if(current.status==='processing'){current.status='paused';current.error='Import interrupted. Saved categories are safe; resume to categorise only the remaining expenses.';}
  current.restored=true;return structuredClone(current);
 }
 if(path==='/api/sample'){const sample=await request(path);reference=sample.transactions;return sample;}
 if(path.startsWith('/api/jobs/'))return structuredClone(current);
 if(path==='/api/resume'){
  if(!current)throw Error('No saved import to resume.');
  const run=++generation;current.status='processing';delete current.error;await checkpoint(current,token);process(current,run,token);return structuredClone(current);
 }
 if(path==='/api/import'){
  const input=JSON.parse(options.body);
  let transactions=input.transactions|| (input.name?.toLowerCase().endsWith('.csv')?parseBank(input.text).map((t,i)=>({...t,id:String(i),category:null,confidence:null})):parseStatement(input.text));
  const original=transactions;transactions=reconcile(transactions,reference).map((t,i)=>({...t,bankCategory:original[i].bankCategory||t.bankCategory||null}));
  if(transactions.length>3000)throw Error('Please import fewer than 3,000 transactions.');
  if(transactions.some(t=>!Number.isFinite(t.amount)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!t.currency))throw Error('Statement contains invalid amounts, dates or currencies.');
  const job={id:crypto.randomUUID(),name:input.name,transactions,status:'processing',done:0};counts(job);
  // Do not spend credits if a durable snapshot cannot be written.
  const run=++generation;await checkpoint(job,token);cache.clear();current=job;process(job,run,token);return structuredClone(job);
 }
 throw Error('Unsupported operation');
}
