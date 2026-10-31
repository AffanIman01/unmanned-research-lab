/** Pure simulation/design logic. No hardware I/O, certification, or CHASING API assumption. */
export const controlDefaults = Object.freeze({
  sensorMaxAgeMs: 200, leaseTimeoutMs: 500, poseMaxAgeMs: 200, captureStableDwellMs: 500,
  maxSpeed: 0.10, finalSpeed: 0.03, finalRadius: 0.50,
  maxYawRate: 0.15, kp: 0.35, yawKp: 0.5,
  stoppingAcceleration: 0.10, latency: 0.20, stoppingMargin: 0.02,
  minConfidence: 0.7, accelerationLimit: 0.1, dt: 0.02
});

const finite = n => typeof n === 'number' && Number.isFinite(n);
const withinAge = (age, max) => finite(age) && age >= 0 && age <= max;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const norm = v => Math.hypot(v.x, v.y, v.z);
const scale = (v, n) => ({ x: v.x * n, y: v.y * n, z: v.z * n });
const cap = (v, max) => norm(v) > max ? scale(v, max / norm(v)) : v;

/**
 * Fail closed: all listed boolean sensors must be literally true.
 * sensorAgeMs, leaseAgeMs, leaseEpoch and armedEpoch are required.
 * rearmRequired must be explicitly false; unknown inputs never permit lifting.
 */
export function recoveryGate(sensor = {}) {
  const reasons = [];
  const required = ['seatA', 'seatB', 'lockA', 'lockB', 'gateClosed', 'rovNeutralConfirmed',
    'tetherClear', 'loadNormal', 'relativeMotionOk', 'brakeReady', 'travelClear',
    'operatorAuthorised', 'leaseValid'];
  for (const key of required) if (sensor[key] !== true) reasons.push(`${key} is not confirmed`);
  if (sensor.noDisagreement !== true) reasons.push('Sensor agreement is not confirmed');
  if (!withinAge(sensor.sensorAgeMs, controlDefaults.sensorMaxAgeMs)) reasons.push('Sensor data is missing or stale');
  if (!withinAge(sensor.leaseAgeMs, controlDefaults.leaseTimeoutMs)) reasons.push('Operator lease is missing or expired');
  if (!finite(sensor.stableDwellMs) || sensor.stableDwellMs < controlDefaults.captureStableDwellMs) reasons.push('Capture has not remained verified for the dwell period');
  if (sensor.rearmRequired !== false) reasons.push('Explicit rearm is required');
  if (sensor.leaseEpoch === undefined || sensor.leaseEpoch === null || sensor.leaseEpoch !== sensor.armedEpoch) {
    reasons.push('Arming belongs to a different or unknown session');
  }
  return { allowed: reasons.length === 0, reasons, hold: reasons.length > 0,
    abort: false, action: reasons.length ? 'HOLD_NO_LIFT' : 'LIFT_PERMITTED_IN_SIMULATION' };
}

