import { useState, useEffect, memo } from 'react';
import { Cloud } from '../../icons';
import { getForecast } from '../../services/haClient';
import { recordConnEvent, cardDebug } from '../../utils/connectionDiagnostics';
import {
  HOUR_FORECAST_LIMIT,
  WEATHER_CONDITION_ICONS,
  addWakeListeners,
  formatWeatherValue,
  getCurrentHourItem,
  getHourlyForecastItems,
  useLazyVisible,
} from './dayCardShared';

const WeatherForecastCard = memo(function WeatherForecastCard({
  dragProps,
  controls,
  cardStyle,
  entities,
  settings,
  customName,
  conn,
  editMode,
}) {
  const [forecast, setForecast] = useState([]);
  const [cardRef, isVisible] = useLazyVisible('weather');

  const weatherEntityId = settings?.weatherEntityId || null;
  const title = customName || settings?.name || 'Værvarsel';
  const weatherEntity = weatherEntityId ? entities?.[weatherEntityId] : null;
  const isWeatherDomain =
    typeof weatherEntity?.entity_id === 'string' && weatherEntity.entity_id.startsWith('weather.');

  const hourlyWeather = weatherEntity
    ? [getCurrentHourItem(weatherEntity), ...getHourlyForecastItems(weatherEntity, forecast)]
        .filter(Boolean)
        .slice(0, HOUR_FORECAST_LIMIT)
    : [];

  cardDebug('weather', 'render', {
    weatherEntityId,
    hasEntity: !!weatherEntity,
    isWeatherDomain,
    isVisible,
    forecastLen: forecast.length,
    hourlyShown: hourlyWeather.length,
  });

  useEffect(() => {
    cardDebug('weather', 'fetch effect run', {
      hasConn: !!conn,
      connConnected: conn?.connected,
      isVisible,
      isWeatherDomain,
      entityId: weatherEntity?.entity_id,
    });
    if (!conn || !isVisible || !isWeatherDomain) {
      cardDebug('weather', 'fetch effect BAILED', { hasConn: !!conn, isVisible, isWeatherDomain });
      if (!isWeatherDomain) setForecast([]);
      return;
    }

    let cancelled = false;
    let retryTimer;
    const entityId = weatherEntity.entity_id;
    const MAX_RETRIES = 4;
    const RETRY_DELAY_MS = 8000;

    // A non-empty result always wins; an empty/failed fetch never clobbers a
    // populated forecast and is retried quickly instead of waiting 30 minutes.
    const fetchForecast = async (attempt = 0) => {
      if (cancelled) return;
      clearTimeout(retryTimer);
      try {
        cardDebug('weather', 'fetching forecast', { entityId, attempt, connConnected: conn?.connected });
        let data = await getForecast(conn, { entityId, type: 'hourly' });
        let usedType = 'hourly';
        if (!Array.isArray(data) || data.length === 0) {
          data = await getForecast(conn, { entityId, type: 'daily' });
          usedType = 'daily';
        }
        if (cancelled) return;
        cardDebug('weather', 'forecast result', {
          usedType,
          isArray: Array.isArray(data),
          count: Array.isArray(data) ? data.length : null,
        });
        if (Array.isArray(data) && data.length > 0) {
          setForecast(data);
          cardDebug('weather', 'forecast APPLIED', data.length);
        } else if (attempt < MAX_RETRIES) {
          recordConnEvent('weather-empty-retry', { entityId, attempt });
          retryTimer = setTimeout(() => fetchForecast(attempt + 1), RETRY_DELAY_MS);
        }
      } catch (err) {
        if (cancelled) return;
        recordConnEvent('weather-fetch-error', { entityId, attempt, message: String(err?.message || err) });
        if (attempt < MAX_RETRIES) {
          retryTimer = setTimeout(() => fetchForecast(attempt + 1), RETRY_DELAY_MS);
        }
      }
    };

    void fetchForecast();
    const interval = setInterval(() => fetchForecast(), 30 * 60 * 1000);
    const removeWake = addWakeListeners(() => fetchForecast(), conn);
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(interval);
      removeWake();
    };
  }, [conn, isVisible, isWeatherDomain, weatherEntity?.entity_id]);

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
      </div>

      {hourlyWeather.length > 0 ? (
        <div className="today-card__weather" aria-label="Værvarsel neste timer">
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
      ) : (
        editMode && <span className="today-card__empty">Velg værsensor i innstillinger</span>
      )}
    </div>
  );
});

export default WeatherForecastCard;
