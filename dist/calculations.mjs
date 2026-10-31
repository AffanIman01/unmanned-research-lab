// Generated defaults match defaults.json. SI units; preliminary screening only.
export const defaults = {
  "status": "CONCEPT ESTIMATES \u2014 NOT A SAFE WORKING LOAD OR A FABRICATION RELEASE",
  "units": "SI: kg, m, s, N, Nm, W",
  "g": 9.81,
  "rov_base_mass_kg": 8.0,
  "rov_accessory_allowance_kg": 2.0,
  "rov_docking_shoe_mass_kg": 1.0,
  "retained_water_allowance_kg": 1.0,
  "supported_tether_segment_kg": 0.5,
  "fixed_auxiliary_items_kg": {
    "ereel_and_remaining_stored_tether_allowance": 4.0,
    "starlink_and_mount_allowance": 2.0,
    "computer_and_dry_enclosure_allowance": 2.0,
    "power_cables_and_other_brackets_allowance": 2.0
  },
  "dynamic_multiplier": 1.5,
  "friction_force_n": 25.0,
  "strength_factor": 2.0,
  "lift_speed_m_s": 0.04,
  "lift_stroke_m": 0.2717,
  "winch_efficiency": 0.65,
  "motor_efficiency": 0.8,
  "drum_max_radius_m": 0.04,
  "seawater_density_kg_m3": 1025.0,
  "drag_coefficient": 1.2,
  "projected_area_m2": 0.2,
  "relative_water_speed_m_s": 0.5,
  "buoyancy_credit_n": 0.0,
  "illustrative_baseline_vessel_mass_kg": 180.0,
  "existing_payload_kg": null,
  "reference_payload_capacity_kg": 60.0,
  "vessel_revision_capacity_confirmed": false,
  "lifter_capacity_confirmed": false,
  "concepts": {
    "D": {
      "name": "EPM capture head, positive pins and removable yoke",
      "moving_carrier_mass_kg": 3.5,
      "fixed_mechanism_mass_kg": 2.5,
      "horizontal_cg_travel_m": 0.0,
      "load_offset_from_mount_m": 0.06,
      "guide_reaction_spacing_m": 0.122,
      "link_length_m": null,
      "actuator_radius_m": null,
      "actuator_angle_deg": null,
      "joint_efficiency": null,
      "lift_stroke_m": 0.2717,
      "rov_docking_shoe_mass_kg": 1.8
    }
  },
  "provenance": {
    "rov_base_mass_kg": "8 kg nominal manufacturer brochure figure; weigh configured ROV. Dimensions 608 x 294 x 196 mm exclude floodlights.",
    "reference_payload_capacity_kg": "OceanAlpha current ME120 product page says 60 kg. Exact user vessel revision and remaining allowance are unconfirmed.",
    "all_other_numbers": "Analyst-selected screening assumptions, not manufacturer ratings. Replace with weighed masses, surveyed geometry, measured friction and approved load cases.",
    "illustrative_baseline_vessel_mass_kg": "Arithmetic illustration only. Baseline means measured ready vessel with original batteries and existing equipment, excluding new integration. Never add original batteries twice."
  }
};

const clone = value => JSON.parse(JSON.stringify(value));
function merge(a, b) {
  const out = clone(a);
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object'
      ? merge(out[k], v) : v;
  }
  return out;
}
function positive(value, name, zero = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (!zero && value === 0)) {
    throw new RangeError(`${name} must be finite and ${zero ? 'nonnegative' : 'positive'}`);
  }
  return value;
}

/**
 * Preliminary SI-unit screening, never a SWL or structural approval.
 * Global overrides use defaults keys; overrides.concept patches selected concept.
 * Returns the Python concept result plus shared masses/drag/status.
 */
