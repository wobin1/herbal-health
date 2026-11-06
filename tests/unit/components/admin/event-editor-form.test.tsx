import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EventEditorForm, type EventEditorInitialValues } from '@/components/admin/event-editor-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const LOCATIONS = [
  { id: 'loc-1', name: 'Austin Botanical Hall' },
  { id: 'loc-2', name: 'Dallas Wellness Center' },
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
    expect(optionNames).toEqual(expect.arrayContaining(['Austin Botanical Hall', 'Dallas Wellness Center']));
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
});
