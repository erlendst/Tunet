import { useEffect, useRef, useState, memo } from 'react';
import { getIconComponent } from '../../icons';
import { Car, MapPin, Zap, RotateCw, Lock, Unlock } from '../../icons';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
} from '../../utils';

/* ─── Helpers (pure, no React) ─── */

const getSafeState = (entities, id) => {
  const state = id ? entities[id]?.state : null;
  if (!state || state === 'unavailable' || state === 'unknown') return null;
  return state;
};

const getNumberState = (entities, id) => {
  const state = getSafeState(entities, id);
  if (state === null) return null;
  const value = parseFloat(state);
  return Number.isFinite(value) ? value : null;
};

const formatValue = (num) => {
  if (num === null || num === undefined) return null;
  const strVal = String(num).replace(',', '.');
  const parsed = parseFloat(strVal);
  if (isNaN(parsed)) return num;
  return Math.round(parsed * 10) / 10;
};

/* ─── CarCard ─── */

const CarCard = ({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  customIcons,
  getS,
  getA,
  getEntityImageUrl,
  onOpen,
  isMobile,
  t,
}) => {
  const cardRef = useRef(null);
  const [isNarrowLargeCard, setIsNarrowLargeCard] = useState(false);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const updateByWidth = (width) => {
      setIsNarrowLargeCard((prev) => (prev ? width < 336 : width < 316));
    };
    updateByWidth(element.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? element.clientWidth;
      updateByWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const {
    batteryId,
    rangeId,
    locationId,
    chargingId,
    chargingStateId,
    pluggedId,
    climateId,
    imageUrl,
    tempId,
    vehicleImageUrl,
    lockId,
    timeToFullId,
  } = settings;
  const effectiveChargingId = chargingStateId || chargingId;

  const batteryValue = getNumberState(entities, batteryId);
  const rangeValue = getNumberState(entities, rangeId);
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const sourceRangeUnitRaw = rangeId ? entities[rangeId]?.attributes?.unit_of_measurement : '';
  const sourceRangeUnit = typeof sourceRangeUnitRaw === 'string' ? sourceRangeUnitRaw.trim() : '';
  const useSourceRangeUnit = unitsMode === 'follow_ha' && !!sourceRangeUnit;
  const rangeUnit = useSourceRangeUnit
    ? sourceRangeUnit
    : getDisplayUnitForKind('length', effectiveUnitMode);
  const displayRangeValue = useSourceRangeUnit
    ? rangeValue
    : convertValueByKind(rangeValue, {
        kind: 'length',
        fromUnit: sourceRangeUnit || 'km',
        unitMode: effectiveUnitMode,
      });
  const locationLabel = locationId ? getS(locationId) : null;

  const chargingState = getSafeState(entities, effectiveChargingId);
  const pluggedState = getSafeState(entities, pluggedId);
  const climateEntity = climateId ? entities[climateId] : null;
  const lockState = lockId ? getSafeState(entities, lockId) : null;
  const timeToFullState = timeToFullId ? getSafeState(entities, timeToFullId) : null;

  const isCharging = chargingState === 'on' || chargingState === 'charging';
  const isLocked = lockState === 'locked';
  const isHtg = climateEntity && !['off', 'unavailable', 'unknown'].includes(climateEntity.state);

  const resolvedImageUrl = vehicleImageUrl || (imageUrl
    ? getEntityImageUrl
      ? getEntityImageUrl(imageUrl)
      : imageUrl
    : null);

  const name = customNames[cardId] || t('car.defaultName');
  const Icon = customIcons[cardId] ? getIconComponent(customIcons[cardId]) || Car : Car;
  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const isSmall = sizeSetting === 'small';

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen();
        }}
        className={`relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 pl-5 shadow-sm transition-all ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        {resolvedImageUrl && (
          <img
            src={resolvedImageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-2 h-[55%] max-w-[40%] object-contain object-right-bottom drop-shadow-md select-none"
          />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" strokeWidth={1.5} />
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-medium text-[var(--text-secondary)]">{name}</span>
            <span className={`text-sm font-bold ${isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'}`}>
              {batteryValue !== null ? `${formatValue(batteryValue)}%` : '--'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      key={cardId}
      {...dragProps}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen();
      }}
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition-all ${!editMode ? 'cursor-pointer active:scale-[0.99]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}

      {/* Top row: name + lock status */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-base font-bold text-[var(--text-primary)]">{name}</span>
        {lockId && (
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            {isLocked ? (
              <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            <span>{isLocked ? (t('car.locked') || 'Låst') : (t('car.unlocked') || 'Ulåst')}</span>
          </div>
        )}
      </div>

      {/* Battery % */}
      <div className="mb-2">
        <span className={`text-4xl font-light leading-none ${isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'}`}>
          {batteryValue !== null ? `${formatValue(batteryValue)}%` : '--'}
        </span>
      </div>

      {/* Vehicle image — flex-1 min-h-0 so it shrinks when space is tight */}
      {resolvedImageUrl && (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-2">
          <img
            src={resolvedImageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none h-full max-h-32 w-auto max-w-full object-contain drop-shadow-md select-none"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Bottom info row — show when any sensor is configured */}
      {(rangeId || locationId || timeToFullId || effectiveChargingId) && (
        <div className="flex items-center justify-between gap-2 border-t border-[var(--card-border)] pt-3">
          {rangeId && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                {displayRangeValue !== null
                  ? `${formatUnitValue(displayRangeValue, { fallback: '--' })} ${rangeUnit}`
                  : '--'}
              </span>
            </div>
          )}
          {(timeToFullId || effectiveChargingId) && (
            <div className={`flex items-center gap-1.5 text-sm ${isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-secondary)]'}`}>
              <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{timeToFullState || chargingState || '--'}</span>
            </div>
          )}
          {locationId && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="truncate">{locationLabel && locationLabel !== '--' ? String(locationLabel) : '--'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(CarCard);
