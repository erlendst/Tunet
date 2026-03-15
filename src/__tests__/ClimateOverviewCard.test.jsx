import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClimateOverviewCard from '../components/cards/ClimateOverviewCard';

describe('ClimateOverviewCard', () => {
  it('shows environment temperature from climate entities', () => {
    render(
      <ClimateOverviewCard
        cardId="climate_overview_card_1"
        dragProps={{}}
        controls={null}
        cardStyle={{}}
        entities={{
          'climate.living_room': {
            entity_id: 'climate.living_room',
            state: 'heat',
            attributes: {
              environment_temperature: 22.4,
              temperature_unit: '°C',
              current_humidity: 41,
            },
          },
        }}
        settings={{
          rooms: [
            {
              name: 'Stue',
              tempId: 'climate.living_room',
              humidityId: 'climate.living_room',
            },
          ],
        }}
        editMode={false}
        t={(key) => key}
      />
    );

    expect(screen.getByText('Stue')).toBeInTheDocument();
    expect(screen.getByText(/22.4°C/)).toBeInTheDocument();
    expect(screen.getByText(/41%/)).toBeInTheDocument();
  });
});
