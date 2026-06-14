import { useState, useEffect, memo } from 'react';
import { Cloud } from '../../icons';
import { getForecast } from '../../services/haClient';
import {
  HOUR_FORECAST_LIMIT,
  WEATHER_CONDITION_ICONS,
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
  const [cardRef, isVisible] = useLazyVisible();

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

  useEffect(() => {
    if (!conn || !isVisible || !isWeatherDomain) {
      if (!isWeatherDomain) setForecast([]);
      return;
    }

    let cancelled = false;
    const entityId = weatherEntity.entity_id;

    const fetchForecast = async () => {
      try {
        let data = await getForecast(conn, { entityId, type: 'hourly' });
        if (!Array.isArray(data) || data.length === 0) {
          data = await getForecast(conn, { entityId, type: 'daily' });
        }
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setForecast(data);
        }
      } catch {
        // Ignore forecast fetch failures and rely on entity attributes as fallback.
      }
    };

    void fetchForecast();
    const interval = setInterval(fetchForecast, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
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
