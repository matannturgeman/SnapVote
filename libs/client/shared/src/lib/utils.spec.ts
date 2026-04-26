import {
  capitalize,
  truncate,
  toLabel,
  omitNullish,
  pick,
  omit,
  unique,
  groupBy,
  chunk,
  isDefined,
  isNonEmptyString,
  tryCatch,
  sleep,
} from './utils';

// ---------------------------------------------------------------------------
// capitalize
// ---------------------------------------------------------------------------

describe('capitalize', () => {
  it('capitalises the first letter of a lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('leaves an already-capitalised string unchanged', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('handles a single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('returns an empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });

  it('does not alter characters after the first', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });
});

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------

describe('truncate', () => {
  it('truncates a string that exceeds maxLength with default suffix', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('returns the string unchanged when it fits within maxLength', () => {
    expect(truncate('Hi', 5)).toBe('Hi');
  });

  it('returns the string unchanged when length equals maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('uses a custom suffix when provided', () => {
    expect(truncate('Hello World', 5, '---')).toBe('Hello---');
  });

  it('handles an empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('handles maxLength of 0', () => {
    expect(truncate('Hello', 0)).toBe('...');
  });

  it('handles a very large maxLength', () => {
    const str = 'a'.repeat(1000);
    expect(truncate(str, 2000)).toBe(str);
  });
});

// ---------------------------------------------------------------------------
// toLabel
// ---------------------------------------------------------------------------

describe('toLabel', () => {
  it('converts camelCase to a human-readable label', () => {
    expect(toLabel('firstName')).toBe('First Name');
  });

  it('converts PascalCase to a human-readable label', () => {
    expect(toLabel('FirstName')).toBe('First Name');
  });

  it('handles a single word', () => {
    expect(toLabel('name')).toBe('Name');
  });

  it('handles multiple consecutive capitals', () => {
    expect(toLabel('myURLParser')).toBe('My U R L Parser');
  });

  it('handles an already-spaced label', () => {
    expect(toLabel('hello')).toBe('Hello');
  });
});

// ---------------------------------------------------------------------------
// omitNullish
// ---------------------------------------------------------------------------

describe('omitNullish', () => {
  it('removes null values', () => {
    expect(omitNullish({ a: 1, b: null })).toEqual({ a: 1 });
  });

  it('removes undefined values', () => {
    expect(omitNullish({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('keeps falsy but defined values', () => {
    expect(omitNullish({ a: 0, b: false, c: '' })).toEqual({
      a: 0,
      b: false,
      c: '',
    });
  });

  it('returns an empty object when all values are nullish', () => {
    expect(omitNullish({ a: null, b: undefined })).toEqual({});
  });

  it('returns a copy, not the same reference', () => {
    const obj = { a: 1 };
    expect(omitNullish(obj)).not.toBe(obj);
  });
});

// ---------------------------------------------------------------------------
// pick
// ---------------------------------------------------------------------------

describe('pick', () => {
  it('picks specified keys from an object', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('ignores keys not present in the object', () => {
    expect(pick({ a: 1 } as Record<string, unknown>, ['a', 'z' as 'a'])).toEqual({ a: 1 });
  });

  it('returns an empty object when keys array is empty', () => {
    expect(pick({ a: 1, b: 2 }, [])).toEqual({});
  });

  it('returns all keys when all are specified', () => {
    expect(pick({ a: 1, b: 2 }, ['a', 'b'])).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// omit
// ---------------------------------------------------------------------------

describe('omit', () => {
  it('omits specified keys from an object', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('returns the full object when keys array is empty', () => {
    expect(omit({ a: 1, b: 2 }, [])).toEqual({ a: 1, b: 2 });
  });

  it('returns an empty object when all keys are omitted', () => {
    expect(omit({ a: 1, b: 2 }, ['a', 'b'])).toEqual({});
  });

  it('handles keys that do not exist in the object gracefully', () => {
    expect(omit({ a: 1 } as Record<string, unknown>, ['z' as 'a'])).toEqual({ a: 1 });
  });
});

// ---------------------------------------------------------------------------
// unique
// ---------------------------------------------------------------------------

describe('unique', () => {
  it('removes duplicate primitive values', () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });

  it('removes duplicate strings', () => {
    expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('returns an empty array for an empty input', () => {
    expect(unique([])).toEqual([]);
  });

  it('returns the same values when all are already unique', () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('keeps first occurrence order', () => {
    expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------

describe('groupBy', () => {
  it('groups array items by a key', () => {
    const input = [
      { type: 'a', val: 1 },
      { type: 'b', val: 2 },
      { type: 'a', val: 3 },
    ];
    expect(groupBy(input, 'type')).toEqual({
      a: [
        { type: 'a', val: 1 },
        { type: 'a', val: 3 },
      ],
      b: [{ type: 'b', val: 2 }],
    });
  });

  it('returns an empty object for an empty array', () => {
    expect(groupBy([], 'type')).toEqual({});
  });

  it('creates a group with all items when all share the same key value', () => {
    const input = [{ k: 'x' }, { k: 'x' }];
    expect(groupBy(input, 'k')).toEqual({ x: [{ k: 'x' }, { k: 'x' }] });
  });
});

// ---------------------------------------------------------------------------
// chunk
// ---------------------------------------------------------------------------

describe('chunk', () => {
  it('splits an array into chunks of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns a single chunk when size exceeds array length', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it('returns an empty array for an empty input', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('returns individual element arrays when size is 1', () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });

  it('handles a chunk size equal to the array length', () => {
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });
});

// ---------------------------------------------------------------------------
// isDefined
// ---------------------------------------------------------------------------

describe('isDefined', () => {
  it('returns true for a non-null, non-undefined value', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined([])).toBe(true);
  });

  it('returns false for null', () => {
    expect(isDefined(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDefined(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isNonEmptyString
// ---------------------------------------------------------------------------

describe('isNonEmptyString', () => {
  it('returns true for a normal string', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('returns false for a whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNonEmptyString(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNonEmptyString(undefined)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isNonEmptyString(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tryCatch
// ---------------------------------------------------------------------------

describe('tryCatch', () => {
  it('returns [data, null] when the promise resolves', async () => {
    const [data, err] = await tryCatch(Promise.resolve(42));
    expect(data).toBe(42);
    expect(err).toBeNull();
  });

  it('returns [null, Error] when the promise rejects with an Error', async () => {
    const [data, err] = await tryCatch(Promise.reject(new Error('boom')));
    expect(data).toBeNull();
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe('boom');
  });

  it('wraps a non-Error rejection in an Error', async () => {
    const [data, err] = await tryCatch(Promise.reject('string rejection'));
    expect(data).toBeNull();
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toBe('string rejection');
  });

  it('works with a resolved object value', async () => {
    const [data, err] = await tryCatch(Promise.resolve({ id: 1 }));
    expect(data).toEqual({ id: 1 });
    expect(err).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sleep
// ---------------------------------------------------------------------------

describe('sleep', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves after the given delay', async () => {
    const done = jest.fn();
    sleep(500).then(done);

    expect(done).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    await Promise.resolve(); // flush microtask queue
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('does not resolve before the delay', async () => {
    const done = jest.fn();
    sleep(1000).then(done);

    jest.advanceTimersByTime(999);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
  });
});
