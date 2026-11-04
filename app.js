import { SECTIONS } from './sections.js';
import { renderSection } from './views.js';
const $=id=>document.getElementById(id);
let token='',factor='',deadline=0,timer,alertsTimer,page='home',busy=false,installPrompt,latestAlert=0;
const API='https://jcvwcodhefqgzsxvoxzz.supabase.co/functions/v1/zos-owner-portal-staging/';
const loginMarkup=$('root').innerHTML;
function notice(text,error=false){const n=$('notice')||$('app-notice');if(n){n.textContent=text;n.classList.toggle('error',error);}}
async function call(action,body={},options={}){
 if(token&&deadline&&Date.now()>=deadline){clearSession();throw Error('انتهت الجلسة. أعد الدخول.');}
 const r=await fetch(API+action,{method:'POST',headers:{...(!(body instanceof FormData)?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body instanceof FormData?body:JSON.stringify(body),cache:'no-store',referrerPolicy:'no-referrer'});
 if(options.binary&&r.ok)return r.blob();
 const d=await r.json();
 if(!r.ok||d.status==='BLOCK'&&action!=='overview'){if(r.status===401&&deadline)clearSession();throw Error(messages[d.code]||'تعذر إكمال الطلب. '+(d.code||d.status));}
 return d;
}
const messages={LOGIN_LOCKED:'الدخول مقفل بعد خمس محاولات. حاول بعد ٣٠ دقيقة.',OWNER_ONLY:'الدخول متاح لبريد المالك فقط.',SEND_RATE_LIMIT:'انتظر دقيقة قبل طلب رمز جديد.',EMAIL_CODE_INVALID:'رمز البريد غير صالح أو منتهٍ.',TOTP_INVALID:'رمز تطبيق المصادقة غير صحيح.',EMAIL_DELIVERY_UNVERIFIED:'تعذر تأكيد إرسال البريد. راجع إعدادات البريد في Supabase.',AAL2_REQUIRED:'يلزم إكمال المصادقة الثنائية.',SESSION_INVALID_OR_EXPIRED:'انتهت صلاحية الجلسة. أعد الدخول.'};
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(x=>x.disabled=true);try{await fn();}catch(e){notice(e.message,true);}finally{busy=false;document.querySelectorAll('button').forEach(x=>x.disabled=false);}}
function bindLogin(){
 $('email-form').onsubmit=e=>{e.preventDefault();run(async()=>{await call('auth/send',{email:$('email').value.trim()});$('email-form').hidden=true;$('otp-form').hidden=false;$('email-code').focus();notice('أرسلنا طلب الرمز إلى بريد المالك.');});};
 $('resend').onclick=()=>run(async()=>{await call('auth/send',{email:$('email').value.trim()});notice('تم طلب رمز جديد.');});
 $('otp-form').onsubmit=e=>{e.preventDefault();run(async()=>{
  const code=$('email-code').value;$('email-code').value='';const r=await call('auth/email',{email:$('email').value.trim(),code});token=r.access_token;
  const f=await call('auth/factors');factor=f.factors.find(x=>x.status==='verified')?.id;
  if(!factor){const enrolled=await call('auth/enroll');factor=enrolled.id;$('totp-secret').textContent=enrolled.totp.secret;$('enrollment').hidden=false;}
  $('otp-form').hidden=true;$('totp-form').hidden=false;$('step-email').removeAttribute('aria-current');$('step-totp').setAttribute('aria-current','step');$('login-title').textContent='التحقق الثاني';$('login-description').textContent='أدخل الرمز من تطبيق المصادقة لإكمال الدخول.';$('totp-code').focus();notice('تم التحقق من البريد. بيانات المنظومة ما زالت محجوبة.');
 });};
 $('totp-form').onsubmit=e=>{e.preventDefault();run(async()=>{const code=$('totp-code').value;$('totp-code').value='';const r=await call('auth/totp',{factor,code});token=r.access_token;deadline=Date.parse(r.expires_at);$('totp-secret').textContent='';await call('session');await openApp();});};
}
function clearSession(){token='';factor='';deadline=0;clearInterval(timer);clearInterval(alertsTimer);$('root').innerHTML=loginMarkup;bindLogin();notice('أُغلقت الجلسة. المعلومات محجوبة.');}
function badge(state){const n=document.createElement('span');n.className='badge';n.dataset.state=state;n.textContent=state;return n;}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
async function openApp(){
 $('root').innerHTML=`<div class="app-shell"><aside class="sidebar"><a class="wordmark" href="#home"><span class="brand-icon">Z</span><span dir="ltr">ZOS<span class="wordmark-light"> CLOUD</span></span></a><nav class="nav" aria-label="أقسام المنظومة" id="navigation"></nav><div class="sidebar-foot"><strong><span class="status-dot"></span>مساحة المالك</strong>STAGING · بانتظار المراجعة</div></aside><div class="workspace"><header class="topbar"><span>بوابة القرار <span class="muted">/ نسخة المراجعة</span></span><div class="identity"><span class="session-clock" id="clock"></span><span class="avatar" aria-hidden="true">ز</span><span>زاهر <small class="muted">المالك</small></span><button type="button" id="logout">خروج</button></div></header><main id="main" class="content"><div class="breadcrumb" id="breadcrumb"></div><div id="app-notice" role="status" aria-live="polite" class="notice global-notice">تم اكتمال الدخول والتحقق الثاني.</div><div id="view"></div></main></div><nav class="bottom-nav" aria-label="التنقل السريع" id="quick-nav"></nav></div>`;
 for(const [id,title] of [['home','الرئيسية'],...SECTIONS]){const b=el('button');b.type='button';b.dataset.page=id;b.append(el('span',id==='home'?'⌂':icons[id]||'◇','nav-icon'),el('span',title));b.onclick=()=>run(()=>navigate(id));$('navigation').append(b);}
 for(const [id,title,icon] of QUICK){const b=el('button',undefined,'quick');b.type='button';if(id!=='more')b.dataset.page=id;b.append(el('span',icon,'quick-icon'),el('span',title));b.onclick=id==='more'?()=>{const s=document.querySelector('.app-shell');s.classList.toggle('nav-open');b.setAttribute('aria-expanded',s.classList.contains('nav-open'));}:()=>run(()=>navigate(id));if(id==='more')b.setAttribute('aria-expanded','false');$('quick-nav').append(b);}
 $('logout').onclick=()=>run(async()=>{try{await call('logout');}finally{clearSession();}});
 clearInterval(timer);timer=setInterval(()=>{if(Date.now()>=deadline){clearSession();return;}const s=Math.max(0,Math.ceil((deadline-Date.now())/1000));if($('clock'))$('clock').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');},1000);
 await navigate('home');
 clearInterval(alertsTimer);alertsTimer=setInterval(async()=>{if(!token||busy)return;try{const d=await call('notifications');if(d.rows[0]&&d.rows[0].id>latestAlert){latestAlert=d.rows[0].id;notice(d.rows[0].status+' — '+d.rows[0].message);}}catch{}},15000);
 const install=el('button','تثبيت التطبيق');install.type='button';install.hidden=!installPrompt;install.onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;install.hidden=true;}};$('navigation').append(install);
}
const QUICK=[['home','الرئيسية','⌂'],['customers','العملاء','♧'],['statements','المستندات','▤'],['reports','التقارير','▥'],['more','المزيد','☰']];
const icons={tower:'◈',statements:'▤',approvals:'✓',customers:'♧',collections:'↙',sales:'↗',activities:'⌖',reports:'▥',ask:'✦',audit:'≡',security:'◇',settings:'⚙'};
async function navigate(id){page=id;document.querySelector('.app-shell')?.classList.remove('nav-open');document.querySelector('#quick-nav [aria-expanded]')?.setAttribute('aria-expanded','false');if(id==='home'){document.querySelectorAll('[data-page]').forEach(n=>n.getAttribute('data-page')==='home'?n.setAttribute('aria-current','page'):n.removeAttribute('aria-current'));$('breadcrumb').textContent='ZOS Cloud / الرئيسية';$('view').replaceChildren();const head=el('div',undefined,'page-head home-head'),copy=el('div'),h=new Date().getHours();copy.append(el('p',new Intl.DateTimeFormat('ar-SA',{dateStyle:'full',calendar:'gregory'}).format(new Date()),'eyebrow'),el('h1',(h<12?'صباح الخير':'مساء الخير')+'، زاهر'));head.append(copy);$('view').append(head);return homeView();}document.querySelectorAll('[data-page]').forEach(n=>n.getAttribute('data-page')===id?n.setAttribute('aria-current','page'):n.removeAttribute('aria-current'));const title=id==='home'?'البوابة الرئيسية':SECTIONS.find(x=>x[0]===id)?.[1]||'البوابة';$('breadcrumb').textContent='ZOS Cloud / '+title;$('view').replaceChildren();
 const head=el('div',undefined,'page-head'),copy=el('div');copy.append(el('p',new Intl.DateTimeFormat('ar-SA',{dateStyle:'full',calendar:'gregory'}).format(new Date()),'eyebrow'),el('h1',id==='home'?'صباح القرار الواضح، زاهر':title),el('p',id==='home'?'كل منظومتك في مكان واحد. ابدأ بما يحتاج قرارك اليوم.':SECTIONS.find(x=>x[0]===id)?.[2]));head.append(copy,badge('REVIEW'));$('view').append(head);
 if(id==='home'||id==='tower')return dashboard(id);
 if(id==='audit')return auditView();
 return renderSection({id,call,el,badge,notice,run,view:$('view')});
 const c=el('div',undefined,'card empty');c.append(badge('NOT VERIFIED'),el('h2','هذا القسم قيد التجهيز'),el('p','سيُفعَّل ضمن مراحل التسليم التالية بعد اجتياز اختبارات القسم.'));$('view').append(c);
}
const sar=v=>v===null||v===undefined||v===''||Number.isNaN(Number(v))?'غير متوفر':Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
async function homeView(){
 const intro=el('section',undefined,'relationship-intro');intro.append(el('p','مساحة المالك · نسخة المراجعة STAGING','eyebrow'),el('h2','علاقات أقوى.'),el('p','خطوة واحدة في كل مرة.'));
 const search=el('button','ابحث عن عميل','customer-search');search.type='button';search.onclick=()=>run(()=>navigate('customers'));intro.append(search);$('view').append(intro);
 const docs=el('section',undefined,'document-focus');docs.append(el('p','الكشوف والتقارير','eyebrow'),el('h2','مستندك، بداية واضحة.'),el('p','ارفع الكشف الأصلي وتابع أدلة الحفظ والتحقق. الرفع لا يعني اعتماداً أو ترحيلاً مالياً.'));
 const upload=el('button','رفع كشف ومتابعة حالته','primary full');upload.type='button';upload.onclick=()=>run(()=>navigate('statements'));const reports=el('button','عرض التقارير','text-button');reports.type='button';reports.onclick=()=>run(()=>navigate('reports'));docs.append(upload,reports);$('view').append(docs);
 const d=await call('financial');let names=[],goals={};
 try{names=(await call('customers/list')).rows.filter(m=>m.status==='PASS');}catch{}
 try{goals=(await call('settings/read')).settings?.goals?.value||{};}catch{}
 const nameOf=id=>names.find(m=>m.account_id===id)?.name||'حساب '+id;
 const hero=el('section',undefined,'home-hero');hero.append(el('span','إجمالي الذمم المستحقة','home-label'));const total=el('strong',sar(d.summary.outstanding_sar),'home-total');total.append(el('small',' ر.س'));hero.append(total,el('span',(d.summary.accounts??'غير متوفر')+' عميل · من الكشوف الرسمية','home-label'));$('view').append(hero);
 const stats=el('div',undefined,'home-stats');for(const [title,value,goal] of [['مبيعات الشهر',d.summary.sales_month_sar,goals.sales_month_sar],['تحصيل الشهر',d.summary.collections_month_sar,goals.collections_month_sar]]){const c=el('section',undefined,'home-stat');c.append(el('span',title,'home-label'),el('strong',sar(value)),el('span','من هدف '+sar(goal),'home-label'));stats.append(c);}$('view').append(stats);
 const dormant=d.business?.dormant_customers||[];if(dormant.length){const a=el('section',undefined,'home-alert');a.append(el('strong','عملاء متوقفون ('+dormant.length+')'),el('span',dormant.slice(0,3).map(nameOf).join(' · ')+(dormant.length>3?' …':'')));a.onclick=()=>run(()=>navigate('sales'));a.tabIndex=0;a.setAttribute('role','button');$('view').append(a);}
 const top=(d.accounts||[]).filter(x=>Number(x.balance_sar)>0).sort((a,b)=>Number(b.balance_sar)-Number(a.balance_sar)).slice(0,4);
 const list=el('section',undefined,'home-list'),lh=el('div',undefined,'home-list-head');lh.append(el('h2','أعلى الأرصدة'));const all=el('button','الكل','text-button');all.type='button';all.onclick=()=>run(()=>navigate('collections'));lh.append(all);list.append(lh);
 if(!top.length)list.append(el('p','لا توجد أرصدة مستحقة.','muted'));
 for(const x of top){const r=el('button',undefined,'home-row');r.type='button';const t=el('span');t.append(el('strong',nameOf(x.account_id)),el('small','حساب '+x.account_id));r.append(t,el('span',sar(x.balance_sar),'home-amount'));r.onclick=()=>run(()=>navigate('customers'));list.append(r);}
 $('view').append(list);
 $('view').append(el('p','آخر تحديث: '+(d.source?.as_of?new Date(d.source.as_of).toLocaleString('ar-SA'):'غير متوفر'),'source'));
}
async function dashboard(id){
 const overview=await call('overview');
 const hero=el('section',undefined,'hero'),hc=el('div');hc.append(el('p','رؤية واحدة · مصدر واحد','eyebrow'),el('h2','الصورة المالية من دفترها المعتمد'),el('p','كل رصيد وحركة هنا من الكشوف الرسمية.'));hero.append(hc,el('span','◈','hero-symbol'));$('view').append(hero);
 const stats=el('div',undefined,'grid stats');for(const [title,value] of [['إجمالي أرصدة العملاء',overview.financial.summary.outstanding_sar],['المستحق هذا الأسبوع',null],['مبيعات الشهر',overview.financial.summary.sales_month_sar]]){const c=el('section',undefined,'card');c.append(el('h2',title),el('div',value===null?'—':value+' ر.س.','card-number'),badge(value===null?'NOT VERIFIED':'PASS'),el('p',value===null?'تواريخ الاستحقاق غير متاحة في المصدر':'من الكشوف الرسمية'));stats.append(c);}$('view').append(stats);
 const operations=await call('operations/overview');
 const row=el('div',undefined,'grid two-column');const today=el('section',undefined,'card');today.append(el('h2','ينتظرك اليوم'),el('p','عملاء ينتظرون: '+operations.customers_waiting+' · كشوف تنتظر: '+operations.statements_waiting),el('p',overview.operations.status==='PASS'?'اتصال بوابة المالك متحقق.':'لم يكتمل التحقق من البوابة.'));const ask=el('section',undefined,'card');ask.append(el('h2','ما الذي تريد معرفته؟'),el('p','اسأل عن عميل أو تحصيل. الإجابة المالية مرتبطة بالمصدر.'));const f=el('form',undefined,'question'),input=el('input');input.placeholder='مثال: ما رصيد العميل؟';input.setAttribute('aria-label','سؤالك للمنظومة');const b=el('button','اسأل');b.type='submit';f.append(input,b);f.onsubmit=e=>{e.preventDefault();run(async()=>{if(renderSection){await navigate('ask');const q=$('question-input');if(q){q.value=input.value;setTimeout(()=>q.form.requestSubmit(),0);}}else notice('NOT VERIFIED — الإجابة المالية غير متاحة قبل اعتماد المصدر.');});};ask.append(f);row.append(today,ask);$('view').append(row);
 if(id==='home'){const sh=el('div',undefined,'section-title');sh.append(el('h2','أقسام المنظومة'),el('span','مساحة عمل متكاملة'));$('view').append(sh);const grid=el('div',undefined,'grid sections');for(const [key,title,sub] of SECTIONS){const c=el('button',undefined,'section-card');c.type='button';c.append(el('span',icons[key],'section-icon'));const text=el('span');text.append(el('strong',title),el('small',sub));c.append(text,el('span','←','chevron'));c.onclick=()=>run(()=>navigate(key));grid.append(c);}$('view').append(grid);}
 const source=el('p','المصدر: الكشوف الرسمية','source');$('view').append(source);
}
async function auditView(){const form=el('form',undefined,'toolbar'),q=el('input');q.placeholder='ابحث عن الإجراء أو المنفّذ';q.setAttribute('aria-label','بحث سجل التدقيق');const select=el('select');select.setAttribute('aria-label','تصفية الحالة');for(const v of ['','PASS','REVIEW','BLOCK','NOT VERIFIED']){const o=el('option',v||'كل الحالات');o.value=v;select.append(o);}const b=el('button','بحث');b.type='submit';form.append(q,select,b);const list=el('div',undefined,'data-list');$('view').append(form,list);let offset=0;const more=el('button','التالي');more.type='button';more.onclick=()=>run(async()=>{offset+=50;await load();});$('view').append(more);async function load(){const d=await call('audit',{query:q.value,status:select.value,offset});list.replaceChildren();for(const x of d.rows){const r=el('article',undefined,'row');r.append(badge(x.status),el('h3',x.action),el('p',x.actor+' · '+new Date(x.at).toLocaleString('ar-SA')));const details=el('details');details.append(el('summary','قبل / بعد / الدليل'),el('pre',JSON.stringify({before:x.before_state,after:x.after_state,evidence:x.evidence},null,2),'inline-detail'));r.append(details);list.append(r);}more.hidden=d.rows.length<50;if(!d.rows.length)list.append(el('p','لا توجد نتائج مطابقة.'));}form.onsubmit=e=>{e.preventDefault();offset=0;run(load);};await load();}
bindLogin();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
// No JWT, owner data, or Financial API response is persisted to browser storage.

