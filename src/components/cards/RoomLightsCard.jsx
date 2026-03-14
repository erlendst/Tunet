import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { getIconComponent } from '../../icons';

const RoomLightsCard = memo(function RoomLightsCard({
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
  const name = settings?.name || 'Lys';
  const rooms = Array.isArray(settings?.rooms) ? settings.rooms : [];
  const cardRef = useRef(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    if (!cardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || 0;
      setCols(w < 260 ? 2 : 3);
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, []);

  const activateRoom = useCallback(
    (sceneId) => {
      if (editMode || !sceneId) return;
      callService?.('scene', 'turn_on', { entity_id: sceneId });
    },
    [editMode, callService]
  );

  return (
    <div
      ref={cardRef}
      {...dragProps}
      style={cardStyle}
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm"
    >
      {controls}

      <h2 className="mb-3 text-base font-bold text-[var(--text-primary)]">{name}</h2>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {rooms.length === 0 && editMode && (
          <span className="col-span-3 text-xs text-[var(--text-muted)]">
            Legg til rom i innstillinger
          </span>
        )}
        {rooms.map((room, idx) => {
          const Icon = room.icon ? getIconComponent(room.icon) : null;
          const lightEntity = room.lightEntityId ? entities?.[room.lightEntityId] : null;
          const isOn = lightEntity?.state === 'on';

          return (
            <button
              key={idx}
              type="button"
              onClick={() => activateRoom(room.sceneId)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all duration-200 ${
                isOn
                  ? 'bg-[var(--accent-color)] text-[var(--accent-foreground)]'
                  : 'border border-[var(--card-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              }`}
            >
              {Icon && (
                <Icon
                  className="h-5 w-5"
                  strokeWidth={1.5}
                />
              )}
              <span className="text-center text-xs font-medium leading-tight">
                {room.name || '–'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default RoomLightsCard;
