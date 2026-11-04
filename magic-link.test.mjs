import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function acceptMagicLinkFragment'),source.indexOf('async function beginSecondFactor'));
async function check(hash,{reject=false}={}){
 const events=[];const context=vm.createContext({URLSearchParams,location:{hash,pathname:'/zos-cloud-portal/',search:''},history:{replaceState(){events.push('scrub');}},notice(){events.push('notice');},run:async f=>{try{await f();}catch{events.push('denied');}},call:async action=>{events.push(action);if(reject)throw Error('denied');},beginSecondFactor:async()=>events.push('totp'),token:'',factor:''});
 await vm.runInContext(code+';acceptMagicLinkFragment()',context);return {events,context};
}
const bearer='eyJ'+'a'.repeat(90); // Synthetic parser fixture, never a valid JWT.
assert.deepEqual((await check('#home')).events,[]);
assert.deepEqual((await check('#access_token=bad&type=magiclink')).events,['scrub','notice']);
assert.deepEqual((await check('#error=access_denied')).events,['scrub','notice']);
assert.deepEqual((await check('#refresh_token=synthetic')).events,['scrub','notice']);
assert.deepEqual((await check('#access_token='+bearer+'&type=magiclink')).events,['scrub','auth/link','totp']);
const failed=await check('#access_token='+bearer+'&type=magiclink',{reject:true});assert.deepEqual(failed.events,['scrub','auth/link','denied']);assert.equal(failed.context.token,'');
assert.deepEqual((await check('#access_token='+bearer+'&access_token='+bearer+'&type=magiclink')).events,['scrub','notice']);
assert.deepEqual((await check('#access_token='+bearer+'&type=recovery')).events,['scrub','notice']);
assert(source.includes("id==='home'?'⌂'"));
assert(source.includes('quick-nav')); // Preserve newer main navigation.
console.log('10 Magic Link parsing/order/denial/navigation checks PASS');
