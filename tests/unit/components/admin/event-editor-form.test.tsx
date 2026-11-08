import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EventEditorForm, type EventEditorInitialValues } from '@/components/admin/event-editor-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const LOCATIONS = [
  { id: 'loc-1', name: 'Austin Botanical Hall', address: '12 Sage St', city: 'Austin', state: 'TX' },
  { id: 'loc-2', name: 'Dallas Wellness Center', address: '400 Elm Ave', city: 'Dallas', state: 'TX' },
];

function openLocationTab() {
  fireEvent.click(screen.getByRole('tab', { name: 'Location' }));
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ event: { id: 'evt-1' } }) });
  vi.stubGlobal('fetch', fetchMock);
});

describe('EventEditorForm venue selection', () => {
  it('lists every location as a selectable option in a dropdown', () => {
    render(<EventEditorForm locations={LOCATIONS} canPublish={false} />);
    openLocationTab();

    const venue = screen.getByRole('combobox', { name: 'Venue' });
    expect(venue.tagName).toBe('SELECT');
    const optionNames = screen.getAllByRole('option').map((o) => o.textContent);
    expect(optionNames).toEqual(
      expect.arrayContaining(['Austin Botanical Hall — Austin, TX', 'Dallas Wellness Center — Dallas, TX']),
    );
  });

  it('sends the selected location id when saving', async () => {
    render(<EventEditorForm locations={LOCATIONS} canPublish={false} />);
    openLocationTab();
    fireEvent.change(screen.getByRole('combobox', { name: 'Venue' }), { target: { value: 'loc-2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).locationId).toBe('loc-2');
  });

  it('sends null when no venue is chosen', async () => {
    render(<EventEditorForm locations={LOCATIONS} canPublish={false} />);
    openLocationTab();

    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).locationId).toBeNull();
  });

  it('pre-selects the saved venue when editing', () => {
    render(
      <EventEditorForm
        locations={LOCATIONS}
        canPublish={false}
        initialValues={{ id: 'evt-1', locationId: 'loc-1' } as EventEditorInitialValues}
      />,
    );
    openLocationTab();
    expect((screen.getByRole('combobox', { name: 'Venue' }) as HTMLSelectElement).value).toBe('loc-1');
  });

  it("fills the listing city and state from the chosen venue and shows its address", () => {
    render(<EventEditorForm locations={LOCATIONS} canPublish={false} />);
    openLocationTab();
    fireEvent.change(screen.getByRole('combobox', { name: 'Venue' }), { target: { value: 'loc-2' } });

    expect(screen.getByLabelText(/City \(listing\)/)).toHaveValue('Dallas');
    expect(screen.getByLabelText(/State \(listing\)/)).toHaveValue('TX');
    expect(screen.getByText('400 Elm Ave, Dallas, TX')).toBeInTheDocument();
  });

  it('links to the locations page to manage venues', () => {
    render(<EventEditorForm locations={LOCATIONS} canPublish={false} />);
    openLocationTab();
    expect(screen.getByRole('link', { name: /manage locations/i })).toHaveAttribute('href', '/admin/locations');
  });
});

describe('EventEditorForm event times', () => {
  function fillTimes(start: string, end: string, timezone: string) {
    fireEvent.change(screen.getByLabelText(/Start At/), { target: { value: start } });
    fireEvent.change(screen.getByLabelText(/End At/), { target: { value: end } });
    fireEvent.change(screen.getByLabelText(/Timezone/), { target: { value: timezone } });
  }

  it("saves the entered times as local to the event's timezone", async () => {
    render(<EventEditorForm locations={LOCATIONS} canPublish={false} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
    fillTimes('2026-12-06T10:00', '2026-12-06T12:30', 'America/Los_Angeles');

    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.startAt).toBe('2026-12-06T18:00:00.000Z');
    expect(body.endAt).toBe('2026-12-06T20:30:00.000Z');
  });

  it('blocks saving with a clear error when the timezone is not recognised', async () => {
    render(<EventEditorForm locations={LOCATIONS} canPublish={false} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
    fillTimes('2026-12-06T10:00', '2026-12-06T12:30', 'Portland');

    fireEvent.click(screen.getByRole('button', { name: 'Create Event' }));
    expect(await screen.findByText(/timezone/i, { selector: '[role="alert"], [role="alert"] *' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
