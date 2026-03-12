import { Bus } from '../../icons';
import { getIconComponent } from '../../icons';

const normalizeKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const buildAttrIndex = (attributes = {}) => {
  const index = new Map();
  Object.entries(attributes).forEach(([key, value]) => {
    index.set(normalizeKey(key), value);
  });
  return index;
};

const pickAttr = (index, keys, fallback = null) => {
  for (const key of keys) {
    const value = index.get(normalizeKey(key));
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
};

const parseRoute = (routeValue) => {
  const raw = String(routeValue || '').trim();
  if (!raw) return { line: null, destination: null };
  const lineMatch = raw.match(/^([A-Za-z]?\d+[A-Za-z]?)/);
  if (!lineMatch) return { line: null, destination: raw };
  const line = lineMatch[1];
  const destination = raw.slice(line.length).trim() || null;
  return { line, destination };
};

const parseDepartureText = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;

  const timeMatch = text.match(/(\d{1,2}:\d{2})/);
  const time = timeMatch?.[1] || null;
  const afterTime = time ? text.slice(text.indexOf(time) + time.length).trim() : text;
  const cleanAfterTime = afterTime.replace(/^(?:ca\.?|kl\.?)\s*/i, '').trim();
  const { line, destination } = parseRoute(cleanAfterTime);

  return {
    route: line ? `${line}${destination ? ` ${destination}` : ''}` : (cleanAfterTime || null),
    displayTime: time,
  };
};

const dedupeRows = (items) => {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    if (!item) return;
    const key = `${item.route || ''}|${item.displayTime || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
};

const formatClock = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{1,2}:\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toPositiveInt = (value) => {
  const numeric = parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = String(value || '').trim().toLowerCase();
  return ['true', 'on', 'yes', '1'].includes(text);
};

const formatDueIn = (value, t) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = parseFloat(value);
  if (Number.isFinite(numeric)) {
    const rounded = Math.max(0, Math.round(numeric));
    const pattern = t('travel.inMinutes') || '{minutes} min';
    return pattern.replace('{minutes}', String(rounded));
  }
  return String(value).trim();
};

const buildDepartureRows = (entity, t) => {
  const attributes = entity?.attributes || {};
  const index = buildAttrIndex(attributes);
  const rows = [];

  const primaryRoute = pickAttr(index, ['route', 'next_route', 'next route']);
  const primaryDueAt = pickAttr(index, ['due_at', 'due at']);
  const primaryRealtime = parseBool(pickAttr(index, ['real_time', 'real time']));
  const primaryDueIn = primaryRealtime
    ? formatDueIn(pickAttr(index, ['due_in', 'due in', 'minutes']), t) || formatDueIn(entity?.state, t)
    : null;

  if (primaryRoute || primaryDueAt || primaryDueIn) {
    const parsed = parseRoute(primaryRoute);
    rows.push({
      route: parsed.line
        ? `${parsed.line}${parsed.destination ? ` ${parsed.destination}` : ''}`
        : (primaryRoute || t('travel.departureFallback')),
      displayTime: primaryRealtime ? (primaryDueIn || formatClock(primaryDueAt)) : formatClock(primaryDueAt),
    });
  }

  const nextRoute = pickAttr(index, ['next_route', 'next route']);
  const nextDueAt = pickAttr(index, ['next_due_at', 'next due at']);
  const nextRealtime = parseBool(pickAttr(index, ['next_real_time', 'next real time']));
  const nextDueIn = nextRealtime ? formatDueIn(pickAttr(index, ['next_due_in', 'next due in']), t) : null;

  if (nextRoute || nextDueAt || nextDueIn) {
    const parsed = parseRoute(nextRoute);
    rows.push({
      route: parsed.line
        ? `${parsed.line}${parsed.destination ? ` ${parsed.destination}` : ''}`
        : (nextRoute || t('travel.departureFallback')),
      displayTime: nextRealtime ? (nextDueIn || formatClock(nextDueAt)) : formatClock(nextDueAt),
    });
  }

  Object.entries(attributes)
    .filter(([key]) => /departure[\s_#-]*\d+/i.test(key))
    .sort((a, b) => {
      const ai = parseInt(String(a[0]).replace(/[^\d]/g, ''), 10) || 0;
      const bi = parseInt(String(b[0]).replace(/[^\d]/g, ''), 10) || 0;
      return ai - bi;
    })
    .forEach(([, value]) => {
      const parsed = parseDepartureText(value);
      if (!parsed) return;
      rows.push({
        route: parsed.route || t('travel.departureFallback'),
        displayTime: formatClock(parsed.displayTime),
      });
    });

  return dedupeRows(rows).filter((row) => row?.route || row?.displayTime);
};

const getStopTitle = (entity) => {
  if (!entity) return null;
  return entity.attributes?.friendly_name
    || entity.attributes?.stop_name
    || entity.entity_id;
};

const getCustomStopTitle = (settings, index) => {
  if (!settings) return null;
  if (index === 0) return settings.travelTitlePrimary || null;
  if (index === 1) return settings.travelTitleSecondary || null;
  return null;
};

export default function TravelCard({
  cardId,
  entity,
  sensorEntities,
  settings,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  onOpen,
  t,
}) {
  const translate = t || ((key) => key);
  const rowsToShow = Math.max(1, Math.min(5, toPositiveInt(settings?.listCount) || 3));

  const sources = (Array.isArray(sensorEntities) ? sensorEntities : [entity])
    .filter(Boolean)
    .slice(0, 2)
    .map((source, index) => ({
      title: getCustomStopTitle(settings, index) || getStopTitle(source),
      rows: buildDepartureRows(source, translate).slice(0, rowsToShow),
    }))
    .filter((section) => section.rows.length > 0 || section.title);

  if (sources.length === 0) return null;

  const name = customNames?.[cardId] || translate('addCard.type.travel') || 'Travel';
  const Icon = customIcons?.[cardId] ? (getIconComponent(customIcons[cardId]) || Bus) : Bus;

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
      className={`touch-feedback rounded-3xl border transition-all duration-500 relative overflow-hidden font-sans h-full p-5 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center gap-3 min-w-0 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 stroke-[1.7px]" />
          </div>
          <p className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] opacity-75 truncate">
            {name}
          </p>
        </div>

        <div className="space-y-4">
          {sources.map((section, sectionIndex) => (
            <div key={`${section.title || 'section'}-${sectionIndex}`}>
              {section.title && (
                <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2 truncate">
                  {section.title}
                </p>
              )}

              {section.rows.length > 0 ? (
                <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] divide-y divide-[var(--glass-border)] overflow-hidden">
                  {section.rows.map((row, index) => (
                    <div key={`${row.route}-${row.displayTime}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {row.route || translate('travel.departureFallback')}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                        {row.displayTime || '--'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-[var(--text-secondary)]">
                  {translate('travel.noDepartures')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
