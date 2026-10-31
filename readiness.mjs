// Self-assessed readiness of the proposed integration, not the purchased robots.
export const SYSTEM_TRL=2;
export const TRL_LEVELS=Object.freeze([
 {level:1,title:'Principles identified',text:'Relevant sensing, control and recovery principles are identified.',status:'Readiness scale'},
 {level:2,title:'Integration concept defined',text:'System architecture and recovery concept are outlined. Critical integrated functions still require experimental proof.',status:'Current · provisional self-assessment'},
 {level:3,title:'Critical function proof',text:'Demonstrate the control interface and physical capture, locking and release with recorded test evidence.',status:'Next milestone'},
 {level:4,title:'Integrated lab validation',text:'Test the controller, tether handling and recovery mechanism together against agreed acceptance criteria.',status:'Planned validation gate'},
 {level:5,title:'Representative conditions',text:'Validate under defined current, vessel motion and communication disturbances.',status:'Planned validation gate'},
 {level:6,title:'Prototype demonstration',text:'Demonstrate deployment, inspection and recovery in a representative water environment.',status:'Planned demonstration gate'},
 {level:7,title:'Operational prototype',text:'Demonstrate the full prototype in its intended operational setting.',status:'Readiness scale · future stage'},
 {level:8,title:'Qualified system',text:'Complete and qualify the system against the intended operating requirements.',status:'Readiness scale · future stage'},
 {level:9,title:'Operational evidence',text:'Establish repeatable performance through actual operational use.',status:'Readiness scale · future stage'},
]);

export function createReadiness(document){
 const buttons=[...document.querySelectorAll('[data-trl]')];
 if(!buttons.length)return null;
 const title=document.getElementById('trlDetailTitle'),text=document.getElementById('trlDetailText'),status=document.getElementById('trlDetailStatus');
 let selected=SYSTEM_TRL;
 function select(value){
  const level=TRL_LEVELS.find(item=>item.level===Number(value));if(!level)return;
  selected=level.level;
  for(const button of buttons){const active=Number(button.dataset.trl)===selected;button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-selected',active);button.tabIndex=active?0:-1;}
  title.textContent=`TRL ${level.level} · ${level.title}`;text.textContent=level.text;status.textContent=level.status;
 }
 buttons.forEach((button,index)=>{
  button.addEventListener('click',()=>select(button.dataset.trl));
  button.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
   buttons[next].focus();select(buttons[next].dataset.trl);
  });
 });
 select(SYSTEM_TRL);
 return {select,info:()=>({selected,systemTRL:SYSTEM_TRL,provisional:true})};
}

export function createConceptAnimation({document,window}){
 const image=document.getElementById('overviewConceptImage'),button=document.getElementById('toggleConceptAnimation');
 if(!image||!button)return null;
 const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let playing=!media?.matches,pageVisible=true,inView=true,current=null;
 function render(){
  const moving=playing&&pageVisible&&inView&&!document.hidden;
  const source=moving?image.dataset.animation:image.dataset.poster;
  if(source!==current){image.src=source;current=source;}
  button.textContent=playing?'Pause animation':'Play animation';button.setAttribute('aria-pressed',String(playing));
 }
 button.addEventListener('click',()=>{playing=!playing;render();});
 document.addEventListener('visibilitychange',render);
 media?.addEventListener?.('change',event=>{if(event.matches)playing=false;render();});
 let observer=null;
 if(window.IntersectionObserver){observer=new window.IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);render();},{rootMargin:'100px'});observer.observe(image);}
 render();
 return {setPage(page){pageVisible=page==='overview';render();},info:()=>({playing,pageVisible,inView,moving:playing&&pageVisible&&inView&&!document.hidden}),dispose(){observer?.disconnect();}};
}
