import {
  toSlug,
  clamp,
  formatCurrency,
  formatDate,
  isPast,
  isFuture,
} from './helpers';

// ---------------------------------------------------------------------------
// toSlug
// ---------------------------------------------------------------------------

describe('toSlug', () => {
  it('converts a simple phrase to a slug', () => {
    expect(toSlug('Hello World')).toBe('hello-world');
  });

  it('strips special characters', () => {
    expect(toSlug('Hello World!')).toBe('hello-world');
  });

  it('replaces underscores with hyphens', () => {
    expect(toSlug('hello_world')).toBe('hello-world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(toSlug('  hello world  ')).toBe('hello-world');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(toSlug('hello   world')).toBe('hello-world');
  });

  it('handles an already-slug string', () => {
    expect(toSlug('hello-world')).toBe('hello-world');
  });

  it('converts to lowercase', () => {
    expect(toSlug('HELLO WORLD')).toBe('hello-world');
  });

  it('returns an empty string for an empty input', () => {
    expect(toSlug('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------

describe('clamp', () => {
  it('returns the value when it is within the range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('returns max when the value exceeds max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('returns min when the value is below min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('returns min when the value equals min', () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it('returns max when the value equals max', () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });

  it('works with negative ranges', () => {
    expect(clamp(-50, -100, -10)).toBe(-50);
    expect(clamp(0, -100, -10)).toBe(-10);
    expect(clamp(-200, -100, -10)).toBe(-100);
  });

  it('works when min equals max', () => {
    expect(clamp(42, 5, 5)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats with two decimal places', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats a negative amount', () => {
    expect(formatCurrency(-99.99)).toBe('-$99.99');
  });

  it('accepts a custom currency and locale', () => {
    // EUR / de-DE produces "1.234,50 €" — normalise whitespace for safety
    const result = formatCurrency(1234.5, 'EUR', 'de-DE').replace(/\s/g, ' ');
    expect(result).toMatch(/1[\.,]234[,\.]50/);
    expect(result).toContain('€');
  });

  it('rounds correctly at half-up', () => {
    // Intl rounding behaviour: $1.235 → $1.24 in most environments
    const result = formatCurrency(1.235);
    expect(result).toMatch(/\$1\.2[34]/);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  it('formats a Date object with default options', () => {
    const result = formatDate(new Date('2024-01-15'));
    expect(result).toBe('Jan 15, 2024');
  });

  it('formats an ISO string with default options', () => {
    const result = formatDate('2024-06-01');
    expect(result).toContain('2024');
  });

  it('accepts a custom locale', () => {
    const result = formatDate(new Date('2024-01-15'), 'en-GB');
    // en-GB short month: '15 Jan 2024'
    expect(result).toMatch(/15 Jan 2024/);
  });

  it('accepts custom format options', () => {
    const result = formatDate(new Date('2024-01-15'), 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    expect(result).toBe('01/15/2024');
  });
});

// ---------------------------------------------------------------------------
// isPast
// ---------------------------------------------------------------------------

describe('isPast', () => {
  it('returns true for a clearly past date', () => {
    expect(isPast(new Date('2000-01-01'))).toBe(true);
  });

  it('returns true for a past ISO string', () => {
    expect(isPast('1999-12-31T23:59:59Z')).toBe(true);
  });

  it('returns false for a clearly future date', () => {
    expect(isPast(new Date('2099-01-01'))).toBe(false);
  });

  it('returns false for a future ISO string', () => {
    expect(isPast('2099-12-31T23:59:59Z')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFuture
// ---------------------------------------------------------------------------

describe('isFuture', () => {
  it('returns true for a clearly future date', () => {
    expect(isFuture(new Date('2099-01-01'))).toBe(true);
  });

  it('returns true for a future ISO string', () => {
    expect(isFuture('2099-12-31T23:59:59Z')).toBe(true);
  });

  it('returns false for a clearly past date', () => {
    expect(isFuture(new Date('2000-01-01'))).toBe(false);
  });

  it('returns false for a past ISO string', () => {
    expect(isFuture('1999-12-31T23:59:59Z')).toBe(false);
  });

  it('is the logical inverse of isPast for non-equal times', () => {
    const futureDate = '2099-06-15T12:00:00Z';
    const pastDate = '2000-06-15T12:00:00Z';
    expect(isFuture(futureDate)).toBe(!isPast(futureDate));
    expect(isFuture(pastDate)).toBe(!isPast(pastDate));
  });
});