/** State-specific recommendations; actions are returned as flags, never executed. */
export function assessFault(fault, phase) {
  const captured = ['PARTIAL_CAPTURE', 'CAPTURED', 'VERIFY', 'LOAD_TRANSFER', 'LIFT_DRAIN', 'STOW_LOCK', 'STOWED'].includes(phase);
  const base = { fault, phase, reason: '', hold: true, abort: !captured,
    stopMechanism: true, brake: true, preserveLocks: captured,
    openLocks: false, takeUp: false, automaticPayout: false,
    neutralTeleop: false, rearmRequired: true, inhibitAffectedThruster: false,
    localContingencyRequired: false, operatorReview: true };
  switch (fault) {
    case 'NETWORK_LOSS':
    case 'STALE_LEASE':
      return { ...base, neutralTeleop: true, localContingencyRequired: !captured,
        reason: captured ? 'Expire remote commands; brake and retain capture. Explicit rearm required.'
          : 'Expire remote commands; use only the locally verified ROV contingency. No blind reeling or surfacing.' };
    case 'HIGH_TENSION':
      return { ...base, reason: 'Stop take-up and mechanism motion. Manual/supported payout requires a clear route and available capability; stock auto payout is not assumed.' };
    case 'TETHER_THRUSTER_SECTOR':
      return { ...base, inhibitAffectedThruster: true, localContingencyRequired: true,
        reason: 'Inhibit affected propulsion through an approved interface and reevaluate station keeping. Do not automatically reverse.' };
    case 'LATCH_DISAGREEMENT':
    case 'SEAT_DISAGREEMENT':
      return { ...base, reason: captured ? 'Stop lifting, retain available locks and support the load; diagnose before movement.'
          : 'Capture is incomplete. Inhibit lifting; retreat only along a verified clear corridor.' };
    case 'MAGNET_UNCONFIRMED':
      return { ...base, preserveLocks:true, reason:'Magnetic state is unconfirmed. Retain engaged pins, stop travel and inhibit release/lift; diagnose locally.' };
    case 'JAM':
      return { ...base, reason: 'Stop the drive and apply its brake. Do not retry with repeated force commands.' };
    case 'STATION_LOSS':
      return { ...base, localContingencyRequired: true,
        reason: captured ? 'Hold carrier; restow only after clearance and motion conditions are reverified.'
          : 'Abort insertion, avoid dragging the ROV, and invoke the locally verified contingency.' };
    case 'POSE_STALE':
      return { ...base, reason: captured ? 'Keep verified capture and hold movement pending fresh evidence.'
          : 'Stop insertion. Retreat only with independent clearance evidence; do not retry blindly.' };
    case 'POWER_LOSS':
      return { ...base, localContingencyRequired: !captured,
        reason: captured ? 'Passive lifting brake and mechanical restraint must retain the load. Software flags do not implement this hardware function.'
          : 'Hold carrier mechanically; ROV follows its verified OEM failsafe. Do not spring-close a gate onto a partial insertion.' };
    default:
      return { ...base, reason: 'Unknown fault: inhibit lifting and drive motion, preserve verified capture, and require operator diagnosis.' };
  }
}

/**
 * Bounded target-frame guidance. Errors x/y/z in metres, yaw in radians.
 * Require poseAgeMs, confidence, and distanceToContact >=0. Optional targetVelocity
 * and previousVelocity are {x,y,z} in m/s. Returned commands remain bounded.
 * Numeric limits are simulation seeds, not verified hardware limits.
 */
export function guidance(error = {}, config = {}) {
  const c = { ...controlDefaults, ...config };
  const stopped = reason => ({ vx: 0, vy: 0, vz: 0, yawRate: 0, speedLimit: 0,
    hold: true, abort: true, reasons: [reason] });
  for (const k of ['maxSpeed', 'finalSpeed', 'finalRadius', 'maxYawRate', 'kp', 'yawKp',
    'stoppingAcceleration', 'latency', 'stoppingMargin', 'accelerationLimit', 'dt',
    'poseMaxAgeMs', 'minConfidence']) {
    if (!finite(c[k]) || c[k] < 0) return stopped(`Invalid control setting ${k}`);
  }
  if (c.stoppingAcceleration === 0 || c.dt === 0) return stopped('Stopping acceleration and timestep must be positive');
  if (!['x', 'y', 'z', 'yaw', 'distanceToContact'].every(k => finite(error[k]))) return stopped('Pose or contact distance is missing/nonfinite');
  if (error.distanceToContact < 0) return stopped('Contact distance is negative');
  if (!withinAge(error.poseAgeMs, c.poseMaxAgeMs)) return stopped('Pose is stale');
  if (!finite(error.confidence) || error.confidence < c.minConfidence || error.confidence > 1) return stopped('Pose confidence is insufficient');
  const d = Math.max(0, error.distanceToContact - c.stoppingMargin);
  const at = c.stoppingAcceleration * c.latency;
  const stopBound = Math.max(0, Math.sqrt(at * at + 2 * c.stoppingAcceleration * d) - at);
  const position = { x: error.x, y: error.y, z: error.z };
  const final = norm(position) <= c.finalRadius;
  const speedLimit = Math.min(c.maxSpeed, final ? c.finalSpeed : c.maxSpeed, stopBound);
  const feed = error.targetVelocity || { x: 0, y: 0, z: 0 };
  if (!['x', 'y', 'z'].every(k => finite(feed[k]))) return stopped('Invalid target velocity');
  let requested = cap({ x: c.kp * error.x + feed.x,
    y: c.kp * error.y + feed.y, z: c.kp * error.z + feed.z }, speedLimit);
  if (error.previousVelocity) {
    const prev = error.previousVelocity;
    if (!['x', 'y', 'z'].every(k => finite(prev[k]))) return stopped('Invalid previous command');
    const delta = cap({ x: requested.x - prev.x, y: requested.y - prev.y,
      z: requested.z - prev.z }, c.accelerationLimit * c.dt);
    requested = cap({ x: prev.x + delta.x, y: prev.y + delta.y, z: prev.z + delta.z }, speedLimit);
  }
  const yaw = Math.atan2(Math.sin(error.yaw), Math.cos(error.yaw));
  return { vx: requested.x, vy: requested.y, vz: requested.z,
    yawRate: clamp(c.yawKp * yaw, -c.maxYawRate, c.maxYawRate), speedLimit,
    hold: speedLimit === 0, abort: false,
    reasons: speedLimit === 0 ? ['Stopping margin reached; no translation permitted'] : [] };
}

