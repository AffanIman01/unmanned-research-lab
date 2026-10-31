import {trainingSections} from './m2-training-data.mjs?v=training-as';
const base='./training/m2-pro-max/';
const pdf=base+'CHASING_M2_PRO_MAX_Training.pdf';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
export function mountM2Training(){
 const dialog=el('dialog','m2-training');dialog.id='m2Training';dialog.setAttribute('aria-labelledby','m2TrainingTitle');
 const head=el('header','m2-training-head');const title=el('div');title.append(el('small','','CHASING · TRAINING REFERENCE'));const h=el('h2','','M2 PRO MAX');h.id='m2TrainingTitle';title.append(h);
 const close=el('button','','×');close.type='button';close.setAttribute('aria-label','Close training guide');close.onclick=()=>dialog.close();head.append(title,close);
 const toolbar=el('div','m2-training-toolbar');const guideButton=el('button','','Guide'),slidesButton=el('button','','Original slides');guideButton.type=slidesButton.type='button';
 const download=el('a','','PDF ↓');download.href=pdf;download.download='CHASING_M2_PRO_MAX_Training.pdf';toolbar.append(guideButton,slidesButton,download);
 const body=el('div','m2-training-body');const guide=el('section','m2-guide');guide.id='m2GuidePanel';guideButton.setAttribute('aria-controls',guide.id);
 const context=el('p','m2-training-context','Your supplied training deck · 39 slides · 2023 document. Check the installed hardware revision.');guide.append(context);
 const disclosures=new Map();
 for(const s of trainingSections){
  const d=el('details','m2-topic');d.id='m2-topic-'+s.id;const summary=el('summary','',s.title);d.append(summary);
  const content=el('div','m2-topic-content');
  if(s.rows.length){const list=el('dl');for(const [label,value]of s.rows){const row=el('div');row.append(el('dt','',label),el('dd','',value));list.append(row);}content.append(list);}
  if(s.items.length){const ul=el('ul');for(const item of s.items)ul.append(el('li','',item));content.append(ul);}
  if(s.note)content.append(el('p','m2-source-note',s.note));
  const refs=el('div','m2-slide-refs');for(const p of s.pages){const b=el('button','','Slide '+p);b.type='button';b.onclick=()=>showSlide(p);refs.append(b);}content.append(refs);d.append(content);guide.append(d);disclosures.set(s.id,d);
 }
 guide.append(el('p','m2-source-note','The contents page mentions a hands-on activity, but no separate activity slides are present in the supplied file.'));
 const slides=el('section','m2-slides');slides.id='m2SlidesPanel';slides.hidden=true;slidesButton.setAttribute('aria-controls',slides.id);
 const slideNav=el('div','m2-slide-nav');const prev=el('button','','← Previous'),next=el('button','','Next →');prev.type=next.type='button';const select=el('select');select.setAttribute('aria-label','Training slide');for(let p=1;p<=39;p++){const o=el('option','','Slide '+p+' / 39');o.value=p;select.append(o);}slideNav.append(prev,select,next);
 const picture=el('img','m2-slide-image');picture.width=1620;picture.height=912;picture.decoding='async';picture.alt='';
 const status=el('p','m2-slide-status');status.setAttribute('role','status');const full=el('a','m2-full-slide','Open full-size slide ↗');full.target='_blank';full.rel='noopener noreferrer';
 slides.append(slideNav,picture,status,full);body.append(guide,slides);dialog.append(head,toolbar,body);document.body.append(dialog);
 let slide=1,opener=null;
 function mode(original){guide.hidden=original;slides.hidden=!original;guideButton.setAttribute('aria-pressed',String(!original));slidesButton.setAttribute('aria-pressed',String(original));body.scrollTop=0;}
 function showSlide(n){slide=Math.max(1,Math.min(39,Number(n)||1));const url=base+'slide-'+String(slide).padStart(2,'0')+'.webp';status.textContent='Loading slide '+slide+'…';picture.src=url;picture.alt='CHASING M2 Pro Max training — original slide '+slide;full.href=url;select.value=slide;prev.disabled=slide===1;next.disabled=slide===39;mode(true);select.focus({preventScroll:true});}
 picture.onload=()=>status.textContent='Slide '+slide+' of 39 · Original training reference';picture.onerror=()=>status.textContent='Slide unavailable. Download the PDF above to view it.';
 guideButton.onclick=()=>mode(false);slidesButton.onclick=()=>showSlide(slide);prev.onclick=()=>showSlide(slide-1);next.onclick=()=>showSlide(slide+1);select.onchange=()=>showSlide(select.value);
 dialog.addEventListener('keydown',e=>{if(!slides.hidden&&!e.target.closest('select,input,textarea')){if(e.key==='ArrowLeft'){e.preventDefault();showSlide(slide-1);}if(e.key==='ArrowRight'){e.preventDefault();showSlide(slide+1);}}e.stopPropagation();});
 dialog.addEventListener('close',()=>{opener?.isConnected&&opener.focus({preventScroll:true});});
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-m2-guide]');if(!trigger)return;opener=trigger;const section=trigger.dataset.m2Guide;for(const [id,d]of disclosures)d.open=id===section;mode(false);dialog.showModal();close.focus();if(disclosures.has(section))disclosures.get(section).scrollIntoView({block:'nearest'});});
 mode(false);return dialog;
}
mountM2Training();
