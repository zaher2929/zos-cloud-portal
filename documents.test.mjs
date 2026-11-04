import fs from 'node:fs';
import assert from 'node:assert/strict';
const {validateDocument,documentDigest}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('./documents.js',import.meta.url),'utf8')).toString('base64'));
function file(name,data){const b=new Blob([data]);b.name=name;return b;}
await assert.rejects(()=>validateDocument(null));
await assert.rejects(()=>validateDocument(file('empty.pdf','')));
await assert.rejects(()=>validateDocument(file('bad.xls','%PDF-')));
await assert.rejects(()=>validateDocument(file('bad.pdf','fake')));
await assert.rejects(()=>validateDocument(file('large.pdf',new Uint8Array(10485761))));
assert.equal(await validateDocument(file('valid.PDF','%PDF-1.7')), 'pdf');
assert.equal(await validateDocument(file('valid.xlsx',new Uint8Array([80,75,3,4]))), 'xlsx');
assert.equal(await documentDigest(file('abc.pdf','abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
console.log('8 document validation/hash checks PASS');
