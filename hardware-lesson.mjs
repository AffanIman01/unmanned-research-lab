import {createLinkFlow} from './link-flow.mjs?v=antennas-ae';

const MODES = ['stereo', 'lidar', 'links'];
const DESCRIPTIONS = {
  stereo: ['ZED · stereo depth', 'Two images. One depth estimate.'],
  lidar: ['RoboSense · 3D scanning', 'Laser returns build a point cloud.'],
  links: ['Shore ↔ USV ↔ ROV', 'Commands out · video and telemetry back.'],
};
const eye = (name) => `<figure class="hl-eye"><figcaption>${name} image</figcaption>
  <svg viewBox="0 0 180 76" role="img" aria-label="Illustrative ${name.toLowerCase()} camera image">
    <rect class="hl-image-bg" width="180" height="76" rx="6"/>
    <path class="hl-image-grid" d="M0 19H180M0 38H180M0 57H180M30 0V76M60 0V76M90 0V76M120 0V76M150 0V76"/>
    <path class="hl-epipolar" d="M8 38H172"/>
    <g data-eye="${name.toLowerCase()}" transform="translate(90 38)">
      <rect class="hl-image-target" x="-24" y="-23" width="48" height="46" rx="3"/>
      <path class="hl-checker" d="M-18-17H0V0H-18ZM0 0H18V17H0Z"/>
      <circle class="hl-match-ring" r="7"/>
      <circle class="hl-match" r="2.7"/>
    </g>
  </svg></figure>`;

