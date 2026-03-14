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

const isLockedState = (entity) => {
  const state = entity?.state;
  if (typeof state !== 'string') return false;
  const normalized = state.trim().toLowerCase();
  const deviceClass = String(entity?.attributes?.device_class || '').trim().toLowerCase();

  if (['locked', 'lock', 'true'].includes(normalized)) return true;
  if (deviceClass === 'lock') {
    if (normalized === 'off') return true;
    if (normalized === 'on') return false;
  }
  return ['closed'].includes(normalized);
};

const formatMinutesLabel = (value, t) => {
  if (value === null || value === undefined || value === '') return '--';
  const asText = String(value).trim();
  if (!asText) return '--';
  const parsed = Number(asText.replace(',', '.'));
  if (!Number.isFinite(parsed)) return asText;
  if (parsed <= 0) return t('car.notCharging') || 'Lader ikke';
  return `${Math.round(parsed)} min`;
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
  const lockEntity = lockId ? entities[lockId] : null;
  const lockState = lockId ? getSafeState(entities, lockId) : null;
  const timeToFullState = timeToFullId ? getSafeState(entities, timeToFullId) : null;

  const isCharging = chargingState === 'on' || chargingState === 'charging';
  const isLocked = lockState !== null ? isLockedState(lockEntity) : false;
  const isHtg = climateEntity && !['off', 'unavailable', 'unknown'].includes(climateEntity.state);
  const lockLabel = isLocked ? t('state.locked') || 'Låst' : t('state.unlocked') || 'Ikke låst';
  const chargingTimeSource = timeToFullState ?? chargingState;
  const chargingTimeLabel = formatMinutesLabel(chargingTimeSource, t);
  const rangeLabel =
    displayRangeValue !== null
      ? `${formatUnitValue(displayRangeValue, { fallback: '--' })} ${rangeUnit}`
      : '--';
  const locationDisplay =
    locationLabel && locationLabel !== '--' ? String(locationLabel) : '--';

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
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 pt-5 pb-4 shadow-sm transition-all ${!editMode ? 'cursor-pointer active:scale-[0.99]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}

      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-[1.75rem] leading-none font-semibold tracking-tight text-[var(--text-primary)]">
            {name}
          </span>
          <span
            className={`mt-3 text-[3rem] leading-none font-light tracking-tight ${
              isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {batteryValue !== null ? `${formatValue(batteryValue)}%` : '--'}
          </span>
        </div>

        {lockId && (
          <div className="flex shrink-0 items-center gap-2 pt-1 text-[var(--text-primary)]">
            <span className="text-xl font-light leading-none">{lockLabel}</span>
            {isLocked ? (
              <Lock className="h-5 w-5" strokeWidth={1.6} />
            ) : (
              <Unlock className="h-5 w-5" strokeWidth={1.6} />
            )}
          </div>
        )}
      </div>

      {resolvedImageUrl && (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-3">
          <img
            src={resolvedImageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none h-full max-h-[240px] w-[88%] object-contain drop-shadow-md select-none"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {(rangeId || locationId || timeToFullId || effectiveChargingId) && (
        <div className="grid grid-cols-3 items-center gap-3 border-t border-[var(--card-border)] pt-4 text-[var(--text-primary)]">
          {rangeId && (
            <div className="flex min-w-0 items-center justify-start gap-2 text-[var(--text-primary)]">
              <RotateCw className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" strokeWidth={1.7} />
              <span className="truncate text-[1.75rem] leading-none font-light">{rangeLabel}</span>
            </div>
          )}
          {(timeToFullId || effectiveChargingId) && (
            <div
              className={`flex min-w-0 items-center justify-center gap-2 ${
                isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'
              }`}
            >
              <Zap className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" strokeWidth={1.7} />
              <span className="truncate text-[1.75rem] leading-none font-light">{chargingTimeLabel}</span>
            </div>
          )}
          {locationId && (
            <div className="flex min-w-0 items-center justify-end gap-2 text-[var(--text-primary)]">
              <MapPin className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" strokeWidth={1.7} />
              <span className="truncate text-[1.75rem] leading-none font-light">{locationDisplay}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(CarCard);
