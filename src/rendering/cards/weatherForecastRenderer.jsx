import WeatherForecastCard from '../../components/cards/WeatherForecastCard';
import { getSettings } from '../helpers';

export function renderWeatherForecastCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, conn, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);

  return (
    <WeatherForecastCard
      key={cardId}
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      settings={settings}
      customName={customNames?.[cardId] || null}
      conn={conn}
      editMode={editMode}
      t={t}
    />
  );
}
