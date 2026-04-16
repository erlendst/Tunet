import { ScooterCard } from '../../components';

export function renderScooterCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { editMode, cardSettings, t } = ctx;

  return (
    <ScooterCard
      key={cardId}
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      settingsKey={settingsKey}
      cardSettings={cardSettings}
      editMode={editMode}
      t={t}
    />
  );
}
