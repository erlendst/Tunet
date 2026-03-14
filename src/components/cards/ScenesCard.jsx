import { useState, useCallback, memo } from 'react';

function formatSceneName(entityId, friendlyName) {
  if (friendlyName) return friendlyName;
  const raw = entityId.replace(/^scene\./, '').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const ScenesCard = memo(function ScenesCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  settings,
  editMode,
  callService,
  t,
}) {
  const name = settings?.name || 'Stemninger';
  const sceneIds = Array.isArray(settings?.scenes) ? settings.scenes : [];
  const [recentlyActivated, setRecentlyActivated] = useState(null);

  const activateScene = useCallback(
    (sceneId) => {
      if (editMode) return;
      callService?.('scene', 'turn_on', { entity_id: sceneId });
      setRecentlyActivated(sceneId);
      setTimeout(() => setRecentlyActivated((prev) => (prev === sceneId ? null : prev)), 600);
    },
    [editMode, callService]
  );

  return (
    <div
      {...dragProps}
      style={cardStyle}
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm"
    >
      {controls}

      <h2 className="mb-3 text-base font-bold text-[var(--text-primary)]">{name}</h2>

      <div className="flex flex-wrap gap-2">
        {sceneIds.length === 0 && editMode && (
          <span className="text-xs text-[var(--text-muted)]">Legg til scener i innstillinger</span>
        )}
        {sceneIds.map((sceneId) => {
          const entity = entities?.[sceneId];
          const label = formatSceneName(sceneId, entity?.attributes?.friendly_name);
          const isActive = recentlyActivated === sceneId;

          return (
            <button
              key={sceneId}
              type="button"
              onClick={() => activateScene(sceneId)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-[var(--accent-color)] text-[var(--accent-foreground)]'
                  : 'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default ScenesCard;
