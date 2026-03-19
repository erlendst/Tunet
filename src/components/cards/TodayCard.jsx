import { useState, useEffect, useRef, memo } from 'react';
import { AlertCircle, Cloud, CloudRain, CloudSun, Moon, Snowflake, Sun, Wind } from '../../icons';
import { getCalendarEvents, getForecast } from '../../services/haClient';

const HOUR_FORECAST_LIMIT = 5;

const WEATHER_CONDITION_ICONS = {
  'clear-night': Moon,
  cloudy: Cloud,
  fog: Cloud,
  hail: CloudRain,
  lightning: CloudRain,
  'lightning-rainy': CloudRain,
  partlycloudy: CloudSun,
  pouring: CloudRain,
  rainy: CloudRain,
  snowy: Snowflake,
  'snowy-rainy': CloudRain,
  sunny: Sun,
  windy: Wind,
  'windy-variant': Wind,
  exceptional: AlertCircle,
};

function formatDate(locale = 'nb-NO') {
  const date = new Date();
  const weekdayRaw = date.toLocaleDateString(locale, { weekday: 'long' });
  const weekday = weekdayRaw ? weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1) : '';
  const month = date.toLocaleDateString(locale, { month: 'long' }).toLowerCase();
  return `${weekday} ${date.getDate()}. ${month} ${date.getFullYear()}`;
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

