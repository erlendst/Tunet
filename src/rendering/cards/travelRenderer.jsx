import { TravelCard } from '../../components';
import { MissingEntityCard } from '../../components';
import { getSettings } from '../helpers';

export function renderTravelCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, setShowSensorInfoModal, t } =
    ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);
  const configuredIds = Array.isArray(settings.travelIds)
    ? settings.travelIds
    : [settings.travelId, settings.travelIdSecondary, settings.travelIdTertiary, settings.travelIdQuaternary].filter(Boolean);
  const sensorIds = Array.from(new Set(configuredIds.filter(Boolean))).slice(0, 4);
  const sensorEntities = sensorIds.map((id) => entities[id]).filter(Boolean);
  const primaryEntityId = sensorIds[0] || null;

  if (sensorEntities.length === 0 || !primaryEntityId) {
    if (editMode) {
      return (
        <MissingEntityCard
          cardId={cardId}
          dragProps={dragProps}
          controls={getControls(cardId)}
          cardStyle={cardStyle}
          t={t}
        />
      );
    }
    return null;
  }

  return (
    <TravelCard
      key={cardId}
      cardId={cardId}
      sensorEntities={sensorEntities}
      settings={settings}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => setShowSensorInfoModal(primaryEntityId)}
      t={t}
    />
  );
}
