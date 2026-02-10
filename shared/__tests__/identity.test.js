const { generateTimeshiftUserId } = require('../identity');

describe('generateTimeshiftUserId', () => {
	it('returns a UUID-formatted string', () => {
		const result = generateTimeshiftUserId('test@example.com');
		expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
	});

	it('is deterministic for the same email', () => {
		const a = generateTimeshiftUserId('test@example.com');
		const b = generateTimeshiftUserId('test@example.com');
		expect(a).toBe(b);
	});

	it('normalizes email (trim + lowercase)', () => {
		const a = generateTimeshiftUserId('Test@Example.com');
		const b = generateTimeshiftUserId('  test@example.com  ');
		expect(a).toBe(b);
	});

	it('produces different IDs for different emails', () => {
		const a = generateTimeshiftUserId('alice@example.com');
		const b = generateTimeshiftUserId('bob@example.com');
		expect(a).not.toBe(b);
	});
});
