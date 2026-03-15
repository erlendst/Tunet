import { act, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import TodayCard from '../components/cards/TodayCard';

vi.mock('../services/haClient', () => ({
  getCalendarEvents: vi.fn(async () => ({})),
  getForecast: vi.fn(async (_conn, { entityId, type }) => {
    if (entityId === 'weather.forecast_home' && type === 'hourly') {
      return [
        { datetime: '2099-01-01T13:00:00Z', condition: 'sunny', temperature: 3.8, precipitation: 2 },
        { datetime: '2099-01-01T14:00:00Z', condition: 'cloudy', temperature: 4.1, precipitation: 0 },
        { datetime: '2099-01-01T15:00:00Z', condition: 'rainy', temperature: 4.4, precipitation: 0.5 },
        { datetime: '2099-01-01T16:00:00Z', condition: 'sunny', temperature: 4.7, precipitation: 0 },
        { datetime: '2099-01-01T17:00:00Z', condition: 'sunny', temperature: 5.1, precipitation: 0 },
        { datetime: '2099-01-01T18:00:00Z', condition: 'sunny', temperature: 5.5, precipitation: 0 },
      ];
    }
    return [];
  }),
}));

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback([{ isIntersecting: true }]);
    }
    disconnect() {}
    unobserve() {}
  };
});

describe('TodayCard', () => {
  it('shows the current hour first and then the next 5 forecast hours', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2099-01-01T12:15:00Z'));

      render(
        <TodayCard
          cardId="today_card_1"
          dragProps={{}}
          controls={null}
          cardStyle={{}}
          entities={{
            'weather.forecast_home': {
              entity_id: 'weather.forecast_home',
              state: 'rainy',
              attributes: {
                temperature: 3.2,
                temperature_unit: '°C',
                precipitation: 1.7,
                precipitation_unit: 'mm',
              },
            },
          }}
          settings={{
            weatherEntityId: 'weather.forecast_home',
          }}
          conn={{ sendMessagePromise: vi.fn() }}
          editMode
          t={(key) => key}
        />
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('13')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('16')).toBeInTheDocument();
      expect(screen.getByText('17')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText('3,2 °C')).toBeInTheDocument();
      expect(screen.getByText('1,7 mm')).toBeInTheDocument();
      expect(screen.getByText('4,1 °C')).toBeInTheDocument();
      expect(screen.getByText('0,5 mm')).toBeInTheDocument();
      expect(screen.queryByText('5,5 °C')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders empty state when no calendar and no weather entity are configured', () => {
    render(
      <TodayCard
        cardId="today_card_2"
        dragProps={{}}
        controls={null}
        cardStyle={{}}
        entities={{}}
        settings={{}}
        conn={null}
        editMode
        t={(key) => key}
      />
    );

    expect(screen.getByText('Velg kalender i innstillinger')).toBeInTheDocument();
  });

  it('does not show empty text or divider when there are no events outside edit mode', () => {
    const { container } = render(
      <TodayCard
        cardId="today_card_3"
        dragProps={{}}
        controls={null}
        cardStyle={{}}
        entities={{}}
        settings={{
          calendars: ['calendar.home'],
        }}
        conn={null}
        editMode={false}
        t={(key) => key}
      />
    );

    expect(screen.queryByText('Ingen hendelser i dag')).not.toBeInTheDocument();
    expect(screen.queryByText('Velg kalender i innstillinger')).not.toBeInTheDocument();
    expect(container.querySelector('.today-card__divider')).not.toBeInTheDocument();
  });
});
