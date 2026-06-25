// Lightweight persistent log of websocket-connection health events.
//
// The "cards went blank" bug is intermittent and tends to surface on a wall
// display / tablet where DevTools is never open at the moment it happens. This
// records connection anomalies (dead-socket detections, reconnects, drops) into
// a small localStorage ring buffer so an incident can be diagnosed *after the
// fact*. Inspect it any time from the browser console with: tunetConnLog()
//
// Only anomalies and state transitions are recorded — healthy heartbeats write
// nothing, so the buffer stays small and every entry is meaningful.

const STORAGE_KEY = 'tunet_conn_log';
const MAX_ENTRIES = 80;

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {}
}

/** Append a timestamped connection event to the persistent ring buffer. */
export function recordConnEvent(type, detail) {
  const entry = {
    iso: new Date().toISOString(),
    type,
    ...(detail !== undefined ? { detail } : {}),
  };
  const entries = read();
  entries.push(entry);
  write(entries);
  return entry;
}

export function getConnLog() {
  return read();
}

export function clearConnLog() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ── Verbose per-card debug logging ──────────────────────────────────────────
// Off by default. Turn on from the browser console with:
//     localStorage.tunet_card_debug = '1'   (then reload)
// or by adding ?carddebug to the URL. Logs the full lifecycle of the
// visibility gate and data fetch for the weather/calendar/todo/sensor cards so
// an intermittent "blank card" can be traced to an exact step.
let _cardDebug;
function cardDebugEnabled() {
  if (_cardDebug === undefined) {
    try {
      _cardDebug =
        localStorage.getItem('tunet_card_debug') === '1' ||
        (typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).has('carddebug'));
    } catch {
      _cardDebug = false;
    }
  }
  return _cardDebug;
}

export function cardDebug(label, ...args) {
  if (!cardDebugEnabled()) return;
  const ts = new Date().toISOString().slice(11, 23);
  // eslint-disable-next-line no-console
  console.log(`%c[cards ${ts}] ${label}`, 'color:#0a84ff;font-weight:bold', ...args);
}

// Console helper: `tunetConnLog()` prints the timeline and returns the raw array.
if (typeof window !== 'undefined') {
  window.tunetConnLog = () => {
    const entries = read();
    // eslint-disable-next-line no-console
    console.table(
      entries.map((e) => ({
        time: e.iso,
        type: e.type,
        detail: e.detail !== undefined ? JSON.stringify(e.detail) : '',
      }))
    );
    return entries;
  };
}
