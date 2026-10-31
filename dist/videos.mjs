// Sample library: replace externalUrl with an HTTPS YouTube URL when footage is ready.
export const VIDEO_ITEMS=Object.freeze([
 Object.freeze({id:'ports',title:'Ports & infrastructure',description:'A coordinated surface and underwater inspection concept.',topic:'Infrastructure',poster:'./application-motion/ports-poster.png',source:'./application-motion/ports.mp4',externalUrl:null}),
 Object.freeze({id:'reservoir',title:'Reservoir inspection',description:'An inspection route around submerged intake structures.',topic:'Water systems',poster:'./application-motion/reservoir-poster.png',source:'./application-motion/reservoir.mp4',externalUrl:null}),
 Object.freeze({id:'aquaculture',title:'Aquaculture inspection',description:'A visual check around a submerged cage and mooring.',topic:'Aquaculture',poster:'./application-motion/aquaculture-poster.png',source:'./application-motion/aquaculture.mp4',externalUrl:null})
]);

export function youtubeDestination(value){
 if(typeof value!=='string'||!value.trim())return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname))return null;
  return url.href;
 }catch{return null;}
}

export function createVideos({document,window,items=VIDEO_ITEMS}){
 const dialog=document.getElementById('sampleVideoDialog'),player=document.getElementById('sampleVideoPlayer'),title=document.getElementById('sampleVideoTitle'),closeButton=document.getElementById('closeSampleVideo'),errorPanel=document.getElementById('sampleVideoError'),fallbackPoster=document.getElementById('sampleVideoFallbackPoster'),hint=document.getElementById('sampleVideoHint');
 if(!dialog||!player||!title||!closeButton||!errorPanel||!fallbackPoster||!hint)return null;
 const byId=new Map(items.map(item=>[item.id,item])),links=[...document.querySelectorAll('[data-video-id]')],listeners=[];
 let page='overview',current=null,previous=null,restoreFocus=true,request=0,disposed=false;
 const on=(element,type,listener)=>{element.addEventListener(type,listener);listeners.push(()=>element.removeEventListener(type,listener));};
 function reset(){
  request++;player.pause();try{player.currentTime=0;}catch{}
  player.removeAttribute('src');player.load();current=null;
 }
 function close(focus=true){restoreFocus=focus;reset();if(dialog.open)dialog.close();}
 function show(item,trigger){
  if(disposed||page!=='videos')return;
  const token=++request;previous=trigger;restoreFocus=true;current=item.id;
  title.textContent=item.title;player.poster=item.poster;player.src=item.source;player.hidden=false;
  fallbackPoster.src=item.poster;fallbackPoster.alt=item.title+' concept preview';errorPanel.hidden=true;hint.hidden=true;
  // Playback follows this explicit card click; loading a tab never starts video.
  player.muted=true;dialog.showModal();player.load();
  try{const playback=player.play();playback?.catch(()=>{if(dialog.open&&token===request){hint.hidden=false;hint.textContent='Press play to view this concept sample.';}});}catch{hint.hidden=false;hint.textContent='Press play to view this concept sample.';}
 }
 for(const link of links){
  const item=byId.get(link.dataset.videoId);if(!item)continue;
  const external=youtubeDestination(item.externalUrl);link.href=external||item.source;
  if(external){link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',item.title+' — open on YouTube in a new tab');}
  else{link.removeAttribute('target');link.removeAttribute('rel');link.setAttribute('aria-label','Play '+item.title+' — 3D concept sample');}
  on(link,'click',event=>{
   if(external||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;
   event.preventDefault();show(item,link);
  });
 }
 on(closeButton,'click',()=>close());
 on(dialog,'cancel',event=>{event.preventDefault();close();});
 on(dialog,'click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
 });
 on(dialog,'close',()=>{
  if(dialog.open)return;
  reset();if(restoreFocus&&!document.hidden&&page==='videos'&&previous?.isConnected!==false)previous?.focus({preventScroll:true});previous=null;
 });
 on(player,'error',()=>{if(!dialog.open||!current)return;player.pause();player.hidden=true;errorPanel.hidden=false;hint.hidden=true;});
 on(document,'visibilitychange',()=>{if(document.hidden)close(false);});
 return{
  setPage(next){page=next;if(next!=='videos')close(false);},
  info(){return{page,open:Boolean(dialog.open),current,items:byId.size};},
  dispose(){if(disposed)return;close(false);listeners.forEach(remove=>remove());disposed=true;}
 };
}
