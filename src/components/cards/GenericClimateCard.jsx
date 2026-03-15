import { memo } from 'react';
import { Minus, Plus, Thermometer } from '../../icons';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { formatKindValueForDisplay, getEffectiveUnitMode } from '../../utils';

const GenericClimateCard = memo(function GenericClimateCard({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  onOpen,
  onSetTemperature,
  displayTemperatureValue,
  displayTemperatureUnit,
  settings,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  if (!entity || !entityId) return null;

  const isSmall = settings?.size === 'small';
  const targetTemp = entity.attributes?.temperature ?? '--';
  const sourceTempUnit =
    haConfig?.unit_system?.temperature || entity.attributes?.temperature_unit || '°C';
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const primaryTempRaw = displayTemperatureValue ?? targetTemp;
  const displayPrimaryTemp = formatKindValueForDisplay(primaryTempRaw, {
    kind: 'temperature',
    fromUnit: displayTemperatureUnit || sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const name = customNames?.[cardId] || entity.attributes?.friendly_name || entityId;
  const numericTargetTemp = Number(targetTemp);
  const resolvedTargetTemp = Number.isFinite(numericTargetTemp) ? numericTargetTemp : 21;
  const stepTemp = (delta) => onSetTemperature?.(resolvedTargetTemp + delta);
  const buttonBaseClass =
    'flex items-center justify-center rounded-[24px] bg-[#e8ece6] text-[#2A5A3B] transition-all hover:bg-[#dfe6de] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';

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
        <div className="min-w-0 flex-1">
          <div className="flex flex-col">
            <span className="truncate text-xs font-medium text-[var(--text-primary)]">{name}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
              <Thermometer className="h-3.5 w-3.5 text-[#2A5A3B]" strokeWidth={1.75} />
              {displayPrimaryTemp.text}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); stepTemp(-0.5); }}
            className={`${buttonBaseClass} h-12 w-12`}
          >
            <Minus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); stepTemp(0.5); }}
            className={`${buttonBaseClass} h-12 w-12`}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
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

      <div className="min-w-0 flex-1">
        <div className="flex flex-col">
          <span className="truncate text-xl font-bold text-[var(--text-primary)]">{name}</span>
          <span className="mt-2 inline-flex items-center gap-2 text-2xl font-light leading-tight text-[var(--text-primary)]">
            <Thermometer className="h-5 w-5 text-[#2A5A3B]" strokeWidth={1.75} />
            {displayPrimaryTemp.text}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); stepTemp(-0.5); }}
          className={`${buttonBaseClass} h-[82px] w-[82px]`}
        >
          <Minus className="h-7 w-7" strokeWidth={2} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); stepTemp(0.5); }}
          className={`${buttonBaseClass} h-[82px] w-[82px]`}
        >
          <Plus className="h-7 w-7" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
});

export default GenericClimateCard;
