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

// Infer transport icon from entity ID/name. Placeholder — user can customize icon.
const getTransportIcon = (entity, customIconName) => {
  if (customIconName) return getIconComponent(customIconName) || Bus;
  // Placeholder: always returns Bus. In future, detect tram/metro from entity ID.
  return Bus;
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
      entity: source,
    }))
    .filter((section) => section.rows.length > 0 || section.title);

  if (sources.length === 0) return null;

  return (
    <div
      key={cardId}
      {...dragProps}
      onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
      className={`dashboard-action-card relative flex h-full flex-col gap-4 overflow-hidden p-5 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}

      {sources.map((section, sectionIndex) => {
        const sectionCustomIcon = sectionIndex === 0
          ? settings?.travelIconPrimary
          : settings?.travelIconSecondary;
        const TransportIcon = getTransportIcon(section.entity, sectionCustomIcon || customIcons?.[cardId]);
        return (
          <div key={`${section.title || 'section'}-${sectionIndex}`}>
            {/* Platform header */}
            <div className="flex items-center justify-between gap-2 py-2.5">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {section.title || '–'}
              </span>
              <TransportIcon className="h-4 w-4 shrink-0 text-[var(--accent-color)]" />
            </div>

            {/* Departure rows */}
            <div className="flex flex-col">
              {section.rows.map((row, index) => (
                <div key={`${row.route}-${row.displayTime}-${index}`}>
                  {index > 0 && <div className="h-px bg-[var(--card-border)]" />}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-sm text-[var(--text-primary)]">
                      {row.route || translate('travel.departureFallback')}
                    </span>
                    <span className="shrink-0 text-sm text-[var(--text-secondary)]">
                      {row.displayTime || '--'}
                    </span>
                  </div>
                </div>
              ))}
              {section.rows.length === 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {translate('travel.noDepartures')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
