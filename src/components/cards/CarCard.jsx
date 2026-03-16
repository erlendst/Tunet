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
  const deviceClass = String(entity?.attributes?.device_class || '')
    .trim()
    .toLowerCase();

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
    rangeIcon,
    locationId,
    locationIcon,
    chargingId,
    chargingStateId,
    chargingIcon,
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
    locationLabel && locationLabel !== '--'
      ? String(locationLabel)
      : t('common.unknown') || 'Ukjent';
  const bottomSensors = [
    rangeId
      ? {
          key: 'range',
          iconName: rangeIcon || 'rotate-cw',
          fallbackIcon: RotateCw,
          value: rangeLabel,
          toneClass: 'car-card__metric-value',
        }
      : null,
    timeToFullId || effectiveChargingId
      ? {
          key: 'charging',
          iconName: chargingIcon || 'zap',
          fallbackIcon: Zap,
          value: chargingTimeLabel,
          toneClass: isCharging
            ? 'car-card__metric-value car-card__metric-value--charging'
            : 'car-card__metric-value',
        }
      : null,
    locationId
      ? {
          key: 'location',
          iconName: locationIcon || 'map-pin',
          fallbackIcon: MapPin,
          value: locationDisplay,
          toneClass: 'car-card__metric-value',
        }
      : null,
  ].filter(Boolean);

  const resolvedImageUrl =
    vehicleImageUrl ||
    (imageUrl ? (getEntityImageUrl ? getEntityImageUrl(imageUrl) : imageUrl) : null);

  const name = customNames[cardId] || settings?.name || t('car.defaultName') || 'Overskrift';
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
        className={`dashboard-action-card relative flex h-full items-center justify-between gap-4 overflow-hidden p-8 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        {resolvedImageUrl && (
          <img
            src={resolvedImageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-2 bottom-2 h-[55%] max-w-[40%] object-contain object-right-bottom drop-shadow-md select-none"
          />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 text-[var(--accent-color)]" strokeWidth={1.5} />
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-medium text-[var(--text-secondary)]">{name}</span>
            <span
              className={`text-sm font-normal ${isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'}`}
            >
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
      className={`dashboard-action-card dashboard-card-padding relative flex h-full flex-col justify-between overflow-hidden ${!editMode ? 'cursor-pointer active:scale-[0.99]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}

      <div className="mb-0 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="dashboard-card-title dashboard-card-title--truncate mb-3">
            {name}
          </span>
          <span
            className={`text-[2.8rem] leading-none font-light tracking-tight ${
              isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {batteryValue !== null ? `${formatValue(batteryValue)}%` : '--'}
          </span>
        </div>

        {lockId && (
          <div className="flex shrink-0 items-center gap-2 text-[var(--text-primary)]">
            <span className="text-xl leading-none font-light">{lockLabel}</span>
            {isLocked ? (
              <Lock className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Unlock className="h-5 w-5" strokeWidth={1.5} />
            )}
          </div>
        )}
      </div>

      {resolvedImageUrl && (
        <div className="flex items-center justify-center overflow-hidden">
          <img
            src={resolvedImageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none max-h-[240px] w-[92%] object-contain select-none"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}

      {bottomSensors.length > 0 && (
        <div className="car-card__metrics">
          {bottomSensors.map(({ key, iconName, fallbackIcon: FallbackIcon, value, toneClass }) => {
            const MetricIcon = getIconComponent(iconName) || FallbackIcon;
            return (
              <div key={key} className="car-card__metric">
                <MetricIcon className="car-card__metric-icon" />
                <span className={toneClass}>{value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(CarCard);
