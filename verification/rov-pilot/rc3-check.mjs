import assert from 'node:assert/strict';
import {readPilotKeys,cycleLight,stepSpeed,normalizeHeading} from '../../dist/rov-simulator/controls.mjs';
import {createPose,step} from '../../dist/rov-simulator/physics.mjs';
import {pilotAxes,nextLight,changeSpeed} from '../../simulation-source/lib/pilot-controls.ts';
import {stepRov} from '../../simulation-source/lib/rov-motion.ts';
let checks=0;function check(label,fn){fn();checks++;console.log('PASS '+label);}
const key=c=>readPilotKeys(new Set([c]),true,100);
check('all requested keys resolve the correct signed axis',()=>{for(const [code,axis,value]of [['KeyW','forward',1],['KeyS','forward',-1],['KeyA','strafe',-1],['KeyD','strafe',1],['KeyQ','roll',1],['KeyE','roll',-1],['KeyR','vertical',1],['KeyC','vertical',-1],['KeyT','pitch',1],['KeyV','pitch',-1],['KeyZ','yaw',-1],['KeyX','yaw',1]]){const a=key(code);assert.equal(a[axis],value);for(const [k,v]of Object.entries(a))if(k!==axis&&k!=='armed')assert.equal(v,0);}});
check('locked and released controls are neutral',()=>{for(const v of Object.values(readPilotKeys(new Set(['KeyW','KeyT']),false,100)))assert(!v);assert.equal(key('KeyF').vertical,0);});
check('light cycles and speed endpoints match in both simulators',()=>{let a=0,b=0;for(const expected of[50,100,0,50]){a=cycleLight(a);b=nextLight(b);assert.equal(a,expected);assert.equal(b,expected);}let s=25;for(const e of[50,75,100,100]){s=stepSpeed(s,1);assert.equal(s,e);assert.equal(changeSpeed(s,1),Math.min(100,s+25));}for(const e of[75,50,25,25]){s=stepSpeed(s,-1);assert.equal(s,e);}});
check('speed scale reduces translation and rotation commands',()=>{const p=createPose(),q=createPose();for(let i=0;i<40;i++){step(p,readPilotKeys(new Set(['KeyW','KeyQ']),true,25),.02,false);step(q,readPilotKeys(new Set(['KeyW','KeyQ']),true,100),.02,false);}assert(Math.abs(p.z)<Math.abs(q.z));assert(Math.abs(p.roll)<Math.abs(q.roll));});
check('compass wraps correctly through north',()=>{assert.equal(normalizeHeading(-1),359);assert.equal(normalizeHeading(360),0);assert.equal(normalizeHeading(721),1);});
check('water simulator WASD strafes without yaw and T/V commands pitch',()=>{assert.deepEqual(pilotAxes(new Set(['a','t']),true),{throttle:0,steer:0,strafe:-1,heave:0,roll:0,pitch:1});assert.equal(pilotAxes(new Set(['a']),false).steer,1);});
const start=()=>({x:0,y:-1,z:0,heading:0,speed:0,vertical:0,yaw:0,roll:0,rollRate:0,pitch:0,pitchRate:0});
check('water simulation strafe preserves heading and nose-up pitch has correct sign',()=>{let p=start();for(let i=0;i<40;i++)p=stepRov(p,0,0,0,.02,{x:0,y:0,z:0},undefined,0,-1,1,1).state;assert(p.x<0);assert.equal(p.heading,0);assert(p.pitch<0);assert.equal(p.roll,0);});
check('releasing pitch brakes angular velocity',()=>{let p=start();for(let i=0;i<40;i++)p=stepRov(p,0,0,0,.02,{x:0,y:0,z:0},undefined,0,0,1,1).state;for(let i=0;i<150;i++)p=stepRov(p,0,0,0,.02,{x:0,y:0,z:0},undefined).state;assert(Math.abs(p.pitchRate)<1e-6);});
console.log(checks+' control checks passed');
