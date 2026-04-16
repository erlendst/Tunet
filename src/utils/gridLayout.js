/**
 * Grid layout algorithm – computes card positions & spans for the dashboard grid.
 * Pure functions with zero React / UI dependencies.
 */

// Size-to-rowspan mappings per card type category
const SPAN_TABLE = {
  // { small, medium, large } → row count
  triSize:  { small: 1, medium: 2, default: 4 },   // calendar, todo
  dualSize: { small: 1, default: 2 },               // light, car, room, travel
};

const CARD_SPAN_RULES = [
  // prefix match → category  (checked in order)
  { prefix: 'calendar_card_', category: 'triSize' },
  { prefix: 'todo_card_',     category: 'triSize' },
  { prefix: 'light_',         category: 'dualSize' },
  { prefix: 'light.',         category: 'dualSize' },
  { prefix: 'car_card_',      category: 'dualSize' },
  { prefix: 'room_card_',     category: 'dualSize' },
  { prefix: 'travel_card_',   category: 'dualSize' },
  { prefix: 'camera_card_',   category: 'dualSize' },
  { prefix: 'spacer_card_',   category: 'dualSize' },
  { prefix: 'scooter_card_', category: 'dualSize' },
];

const getLegacyRowSpan = (cardId, getCardSettingsKey, cardSettings, activePage) => {
  const settings = cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};

  // Automations have their own logic based on type sub-setting
  if (cardId.startsWith('automation.')) {
    if (['sensor', 'entity', 'toggle'].includes(settings.type)) {
      return settings.size === 'small' ? 1 : 2;
    }
    return 1;
  }

  // Exact-match for legacy 'car' id
  if (cardId === 'car') {
    const sizeSetting = settings?.size;
    return sizeSetting === 'small' ? 1 : 2;
  }

  // Table-driven lookup for prefix-matched card types
  for (const rule of CARD_SPAN_RULES) {
    if (cardId.startsWith(rule.prefix)) {
      const sizeSetting = settings?.size;
      const mapping = SPAN_TABLE[rule.category];
      return mapping[sizeSetting] ?? mapping.default;
    }
  }

  // Default behaviour for all other cards
  const sizeSetting = settings?.size;
  if (sizeSetting === 'small') return 1;
  if (cardId.startsWith('weather_temp_')) return 2;
  if (activePage === 'settings' && cardId !== 'car' && !cardId.startsWith('media_player')) return 1;

  return 2;
};

const toPositiveInt = (value) => {
  const num = parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : null;
};

/**
 * Determine card size in grid cells.
 *
 * @returns {{ rows: number, cols: number }}
 */
export const getCardGridSize = (cardId, getCardSettingsKey, cardSettings, activePage) => {
  const settings = cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
  const defaultRows = getLegacyRowSpan(cardId, getCardSettingsKey, cardSettings, activePage);
  return {
    rows: toPositiveInt(settings.gridRows) || defaultRows,
    cols: toPositiveInt(settings.gridCols) || 1,
    row: toPositiveInt(settings.gridRow),
    col: toPositiveInt(settings.gridCol),
  };
};

// Backwards-compatible helper used by legacy tests/callers.
export const getCardGridSpan = (cardId, getCardSettingsKey, cardSettings, activePage) =>
  getCardGridSize(cardId, getCardSettingsKey, cardSettings, activePage).rows;

/**
 * Determine how many grid columns a card should occupy horizontally.
 *
 * @param {string}   cardId
 * @param {Function} getCardSettingsKey  (cardId) => settingsKey
 * @param {Object}   cardSettings        Full card-settings map
 * @returns {number} 1–4
 */
export const getCardColSpan = (cardId, getCardSettingsKey, cardSettings) => {
  const settings = cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
  if (settings.colSpan === 'full') return Number.MAX_SAFE_INTEGER;
  return settings.colSpan || 1;
};

/**
 * Build a position map for a list of card ids.
 *
 * @param {string[]}  ids       Ordered card ids
 * @param {number}    columns   Number of grid columns
 * @param {Function}  sizeFn    (cardId) => number | { rows:number, cols:number, preferredCol?:number }
 * @returns {Object}  { [cardId]: { row, col, rowSpan, colSpan, span } }
 */
export const buildGridLayout = (ids, columns, sizeFn) => {
  if (!columns || columns < 1) return {};
  const occupancy = [];
  const positions = {};

  const ensureRow = (row) => {
    if (!occupancy[row]) occupancy[row] = Array(columns).fill(false);
  };

  const canPlace = (row, col, rowSpan, colSpan) => {
    if (col + colSpan > columns) return false;
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        if (occupancy[r][c]) return false;
      }
    }
    return true;
  };

  const place = (row, col, rowSpan, colSpan) => {
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        occupancy[r][c] = true;
      }
    }
  };

  const placeSingle = (id, rowSpan, colSpan, preferredCol = null, fixedRow = null, fixedCol = null) => {
    let placed = false;
    let row = Math.max(0, (fixedRow || 1) - 1);
    const fixedColIndex =
      Number.isFinite(fixedCol) && fixedCol > 0
        ? Math.max(0, Math.min(columns - colSpan, fixedCol - 1))
        : null;
    while (!placed) {
      ensureRow(row);
      const candidateCols = [];
      if (fixedColIndex !== null) candidateCols.push(fixedColIndex);
      const preferredIndex =
        Number.isFinite(preferredCol) && preferredCol > 0
          ? Math.min(columns, preferredCol) - 1
          : null;
      if (fixedColIndex === null && preferredIndex !== null) candidateCols.push(preferredIndex);
      for (let col = 0; col < columns; col += 1) {
        if (col !== preferredIndex && col !== fixedColIndex) candidateCols.push(col);
      }
      for (const col of candidateCols) {
        if (canPlace(row, col, rowSpan, colSpan)) {
          place(row, col, rowSpan, colSpan);
          positions[id] = { row: row + 1, col: col + 1, rowSpan, colSpan, span: rowSpan };
          placed = true;
          break;
        }
      }
      if (!placed) row += 1;
    }
  };

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const rawSize = sizeFn(id);
    const rowSpan = Math.max(1, typeof rawSize === 'number' ? rawSize : (rawSize?.rows || 1));
    const colSpan = Math.max(
      1,
      Math.min(columns, typeof rawSize === 'number' ? 1 : (rawSize?.cols || 1))
    );
    const preferredCol = typeof rawSize === 'number' ? null : rawSize?.preferredCol;
    const fixedRow = typeof rawSize === 'number' ? null : rawSize?.row;
    const fixedCol = typeof rawSize === 'number' ? null : rawSize?.col;
    placeSingle(id, rowSpan, colSpan, preferredCol, fixedRow, fixedCol);
  }

  return positions;
};
