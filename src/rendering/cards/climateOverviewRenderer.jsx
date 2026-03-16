import ClimateOverviewCard from '../../components/cards/ClimateOverviewCard';
import { getSettings } from '../helpers';

export function renderClimateOverviewCard(
  cardId,
  dragProps,
  getControls,
  cardStyle,
  settingsKey,
  ctx
) {
  const { entities, editMode, cardSettings, customNames, t } = ctx;
  const settings = getSettings(cardSettings, settingsKey, cardId);

  return (
    <ClimateOverviewCard
      key={cardId}
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      entities={entities}
      settings={settings}
      customName={customNames?.[cardId] || null}
      editMode={editMode}
      t={t}
    />
  );
}
