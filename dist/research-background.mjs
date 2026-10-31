// Static plum wash: no pointer tracking or animation work behind the scene.
export function mountResearchBackground(doc=document){
  const existing=doc.querySelector('.research-background');
  if(existing)return()=>{};
  const background=doc.createElement('div');
  background.className='research-background';
  background.setAttribute('aria-hidden','true');
  doc.body.prepend(background);
  return()=>background.remove();
}

if(typeof document!=='undefined')mountResearchBackground();
