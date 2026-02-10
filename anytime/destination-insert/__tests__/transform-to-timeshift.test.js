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
	brand: 'pilatesAnytime',
	timeshiftApiBearerToken: 'test-token',
};

describe('onTrack', () => {
	it('drops event when userId is missing', async () => {
		const event = { userId: '', event: 'Page Viewed', properties: {} };
		await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
	});

	it('drops event when userId is null', async () => {
		const event = { event: 'Page Viewed', properties: {} };
		await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
	});

	it('transforms userId and adds brand property on success', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ pilatesAnytime: 'cust-1', timeshift: 'ts-uuid-123' }),
		});

		const event = {
			userId: 'cust-1',
			event: 'Page Viewed',
			properties: {},
		};
		const result = await fns.onTrack(event, settings);
		expect(result.userId).toBe('ts-uuid-123');
		expect(result.properties.brand).toBe('Pilates Anytime');
	});

	it('drops event when identity has no timeshift userId', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ pilatesAnytime: 'cust-1' }),
		});

		const event = {
			userId: 'cust-1',
			event: 'Page Viewed',
			properties: {},
		};
		await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
	});

	it('retries on 5xx server errors', async () => {
		global.fetch.mockResolvedValueOnce({ status: 500 });

		const event = {
			userId: 'cust-1',
			event: 'Page Viewed',
			properties: {},
		};
		await expect(fns.onTrack(event, settings)).rejects.toThrow(RetryError);
	});

	it('retries on 429 rate limit', async () => {
		global.fetch.mockResolvedValueOnce({ status: 429 });

		const event = {
			userId: 'cust-1',
			event: 'Page Viewed',
			properties: {},
		};
		await expect(fns.onTrack(event, settings)).rejects.toThrow(RetryError);
	});

	it('drops event on 404 for non-Account Created events', async () => {
		global.fetch.mockResolvedValueOnce({ status: 404 });

		const event = {
			userId: 'cust-1',
			event: 'Page Viewed',
			properties: {},
		};
		await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
	});

	it('creates identity on 404 for Account Created - Server with email', async () => {
		global.fetch.mockResolvedValueOnce({ status: 404 });

		const event = {
			userId: 'cust-1',
			event: 'Account Created - Server',
			properties: { email: 'jane@example.com' },
		};
		const result = await fns.onTrack(event, settings);
		expect(result.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
		expect(result.properties.brand).toBe('Pilates Anytime');
	});
});

describe('onIdentify', () => {
	it('transforms traits when identity is found', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ pilatesAnytime: 'cust-1', timeshift: 'ts-uuid-123' }),
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

		// userId should be replaced
		expect(result.userId).toBe('ts-uuid-123');

		// Traits should be nested under brands
		expect(result.traits.brands.pilatesAnytime).toBeDefined();
		expect(result.traits.brands.pilatesAnytime.planStatus).toBe('active');

		// email, firstName, lastName should be at root level
		expect(result.traits.email).toBe('jane@example.com');
		expect(result.traits.firstName).toBe('Jane');
		expect(result.traits.lastName).toBe('Doe');

		// customerId should be set to original userId
		expect(result.traits.brands.pilatesAnytime.customerId).toBe('cust-1');
	});

	it('converts snake_case trait keys to camelCase', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ pilatesAnytime: 'cust-1', timeshift: 'ts-uuid-123' }),
		});

		const event = {
			userId: 'cust-1',
			traits: {
				plan_status: 'active',
				subscription_type: 'monthly',
			},
		};
		const result = await fns.onIdentify(event, settings);

		const brandTraits = result.traits.brands.pilatesAnytime;
		expect(brandTraits.planStatus).toBe('active');
		expect(brandTraits.subscriptionType).toBe('monthly');
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

	it('drops event when identity not found and no created_at', async () => {
		global.fetch.mockResolvedValueOnce({ status: 404 });

		const event = {
			userId: 'cust-1',
			traits: { email: 'jane@example.com' },
		};
		await expect(fns.onIdentify(event, settings)).rejects.toThrow(DropEvent);
	});

	it('retries once when identity not found but created_at is recent, then succeeds', async () => {
		global.fetch
			.mockResolvedValueOnce({ status: 404 }) // first attempt
			.mockResolvedValueOnce({
				status: 200,
				json: async () => ({ pilatesAnytime: 'cust-1', timeshift: 'ts-uuid-123' }),
			}); // retry succeeds

		const event = {
			userId: 'cust-1',
			traits: {
				email: 'jane@example.com',
				created_at: new Date().toISOString(),
			},
		};
		const result = await fns.onIdentify(event, settings);
		expect(result.userId).toBe('ts-uuid-123');
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it('drops event when retry also returns 404', async () => {
		global.fetch
			.mockResolvedValueOnce({ status: 404 })
			.mockResolvedValueOnce({ status: 404 });

		const event = {
			userId: 'cust-1',
			traits: {
				email: 'jane@example.com',
				created_at: new Date().toISOString(),
			},
		};
		await expect(fns.onIdentify(event, settings)).rejects.toThrow(DropEvent);
	});

	it('drops event when identity has no timeshift userId', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ pilatesAnytime: 'cust-1' }),
		});

		const event = {
			userId: 'cust-1',
			traits: { email: 'jane@example.com' },
		};
		await expect(fns.onIdentify(event, settings)).rejects.toThrow(DropEvent);
	});

	it('uses username as email fallback', async () => {
		global.fetch.mockResolvedValueOnce({
			status: 200,
			json: async () => ({ pilatesAnytime: 'cust-1', timeshift: 'ts-uuid-123' }),
		});

		const event = {
			userId: 'cust-1',
			traits: {
				username: 'jdoe@example.com',
				first_name: 'Jane',
			},
		};
		const result = await fns.onIdentify(event, settings);
		expect(result.traits.email).toBe('jdoe@example.com');
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
