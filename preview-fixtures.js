// Isolated UI fixtures: never used by index.html or the deployed auth path.
// Dummy-only hash, not a cryptographic test.
const documentDigest=async()=> 'f'.repeat(64);
let records=[];
export async function previewCall(action,body={}){
 if(action==='financial')return {status:'PASS',summary:{outstanding_sar:null,accounts:0,sales_month_sar:null,collections_month_sar:null},accounts:[],lines:[],next_cursor:null,business:{},source:{as_of:'2026-11-04T15:00:00Z'}};
 if(action==='customers/list')return {rows:[]};
 if(action==='settings/read')return {settings:{goals:{value:{}}}};
 if(action==='statements/list')return {rows:records};
 if(action==='statements/upload'){
  const file=body.get('file'),sha256=await documentDigest(file);
  if(records.some(r=>r.sha256===sha256))throw Error('ملف مكرر — لم تُنشأ نسخة جديدة.');
  const row={id:String(records.length+1),file_name:file.name,declared_account:body.get('account_id'),declared_site:body.get('site'),created_at:new Date().toISOString(),sha256,status:'NOT VERIFIED',custody_status:'PASS',identity_status:'NOT VERIFIED',account_status:'NOT VERIFIED',site_status:'NOT VERIFIED'};
  records.push(row);return {status:'NOT VERIFIED',code:'ORIGINAL_STORED_VERIFICATION_QUEUED',record:row};
 }
 if(action==='statements/original')return new Blob(['%PDF-1.7\nUI fixture only'],{type:'application/pdf'});
 if(action==='notifications')return {rows:[]};
 throw Error('معاينة فقط — هذا الإجراء غير متصل بالخادم.');
}
export function fixtureControls(){
 document.getElementById('app-notice').textContent='معاينة معزولة — لا تسجيل دخول حقيقي ولا أرقام رسمية.';
 const bar=document.createElement('aside');bar.className='preview-banner';bar.textContent='معاينة تفاعلية · بيانات تجريبية · لا اتصال مالي';
 for(const [label,valid] of [['اختبار PDF',true],['اختبار ملف غير صالح',false]]){
 const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=()=>{const input=document.getElementById('file');if(!input)return;const dt=new DataTransfer();dt.items.add(new File([valid?'%PDF-1.7\nUI fixture only':'invalid content'],valid?'demo-statement.pdf':'invalid.pdf',{type:'application/pdf'}));input.files=dt.files;input.dispatchEvent(new Event('change'));for(const [id,value] of [['account_id','DEMO-ONLY'],['site','DEMO-SITE'],['issuer','DEMO-ISSUER']])document.getElementById(id).value=value;};bar.append(b);}
 document.body.prepend(bar);
}