export function calculate(conceptKey, overrides = {}) {
  if (!Object.hasOwn(defaults.concepts, conceptKey)) throw new RangeError('Only the magnetic concept D is available');
  const { concept: conceptOverride, ...globalOverrides } = overrides;
  const p = merge(defaults, globalOverrides);
  const c = merge(p.concepts[conceptKey], conceptOverride || {});
  if(!Object.hasOwn(globalOverrides,'rov_docking_shoe_mass_kg')&&c.rov_docking_shoe_mass_kg!==undefined)p.rov_docking_shoe_mass_kg=c.rov_docking_shoe_mass_kg;
  for (const k of ['rov_accessory_allowance_kg', 'rov_docking_shoe_mass_kg',
    'retained_water_allowance_kg', 'supported_tether_segment_kg', 'friction_force_n',
    'relative_water_speed_m_s']) positive(p[k], k, true);
  for (const k of ['g', 'rov_base_mass_kg', 'dynamic_multiplier', 'strength_factor',
    'lift_speed_m_s', 'lift_stroke_m', 'winch_efficiency', 'motor_efficiency',
    'drum_max_radius_m', 'seawater_density_kg_m3', 'drag_coefficient', 'projected_area_m2',
    'illustrative_baseline_vessel_mass_kg']) positive(p[k], k);
  if (p.dynamic_multiplier < 1 || p.strength_factor < 1) throw new RangeError('Load factors must be >= 1');
  if (p.winch_efficiency > 1 || p.motor_efficiency > 1) throw new RangeError('Efficiency must be <= 1');
  if (p.buoyancy_credit_n !== 0) throw new RangeError('In-air screening uses zero buoyancy credit');
  if (p.existing_payload_kg !== null) positive(p.existing_payload_kg, 'existing_payload_kg', true);
  positive(p.reference_payload_capacity_kg, 'reference_payload_capacity_kg', true);
  for (const [k, v] of Object.entries(p.fixed_auxiliary_items_kg)) positive(v, k, true);
  for (const k of ['moving_carrier_mass_kg', 'fixed_mechanism_mass_kg', 'horizontal_cg_travel_m',
    'load_offset_from_mount_m']) positive(c[k], k, true);
  positive(c.guide_reaction_spacing_m, 'guide_reaction_spacing_m');
  const aux = Object.values(p.fixed_auxiliary_items_kg).reduce((a, b) => a + b, 0);
  const rov = p.rov_base_mass_kg + p.rov_accessory_allowance_kg + p.rov_docking_shoe_mass_kg;
  const movingDry = rov + c.moving_carrier_mass_kg + p.supported_tether_segment_kg;
  const movingWet = movingDry + p.retained_water_allowance_kg;
  const addedDry = movingDry + c.fixed_mechanism_mass_kg + aux;
  const addedWet = addedDry + p.retained_water_allowance_kg;
  const staticWeight = movingWet * p.g;
  const operating = p.dynamic_multiplier * staticWeight + p.friction_force_n;
  const resistance = operating * p.strength_factor;
  const serviceMoment = operating * c.load_offset_from_mount_m;
  const resistanceMoment = serviceMoment * p.strength_factor;
  const totalMass = p.illustrative_baseline_vessel_mass_kg + addedWet;
  const shaftPower = operating * p.lift_speed_m_s / p.winch_efficiency;
  const electricalPower = shaftPower / p.motor_efficiency;
  const time = positive(c.lift_stroke_m ?? p.lift_stroke_m, 'concept lift stroke') / p.lift_speed_m_s;
  const result = {
    concept: conceptKey, status: p.status, name: c.name,
    configured_rov_and_shoe_kg: rov,
    fixed_auxiliary_allowance_kg: aux,
    drag_screening_separate_lateral_load_n: 0.5 * p.seawater_density_kg_m3 * p.drag_coefficient * p.projected_area_m2 * p.relative_water_speed_m_s ** 2,
    buoyancy_credit_n: 0,
    moving_dry_mass_kg: movingDry,
    moving_recovery_mass_kg: movingWet,
    added_dry_payload_kg: addedDry,
    added_wet_recovery_payload_kg: addedWet,
    in_air_static_weight_n: staticWeight,
    operational_lift_force_n: operating,
    screening_strength_resistance_n: resistance,
    service_mount_moment_nm: serviceMoment,
    screening_mount_resistance_nm: resistanceMoment,
    service_guide_couple_force_n: serviceMoment / c.guide_reaction_spacing_m,
    screening_guide_couple_resistance_n: resistanceMoment / c.guide_reaction_spacing_m,
    drum_output_torque_nm: operating * p.drum_max_radius_m,
    equivalent_input_torque_nm_at_drum_speed: operating * p.drum_max_radius_m / p.winch_efficiency,
    input_shaft_power_w: shaftPower,
    electrical_lift_power_w: electricalPower,
    illustrative_lift_time_s: time,
    illustrative_electrical_energy_wh: electricalPower * time / 3600,
    illustrative_vessel_total_mass_kg: totalMass,
    illustrative_horizontal_cg_shift_m: movingWet * c.horizontal_cg_travel_m / totalMass,
    headroom_if_no_existing_payload_kg: p.reference_payload_capacity_kg - addedWet,
    remaining_payload_kg: p.existing_payload_kg === null ? null : p.reference_payload_capacity_kg - p.existing_payload_kg - addedWet,
    rated_capacity_status: 'UNCONFIRMED'
  };
  return result;
}
