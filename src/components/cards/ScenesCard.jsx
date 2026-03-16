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
  customName,
  editMode,
  callService,
  t,
}) {
  const name = customName || settings?.name || 'Overskrift';
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
      className="dashboard-card-padding relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
    >
      {controls}

      <h2 className="dashboard-card-title mb-3">{name}</h2>

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
              className={`text-md rounded-2xl px-6 py-4 font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-[var(--accent-color)] text-[var(--accent-foreground)]'
                  : 'bg-[#e8ece6] text-[#2A5A3B] hover:bg-[#dfe6de]'
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
