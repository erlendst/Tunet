import { memo, Fragment } from 'react';
import {
  getDayHeading,
  getDayKey,
  groupEventsByDay,
  useCalendarEvents,
  useLazyVisible,
} from './dayCardShared';

const DinnerPlanCard = memo(function DinnerPlanCard({
  dragProps,
  controls,
  cardStyle,
  settings,
  customName,
  conn,
  editMode,
}) {
  const [cardRef, isVisible] = useLazyVisible('dinner');

  const mealCalendarId = settings?.mealCalendarId || null;
  const title = customName || settings?.name || 'Middagsplan';
  const events = useCalendarEvents(
    conn,
    mealCalendarId ? [mealCalendarId] : [],
    isVisible,
    6,
    'DinnerPlanCard'
  );

  const mealGroups = groupEventsByDay(events);

  return (
    <div
      ref={cardRef}
      {...dragProps}
      style={cardStyle}
      className={`today-card relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm ${editMode ? 'cursor-move' : ''}`}
    >
      {controls}

      <div className="today-card__header">
        <span className="today-card__title">{title}</span>
      </div>

      {editMode && !mealCalendarId && (
        <span className="today-card__empty">Velg middagskalender i innstillinger</span>
      )}
      <div className="today-card__dinner-cols">
        {(() => {
          const days = Array.from({ length: 6 }, (_, i) => {
            const key = getDayKey(i);
            const group = mealGroups.find((g) => g.key === key);
            const dish = group && group.events.length > 0
              ? group.events.map((evt) => evt.summary || evt.title || '').join(', ')
              : '';
            return { key, heading: getDayHeading(i), dish };
          });
          const mid = Math.ceil(days.length / 2);
          return [days.slice(0, mid), days.slice(mid)].map((col, ci) => (
            <div key={ci} className="today-card__dinner-col">
              {col.map(({ key, heading, dish }) => (
                <Fragment key={key}>
                  <span className="today-card__day-tag">{heading}</span>
                  <span className="today-card__meal-dish">{dish}</span>
                </Fragment>
              ))}
            </div>
          ));
        })()}
      </div>
    </div>
  );
});

export default DinnerPlanCard;
