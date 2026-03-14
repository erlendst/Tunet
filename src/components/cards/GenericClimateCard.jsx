import { memo } from 'react';
import { Minus, Plus, AirVent } from 'lucide-react';
import { getIconComponent } from '../../icons';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { formatKindValueForDisplay, getEffectiveUnitMode } from '../../utils';

const normalizeFanModeToken = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const isAutoFanMode = (value) => {
  const normalized = normalizeFanModeToken(value);
  return normalized === 'auto' || normalized === 'automatic';
};

const getFanSpeedLevel = (fanMode, fanModes) => {
  if (!Array.isArray(fanModes) || fanModes.length === 0) return 0;
  if (isAutoFanMode(fanMode)) return 0;
  const speedModes = fanModes.filter((mode) => !isAutoFanMode(mode));
  if (speedModes.length === 0) return 0;
  const target = normalizeFanModeToken(fanMode);
  if (!target) return 0;
  const matchedIndex = speedModes.findIndex((mode) => normalizeFanModeToken(mode) === target);
  if (matchedIndex === -1) return 0;
  const scaledLevel = Math.round(((matchedIndex + 1) / speedModes.length) * 5);
  return Math.max(1, Math.min(5, scaledLevel));
};

const GenericClimateCard = memo(function GenericClimateCard({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  onOpen,
  onSetTemperature,
  isMobile,
  settings,
  t,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  if (!entity || !entityId) return null;

  const isSmall = settings?.size === 'small';
  const currentTemp = entity.attributes?.current_temperature ?? '--';
  const targetTemp = entity.attributes?.temperature ?? '--';
  const sourceTempUnit =
    haConfig?.unit_system?.temperature || entity.attributes?.temperature_unit || '°C';
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const displayCurrentTemp = formatKindValueForDisplay(currentTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const displayTargetTemp = formatKindValueForDisplay(targetTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });

  const name = customNames?.[cardId] || entity.attributes?.friendly_name || entityId;
  const climateIconName = customIcons?.[cardId] || entity?.attributes?.icon;
  const Icon = climateIconName ? getIconComponent(climateIconName) : AirVent;
  const stepTemp = (delta) => onSetTemperature?.((targetTemp || 21) + delta);

  if (isSmall) {
    return (
      <div
        {...dragProps}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`relative flex h-full items-center justify-between gap-3 overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 shadow-sm transition-all ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-[var(--text-secondary)]" strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[var(--text-secondary)]">{name}</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {displayCurrentTemp.text}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); stepTemp(-0.5); }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-90"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); stepTemp(0.5); }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-90"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...dragProps}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`relative flex h-full items-center justify-between overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-5 shadow-sm transition-all ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}

      {/* Left: name + temp */}
      <div className="flex items-center gap-4">
        <Icon className="h-6 w-6 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[var(--text-primary)]">{name}</span>
          <span className="text-2xl font-light leading-tight text-[var(--text-primary)]">
            {displayCurrentTemp.text}
          </span>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); stepTemp(-0.5); }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); stepTemp(0.5); }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

export default GenericClimateCard;
