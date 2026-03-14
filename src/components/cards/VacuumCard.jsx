import { memo } from 'react';
import { AlertTriangle, Battery, Home, Pause, Play } from '../../icons';

function getVacuumStateLabel(state, battery, t) {
  const normalized = String(state || '').toLowerCase();
  if (!normalized) return t('vacuum.unknown');

  if (normalized === 'cleaning' || normalized === 'vacuuming') return t('vacuum.cleaning');
  if (normalized === 'returning' || normalized === 'going_home' || normalized === 'return_to_base') {
    return t('vacuum.returning') || t('room.vacuumStatus.goingHome') || normalized;
  }
  if ((normalized === 'charging' || normalized === 'docked') && battery === 100) return t('vacuum.docked');
  if (normalized === 'docked') return t('vacuum.charging');
  if (normalized === 'idle' || normalized === 'ready') return t('vacuum.idle');
  if (normalized === 'paused' || normalized === 'pause') return t('vacuum.pause');
  if (['error', 'fault', 'problem', 'stuck'].includes(normalized)) {
    return t('room.vacuumStatus.error') || 'Error';
  }
  if (normalized === 'stopped') return t('room.vacuumStatus.stopped') || 'Stopped';
  return state;
}

const VacuumCard = ({
  vacuumId,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  getA,
  callService,
  onOpen,
  t,
}) => {
  const entity = entities[vacuumId];

  if (!entity) {
    if (editMode) {
      return (
        <div
          {...dragProps}
          className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[var(--status-error-border)] bg-[var(--card-bg)] p-4"
          style={cardStyle}
        >
          {controls}
          <AlertTriangle className="mb-2 h-8 w-8 text-[var(--status-error-fg)] opacity-80" />
          <p className="text-center text-xs font-bold tracking-widest text-[var(--status-error-fg)] uppercase">
            {t('common.missing')}
          </p>
          <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-[var(--status-error-fg)]/70">
            {vacuumId}
          </p>
        </div>
      );
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[vacuumId] || {};
  const isSmall = settings.size === 'small';
  const state = entity?.state;
  const normalizedState = String(state || '').toLowerCase();
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isErrorState = ['error', 'fault', 'problem', 'stuck'].includes(normalizedState);
  const isCleaning = normalizedState === 'cleaning' || normalizedState === 'vacuuming';
  const mappedBattery = getA?.(vacuumId, 'battery_level') ?? settings?.batterySensorId ?? null;
  const mappedBatteryEntity = typeof mappedBattery === 'string' ? entities?.[mappedBattery] : null;
  const rawBattery =
    (typeof mappedBattery === 'number' ? mappedBattery : null) ??
    entity.attributes?.battery_level ??
    mappedBatteryEntity?.state ??
    mappedBatteryEntity?.attributes?.battery_level;
  const batteryNumber = Number(rawBattery);
  const battery = Number.isFinite(batteryNumber) ? Math.round(batteryNumber) : null;
  const name = customNames[vacuumId] || entity.attributes?.friendly_name || t('vacuum.name');
  const statusText = getVacuumStateLabel(state, battery, t);
  const secondaryText = battery !== null ? `${battery}%` : statusText;
  const buttonBaseClass =
    'flex items-center justify-center rounded-[24px] border border-[color:color-mix(in_srgb,var(--text-secondary)_16%,transparent)] bg-[color:color-mix(in_srgb,var(--card-bg)_84%,var(--bg-primary)_16%)] text-[var(--text-primary)] transition-all hover:bg-[color:color-mix(in_srgb,var(--card-bg)_70%,var(--glass-bg-hover)_30%)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (!isUnavailable)
      callService('vacuum', isCleaning ? 'pause' : 'start', { entity_id: vacuumId });
  };

  const handleHome = (e) => {
    e.stopPropagation();
    if (!isUnavailable) callService('vacuum', 'return_to_base', { entity_id: vacuumId });
  };

  if (isSmall) {
    return (
      <div
        {...dragProps}
        onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }}
        className={`dashboard-action-card relative flex h-full items-center justify-between gap-3 overflow-hidden px-4 py-3 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{
          ...cardStyle,
          backgroundColor: isErrorState ? 'var(--status-error-bg)' : cardStyle?.backgroundColor || '#ffffff',
          borderColor: isErrorState ? 'var(--status-error-border)' : cardStyle?.borderColor,
        }}
      >
        {controls}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-[var(--text-primary)]">{name}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 truncate text-sm font-medium text-[var(--text-primary)]">
              <Battery className="h-3.5 w-3.5 shrink-0 text-[var(--accent-color)]" strokeWidth={1.75} />
              {secondaryText}
            </span>
            {battery !== null && !isUnavailable && statusText !== secondaryText ? (
              <span className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">{statusText}</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={handleHome} className={`${buttonBaseClass} dashboard-action-button h-12 w-12`} disabled={isUnavailable}>
            <Home className="h-4 w-4" strokeWidth={2} />
          </button>
          <button onClick={handlePlayPause} className={`${buttonBaseClass} dashboard-action-button h-12 w-12`} disabled={isUnavailable}>
            {isCleaning ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...dragProps}
      onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }}
      className={`dashboard-action-card relative flex h-full items-center justify-between overflow-hidden px-6 py-5 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{
        ...cardStyle,
        backgroundColor: isErrorState ? 'var(--status-error-bg)' : cardStyle?.backgroundColor || '#ffffff',
        borderColor: isErrorState ? 'var(--status-error-border)' : cardStyle?.borderColor,
      }}
    >
      {controls}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold text-[var(--text-primary)]">{name}</span>
          <span className="mt-2 inline-flex items-center gap-2 truncate text-2xl font-light leading-tight text-[var(--text-primary)]">
            <Battery className="h-5 w-5 shrink-0 text-[var(--accent-color)]" strokeWidth={1.75} />
            {secondaryText}
          </span>
          {battery !== null && !isUnavailable && statusText !== secondaryText ? (
            <span className="mt-1 truncate text-sm text-[var(--text-secondary)]">{statusText}</span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button onClick={handleHome} className={`${buttonBaseClass} dashboard-action-button h-[82px] w-[82px]`} disabled={isUnavailable}>
          <Home className="h-7 w-7" strokeWidth={2} />
        </button>
        <button onClick={handlePlayPause} className={`${buttonBaseClass} dashboard-action-button h-[82px] w-[82px]`} disabled={isUnavailable}>
          {isCleaning ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
        </button>
      </div>
    </div>
  );
};

export default memo(VacuumCard);
