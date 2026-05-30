import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDateLabel } from './date';

describe('formatDateLabel', () => {
  it('returns "Today" for current date', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2024-05-30T12:00:00Z') });
    const result = formatDateLabel('2024-05-30T12:00:00Z');
    assert.strictEqual(result, 'Today');
  });

  it('returns "Yesterday" for previous day', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2024-05-30T12:00:00Z') });
    const result = formatDateLabel('2024-05-29T12:00:00Z');
    assert.strictEqual(result, 'Yesterday');
  });

  it('returns formatted date without year for earlier this year', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2024-05-30T12:00:00Z') });
    const dateStr = '2024-05-20T10:00:00Z';
    const result = formatDateLabel(dateStr);

    const date = new Date(dateStr);
    const expected = date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    assert.strictEqual(result, expected);
  });

  it('returns formatted date with year for a previous year', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2024-05-30T12:00:00Z') });
    const dateStr = '2023-05-20T10:00:00Z';
    const result = formatDateLabel(dateStr);

    const date = new Date(dateStr);
    const expected = date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    assert.strictEqual(result, expected);
  });
});
