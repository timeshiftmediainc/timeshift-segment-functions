const { setupSegmentGlobals, teardownSegmentGlobals, DropEvent, RetryError, EventNotSupported } = require('../../../shared/__tests__/setup');

let fns;

beforeEach(() => {
	setupSegmentGlobals();
	delete require.cache[require.resolve('../transform-to-timeshift')];
	fns = require('../transform-to-timeshift');
});

afterEach(() => {
	teardownSegmentGlobals();
	jest.restoreAllMocks();
});

const settings = {
	apiHost: 'https://api.example.com',
	brand: 'channelYoga',
	timeshiftApiBearerToken: 'test-token',
};

describe('onTrack', () => {
	it('drops event when userId is missing', async () => {
		const event = { userId: '', event: 'Page Viewed', properties: {} };
		await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
	});

	it('drops event when brand property is missing', async () => {
		const event = { userId: 'user-1', event: 'Page Viewed', properties: {} };
		await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
	});

	it('returns event when userId and brand are present', async () => {
		const event = {
			userId: 'user-1',
			event: 'Page Viewed',
			properties: { brand: 'Channel Yoga' },
		};
		const result = await fns.onTrack(event, settings);
		expect(result).toBe(event);
	});
});

describe('onIdentify', () => {
	it('transforms traits when identity is found', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ channelYoga: 'cust-1', timeshift: 'ts-uuid-123' }),
		});

		const event = {
			userId: 'cust-1',
			traits: {
				email: 'jane@example.com',
				first_name: 'Jane',
				last_name: 'Doe',
				plan_status: 'active',
			},
		};
		const result = await fns.onIdentify(event, settings);

		expect(result.userId).toBe('ts-uuid-123');
		expect(result.traits.brands.channelYoga).toBeDefined();
		expect(result.traits.brands.channelYoga.planStatus).toBe('active');
		expect(result.traits.email).toBe('jane@example.com');
		expect(result.traits.firstName).toBe('Jane');
		expect(result.traits.lastName).toBe('Doe');
	});

	it('retries on 5xx server errors', async () => {
		global.fetch.mockResolvedValueOnce({ status: 500 });

		const event = {
			userId: 'cust-1',
			traits: { email: 'jane@example.com' },
		};
		await expect(fns.onIdentify(event, settings)).rejects.toThrow(RetryError);
	});

	it('drops event when identity not found and created_at is not recent', async () => {
		global.fetch.mockResolvedValueOnce({ status: 404 });

		const event = {
			userId: 'cust-1',
			traits: {
				email: 'jane@example.com',
				created_at: '2020-01-01T00:00:00Z',
			},
		};
		await expect(fns.onIdentify(event, settings)).rejects.toThrow(DropEvent);
	});

	it('retries once when created_at is recent, then succeeds', async () => {
		global.fetch
			.mockResolvedValueOnce({ status: 404 })
			.mockResolvedValueOnce({
				status: 200,
				json: async () => ({ channelYoga: 'cust-1', timeshift: 'ts-uuid-123' }),
			});

		const event = {
			userId: 'cust-1',
			traits: {
				email: 'jane@example.com',
				created_at: new Date().toISOString(),
			},
		};
		const result = await fns.onIdentify(event, settings);
		expect(result.userId).toBe('ts-uuid-123');
	});
});

describe('unsupported events', () => {
	it('throws EventNotSupported for group', async () => {
		await expect(fns.onGroup({}, settings)).rejects.toThrow(EventNotSupported);
	});

	it('throws EventNotSupported for page', async () => {
		await expect(fns.onPage({}, settings)).rejects.toThrow(EventNotSupported);
	});

	it('throws EventNotSupported for screen', async () => {
		await expect(fns.onScreen({}, settings)).rejects.toThrow(EventNotSupported);
	});

	it('throws EventNotSupported for alias', async () => {
		await expect(fns.onAlias({}, settings)).rejects.toThrow(EventNotSupported);
	});

	it('throws EventNotSupported for delete', async () => {
		await expect(fns.onDelete({}, settings)).rejects.toThrow(EventNotSupported);
	});
});
