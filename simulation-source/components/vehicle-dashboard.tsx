import {useEffect,useRef} from 'react';
import {createVehicleHUD} from '../../dist/vehicle-hud.mjs';
import '../../dist/vehicle-hud.css';
export default function VehicleDashboard({data}:{data:Record<string,unknown>}){
 const host=useRef<HTMLDivElement>(null),hud=useRef<ReturnType<typeof createVehicleHUD>|null>(null);
 useEffect(()=>{hud.current=createVehicleHUD(host.current);return()=>{hud.current?.dispose();hud.current=null;};},[]);
 useEffect(()=>{hud.current?.update(data);},[data]);
 return <div ref={host}/>;
}