/** Compact, synthetic lessons. Motion is advanced only by update(dt). */
export function createHardwareLesson({host, onOpen = () => {}, onClose = () => {}, onDistance = () => {}}) {
  if (!host) throw new TypeError('createHardwareLesson requires a host');
  const document = host.ownerDocument || globalThis.document;
  const workspace = host.closest?.('.workspace') || document.querySelector('.workspace');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let mode = null, playing = false, distance = 4, route = 'radio';
  let lastInfo = {};

  host.classList.add('hardware-lesson');
  host.hidden = true;
  host.setAttribute('aria-label', 'How the hardware works');
  host.innerHTML = `<div class="hl-toolbar">
      <div class="hl-tabs" role="group" aria-label="Hardware lesson">
        <button type="button" data-hl-mode="stereo" aria-pressed="false"><span class="hl-tab-dot hl-stereo-dot" aria-hidden="true"></span>Stereo depth</button>
        <button type="button" data-hl-mode="lidar" aria-pressed="false"><span class="hl-tab-dot hl-lidar-dot" aria-hidden="true"></span>LiDAR scan</button>
        <button type="button" data-hl-mode="links" aria-pressed="false"><span class="hl-tab-dot hl-link-dot" aria-hidden="true"></span>Control link</button>
      </div>
      <div class="hl-actions"><button type="button" data-hl-pause aria-pressed="false">Pause</button>
        <button type="button" class="hl-close" data-hl-close aria-label="Close hardware lesson" title="Close lesson"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4L12 12M12 4L4 12"/></svg></button></div>
    </div>
    <div class="hl-body">
      <div class="hl-intro"><span class="hl-eyebrow" data-hl-title></span><p data-hl-caption></p></div>
      <div class="hl-sensing" data-hl-sensing>
        <div class="hl-stereo-pair" data-hl-stereo>${eye('Left')}${eye('Right')}</div>
        <div class="hl-lidar-key" data-hl-lidar hidden><svg viewBox="0 0 124 70" aria-hidden="true"><path class="hl-lidar-path" d="M15 46L108 16L108 54L15 46"/><path class="hl-lidar-return" d="M107 20L21 46"/><circle class="hl-lidar-source" cx="15" cy="46" r="7"/><g class="hl-cloud-dots"><circle cx="108" cy="16" r="2"/><circle cx="108" cy="25" r="2"/><circle cx="108" cy="35" r="2"/><circle cx="108" cy="44" r="2"/><circle cx="108" cy="54" r="2"/></g><text x="41" y="19">pulse</text><text x="55" y="58">return</text></svg><span>Time of flight</span></div>
        <div class="hl-readouts"><div><span data-hl-metric-one-label>Example depth</span><output data-hl-metric-one>4.0 m</output></div><div><span data-hl-metric-two-label>Disparity</span><output data-hl-metric-two>9.6 px</output></div></div>
        <label class="hl-distance" for="hl-target-distance"><span>Target depth <output data-hl-distance-value>4.0 m</output></span><input id="hl-target-distance" type="range" min="2" max="8" step="0.1" value="4"><span class="hl-range-ends"><small>2 m</small><small>8 m</small></span></label>
      </div>
      <div class="hl-route" data-hl-routes hidden role="group" aria-label="Communication route"><button type="button" data-hl-route="radio" aria-pressed="true">Ground radio</button><button type="button" data-hl-route="internet" aria-pressed="false">Internet · Starlink</button></div>
      <div class="hl-link-host" data-hl-flow hidden></div>
    </div>
    <div class="hl-footnote"><span>Illustrative · no live sensor data</span><details class="hl-method"><summary>Principle &amp; sources</summary><div data-hl-explanation></div></details></div>`;

  const query = selector => host.querySelector(selector);
  const all = selector => [...host.querySelectorAll(selector)];
  const title = query('[data-hl-title]'), caption = query('[data-hl-caption]');
  const pauseButton = query('[data-hl-pause]');
  const slider = query('#hl-target-distance');
  const stereo = query('[data-hl-stereo]'), lidar = query('[data-hl-lidar]');
  const sensing = query('[data-hl-sensing]'), routes = query('[data-hl-routes]');
  const flowHost = query('[data-hl-flow]');
  const flow = createLinkFlow(flowHost);
  flow.stop();
  const leftEye = query('[data-eye="left"]'), rightEye = query('[data-eye="right"]');
  const labelOne = query('[data-hl-metric-one-label]'), labelTwo = query('[data-hl-metric-two-label]');
  const metricOne = query('[data-hl-metric-one]'), metricTwo = query('[data-hl-metric-two]');
  const distanceValue = query('[data-hl-distance-value]');
  const explanation = query('[data-hl-explanation]');
  const method = query('.hl-method');

  function setPlaying(value) {
    playing = Boolean(value) && mode !== null;
    pauseButton.textContent = playing ? 'Pause' : 'Play';
    pauseButton.setAttribute('aria-pressed', String(!playing));
    pauseButton.setAttribute('aria-label', playing ? 'Pause lesson animation' : 'Play lesson animation');
    host.setAttribute('data-playing', String(playing));
    flow.setPlaying(playing && mode === 'links');
  }

  function renderReadouts(data = {}) {
    const sensedDistance = Number(data.distanceM ?? data.distance);
    const range = Number.isFinite(sensedDistance) ? sensedDistance : distance;
    distanceValue.textContent = `${distance.toFixed(1)} m`;
    if (mode === 'stereo') {
      const candidate = Number(data.disparityPx);
      const disparity = Number.isFinite(candidate) && candidate > 0 ? candidate : 320 * .12 / range;
      metricOne.textContent = `${range.toFixed(1)} m`;
      metricTwo.textContent = `${disparity.toFixed(1)} px`;
      leftEye.setAttribute('transform', `translate(${(90 + disparity / 2).toFixed(2)} 38)`);
      rightEye.setAttribute('transform', `translate(${(90 - disparity / 2).toFixed(2)} 38)`);
    } else if (mode === 'lidar') {
      const count = Number(data.pointCount ?? data.pointcount);
      const hit = Number(data.firstHitDistanceM);
      metricOne.textContent = Number.isFinite(count) ? Math.max(0, Math.round(count)).toLocaleString() : '0';
      metricTwo.textContent = data.firstHitDistanceM != null && Number.isFinite(hit) ? `${hit.toFixed(2)} m` : '—';
    }
  }

  function open(nextMode = 'stereo') {
    if (!MODES.includes(nextMode)) throw new RangeError('Unknown hardware lesson');
    mode = nextMode;
    host.hidden = false;
    host.dataset.mode = mode;
    workspace?.classList.add('hardware-active');
    workspace?.classList.toggle('hardware-links', mode === 'links');
    title.textContent = DESCRIPTIONS[mode][0];
    caption.textContent = DESCRIPTIONS[mode][1];
    all('[data-hl-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.hlMode === mode)));
    sensing.hidden = mode === 'links';
    stereo.hidden = mode !== 'stereo';
    lidar.hidden = mode !== 'lidar';
    routes.hidden = mode !== 'links';
    flowHost.hidden = mode !== 'links';
    method.open = false;
    labelOne.textContent = mode === 'stereo' ? 'Example depth' : 'Synthetic points';
    labelTwo.textContent = mode === 'stereo' ? 'Disparity' : 'Beam return';
    explanation.innerHTML = mode === 'stereo'
      ? '<p>Passive stereo matches features in two images. A nearer target gives greater image disparity. The sightlines show observation, not emitted light.</p><p><strong>Example only:</strong> depth = focal length × baseline ÷ disparity; 320 px and 0.12 m. The image pair is synthetic, not a camera feed or calibrated ZED output.</p><a href="https://support.stereolabs.com/articles/6815914373-how-does-the-zed-3d-perception-work" target="_blank" rel="noopener noreferrer">Stereolabs · stereo principle ↗</a>'
      : mode === 'lidar'
        ? '<p>A laser pulse reflects from a surface. Its return time gives distance: range = speed of light × travel time ÷ 2. Many returns form a 3D point cloud.</p><p>The pulse and sweep are slowed for viewing. These targets, points and scan pattern are synthetic; the photographed sensor’s exact model is unconfirmed. Returns intersect the example targets only, without vessel self-occlusion, noise or weather.</p><a href="https://store.robosense.ai/products/helios-series" target="_blank" rel="noopener noreferrer">RoboSense · LiDAR reference ↗</a>'
        : '<p>The two 1.4 GHz ground antennas match USV antennas 1 and 4. Antenna 2 is 4G cellular; antenna 3 is 2.4 GHz, with its role unconfirmed. Starlink provides Internet backhaul. The planned Jetson gateway combines perception and operator traffic; its control connections require OEM validation.</p><p>The CHASING controller, E-Reel and underwater tether are retained in this proposed architecture.</p><div class="hl-source-links"><a href="https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/" target="_blank" rel="noopener noreferrer">NVIDIA · Jetson ↗</a><a href="https://www.starlink.com/public-files/specification_sheet_mini.pdf" target="_blank" rel="noopener noreferrer">Starlink Mini ↗</a><a href="https://na-file.chasing.com/ltWgw4lZoQ7OvgSnLHiGc5Yeku2-" target="_blank" rel="noopener noreferrer">CHASING · manual ↗</a></div>';
    setPlaying(!reducedMotion);
    lastInfo = {};
    renderReadouts();
    onOpen(mode);
    onDistance(distance);
  }

  function close() {
    if (!mode) return;
    mode = null;
    setPlaying(false);
    flow.stop();
    host.hidden = true;
    delete host.dataset.mode;
    workspace?.classList.remove('hardware-active', 'hardware-links');
    onClose();
  }

  all('[data-hl-mode]').forEach(button => button.addEventListener('click', () => open(button.dataset.hlMode)));
  query('[data-hl-close]').addEventListener('click', close);
  pauseButton.addEventListener('click', () => setPlaying(!playing));
  slider.addEventListener('input', () => {
    const value = Number(slider.value);
    if (!Number.isFinite(value)) return;
    distance = Math.min(8, Math.max(2, value));
    slider.value = String(distance);
    renderReadouts();
    onDistance(distance);
  });
  all('[data-hl-route]').forEach(button => button.addEventListener('click', () => {
    route = button.dataset.hlRoute;
    flow.setRoute(route);
    flow.setPlaying(playing && mode === 'links');
    all('[data-hl-route]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.hlRoute === route)));
  }));
  host.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mode) { event.preventDefault(); close(); }
  });

  return {
    open, close,
    update(dt, data = {}) {
      if (!mode) return;
      lastInfo = data || {};
      if (mode === 'links') flow.update(playing && !document.hidden ? dt : 0);
      else renderReadouts(lastInfo);
    },
    get mode() { return mode; },
    get playing() { return playing; },
    info() { return {mode, playing, distanceM: distance, route, illustrative: true, live: false, sensor: lastInfo, flow: flow.info()}; },
  };
}
