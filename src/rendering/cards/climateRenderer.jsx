import { GenericClimateCard } from '../../components';
import { getSettings, renderMissingEntityWhenReady } from '../helpers';

export function renderGenericClimateCard(
  cardId,
  dragProps,
  getControls,
  cardStyle,
  settingsKey,
  ctx
) {
  const {
    entities,
    editMode,
    cardSettings,
    customNames,
    callService,
    setActiveClimateEntityModal,
    t,
  } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const entityId = settings.climateId;
  const entity = entityId ? entities[entityId] : null;
  const temperatureDisplayMode = settings.temperatureDisplayMode || 'target';
  const temperatureSensorEntity =
    temperatureDisplayMode === 'sensor' && settings.temperatureSensorId
      ? entities[settings.temperatureSensorId]
      : null;
  const displayTemperatureValue =
    temperatureDisplayMode === 'current'
      ? entity?.attributes?.current_temperature
      : temperatureDisplayMode === 'sensor'
        ? temperatureSensorEntity?.state
        : entity?.attributes?.temperature;
  const displayTemperatureUnit =
    temperatureDisplayMode === 'sensor'
      ? temperatureSensorEntity?.attributes?.unit_of_measurement ||
        temperatureSensorEntity?.attributes?.temperature_unit ||
        null
      : entity?.attributes?.temperature_unit || null;

  if (!entity || !entityId) {
    return renderMissingEntityWhenReady(ctx, {
      cardId,
      dragProps,
      controls: getControls(cardId),
      cardStyle,
      missingEntityId: entityId || cardId,
      t,
    });
  }

  return (
    <GenericClimateCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      entity={entity}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      onOpen={() => setActiveClimateEntityModal(entityId)}
      onSetTemperature={(temp) =>
        callService('climate', 'set_temperature', { entity_id: entityId, temperature: temp })
      }
      displayTemperatureValue={displayTemperatureValue}
      displayTemperatureUnit={displayTemperatureUnit}
      settings={settings}
    />
  );
}
