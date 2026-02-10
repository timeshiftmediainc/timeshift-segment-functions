const { camelToTitleWithSpaces, snakeToCamel } = require('../helpers');

describe('camelToTitleWithSpaces', () => {
	it('converts camelCase to Title With Spaces', () => {
		expect(camelToTitleWithSpaces('pilatesAnytime')).toBe('Pilates Anytime');
	});

	it('capitalizes a single lowercase word', () => {
		expect(camelToTitleWithSpaces('yoga')).toBe('Yoga');
	});

	it('handles multiple humps', () => {
		expect(camelToTitleWithSpaces('channelYogaAnytime')).toBe('Channel Yoga Anytime');
	});

	it('does not produce leading space when first letter is already uppercase', () => {
		// Known quirk: input should be camelCase (lowercase first letter)
		expect(camelToTitleWithSpaces('PilatesAnytime')).toBe('Pilates Anytime');
	});
});

describe('snakeToCamel', () => {
	it('converts snake_case keys to camelCase', () => {
		expect(snakeToCamel({ plan_status: 'active' })).toEqual({ planStatus: 'active' });
	});

	it('handles nested objects', () => {
		const input = { user_info: { first_name: 'Jane', last_name: 'Doe' } };
		const expected = { userInfo: { firstName: 'Jane', lastName: 'Doe' } };
		expect(snakeToCamel(input)).toEqual(expected);
	});

	it('handles arrays', () => {
		const input = [{ first_name: 'Jane' }, { first_name: 'John' }];
		const expected = [{ firstName: 'Jane' }, { firstName: 'John' }];
		expect(snakeToCamel(input)).toEqual(expected);
	});

	it('returns primitives as-is', () => {
		expect(snakeToCamel('hello')).toBe('hello');
		expect(snakeToCamel(42)).toBe(42);
		expect(snakeToCamel(null)).toBe(null);
		expect(snakeToCamel(undefined)).toBe(undefined);
	});

	it('handles keys with no underscores', () => {
		expect(snakeToCamel({ email: 'a@b.com' })).toEqual({ email: 'a@b.com' });
	});

	it('handles multiple underscores', () => {
		expect(snakeToCamel({ my_long_key_name: 'val' })).toEqual({ myLongKeyName: 'val' });
	});
});
