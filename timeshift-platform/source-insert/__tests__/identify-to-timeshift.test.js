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

    it('returns the event object', async () => {
        const event = { properties: { brand: 'Test' } };
        const result = await fns.onTrack(event, settings);
        expect(result).toBe(event);
    });
});

describe('onIdentify', () => {
    it('nests traits under brand_channelYoga by default', async () => {
        const event = {
            userId: 'ts-user-1',
            traits: { email: 'jane@example.com', plan_status: 'active' },
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.traits.brand_channelYoga).toBeDefined();
        expect(result.traits.brand_channelYoga.email).toBe('jane@example.com');
        expect(result.traits.brand_channelYoga.plan_status).toBe('active');
    });

    it('uses brand trait for nesting key when specified', async () => {
        const event = {
            userId: 'ts-user-1',
            traits: { brand: 'pilatesAnytime', email: 'jane@example.com' },
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.traits.brand_pilatesAnytime).toBeDefined();
        expect(result.traits.brand_pilatesAnytime.email).toBe('jane@example.com');
    });

    it('does not re-nest traits that already have a single brand_ key', async () => {
        const event = {
            userId: 'ts-user-1',
            traits: { brand_channelYoga: { planStatus: 'active' } },
        };
        const result = await fns.onIdentify(event, settings);
        expect(result.traits.brand_channelYoga).toBeDefined();
        expect(result.traits.brand_channelYoga.planStatus).toBe('active');
    });

    it('handles empty traits', async () => {
        const event = { userId: 'ts-user-1', traits: {} };
        const result = await fns.onIdentify(event, settings);
        expect(result).toBe(event);
    });

    it('returns the event object', async () => {
        const event = { userId: 'ts-user-1', traits: { email: 'test@test.com' } };
        const result = await fns.onIdentify(event, settings);
        expect(result).toBe(event);
    });
});

describe('camelToTitleWithSpaces (exported helper)', () => {
    it('converts camelCase to Title With Spaces', () => {
        expect(fns.camelToTitleWithSpaces('channelYoga')).toBe('Channel Yoga');
    });

    it('converts single word', () => {
        expect(fns.camelToTitleWithSpaces('yoga')).toBe('Yoga');
    });

    it('handles already capitalized first letter', () => {
        expect(fns.camelToTitleWithSpaces('ChannelYoga')).toBe('Channel Yoga');
    });
});

describe('passthrough events', () => {
    it('onGroup returns event unchanged', async () => {
        const event = { groupId: 'g1' };
        const result = await fns.onGroup(event, settings);
        expect(result).toBe(event);
    });

    it('onPage returns event unchanged', async () => {
        const event = { name: 'Home' };
        const result = await fns.onPage(event, settings);
        expect(result).toBe(event);
    });

    it('onScreen returns event unchanged', async () => {
        const event = { name: 'Dashboard' };
        const result = await fns.onScreen(event, settings);
        expect(result).toBe(event);
    });

    it('onAlias returns event unchanged', async () => {
        const event = { previousId: 'old', userId: 'new' };
        const result = await fns.onAlias(event, settings);
        expect(result).toBe(event);
    });

    it('onDelete returns event unchanged', async () => {
        const event = { userId: 'u1' };
        const result = await fns.onDelete(event, settings);
        expect(result).toBe(event);
    });
});
