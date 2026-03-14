import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericClimateCard from '../components/cards/GenericClimateCard';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: {
      unit_system: {
        temperature: '°C',
      },
    },
  }),
}));

const baseProps = (entityOverrides = {}) => ({
  cardId: 'climate_card_1',
  entityId: 'climate.living_room',
  entity: {
    state: 'cool',
    attributes: {
      friendly_name: 'Living Room AC',
      temperature: 22,
      current_temperature: 24,
      hvac_action: 'cooling',
      fan_mode: 'auto',
      fan_modes: ['auto', 'low', 'medium', 'high'],
      ...entityOverrides,
    },
  },
  dragProps: {},
  controls: null,
  cardStyle: {},
  editMode: false,
  customNames: {},
  customIcons: {},
  onOpen: vi.fn(),
  onSetTemperature: vi.fn(),
  settings: { size: 'large' },
  t: (key) => key,
});

describe('GenericClimateCard', () => {
  it('shows the climate name and current temperature', () => {
    render(<GenericClimateCard {...baseProps({ fan_mode: 'auto' })} />);

    expect(screen.getByText('Living Room AC')).toBeInTheDocument();
    expect(screen.getByText('24°C')).toBeInTheDocument();
  });

  it('renders plus and minus controls', () => {
    render(<GenericClimateCard {...baseProps()} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('steps temperature down and up from the numeric target temperature', () => {
    const onSetTemperature = vi.fn();
    render(<GenericClimateCard {...baseProps({ temperature: 22 })} onSetTemperature={onSetTemperature} />);

    const [minusButton, plusButton] = screen.getAllByRole('button');
    fireEvent.click(minusButton);
    fireEvent.click(plusButton);

    expect(onSetTemperature).toHaveBeenNthCalledWith(1, 21.5);
    expect(onSetTemperature).toHaveBeenNthCalledWith(2, 22.5);
  });
});
