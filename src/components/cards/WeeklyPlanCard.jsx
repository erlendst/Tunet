import { memo, Fragment, useEffect, useState } from 'react';
import {
  formatDate,
  formatEventTime,
  getDayHeading,
  getDayKey,
  groupEventsByDay,
  useCalendarEvents,
  useLazyVisible,
} from './dayCardShared';

const WeeklyPlanCard = memo(function WeeklyPlanCard({
  dragProps,
  controls,
  cardStyle,
  settings,
  customName,
  conn,
  editMode,
}) {
  const [cardRef, isVisible] = useLazyVisible();

  // Re-render every minute so the clock in the date header stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const calendarIds = Array.isArray(settings?.calendarIds) ? settings.calendarIds : [];
  const title = customName || settings?.name || 'Ukeplan';
  const events = useCalendarEvents(conn, calendarIds, isVisible, 6, 'WeeklyPlanCard');

  const eventGroups = groupEventsByDay(events);

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
        <span className="today-card__date">{formatDate()}</span>
      </div>

      <div className="today-card__events">
        {editMode && calendarIds.length === 0 && (
          <span className="today-card__empty">Velg kalender i innstillinger</span>
        )}
        {Array.from({ length: 7 }, (_, i) => {
          const key = getDayKey(i);
          const group = eventGroups.find((g) => g.key === key);
          if (!group || group.events.length === 0) return null;
          return (
            <Fragment key={key}>
              <span className="today-card__day-tag">{getDayHeading(i)}</span>
              <span className="today-card__cal-entry">
                {group.events.map((evt, idx) => {
                  const timeStr = formatEventTime(evt.start, evt.end);
                  return (
                    <span key={idx} className="today-card__cal-event">
                      <span className="today-card__cal-event-title">
                        {evt.summary || evt.title || '–'}
                      </span>
                      {timeStr && <span className="today-card__cal-event-time">{timeStr}</span>}
                    </span>
                  );
                })}
              </span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

export default WeeklyPlanCard;