function getEventDateKey(eventDate) {
  const value = eventDate?.dateTime || eventDate?.date || eventDate;
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getEventDate(eventDate) {
  const value = eventDate?.dateTime || eventDate?.date || eventDate;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function groupEventsByDay(events) {
  const groups = [];
  const keyToIndex = new Map();
  for (const evt of events) {
    const key = getEventDateKey(evt.start);
    if (!keyToIndex.has(key)) {
      keyToIndex.set(key, groups.length);
      groups.push({ key, date: getEventDate(evt.start), events: [] });
    }
    groups[keyToIndex.get(key)].events.push(evt);
  }
  return groups;
}

function formatWeatherValue(value, maxFractionDigits = 1) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '--';
  return new Intl.NumberFormat('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(Number(value));
}

function getForecastDate(entry) {
  const raw = entry?.datetime || entry?.time || entry?.date || entry?.forecast_time;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatForecastHour(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: undefined,
  });
}

function getCurrentHourItem(weatherEntity) {
  if (!weatherEntity) return null;
  return {
    hour: formatForecastHour(new Date()),
    condition: weatherEntity.state,
    temperature: weatherEntity.attributes?.temperature,
    precipitation: weatherEntity.attributes?.precipitation ?? 0,
  };
}

function getHourlyForecastItems(weatherEntity, forecast = []) {
  const source = Array.isArray(forecast) && forecast.length > 0
    ? forecast
    : Array.isArray(weatherEntity?.attributes?.forecast)
      ? weatherEntity.attributes.forecast
      : [];

  const now = new Date();

  return source
    .map((entry) => {
      const forecastDate = getForecastDate(entry);
      return { entry, forecastDate };
    })
    .filter(({ entry, forecastDate }) => {
      if (!entry) return false;
      if (!forecastDate) return true;
      return forecastDate.getTime() > now.getTime();
    })
    .slice(0, HOUR_FORECAST_LIMIT - 1)
    .map(({ entry, forecastDate }) => ({
      hour: formatForecastHour(forecastDate),
      condition: entry?.condition || entry?.state || weatherEntity?.state,
      temperature: entry?.temperature,
      precipitation: entry?.precipitation ?? entry?.precipitation_amount ?? 0,
    }));
}

const TodayCard = memo(function TodayCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  settings,
  customName,
  conn,
  editMode,
}) {
  const [events, setEvents] = useState([]);
  const [forecastsById, setForecastsById] = useState({});
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const weatherEntityId = settings?.weatherEntityId || null;
  const calendarIds = Array.isArray(settings?.calendarIds) ? settings.calendarIds : [];
  const title = customName || settings?.name || 'Overskrift';

  const weatherEntity = weatherEntityId ? entities?.[weatherEntityId] : null;

  const weatherSensorIds = Array.from(
    new Set(
      [weatherEntity?.entity_id]
        .filter((entityId) => typeof entityId === 'string' && entityId.startsWith('weather.'))
    )
  );
  const hourlyWeather = weatherEntity
    ? [
      getCurrentHourItem(weatherEntity),
      ...getHourlyForecastItems(weatherEntity, forecastsById[weatherEntity.entity_id]),
    ].filter(Boolean).slice(0, HOUR_FORECAST_LIMIT)
    : [];

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
        end.setDate(end.getDate() + 4);
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
        allEvents = allEvents.filter((e) => e && e.start);
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

  useEffect(() => {
    if (!conn || !isVisible || weatherSensorIds.length === 0) {
      if (weatherSensorIds.length === 0) setForecastsById({});
      return;
    }

    let cancelled = false;

    const fetchForecasts = async () => {
      const nextForecasts = {};

      await Promise.all(
        weatherSensorIds.map(async (entityId) => {
          try {
            let data = await getForecast(conn, { entityId, type: 'hourly' });
            if (!Array.isArray(data) || data.length === 0) {
              data = await getForecast(conn, { entityId, type: 'daily' });
            }
            if (!cancelled && Array.isArray(data) && data.length > 0) {
              nextForecasts[entityId] = data;
            }
          } catch {
            // Ignore forecast fetch failures and rely on entity attributes as fallback.
          }
        })
      );

      if (!cancelled) setForecastsById(nextForecasts);
    };

    void fetchForecasts();
    const interval = setInterval(fetchForecasts, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conn, isVisible, weatherSensorIds.join('|')]);

  return (
    <div
      ref={cardRef}
      {...dragProps}
      style={cardStyle}
      className={`today-card relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm ${editMode ? 'cursor-move' : ''}`}
    >
      {controls}

      <div className="today-card__header">
        <span className="today-card__title">{title}</span>
        <span className="today-card__date">
          {formatDate()}
        </span>
      </div>

      {hourlyWeather.length > 0 && (
        <div className="today-card__weather" aria-label="Vær neste 6 timer">
          {hourlyWeather.map((item, idx) => {
            const Icon = WEATHER_CONDITION_ICONS[item.condition] || Cloud;
            return (
              <div key={`${item.condition || 'weather'}-${idx}`} className="today-card__weather-hour">
                <Icon className="today-card__weather-icon" />
                <span className="today-card__weather-time">{item.hour}</span>
                <span className="today-card__weather-temp">
                  {formatWeatherValue(item.temperature)} {weatherEntity?.attributes?.temperature_unit || '°C'}
                </span>
                <span className="today-card__weather-precipitation">
                  {formatWeatherValue(item.precipitation)} {weatherEntity?.attributes?.precipitation_unit || 'mm'}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="today-card__events">
        {editMode && events.length === 0 && calendarIds.length === 0 && (
          <span className="today-card__empty">Velg kalender i innstillinger</span>
        )}
        {(() => {
          const eventGroups = groupEventsByDay(events);
          return Array.from({ length: 4 }, (_, i) => {
          const day = new Date();
          day.setDate(day.getDate() + i);
          day.setHours(0, 0, 0, 0);
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const group = eventGroups.find((g) => g.key === key);
          const dayHeading = i === 0
            ? 'I dag'
            : day.toLocaleDateString('nb-NO', { weekday: 'long' }).replace(/^\w/, (c) => c.toUpperCase());
          return (
            <div key={key} className="today-card__day-group">
              <span className="today-card__day-heading">{dayHeading}</span>
              {group && group.events.length > 0 ? (
                group.events.map((evt, idx) => {
                  const timeStr = formatEventTime(evt.start, evt.end);
                  return (
                    <div key={idx} className="today-card__event">
                      <span className="today-card__event-title">
                        {evt.summary || evt.title || '–'}
                      </span>
                      {timeStr && (
                        <span className="today-card__event-time">{timeStr}</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="today-card__no-events">Ingenting i kalenderen denne dagen</span>
              )}
            </div>
          );
        });
        })()}
      </div>
    </div>
  );
});

export default TodayCard;
