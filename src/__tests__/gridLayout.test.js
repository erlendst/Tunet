import { describe, it, expect } from 'vitest';
import { getCardGridSpan, getCardGridSize, getCardColSpan, buildGridLayout } from '../utils/gridLayout';

// ═════════════════════════════════════════════════════════════════════════
// getCardGridSize / getCardGridSpan
// ═════════════════════════════════════════════════════════════════════════
describe('getCardGridSize', () => {
  const identity = (id) => id;

  it('returns small lights as 1 row and 1 col', () => {
    const settings = { 'light_abc': { size: 'small' } };
    expect(getCardGridSize('light_abc', identity, settings, 'home')).toEqual({ rows: 1, cols: 1 });
  });

  it('returns default lights as 2 rows and 1 col', () => {
    expect(getCardGridSize('light_abc', identity, {}, 'home')).toEqual({ rows: 2, cols: 1 });
  });

  it('returns 1 row for small calendar cards', () => {
    const settings = { 'calendar_card_1': { size: 'small' } };
    expect(getCardGridSize('calendar_card_1', identity, settings, 'home').rows).toBe(1);
  });

  it('returns 2 rows for medium calendar cards', () => {
    const settings = { 'calendar_card_1': { size: 'medium' } };
    expect(getCardGridSize('calendar_card_1', identity, settings, 'home').rows).toBe(2);
  });

  it('returns 4 rows for default (large) calendar cards', () => {
    expect(getCardGridSize('calendar_card_1', identity, {}, 'home').rows).toBe(4);
  });

  it('returns 1 row for small car cards', () => {
    const settings = { 'car_card_1': { size: 'small' } };
    expect(getCardGridSize('car_card_1', identity, settings, 'home').rows).toBe(1);
  });

  it('returns 2 rows for default car cards', () => {
    expect(getCardGridSize('car_card_1', identity, {}, 'home').rows).toBe(2);
  });

  it('returns 1 row for automation with sensor type and small size', () => {
    const settings = { 'automation.test': { type: 'sensor', size: 'small' } };
    expect(getCardGridSize('automation.test', identity, settings, 'home').rows).toBe(1);
  });

  it('returns 2 rows for automation with sensor type and no small size', () => {
    const settings = { 'automation.test': { type: 'sensor' } };
    expect(getCardGridSize('automation.test', identity, settings, 'home').rows).toBe(2);
  });

  it('returns 1 row for automation without sensor/entity/toggle type', () => {
    const settings = { 'automation.test': { type: 'other' } };
    expect(getCardGridSize('automation.test', identity, settings, 'home').rows).toBe(1);
  });

  it('returns 2 rows for weather_temp_ cards', () => {
    expect(getCardGridSize('weather_temp_abc', identity, {}, 'home').rows).toBe(2);
  });

  it('returns 1 row for generic small cards', () => {
    const settings = { 'sensor.xyz': { size: 'small' } };
    expect(getCardGridSize('sensor.xyz', identity, settings, 'home').rows).toBe(1);
  });

  it('returns 1 row for settings page non-special cards', () => {
    expect(getCardGridSize('sensor.xyz', identity, {}, 'settings').rows).toBe(1);
  });

  it('returns 2 rows for default generic cards on non-settings page', () => {
    expect(getCardGridSize('sensor.xyz', identity, {}, 'home').rows).toBe(2);
  });

  it('returns 1 row for small room cards', () => {
    const settings = { 'room_card_1': { size: 'small' } };
    expect(getCardGridSize('room_card_1', identity, settings, 'home').rows).toBe(1);
  });

  it('returns 2 rows for default room cards', () => {
    expect(getCardGridSize('room_card_1', identity, {}, 'home').rows).toBe(2);
  });

  it('uses explicit gridRows/gridCols overrides when provided', () => {
    const settings = { 'sensor.xyz': { gridRows: 3, gridCols: 2 } };
    expect(getCardGridSize('sensor.xyz', identity, settings, 'home')).toEqual({ rows: 3, cols: 2 });
  });

  it('returns estimated spacer span when heightPx is set', () => {
    const settings = { spacer_card_1: { heightPx: 260 } };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home')).toBe(3);
  });

  it('supports legacy spacer heightRows setting', () => {
    const settings = { spacer_card_1: { heightRows: 3 } };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home')).toBe(3);
  });

  it('uses runtime row/gap metrics for spacer heightPx span', () => {
    const settings = { spacer_card_1: { heightPx: 420 } };
    const metrics = { rowPx: 82, gapPx: 12 };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home', metrics)).toBe(5);
  });

  it('falls back to size behavior for spacer when heightRows is not set', () => {
    const settings = { spacer_card_1: { size: 'small' } };
    expect(getCardGridSpan('spacer_card_1', identity, settings, 'home')).toBe(1);
    expect(getCardGridSpan('spacer_card_2', identity, {}, 'home')).toBe(2);
  });

  it('uses getCardSettingsKey to resolve settings', () => {
    const keyFn = (id) => `page_home_${id}`;
    const settings = { 'page_home_light_abc': { size: 'small', gridCols: 2 } };
    expect(getCardGridSize('light_abc', keyFn, settings, 'home')).toEqual({ rows: 1, cols: 2 });
  });

  it('handles legacy "car" id', () => {
    expect(getCardGridSize('car', identity, {}, 'home').rows).toBe(2);
    const settings = { 'car': { size: 'small' } };
    expect(getCardGridSize('car', identity, settings, 'home').rows).toBe(1);
  });
});

