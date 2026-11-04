export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export async function validateDocument(file) {
 if (!file || !file.size || file.size > MAX_DOCUMENT_BYTES) throw Error('اختر ملفاً غير فارغ لا يتجاوز 10 MB.');
 const extension = file.name.split('.').pop().toLowerCase();
 if (!['pdf','xlsx'].includes(extension)) throw Error('الصيغ المدعومة PDF وXLSX فقط.');
 const bytes = new Uint8Array(await file.slice(0,8).arrayBuffer());
 const valid = extension === 'pdf' ? [37,80,68,70,45].every((v,i)=>bytes[i]===v) : [80,75,3,4].every((v,i)=>bytes[i]===v);
 if (!valid) throw Error('محتوى الملف لا يطابق صيغته. اختر الأصل الصحيح.');
 // Client checks are preliminary. Server must independently validate format,
 // custody, duplicate hash, issuer, identity and approval before any posting.
 return extension;
}
export async function documentDigest(file) {
 if (!globalThis.crypto?.subtle) throw Error('يلزم اتصال HTTPS آمن لحساب بصمة الملف. لم يُرسل الملف.');
 const bytes = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
 return Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
}

export function verifyUploadReceipt(response, expectedHash) {
 const record=response?.record;
 if (!record || record.sha256!==expectedHash || record.custody_status!=='PASS') throw Error('لم يكتمل إثبات الحفظ والبصمة. حدّث سجل الكشوف قبل إعادة المحاولة.');
 return record;
}
