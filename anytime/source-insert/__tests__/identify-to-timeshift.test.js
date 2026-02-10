const { setupSegmentGlobals, teardownSegmentGlobals } = require('../../../shared/__tests__/setup');

let fns;
let mocks;

beforeEach(() => {
	mocks = setupSegmentGlobals();
	// Clear module cache so globals are picked up fresh
	delete require.cache[require.resolve('../identify-to-timeshift')];
	fns = require('../identify-to-timeshift');
});

afterEach(() => {
	teardownSegmentGlobals();
	jest.restoreAllMocks();
});

const settings = {
	apiHost: 'https://api.example.com',
	brand: 'pilatesAnytime',
	timeshiftApiBearerToken: 'test-token',
};

describe('onTrack', () => {
	it('returns the event unchanged', async () => {
		const event = { userId: '123', event: 'Page Viewed' };
		const result = await fns.onTrack(event, settings);
		expect(result).toBe(event);
	});
});

describe('onIdentify', () => {
	it('returns event unchanged when identity already exists', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ pilatesAnytime: 'cust-1', timeshift: 'ts-uuid' }),
		});

		const event = {
			userId: 'cust-1',
			traits: { email: 'jane@example.com' },
		};
		const result = await fns.onIdentify(event, settings);
		expect(result).toBe(event);
		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(global.fetch).toHaveBeenCalledWith(
			'https://api.example.com/user/v1/identity/pilatesAnytime/cust-1',
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('creates identity via POST when 404 is returned', async () => {
		global.fetch
			.mockResolvedValueOnce({ status: 404 }) // GET returns 404
			.mockResolvedValueOnce({ status: 201 }); // POST succeeds

		const event = {
			userId: 'cust-1',
			traits: { email: 'jane@example.com' },
		};
		const result = await fns.onIdentify(event, settings);
		expect(result).toBe(event);

		// Verify POST was made
		expect(global.fetch).toHaveBeenCalledTimes(2);
		const postCall = global.fetch.mock.calls[1];
		expect(postCall[0]).toBe('https://api.example.com/user/v1/identity');
		expect(postCall[1].method).toBe('POST');

		const body = JSON.parse(postCall[1].body);
		expect(body.pilatesAnytime).toBe('cust-1');
		expect(body.timeshift).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
	});

	it('generates deterministic userId from email hash', async () => {
		global.fetch
			.mockResolvedValueOnce({ status: 404 })
			.mockResolvedValueOnce({ status: 201 });

		const event = {
			userId: 'cust-1',
			traits: { email: 'jane@example.com' },
		};
		await fns.onIdentify(event, settings);

		const body1 = JSON.parse(global.fetch.mock.calls[1][1].body);

		// Reset and run again — should produce the same userId
		global.fetch
			.mockResolvedValueOnce({ status: 404 })
			.mockResolvedValueOnce({ status: 201 });

		await fns.onIdentify({ ...event }, settings);

		const body2 = JSON.parse(global.fetch.mock.calls[3][1].body);
		expect(body1.timeshift).toBe(body2.timeshift);
	});
});
