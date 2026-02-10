const { setupSegmentGlobals, teardownSegmentGlobals } = require('../../../shared/__tests__/setup');

let fns;

beforeEach(() => {
	setupSegmentGlobals();
	delete require.cache[require.resolve('../identify-to-timeshift')];
	fns = require('../identify-to-timeshift');
});

afterEach(() => {
	teardownSegmentGlobals();
	jest.restoreAllMocks();
});

const settings = {
	apiHost: 'https://api.example.com',
	timeshiftApiBearerToken: 'test-token',
};

describe('onTrack', () => {
	it('sets default brand to "Channel Yoga" when brand is missing', async () => {
		const event = { properties: {} };
		const result = await fns.onTrack(event, settings);
		expect(result.properties.brand).toBe('Channel Yoga');
	});

	it('preserves existing brand property', async () => {
		const event = { properties: { brand: 'Custom Brand' } };
		const result = await fns.onTrack(event, settings);
		expect(result.properties.brand).toBe('Custom Brand');
	});

	it('sets brand when properties exists but brand is missing', async () => {
		const event = { properties: { other: 'value' } };
		const result = await fns.onTrack(event, settings);
		expect(result.properties.brand).toBe('Channel Yoga');
	});
});

describe('onIdentify', () => {
	it('returns event unchanged when identity already exists', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ timeshift: 'ts-user-1' }),
		});

		const event = { userId: 'ts-user-1', traits: {} };
		const result = await fns.onIdentify(event, settings);
		expect(result).toBe(event);
		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(global.fetch).toHaveBeenCalledWith(
			'https://api.example.com/user/v1/identity/timeshift/ts-user-1',
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('creates identity via POST when 404 is returned', async () => {
		global.fetch
			.mockResolvedValueOnce({ status: 404 })
			.mockResolvedValueOnce({ status: 201 });

		const event = { userId: 'ts-user-1', traits: {} };
		const result = await fns.onIdentify(event, settings);
		expect(result).toBe(event);

		// Verify POST body only contains timeshift userId (no brand customerId)
		const postCall = global.fetch.mock.calls[1];
		expect(postCall[0]).toBe('https://api.example.com/user/v1/identity');
		const body = JSON.parse(postCall[1].body);
		expect(body).toEqual({ timeshift: 'ts-user-1' });
	});
});

describe('camelToTitleWithSpaces (exported helper)', () => {
	it('converts camelCase to Title With Spaces', () => {
		expect(fns.camelToTitleWithSpaces('channelYoga')).toBe('Channel Yoga');
	});
});
