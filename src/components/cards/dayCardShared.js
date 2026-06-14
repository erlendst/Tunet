import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Cloud, CloudRain, CloudSun, Moon, Snowflake, Sun, Wind } from '../../icons';
import { getCalendarEvents } from '../../services/haClient';

/* ─── Shared constants ─── */

export const HOUR_FORECAST_LIMIT = 5;

export const WEATHER_CONDITION_ICONS = {
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

/* ─── Date / event helpers ─── */

export function formatDate(locale = 'nb-NO') {
  const date = new Date();
  const weekdayRaw = date.toLocaleDateString(locale, { weekday: 'long' });
  const weekday = weekdayRaw ? weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1) : '';
  const month = date.toLocaleDateString(locale, { month: 'long' }).toLowerCase();
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${weekday} ${date.getDate()}. ${month} kl. ${time}`;
}

export function formatEventTime(eventStart, eventEnd) {
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

export function getEventDateKey(eventDate) {
  const value = eventDate?.dateTime || eventDate?.date || eventDate;
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function getEventDate(eventDate) {
  const value = eventDate?.dateTime || eventDate?.date || eventDate;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function groupEventsByDay(events) {
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

/** Label for the i-th day from today: "I dag" for today, capitalized weekday otherwise. */
export function getDayHeading(i, locale = 'nb-NO') {
  const day = new Date();
  day.setDate(day.getDate() + i);
  if (i === 0) return 'I dag';
  return day.toLocaleDateString(locale, { weekday: 'long' }).replace(/^\w/, (c) => c.toUpperCase());
}

/** Key for the i-th day from today, matching getEventDateKey. */
export function getDayKey(i) {
  const day = new Date();
  day.setDate(day.getDate() + i);
  day.setHours(0, 0, 0, 0);
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

/* ─── Weather helpers ─── */

export function formatWeatherValue(value, maxFractionDigits = 1) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '--';
  return new Intl.NumberFormat('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(Number(value));
}

export function getForecastDate(entry) {
  const raw = entry?.datetime || entry?.time || entry?.date || entry?.forecast_time;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatForecastHour(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: undefined,
  });
}

export function getCurrentHourItem(weatherEntity) {
  if (!weatherEntity) return null;
  return {
    hour: formatForecastHour(new Date()),
    condition: weatherEntity.state,
    temperature: weatherEntity.attributes?.temperature,
    precipitation: weatherEntity.attributes?.precipitation ?? 0,
  };
}

export function getHourlyForecastItems(weatherEntity, forecast = []) {
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

/* ─── Shared hooks ─── */

/** Lazily flips to true once the referenced element scrolls near the viewport. */
export function useLazyVisible() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

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
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

/**
 * Fetches and keeps a sorted list of calendar events for the next `daysAhead`
 * days from the given calendar entity ids. Refreshes every 15 minutes.
 */
export function useCalendarEvents(conn, entityIds, isVisible, daysAhead = 6, label = 'calendar') {
  const [events, setEvents] = useState([]);
  const ids = Array.isArray(entityIds) ? entityIds.filter(Boolean) : [];
  const idsKey = ids.join('|');

  useEffect(() => {
    if (!conn || ids.length === 0 || !isVisible) {
      if (ids.length === 0) setEvents([]);
      return;
    }

    const fetchEvents = async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() + daysAhead);
        end.setHours(23, 59, 59, 999);

        const result = await getCalendarEvents(conn, { start, end, entityIds: ids });
        if (!result) { setEvents([]); return; }

        let all = [];
        Object.values(result).forEach((cal) => {
          if (cal && Array.isArray(cal.events)) all = [...all, ...cal.events];
        });
        all = all.filter((e) => e && e.start);
        all.sort((a, b) => {
          const ta = new Date(a.start?.dateTime || a.start?.date || a.start).getTime();
          const tb = new Date(b.start?.dateTime || b.start?.date || b.start).getTime();
          return ta - tb;
        });
        setEvents(all);
      } catch (err) {
        console.error(`${label}: failed to fetch calendar events`, err);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn, idsKey, isVisible, daysAhead]);

  return events;
}
