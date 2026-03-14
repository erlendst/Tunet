import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import TodayCard from '../components/cards/TodayCard';

beforeAll(() => {
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
});

describe('TodayCard', () => {
  it('can show temperature, humidity and condition from the same weather entity', () => {
    render(
      <TodayCard
        cardId="today_card_1"
        dragProps={{}}
        controls={null}
        cardStyle={{}}
        entities={{
          'weather.forecast_home': {
            entity_id: 'weather.forecast_home',
            state: 'sunny',
            attributes: {
              temperature: 21,
              temperature_unit: '°C',
              humidity: 48,
            },
          },
        }}
        settings={{
          sensor1Id: 'weather.forecast_home',
          sensor1Field: 'temperature',
          sensor2Id: 'weather.forecast_home',
          sensor2Field: 'humidity',
          sensor3Id: 'weather.forecast_home',
          sensor3Field: 'condition',
        }}
        conn={null}
        editMode
        t={(key) => ({ 'weather.condition.sunny': 'Sol' })[key] || key}
      />
    );

    expect(screen.getByText(/21 °C/)).toBeInTheDocument();
    expect(screen.getByText(/48 %/)).toBeInTheDocument();
    expect(screen.getByText('Sol')).toBeInTheDocument();
  });
});
