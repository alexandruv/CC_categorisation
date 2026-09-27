// One durable snapshot per workspace. Cloud snapshots are encrypted with the
// private access code; the code itself is never persisted here.
const DATABASE='folio-workspaces';
let database;
async function db(){
 if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Browser storage is unavailable. Enable site storage before importing to avoid repeat Jev charges.'));});
 return database;
}
async function encryptionKey(secret){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function saveWorkspace(scope,value,secret=''){
 let payload={version:1,value};
 if(secret){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(secret),new TextEncoder().encode(JSON.stringify(value)));payload={version:1,iv,data};}
 const connection=await db();
 await new Promise((resolve,reject)=>{const tx=connection.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(payload,scope);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(new Error('Could not save expenses in this browser. Free some site storage before continuing.'));});
}
export async function loadWorkspace(scope,secret=''){
 const connection=await db();
 const saved=await new Promise((resolve,reject)=>{const request=connection.transaction('snapshots').objectStore('snapshots').get(scope);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Could not read saved expenses. Please retry.'));});
 if(!saved)return null;
 if(saved.version!==1)throw Error('Saved workspace has an unsupported format. Import a statement to replace it.');
 if(saved.data){try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:saved.iv},await encryptionKey(secret),saved.data)))}catch{throw Error('Saved expenses could not be unlocked with this access code. Import a statement to replace them.');}}
 if(secret)throw Error('Saved workspace is not encrypted. Import a statement to replace it.');
 return saved.value;
}
