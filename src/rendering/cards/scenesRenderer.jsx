import ScenesCard from '../../components/cards/ScenesCard';
import { getSettings } from '../helpers';

export function renderScenesCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, callService, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);

  return (
    <ScenesCard
      key={cardId}
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      settings={settings}
      editMode={editMode}
      callService={callService}
      t={t}
    />
  );
}
