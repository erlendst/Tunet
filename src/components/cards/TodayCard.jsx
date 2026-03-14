import { useState, useEffect, useRef, memo } from 'react';
import { getIconComponent } from '../../icons';
import { getCalendarEvents } from '../../services/haClient';

const DEFAULT_SENSOR_FIELDS = ['temperature', 'humidity', 'condition'];

function formatDate(locale = 'nb-NO') {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatEventTime(eventStart, eventEnd) {
  const toTime = (dateObj) => {
    const value = dateObj?.dateTime || dateObj?.date || dateObj;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    if (dateObj?.date && !dateObj?.dateTime) return null; // all-day
    return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };
  const start = toTime(eventStart);
  const end = toTime(eventEnd);
  if (!start) return null;
  if (!end) return start;
  return `${start} – ${end}`;
}

function isToday(eventDate) {
  const value = eventDate?.dateTime || eventDate?.date || eventDate;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function getWeatherConditionLabel(condition, t) {
  const map = {
    'clear-night': t?.('weather.condition.clearNight') || 'Clear',
    cloudy: t?.('weather.condition.cloudy') || 'Cloudy',
    fog: t?.('weather.condition.fog') || 'Fog',
    hail: t?.('weather.condition.hail') || 'Hail',
    lightning: t?.('weather.condition.lightning') || 'Lightning',
    'lightning-rainy': t?.('weather.condition.lightning') || 'Lightning',
    partlycloudy: t?.('weather.condition.partlyCloudy') || 'Partly cloudy',
    pouring: t?.('weather.condition.pouring') || 'Heavy rain',
    rainy: t?.('weather.condition.rainy') || 'Rain',
    snowy: t?.('weather.condition.snowy') || 'Snow',
    'snowy-rainy': t?.('weather.condition.snowy') || 'Snow',
    sunny: t?.('weather.condition.sunny') || 'Sunny',
    windy: t?.('weather.condition.windy') || 'Wind',
    'windy-variant': t?.('weather.condition.windy') || 'Wind',
    exceptional: t?.('weather.condition.exceptional') || 'Extreme',
  };

  return map[condition] || condition || '--';
}

function getSensorDisplay(entity, field, t) {
  if (!entity) return null;

  const isWeatherEntity = entity.entity_id?.startsWith('weather.');
  if (!isWeatherEntity) {
    return {
      value: entity.state,
      unit: entity.attributes?.unit_of_measurement || '',
    };
  }

  switch (field) {
    case 'state':
      return {
        value: entity.state,
        unit: entity.attributes?.unit_of_measurement || '',
      };
    case 'humidity':
      return {
        value: entity.attributes?.humidity ?? '--',
        unit: entity.attributes?.humidity != null ? '%' : '',
      };
    case 'condition':
      return {
        value: getWeatherConditionLabel(entity.state, t),
        unit: '',
      };
    case 'temperature':
    default:
      return {
        value: entity.attributes?.temperature ?? entity.state ?? '--',
        unit: entity.attributes?.temperature != null ? entity.attributes?.temperature_unit || '' : '',
      };
  }
}

const TodayCard = memo(function TodayCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  settings,
  conn,
  editMode,
  t,
}) {
  const [events, setEvents] = useState([]);
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const sensor1Id = settings?.sensor1Id;
  const sensor1Icon = settings?.sensor1Icon || 'thermometer';
  const sensor2Id = settings?.sensor2Id;
  const sensor2Icon = settings?.sensor2Icon || 'cloud-rain';
  const sensor3Id = settings?.sensor3Id;
  const sensor3Icon = settings?.sensor3Icon || 'wind';
  const calendarIds = Array.isArray(settings?.calendarIds) ? settings.calendarIds : [];

  const sensor1 = sensor1Id ? entities?.[sensor1Id] : null;
  const sensor2 = sensor2Id ? entities?.[sensor2Id] : null;
  const sensor3 = sensor3Id ? entities?.[sensor3Id] : null;

  const sensors = [
    {
      entity: sensor1,
      icon: sensor1Icon,
      field: settings?.sensor1Field || DEFAULT_SENSOR_FIELDS[0],
    },
    {
      entity: sensor2,
      icon: sensor2Icon,
      field: settings?.sensor2Field || DEFAULT_SENSOR_FIELDS[1],
    },
    {
      entity: sensor3,
      icon: sensor3Icon,
      field: settings?.sensor3Field || DEFAULT_SENSOR_FIELDS[2],
    },
  ].filter((s) => s.entity);

  // Intersection observer for lazy calendar fetch
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch today's calendar events
  useEffect(() => {
    if (!conn || calendarIds.length === 0 || !isVisible) {
      if (calendarIds.length === 0) setEvents([]);
      return;
    }

    const fetchEvents = async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const result = await getCalendarEvents(conn, {
          start,
          end,
          entityIds: calendarIds,
        });

        if (!result) { setEvents([]); return; }

        let allEvents = [];
        Object.values(result).forEach((cal) => {
          if (cal && Array.isArray(cal.events)) allEvents = [...allEvents, ...cal.events];
        });
        allEvents = allEvents.filter((e) => e && e.start && isToday(e.start));
        allEvents.sort((a, b) => {
          const ta = new Date(a.start?.dateTime || a.start?.date || a.start).getTime();
          const tb = new Date(b.start?.dateTime || b.start?.date || b.start).getTime();
          return ta - tb;
        });
        setEvents(allEvents);
      } catch (err) {
        console.error('TodayCard: failed to fetch calendar events', err);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [conn, calendarIds.join('|'), isVisible]);

  return (
    <div
      ref={cardRef}
      {...dragProps}
      style={cardStyle}
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm"
    >
      {controls}

      {/* Header */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-base font-bold text-[var(--text-primary)]">I dag</span>
        <span className="text-right text-xs capitalize text-[var(--text-muted)]">
          {formatDate()}
        </span>
      </div>

      {/* Sensors row */}
      {sensors.length > 0 && (
        <div className="mb-3 flex items-center gap-4">
          {sensors.map(({ entity, icon, field }, idx) => {
            const Icon = getIconComponent(icon);
            const display = getSensorDisplay(entity, field, t);
            return (
              <div key={idx} className="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
                {Icon && <Icon className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={1.5} />}
                <span className="font-medium">
                  {display?.value} {display?.unit}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Divider */}
      {(sensors.length > 0 || events.length > 0) && (
        <div className="mb-3 h-px bg-[var(--card-border)]" />
      )}

      {/* Calendar events */}
      <div className="flex flex-col gap-2 overflow-hidden">
        {events.length === 0 && !editMode && (
          <span className="text-xs text-[var(--text-muted)]">Ingen hendelser i dag</span>
        )}
        {editMode && events.length === 0 && calendarIds.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">Velg kalender i innstillinger</span>
        )}
        {events.map((evt, idx) => {
          const timeStr = formatEventTime(evt.start, evt.end);
          return (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--glass-bg)] px-3 py-2"
            >
              <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                {evt.summary || evt.title || '–'}
              </span>
              {timeStr && (
                <span className="ml-3 shrink-0 text-xs text-[var(--text-secondary)]">{timeStr}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default TodayCard;
