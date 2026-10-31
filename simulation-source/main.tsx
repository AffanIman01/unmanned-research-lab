import {Component,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import PoolSimulation from './components/pool-simulation';
import './source-theme.css';
import './theme.css';

class SimulationBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){
    if(window.parent!==window)window.parent.postMessage({type:'water-simulation-error'},window.location.origin);
  }
  render(){
    if(this.state.failed)return <main className="sim-error" role="alert"><h1>Simulation unavailable</h1><p>Please reload to retry.</p><button onClick={()=>window.location.reload()}>Reload simulation</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(<SimulationBoundary><PoolSimulation/></SimulationBoundary>);
