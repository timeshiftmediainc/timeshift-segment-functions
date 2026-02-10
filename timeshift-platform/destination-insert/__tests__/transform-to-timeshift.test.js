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

    it('drops event when userId is undefined', async () => {
        const event = { event: 'Page Viewed', properties: { brand: 'Channel Yoga' } };
        await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
    });

    it('drops event when brand property is missing', async () => {
        const event = { userId: 'user-1', event: 'Page Viewed', properties: {} };
        await expect(fns.onTrack(event, settings)).rejects.toThrow(DropEvent);
    });

    it('drops event when properties is missing entirely', async () => {
        const event = { userId: 'user-1', event: 'Page Viewed' };
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
    it('transforms traits by nesting under brand_channelYoga with camelCase keys', async () => {
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

        // userId is NOT transformed (no API call)
        expect(result.userId).toBe('cust-1');
        // traits are nested under brand_channelYoga with snake_to_camel conversion
        expect(result.traits.brand_channelYoga).toBeDefined();
        expect(result.traits.brand_channelYoga.planStatus).toBe('active');
        // email, firstName, lastName are copied to root traits level
        expect(result.traits.email).toBe('jane@example.com');
        expect(result.traits.firstName).toBe('Jane');
        expect(result.traits.lastName).toBe('Doe');
    });

    it('uses default brand channelYoga when brand trait is not specified', async () => {
        const event = {
            userId: 'cust-1',
            traits: {
                email: 'jane@example.com',
            },
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.traits.brand_channelYoga).toBeDefined();
        expect(result.traits.email).toBe('jane@example.com');
    });

    it('uses specified brand trait for nesting', async () => {
        const event = {
            userId: 'cust-1',
            traits: {
                brand: 'pilatesAnytime',
                email: 'jane@example.com',
                plan_status: 'trial',
            },
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.traits.brand_pilatesAnytime).toBeDefined();
        expect(result.traits.brand_pilatesAnytime.planStatus).toBe('trial');
        expect(result.traits.email).toBe('jane@example.com');
    });

    it('does not re-nest traits that already have a single brand_ key', async () => {
        const event = {
            userId: 'cust-1',
            traits: {
                brand_channelYoga: { planStatus: 'active' },
            },
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.traits.brand_channelYoga).toBeDefined();
        expect(result.traits.brand_channelYoga.planStatus).toBe('active');
    });

    it('handles empty traits gracefully', async () => {
        const event = {
            userId: 'cust-1',
            traits: {},
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.userId).toBe('cust-1');
    });

    it('handles missing traits gracefully', async () => {
        const event = {
            userId: 'cust-1',
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.userId).toBe('cust-1');
    });

    it('uses username as email when email is not present', async () => {
        const event = {
            userId: 'cust-1',
            traits: {
                username: 'jane@example.com',
            },
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.traits.email).toBe('jane@example.com');
    });
});

describe('snakeToCamel', () => {
    it('converts snake_case keys to camelCase', () => {
        const input = { plan_status: 'active', first_name: 'Jane' };
        const result = fns.snakeToCamel(input);
        expect(result).toEqual({ planStatus: 'active', firstName: 'Jane' });
    });

    it('handles nested objects', () => {
        const input = { outer_key: { inner_key: 'value' } };
        const result = fns.snakeToCamel(input);
        expect(result).toEqual({ outerKey: { innerKey: 'value' } });
    });

    it('handles arrays', () => {
        const input = [{ snake_key: 'value' }];
        const result = fns.snakeToCamel(input);
        expect(result).toEqual([{ snakeKey: 'value' }]);
    });

    it('returns primitives as-is', () => {
        expect(fns.snakeToCamel('hello')).toBe('hello');
        expect(fns.snakeToCamel(42)).toBe(42);
        expect(fns.snakeToCamel(null)).toBe(null);
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
