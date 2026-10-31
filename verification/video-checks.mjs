// Headless contract checks only; no browser video decoding or visual review.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {VIDEO_ITEMS,youtubeDestination,createVideos} from '../dist/videos.mjs';
class Element{
 constructor(){this.attrs={};this.dataset={};this.events=new Map();this.hidden=false;this.open=false;this.focusCount=0;this.playCount=0;this.pauseCount=0;this.loadCount=0;this.isConnected=true;}
 addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn);}
 removeEventListener(type,fn){this.events.get(type)?.delete(fn);}
 emit(type,extras={}){const event={target:this,button:0,preventDefault(){this.defaultPrevented=true;},...extras};for(const fn of this.events.get(type)||[])fn(event);return event;}
 setAttribute(name,value){this.attrs[name]=String(value);}
 removeAttribute(name){delete this.attrs[name];delete this[name];}
 focus(){this.focusCount++;}
 showModal(){this.open=true;}
 close(){this.open=false;this.emit('close');}
 play(){this.playCount++;return this.rejection?Promise.reject(this.rejection):Promise.resolve();}
 pause(){this.pauseCount++;}
 load(){this.loadCount++;}
 getBoundingClientRect(){return{left:100,right:900,top:100,bottom:650};}
}
function fixture(items=VIDEO_ITEMS){
 const document=new Element();document.hidden=false;
 const ids=Object.fromEntries(['sampleVideoDialog','sampleVideoPlayer','sampleVideoTitle','closeSampleVideo','sampleVideoError','sampleVideoFallbackPoster','sampleVideoHint'].map(id=>[id,new Element()]));
 const links=items.map(item=>{const link=new Element();link.dataset.videoId=item.id;return link;});
 document.getElementById=id=>ids[id]||null;document.querySelectorAll=()=>links;
 const api=createVideos({document,window:{},items});return{document,ids,links,api,dialog:ids.sampleVideoDialog,player:ids.sampleVideoPlayer};
}
const results=[];
async function check(name,run){await run();results.push({name,passed:true});console.log('PASS '+name);}
await check('Browsing tabs never starts playback; a card click opens its titled concept',()=>{
 const f=fixture();assert.equal(f.player.playCount,0);f.api.setPage('videos');assert.equal(f.player.playCount,0);
 const click=f.links[0].emit('click');assert.equal(click.defaultPrevented,true);assert.equal(f.dialog.open,true);assert.equal(f.player.playCount,1);assert.equal(f.player.src,VIDEO_ITEMS[0].source);assert.equal(f.ids.sampleVideoTitle.textContent,VIDEO_ITEMS[0].title);assert.equal(f.api.info().current,'ports');assert.equal(f.player.muted,true);
});
await check('Escape and close button stop playback, clear the source and restore card focus',()=>{
 for(const method of ['cancel','button']){const f=fixture();f.api.setPage('videos');f.links[1].emit('click');if(method==='cancel')assert.equal(f.dialog.emit('cancel').defaultPrevented,true);else f.ids.closeSampleVideo.emit('click');assert.equal(f.dialog.open,false);assert.equal(f.api.info().current,null);assert.equal(f.player.src,undefined);assert(f.player.pauseCount>0);assert.equal(f.links[1].focusCount,1);}
});
await check('Backdrop closes only when the click is outside the dialog boundary',()=>{
 const f=fixture();f.api.setPage('videos');f.links[0].emit('click');f.dialog.emit('click',{clientX:400,clientY:350});assert.equal(f.dialog.open,true);f.dialog.emit('click',{clientX:5,clientY:350});assert.equal(f.dialog.open,false);
});
await check('Leaving Videos or hiding the document stops playback without focusing hidden cards',()=>{
 for(const method of ['page','hidden']){const f=fixture();f.api.setPage('videos');f.links[2].emit('click');if(method==='page')f.api.setPage('overview');else{f.document.hidden=true;f.document.emit('visibilitychange');}assert.equal(f.dialog.open,false);assert.equal(f.api.info().current,null);assert.equal(f.player.src,undefined);assert.equal(f.links[2].focusCount,0);f.api.setPage('videos');assert.equal(f.player.playCount,1);}
});
await check('Unavailable video gives a poster fallback; retry clears the failure state',()=>{
 const f=fixture();f.api.setPage('videos');f.links[0].emit('click');f.player.emit('error');assert.equal(f.player.hidden,true);assert.equal(f.ids.sampleVideoError.hidden,false);assert.equal(f.ids.sampleVideoFallbackPoster.src,VIDEO_ITEMS[0].poster);f.ids.closeSampleVideo.emit('click');f.links[1].emit('click');assert.equal(f.player.hidden,false);assert.equal(f.ids.sampleVideoError.hidden,true);assert.equal(f.ids.sampleVideoFallbackPoster.src,VIDEO_ITEMS[1].poster);
});
await check('Browser playback rejection offers manual playback and a late rejection cannot affect a closed dialog',async()=>{
 const f=fixture();f.player.rejection=new Error('Play requires interaction');f.api.setPage('videos');f.links[0].emit('click');await Promise.resolve();assert.equal(f.ids.sampleVideoHint.hidden,false);assert.match(f.ids.sampleVideoHint.textContent,/Press play/);f.ids.closeSampleVideo.emit('click');f.links[1].emit('click');f.ids.closeSampleVideo.emit('click');await Promise.resolve();assert.equal(f.ids.sampleVideoHint.hidden,true);
});
await check('Configured YouTube destinations open safely while deceptive hosts and executable URLs are rejected',()=>{
 for(const url of ['https://www.youtube.com/watch?v=example','https://youtu.be/example'])assert.equal(youtubeDestination(url),url);
 for(const url of ['javascript:alert(1)','https://youtube.com.example.org/watch?v=x','https://evil.youtube.com/watch?v=x','https://youtube.com@evil.org/','http://youtube.com/','//youtube.com/watch?v=x','https://user:pass@youtube.com/','https://youtube.com:3000/',null])assert.equal(youtubeDestination(url),null);
 const f=fixture([{...VIDEO_ITEMS[0],externalUrl:'https://youtu.be/example'}]);f.api.setPage('videos');assert.equal(f.links[0].target,'_blank');assert.equal(f.links[0].rel,'noopener noreferrer');assert.equal(f.links[0].href,'https://youtu.be/example');assert(!f.links[0].emit('click').defaultPrevented);assert.equal(f.player.playCount,0);
 const invalid=fixture([{...VIDEO_ITEMS[0],externalUrl:'javascript:alert(1)'}]);invalid.api.setPage('videos');assert.equal(invalid.links[0].href,VIDEO_ITEMS[0].source);invalid.links[0].emit('click');assert.equal(invalid.player.playCount,1);
});
await check('Modified link clicks preserve native browser behavior and disposal removes handlers',()=>{
 const f=fixture();f.api.setPage('videos');assert(!f.links[0].emit('click',{ctrlKey:true}).defaultPrevented);assert.equal(f.dialog.open,false);f.links[0].emit('click');f.api.dispose();assert.equal(f.dialog.open,false);assert.equal(f.player.src,undefined);const plays=f.player.playCount;f.links[0].emit('click');assert.equal(f.player.playCount,plays);assert.equal(f.document.events.get('visibilitychange').size,0);f.api.dispose();
});
await check('Published fragment supplies three distinct samples, native controls, honest labels and no autoplay',async()=>{
 const html=await readFile(new URL('../dist/videos-content.html',import.meta.url),'utf8');assert.equal((html.match(/data-video-id=/g)||[]).length,3);assert.equal((html.match(/class="vid-meta">3D concept sample/g)||[]).length,3);assert.match(html,/<video[^>]*controls[^>]*playsinline[^>]*preload="none"/);assert.doesNotMatch(html,/\sautoplay(?:\s|=|>)/);assert.match(html,/aria-labelledby="sampleVideoTitle"/);for(const item of VIDEO_ITEMS){assert.equal(item.externalUrl,null);assert(html.includes(item.source));assert(html.includes(item.poster));}assert.match(html,/Illustrative animations/);
});
await writeFile(new URL('./video-results.json',import.meta.url),JSON.stringify({revision:'AD',checks:results.length,passed:results.length,scope:'Video library configuration, mock-DOM playback lifecycle, dialog accessibility contracts and static markup.',browserPreview:'Not run: control-browser unavailable',results},null,2)+'\n');
console.log(`\n${results.length} video checks passed.`);
