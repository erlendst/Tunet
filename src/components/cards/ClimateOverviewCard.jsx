import { memo } from 'react';
import { Thermometer, Droplets } from 'lucide-react';
import { getIconComponent } from '../../icons';

function getNumericAttributeValue(entity, keys) {
  for (const key of keys) {
    const value = entity?.attributes?.[key];
    if (value == null || value === '') continue;
    return value;
  }
  return null;
}

function getClimateOverviewTemperature(entity) {
  if (!entity) return { value: null, unit: '°C' };
  const domain = entity.entity_id?.split('.')?.[0];
  if (domain === 'climate') {
    return {
      value: getNumericAttributeValue(entity, ['environment_temperature', 'current_temperature']),
      unit:
        entity.attributes?.temperature_unit || entity.attributes?.unit_of_measurement || '°C',
    };
  }
  return {
    value: entity.state,
    unit: entity.attributes?.unit_of_measurement || '°C',
  };
}

function getClimateOverviewHumidity(entity) {
  if (!entity) return null;
  const domain = entity.entity_id?.split('.')?.[0];
  if (domain === 'climate') {
    return getNumericAttributeValue(entity, ['current_humidity', 'humidity']);
  }
  return entity.state;
}

const ClimateOverviewCard = memo(function ClimateOverviewCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  settings,
  customName,
  editMode,
  t,
}) {
  const name = customName || settings?.name || 'Overskrift';
  const rooms = Array.isArray(settings?.rooms) ? settings.rooms : [];

  return (
    <div
      {...dragProps}
      style={cardStyle}
      className="dashboard-card-padding relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
    >
      {controls}

      <h2 className="dashboard-card-title mb-3">{name}</h2>

      <div className="flex min-h-0 flex-1 flex-col">
        {rooms.length === 0 && editMode && (
          <span className="text-xs text-[var(--text-muted)]">Legg til rom i innstillinger</span>
        )}
        {rooms.map((room, idx) => {
          const Icon = room.icon ? getIconComponent(room.icon) : null;
          const TempIcon = getIconComponent(room.tempIcon || 'thermometer') || Thermometer;
          const HumidityIcon = getIconComponent(room.humidityIcon || 'droplets') || Droplets;
          const tempEntity = room.tempId ? entities?.[room.tempId] : null;
          const humidityEntity = room.humidityId ? entities?.[room.humidityId] : null;
          const { value: tempValue, unit: tempUnit } = getClimateOverviewTemperature(tempEntity);
          const humidityValue = getClimateOverviewHumidity(humidityEntity);

          return (
            <div key={idx} className="flex flex-1 flex-col justify-center">
              {idx > 0 && <div className="h-px bg-[var(--card-border)]" />}
              <div className="flex flex-1 items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-base text-[var(--text-primary)]">{room.name || '–'}</span>
                </div>
                <div className="flex items-center gap-5">
                  {tempValue != null && (
                    <div className="flex items-center gap-1.5 text-base text-[var(--text-secondary)]">
                      <TempIcon className="h-5 w-5" />
                      <span>
                        {tempValue}
                        {tempUnit}
                      </span>
                    </div>
                  )}
                  {humidityValue != null && (
                    <div className="flex items-center gap-1.5 text-base text-[var(--text-secondary)]">
                      <HumidityIcon className="h-5 w-5" />
                      <span>{humidityValue}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ClimateOverviewCard;
