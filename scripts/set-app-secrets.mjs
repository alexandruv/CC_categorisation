import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const env=await readFile('.env','utf8');
const key=env.match(/(?:typesafeai_api_key|TYPESAFE_API_KEY)\s*=\s*["']?([^\s"']+)/)?.[1];
if(!key)throw Error('No local TypeSafe key found.');
await mkdir('data',{recursive:true});
const path='data/deployment-access.txt';
let access=await readFile(path,'utf8').catch(()=>'');if(!access){access=randomBytes(24).toString('base64url');await writeFile(path,access+'\n',{mode:0o600})}
for(const [name,value] of [['TYPESAFE_API_KEY',key],['APP_ACCESS_TOKEN',access.trim()]])execFileSync('gh',['secret','set',name,'--repo','alexandruv/CC_categorisation'],{input:value,stdio:['pipe','pipe','pipe']});
console.log('Saved TypeSafe key and workspace access code as GitHub Actions secrets. Access code: data/deployment-access.txt (not tracked).');