/** Pure lease reducer; nowMs must be receiver-local monotonic milliseconds. */
export function updateLease(previous, event = {}, nowMs) {
  const s = { connected: false, epoch: null, armed: false, rearmRequired: true,
    highestSequence: -1, armGeneration: 0, lastCommandAtMs: null, lastNowMs: null,
    ...previous, accepted: false, reason: '' };
  if (!finite(nowMs) || nowMs < 0 || (finite(s.lastNowMs) && nowMs < s.lastNowMs)) {
    return { ...s, armed: false, rearmRequired: true, reason: 'Invalid or reversed monotonic time' };
  }
  s.lastNowMs = nowMs;
  if (s.armed && (!finite(s.lastCommandAtMs) || nowMs - s.lastCommandAtMs > controlDefaults.leaseTimeoutMs)) {
    s.armed = false; s.rearmRequired = true; s.reason = 'Lease expired; explicit rearm required';
  }
  switch (event.type) {
    case 'CONNECT':
      if (event.epoch === undefined || event.epoch === null || event.epoch === s.epoch) {
        return { ...s, armed: false, rearmRequired: true, reason: 'New connection requires a fresh session epoch' };
      }
      return { ...s, connected: true, epoch: event.epoch, armed: false, rearmRequired: true,
        highestSequence: -1, lastCommandAtMs: null, accepted: true, reason: 'Connected; explicit rearm required' };
    case 'DISCONNECT':
    case 'DEADMAN_RELEASE':
      return { ...s, connected: event.type === 'DISCONNECT' ? false : s.connected,
        armed: false, rearmRequired: true, accepted: true, reason: 'Commands expired; explicit rearm required' };
    case 'ARM':
      if (!s.connected || event.epoch !== s.epoch || event.operatorAuthorised !== true) {
        return { ...s, reason: 'Arming request is not authorised for this session' };
      }
      return { ...s, armed: true, rearmRequired: false, armGeneration: s.armGeneration + 1, lastCommandAtMs: nowMs,
        accepted: true, reason: 'Explicitly armed for current session' };
    case 'COMMAND':
      if (!s.connected || !s.armed || s.rearmRequired || event.epoch !== s.epoch || event.armGeneration !== s.armGeneration) {
        return { ...s, reason: 'Command rejected: disconnected, unarmed, expired or wrong session' };
      }
      if (!Number.isSafeInteger(event.sequence) || event.sequence <= s.highestSequence) {
        return { ...s, reason: 'Command rejected: stale or duplicate sequence' };
      }
      return { ...s, highestSequence: event.sequence, lastCommandAtMs: nowMs,
        accepted: true, reason: 'Command accepted' };
    case 'TICK':
      return s;
    default:
      return { ...s, reason: 'No valid lease event' };
  }
}
