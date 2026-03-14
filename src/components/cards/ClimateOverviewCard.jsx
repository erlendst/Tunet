import { memo } from 'react';
import { Thermometer, Droplets } from 'lucide-react';
import { getIconComponent } from '../../icons';

const ClimateOverviewCard = memo(function ClimateOverviewCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  settings,
  editMode,
  t,
}) {
  const name = settings?.name || 'Hjemme';
  const rooms = Array.isArray(settings?.rooms) ? settings.rooms : [];

  return (
    <div
      {...dragProps}
      style={cardStyle}
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm"
    >
      {controls}

      <h2 className="mb-3 text-base font-bold text-[var(--text-primary)]">{name}</h2>

      <div className="flex flex-col">
        {rooms.length === 0 && editMode && (
          <span className="text-xs text-[var(--text-muted)]">Legg til rom i innstillinger</span>
        )}
        {rooms.map((room, idx) => {
          const Icon = room.icon ? getIconComponent(room.icon) : null;
          const tempEntity = room.tempId ? entities?.[room.tempId] : null;
          const humidityEntity = room.humidityId ? entities?.[room.humidityId] : null;
          const tempValue = tempEntity?.state;
          const humidityValue = humidityEntity?.state;

          return (
            <div key={idx}>
              {idx > 0 && <div className="h-px bg-[var(--card-border)]" />}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  {Icon ? (
                    <Icon className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.5} />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <span className="text-sm text-[var(--text-primary)]">{room.name || '–'}</span>
                </div>
                <div className="flex items-center gap-4">
                  {tempValue != null && (
                    <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                      <Thermometer className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>
                        {tempValue}
                        {tempEntity?.attributes?.unit_of_measurement || '°C'}
                      </span>
                    </div>
                  )}
                  {humidityValue != null && (
                    <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                      <Droplets className="h-3.5 w-3.5" strokeWidth={1.5} />
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