describe('getCardGridSpan (compat)', () => {
  const identity = (id) => id;
  it('returns only row span for compatibility', () => {
    const settings = { 'sensor.a': { gridRows: 5, gridCols: 3 } };
    expect(getCardGridSpan('sensor.a', identity, settings, 'home')).toBe(5);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// buildGridLayout
// ═════════════════════════════════════════════════════════════════════════
describe('buildGridLayout', () => {
  const sizeOf = (rows, cols = 1) => () => ({ rows, cols });

  it('returns empty for 0 columns', () => {
    expect(buildGridLayout(['a', 'b'], 0, sizeOf(1))).toEqual({});
  });

  it('returns empty for undefined columns', () => {
    expect(buildGridLayout(['a'], undefined, sizeOf(1))).toEqual({});
  });

  it('places single-span cards in a 2-col grid', () => {
    const result = buildGridLayout(['a', 'b', 'c'], 2, sizeOf(1));
    expect(result.a).toEqual({ row: 1, col: 1, rowSpan: 1, colSpan: 1, span: 1 });
    expect(result.b).toEqual({ row: 1, col: 2, rowSpan: 1, colSpan: 1, span: 1 });
    expect(result.c).toEqual({ row: 2, col: 1, rowSpan: 1, colSpan: 1, span: 1 });
  });

  it('places cards with column spans correctly', () => {
    const sizeFn = (id) => (id === 'wide' ? { rows: 1, cols: 2 } : { rows: 1, cols: 1 });
    const result = buildGridLayout(['wide', 'a', 'b'], 2, sizeFn);
    expect(result.wide).toEqual({ row: 1, col: 1, rowSpan: 1, colSpan: 2, span: 1 });
    expect(result.a).toEqual({ row: 2, col: 1, rowSpan: 1, colSpan: 1, span: 1 });
    expect(result.b).toEqual({ row: 2, col: 2, rowSpan: 1, colSpan: 1, span: 1 });
  });

  it('handles mixed row/column spans', () => {
    const sizeFn = (id) => {
      if (id === 'big') return { rows: 2, cols: 2 };
      return { rows: 1, cols: 1 };
    };
    const result = buildGridLayout(['small1', 'big', 'small2', 'small3'], 3, sizeFn);
    expect(result.small1).toEqual({ row: 1, col: 1, rowSpan: 1, colSpan: 1, span: 1 });
    expect(result.big).toEqual({ row: 1, col: 2, rowSpan: 2, colSpan: 2, span: 2 });
    expect(result.small2).toEqual({ row: 2, col: 1, rowSpan: 1, colSpan: 1, span: 1 });
    expect(result.small3).toEqual({ row: 3, col: 1, rowSpan: 1, colSpan: 1, span: 1 });
  });

  it('clamps oversized column spans to available columns', () => {
    const sizeFn = () => ({ rows: 1, cols: 9 });
    const result = buildGridLayout(['a', 'b'], 3, sizeFn);
    expect(result.a.colSpan).toBe(3);
    expect(result.b.row).toBe(2);
  });

  it('returns empty object for empty ids', () => {
    expect(buildGridLayout([], 4, sizeOf(1))).toEqual({});
  });
});

describe('getCardColSpan', () => {
  const identity = (id) => id;

  it('returns full width sentinel for colSpan=full', () => {
    const settings = { spacer_card_1: { colSpan: 'full' } };
    expect(getCardColSpan('spacer_card_1', identity, settings)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('returns numeric colSpan when provided', () => {
    const settings = { spacer_card_1: { colSpan: 3 } };
    expect(getCardColSpan('spacer_card_1', identity, settings)).toBe(3);
  });
});
