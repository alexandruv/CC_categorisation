import {categories,makeRequest} from '../categorizer.mjs';
import {comparisonRequest} from '../bank.mjs';
import {reviewedDecision} from '../reviewed.mjs';
import sample from './sample.json' with {type:'json'};
const enc=new TextEncoder();
async function equal(a,b){const [x,y]=await Promise.all([a,b].map(s=>crypto.subtle.digest('SHA-256',enc.encode(s))));return new Uint8Array(x).every((v,i)=>v===new Uint8Array(y)[i]);}
export async function handle(request,env,upstream=fetch){
 const origin=request.headers.get('Origin');const allowed=env.ALLOWED_ORIGIN||'https://cc.pomeloapps.com';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(origin===allowed)Object.assign(headers,{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'3600'});
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&origin!==allowed)return reply({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const path=new URL(request.url).pathname;
 if(path==='/api/health'&&request.method==='GET')return reply({ok:true,configured:!!env.TYPESAFE_API_KEY&&!!env.APP_ACCESS_TOKEN});
 if(!env.APP_ACCESS_TOKEN||!env.TYPESAFE_API_KEY)return reply({error:'The categorisation service is not configured yet.'},503);
 const supplied=request.headers.get('Authorization')||'';
 if(!await equal(supplied,'Bearer '+env.APP_ACCESS_TOKEN))return reply({error:'Enter your workspace access code to continue.'},401);
 if(path==='/api/session'&&request.method==='GET')return reply({ok:true});
 if(path==='/api/sample'&&request.method==='GET')return reply(sample);
 if(path!=='/api/classify'||request.method!=='POST')return reply({error:'Not found'},404);
 try{
  let text='';const decoder=new TextDecoder();const reader=request.body?.getReader();if(!reader)return reply({error:'A transaction batch is required.'},400);let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>48000){await reader.cancel();return reply({error:'Batch is too large.'},413)}text+=decoder.decode(value,{stream:true});}
  text+=decoder.decode();const input=JSON.parse(text);
  if(!Array.isArray(input.transactions)||input.transactions.length<1||input.transactions.length>12)return reply({error:'Send 1–12 transactions per batch.'},400);
  // Pick only semantic fields: dates, amounts, accounts and references never reach Jev.
  const batch=input.transactions.map(t=>{for(const k of ['merchant','title','type','bankCategory'])if(t[k]!=null&&(typeof t[k]!=='string'||t[k].length>1500))throw Error('Invalid transaction fields.');if(!t.merchant)throw Error('Merchant is required.');return {merchant:t.merchant,title:t.title||'',type:t.type||'',bankCategory:t.bankCategory||null};});
  async function ask(payload){let res;for(let attempt=0;attempt<3;attempt++){
   res=await upstream('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:'Bearer '+env.TYPESAFE_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
   if(![429,503,529].includes(res.status))break;if(attempt<2)await new Promise(r=>setTimeout(r,1000*2**attempt));
  }
  if(!res.ok)throw Error('Jev is temporarily unavailable (HTTP '+res.status+'). Please retry.');
  const result=await res.json();return batch.map((t,i)=>{const a=result.answers?.['t'+i];if(!a||!categories[a.choice]||!Number.isFinite(a.confidence)||a.confidence<0||a.confidence>1)throw Error('Jev returned an incomplete result. Please retry.');return {...t,category:a.choice,confidence:a.confidence,model:result.model};});}
  const initial=await ask(makeRequest(batch));let final=initial;
  if(batch.some(t=>t.bankCategory))final=await ask(comparisonRequest(initial));
  return reply({results:final.map((t,i)=>({...t,initialCategory:initial[i].category,compared:!!t.bankCategory,...reviewedDecision(t)}))});
 }catch(e){return reply({error:e instanceof SyntaxError?'Invalid JSON.':e.message||'Unable to categorise. Please retry.'},e instanceof SyntaxError||e.message==='Invalid transaction fields.'||e.message==='Merchant is required.'?400:502);}
}
export default {fetch:(request,env)=>handle(request,env)};
