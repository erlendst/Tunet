import { describe, it, expect } from 'vitest';
import { matchCarEntities } from '../utils/carEntityMatcher';

// Sensors exposed by the new ID.4 integration.
const entities = {
  'binary_sensor.id_4_charging': {
    state: 'off',
    attributes: { friendly_name: 'ID.4 Charging' },
  },
  'sensor.id_4_estimated_remaining_driving_range': {
    state: '320',
    attributes: { friendly_name: 'ID.4 Estimated remaining driving range', unit_of_measurement: 'km' },
  },
  'binary_sensor.id_4_plug': {
    state: 'on',
    attributes: { friendly_name: 'ID.4 Plug', device_class: 'plug' },
  },
  'sensor.id_4_target_state_of_charge': {
    state: '80',
    attributes: { friendly_name: 'ID.4 Target state of charge', unit_of_measurement: '%' },
  },
};

describe('matchCarEntities — ID.4 integration', () => {
  const { suggested } = matchCarEntities(entities);

  it('maps the charging binary sensor', () => {
    expect(suggested.chargingStateId).toBe('binary_sensor.id_4_charging');
  });

  it('maps the plug binary sensor', () => {
    expect(suggested.pluggedId).toBe('binary_sensor.id_4_plug');
  });

  it('maps the range sensor', () => {
    expect(suggested.rangeId).toBe('sensor.id_4_estimated_remaining_driving_range');
  });

  it('maps the target state of charge sensor', () => {
    expect(suggested.targetSocId).toBe('sensor.id_4_target_state_of_charge');
  });

  it('does not mistake target state of charge for the battery level', () => {
    expect(suggested.batteryId).not.toBe('sensor.id_4_target_state_of_charge');
  });
});
