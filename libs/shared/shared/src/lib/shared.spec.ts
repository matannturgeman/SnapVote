import {
  paginate,
  successResponse,
  errorResponse,
  isDefined,
  omitUndefined,
  capitalize,
  toSnakeCase,
  deepFreeze,
} from './shared';

// ---------------------------------------------------------------------------
// paginate
// ---------------------------------------------------------------------------

describe('paginate', () => {
  it('returns correct shape for a standard page', () => {
    const result = paginate(['a', 'b', 'c'], 30, { page: 2, limit: 10 });
    expect(result).toEqual({
      data: ['a', 'b', 'c'],
      total: 30,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });

  it('calculates totalPages with a partial last page', () => {
    const result = paginate([1, 2], 22, { page: 3, limit: 10 });
    expect(result.totalPages).toBe(3);
  });

  it('calculates totalPages when items divide evenly', () => {
    const result = paginate([], 20, { page: 1, limit: 10 });
    expect(result.totalPages).toBe(2);
  });

  it('returns totalPages of 0 when total is 0', () => {
    const result = paginate([], 0, { page: 1, limit: 10 });
    expect(result.totalPages).toBe(0);
  });

  it('returns totalPages of 1 when total equals limit', () => {
    const result = paginate([1, 2, 3], 3, { page: 1, limit: 3 });
    expect(result.totalPages).toBe(1);
  });

  it('handles an empty data array', () => {
    const result = paginate<number>([], 0, { page: 1, limit: 25 });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('passes limit of 1 through correctly', () => {
    const result = paginate(['only'], 5, { page: 1, limit: 1 });
    expect(result.totalPages).toBe(5);
    expect(result.limit).toBe(1);
  });

  it('passes negative page through without modification', () => {
    // paginate is a pure data-wrapper; validation lives elsewhere
    const result = paginate([], 10, { page: -1, limit: 5 });
    expect(result.page).toBe(-1);
    expect(result.totalPages).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// successResponse
// ---------------------------------------------------------------------------

describe('successResponse', () => {
  it('returns 200 statusCode by default', () => {
    const res = successResponse({ id: 1 });
    expect(res.statusCode).toBe(200);
  });

  it('includes the provided data', () => {
    const data = { name: 'Alice' };
    const res = successResponse(data);
    expect(res.data).toBe(data);
  });

  it('accepts a custom status code', () => {
    const res = successResponse('created', 201);
    expect(res.statusCode).toBe(201);
  });

  it('includes the optional message when provided', () => {
    const res = successResponse(null, 200, 'All good');
    expect(res.message).toBe('All good');
  });

  it('leaves message undefined when not provided', () => {
    const res = successResponse(42);
    expect(res.message).toBeUndefined();
  });

  it('does not include an error field', () => {
    const res = successResponse({});
    expect(res.error).toBeUndefined();
  });

  it('handles null data', () => {
    const res = successResponse(null);
    expect(res.data).toBeNull();
    expect(res.statusCode).toBe(200);
  });

  it('handles array data', () => {
    const res = successResponse([1, 2, 3]);
    expect(res.data).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// errorResponse
// ---------------------------------------------------------------------------

describe('errorResponse', () => {
  it('returns 500 statusCode by default', () => {
    const res = errorResponse('Something went wrong');
    expect(res.statusCode).toBe(500);
  });

  it('includes the error message', () => {
    const res = errorResponse('Not found', 404);
    expect(res.error).toBe('Not found');
  });

  it('accepts a custom status code', () => {
    const res = errorResponse('Unauthorized', 401);
    expect(res.statusCode).toBe(401);
  });

  it('does not include a data field', () => {
    const res = errorResponse('Oops');
    expect(res.data).toBeUndefined();
  });

  it('does not include a message field', () => {
    const res = errorResponse('Oops');
    expect(res.message).toBeUndefined();
  });

  it('handles empty string as error message', () => {
    const res = errorResponse('');
    expect(res.error).toBe('');
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
    expect(isDefined({})).toBe(true);
    expect(isDefined([])).toBe(true);
  });

  it('returns false for null', () => {
    expect(isDefined(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDefined(undefined)).toBe(false);
  });

  it('returns true for number 0', () => {
    expect(isDefined(0)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isDefined('')).toBe(true);
  });

  it('works as a type guard in array filter', () => {
    const values: (string | null | undefined)[] = ['a', null, 'b', undefined, 'c'];
    const defined: string[] = values.filter(isDefined);
    expect(defined).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------
// omitUndefined
// ---------------------------------------------------------------------------

describe('omitUndefined', () => {
  it('removes keys whose value is undefined', () => {
    const result = omitUndefined({ a: 1, b: undefined, c: 'x' });
    expect(result).toEqual({ a: 1, c: 'x' });
    expect('b' in result).toBe(false);
  });

  it('keeps keys with null values', () => {
    const result = omitUndefined({ a: null, b: undefined });
    expect(result).toEqual({ a: null });
  });

  it('keeps keys with falsy non-undefined values', () => {
    const result = omitUndefined({ a: 0, b: false, c: '' });
    expect(result).toEqual({ a: 0, b: false, c: '' });
  });

  it('returns empty object when all values are undefined', () => {
    const result = omitUndefined({ x: undefined, y: undefined });
    expect(result).toEqual({});
  });

  it('returns same entries for an object with no undefined values', () => {
    const obj = { a: 1, b: 2 };
    expect(omitUndefined(obj)).toEqual({ a: 1, b: 2 });
  });

  it('handles empty input object', () => {
    expect(omitUndefined({})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// capitalize
// ---------------------------------------------------------------------------

describe('capitalize', () => {
  it('uppercases the first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('leaves the rest of the string unchanged', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });

  it('handles a single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('returns an already-capitalised string unchanged', () => {
    expect(capitalize('World')).toBe('World');
  });

  it('returns an empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles a string that starts with a digit', () => {
    expect(capitalize('123abc')).toBe('123abc');
  });

  it('handles a string with leading whitespace', () => {
    expect(capitalize(' hello')).toBe(' hello');
  });
});

// ---------------------------------------------------------------------------
// toSnakeCase
// ---------------------------------------------------------------------------

describe('toSnakeCase', () => {
  it('converts a simple camelCase word', () => {
    expect(toSnakeCase('helloWorld')).toBe('hello_world');
  });

  it('converts multiple humps', () => {
    expect(toSnakeCase('myVariableName')).toBe('my_variable_name');
  });

  it('leaves an already-lowercase string unchanged', () => {
    expect(toSnakeCase('hello')).toBe('hello');
  });

  it('prefixes the first letter with _ if the string starts with uppercase', () => {
    expect(toSnakeCase('Hello')).toBe('_hello');
  });

  it('handles a single uppercase letter', () => {
    expect(toSnakeCase('A')).toBe('_a');
  });

  it('handles empty string', () => {
    expect(toSnakeCase('')).toBe('');
  });

  it('handles consecutive uppercase letters (acronym style)', () => {
    expect(toSnakeCase('parseJSON')).toBe('parse_j_s_o_n');
  });
});

// ---------------------------------------------------------------------------
// deepFreeze
// ---------------------------------------------------------------------------

describe('deepFreeze', () => {
  it('freezes the top-level object', () => {
    const obj = deepFreeze({ a: 1 });
    expect(Object.isFrozen(obj)).toBe(true);
  });

  it('freezes nested objects', () => {
    const obj = deepFreeze({ outer: { inner: { value: 42 } } });
    expect(Object.isFrozen(obj.outer)).toBe(true);
    expect(Object.isFrozen(obj.outer.inner)).toBe(true);
  });

  it('freezes nested arrays', () => {
    const obj = deepFreeze({ items: [1, 2, 3] });
    expect(Object.isFrozen(obj.items)).toBe(true);
  });

  it('prevents mutation of top-level properties in strict mode', () => {
    const obj = deepFreeze({ x: 10 });
    expect(() => {
      'use strict';
      (obj as { x: number }).x = 99;
    }).toThrow();
  });

  it('prevents mutation of nested properties in strict mode', () => {
    const obj = deepFreeze({ nested: { y: 5 } });
    expect(() => {
      'use strict';
      (obj.nested as { y: number }).y = 50;
    }).toThrow();
  });

  it('returns the same object reference', () => {
    const original = { a: 1 };
    const frozen = deepFreeze(original);
    expect(frozen).toBe(original);
  });

  it('handles an empty object', () => {
    const obj = deepFreeze({});
    expect(Object.isFrozen(obj)).toBe(true);
  });

  it('handles objects with null property values without throwing', () => {
    const obj = deepFreeze({ a: null });
    expect(Object.isFrozen(obj)).toBe(true);
  });
});
