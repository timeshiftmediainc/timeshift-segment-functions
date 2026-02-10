/**
 * Test setup utilities for Segment Function tests.
 *
 * Segment Functions run in a sandboxed environment with implicit globals
 * (DropEvent, RetryError, EventNotSupported, fetch, cache, crypto).
 * This module injects mocks for those globals so function files can be
 * required in Jest without modification.
 */

class DropEvent extends Error {
	constructor(message) {
		super(message);
		this.name = 'DropEvent';
	}
}

class RetryError extends Error {
	constructor(message) {
		super(message);
		this.name = 'RetryError';
	}
}

class EventNotSupported extends Error {
	constructor(message) {
		super(message);
		this.name = 'EventNotSupported';
	}
}

/**
 * Install Segment globals before requiring a function file.
 * Call this in beforeEach() or at the top of your test file.
 *
 * Returns references to the mocks so tests can configure them.
 */
function setupSegmentGlobals() {
	global.DropEvent = DropEvent;
	global.RetryError = RetryError;
	global.EventNotSupported = EventNotSupported;
	global.fetch = jest.fn();
	global.crypto = require('crypto');
	global.cache = {
		load: jest.fn(async (key, ttl, loader) => loader()),
	};

	return {
		DropEvent,
		RetryError,
		EventNotSupported,
		fetch: global.fetch,
		cache: global.cache,
	};
}

/**
 * Clean up Segment globals after tests.
 */
function teardownSegmentGlobals() {
	delete global.DropEvent;
	delete global.RetryError;
	delete global.EventNotSupported;
	delete global.fetch;
	delete global.cache;
	// Don't delete global.crypto — it's a Node built-in
}

module.exports = {
	DropEvent,
	RetryError,
	EventNotSupported,
	setupSegmentGlobals,
	teardownSegmentGlobals,
};
