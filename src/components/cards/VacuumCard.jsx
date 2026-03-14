import { memo } from 'react';
import { getIconComponent } from '../../icons';
import { AlertTriangle, Bot, Home, Pause, Play } from '../../icons';

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
  customIcons,
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
  const battery = entity.attributes?.battery_level;
  const name = customNames[vacuumId] || entity.attributes?.friendly_name || t('vacuum.name');
  const vacuumIconName = customIcons[vacuumId] || entity?.attributes?.icon;
  const Icon = vacuumIconName ? getIconComponent(vacuumIconName) || Bot : Bot;
  const statusText = getVacuumStateLabel(state, battery, t);

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (!isUnavailable)
      callService('vacuum', isCleaning ? 'pause' : 'start', { entity_id: vacuumId });
  };

  const handleHome = (e) => {
    e.stopPropagation();
    if (!isUnavailable) callService('vacuum', 'return_to_base', { entity_id: vacuumId });
  };

  const btnBase = 'flex items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90';

  if (isSmall) {
    return (
      <div
        {...dragProps}
        onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }}
        className={`relative flex h-full items-center justify-between gap-3 overflow-hidden rounded-3xl border border-[var(--card-border)] px-4 py-3 transition-all ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{
          ...cardStyle,
          backgroundColor: isErrorState ? 'var(--status-error-bg)' : isCleaning ? 'rgba(59,130,246,0.06)' : '#ffffff',
          borderColor: isErrorState ? 'var(--status-error-border)' : isCleaning ? 'rgba(59,130,246,0.3)' : cardStyle?.borderColor,
        }}
      >
        {controls}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon className={`h-5 w-5 shrink-0 ${isCleaning ? 'animate-pulse text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`} strokeWidth={1.5} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-[var(--text-secondary)]">{name}</span>
            <span className="truncate text-sm font-bold text-[var(--text-primary)]">{statusText}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={handlePlayPause} className={`${btnBase} h-8 w-8`}>
            {isCleaning ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
          </button>
          <button onClick={handleHome} className={`${btnBase} h-8 w-8`}>
            <Home className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...dragProps}
      onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }}
      className={`relative flex h-full items-center justify-between overflow-hidden rounded-3xl border border-[var(--card-border)] px-6 py-5 transition-all ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{
        ...cardStyle,
        backgroundColor: isErrorState ? 'var(--status-error-bg)' : isCleaning ? 'rgba(59,130,246,0.06)' : '#ffffff',
        borderColor: isErrorState ? 'var(--status-error-border)' : isCleaning ? 'rgba(59,130,246,0.3)' : cardStyle?.borderColor,
      }}
    >
      {controls}

      {/* Left: icon + name + status */}
      <div className="flex items-center gap-4">
        <Icon className={`h-6 w-6 shrink-0 ${isCleaning ? 'animate-pulse text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`} strokeWidth={1.5} />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[var(--text-primary)]">{name}</span>
          <span className="text-2xl font-light leading-tight text-[var(--text-primary)]">
            {statusText}
            {typeof battery === 'number' && (
              <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">{battery}%</span>
            )}
          </span>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <button onClick={handlePlayPause} className={`${btnBase} h-10 w-10`}>
          {isCleaning ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>
        <button onClick={handleHome} className={`${btnBase} h-10 w-10`}>
          <Home className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default memo(VacuumCard);
