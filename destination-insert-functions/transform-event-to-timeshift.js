/**
 * Handle track event
 * @param  {SegmentTrackEvent} event
 * @param  {FunctionSettings} settings
 */
async function onTrack(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/track/
	if (!event.userId || event.userId === '') {
		throw new DropEvent('userId not provided');
	}
	if (event.event === 'Account Created - Server') {
		//console.log("Account Created - Server, sleeping 2000 ms");
		new Promise(resolve => setTimeout(resolve, 2000));
	}
	const endpoint = `${settings.apiHost}/user/v1/identity/${settings.brand}/${event.userId}`;
	const ttl = 60; // TODO update to 60*60 for 1 hour for prod
	let identity = await cache.load(endpoint, ttl, async () => {
		try {
			const response = await fetch(endpoint, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${settings.timeshiftApiBearerToken}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.status >= 500 || response.status === 429) {
				// Retry on 5xx (server errors) and 429s (rate limits)
				throw new RetryError(`Failed with ${response.status}`);
			}

			// Iterable can't use an event without a timeshift userId
			if (response.status === 404) {
				if (
					event.event === 'Account Created - Server' &&
					event?.properties?.email
				) {
					const hash = crypto
						.createHash('sha256')
						.update(
							`${event.properties.email.trim().toLowerCase()}timeshiftMEDIA@@@@@@@@@@@@@@@@@@@@@@@@@`
						)
						.digest('hex');
					const userId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
					return { [settings.brand]: event.userId, timeshift: userId };
				} else {
					throw new DropEvent('Identity not found');
				}
			}

			return response.json();
		} catch (error) {
			// If it's already a RetryError or DropEvent, re-throw as-is
			if (error instanceof RetryError || error instanceof DropEvent) {
				throw error;
			}

			// Retry on connection errors and other unexpected errors
			throw new RetryError(`Connection or parsing error: ${error.message}`);
		}
	});

	// Iterable can't use an event without a timeshift userId
	if (!identity.timeshift) {
		throw new DropEvent('Identity not found');
	}
	event.userId = identity.timeshift;
	event.properties.brand = camelToTitleWithSpaces(settings.brand);

	console.log(event);

	return event;
}

/**
 * Handle identify event
 * @param  {SegmentIdentifyEvent} event
 * @param  {FunctionSettings} settings
 */
async function onIdentify(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/identify/
	const endpoint = `${settings.apiHost}/user/v1/identity/${settings.brand}/${event.userId}`;
	const ttl = 60; // TODO update to 60*60 for 1 hour for prod
	let identity = await cache.load(endpoint, ttl, async () => {
		try {
			let response = await fetch(endpoint, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${settings.timeshiftApiBearerToken}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.status >= 500 || response.status === 429) {
				// Retry on 5xx (server errors) and 429s (rate limits)
				throw new RetryError(`Failed with ${response.status}`);
			}

			// Iterable can't use an event without a timeshift userId
			if (response.status === 404) {
				// if event.traits.created_at exists and is within the last 5 minutes, sleep for 2 seconds and retry once
				if (
					event?.traits?.created_at &&
					new Date().getTime() - new Date(event.traits.created_at).getTime() <
						5 * 60 * 1000
				) {
					console.log(
						'Identity not found, but created_at is recent. Sleeping for 2 seconds and retrying.'
					);
					await new Promise(resolve => setTimeout(resolve, 2000));
					response = await fetch(endpoint, {
						method: 'GET',
						headers: {
							Authorization: `Bearer ${settings.timeshiftApiBearerToken}`,
							'Content-Type': 'application/json'
						}
					});
					if (response.status === 404) {
						throw new DropEvent(
							'Identity not found after retry, dropping event'
						);
					}
				} else {
					// Otherwise, drop the event
					throw new DropEvent(
						'Identity not found and created_at not recent, dropping event'
					);
				}
			}

			return response.json();
		} catch (error) {
			// If it's already a RetryError or DropEvent, re-throw as-is
			if (error instanceof RetryError || error instanceof DropEvent) {
				throw error;
			}

			// Retry on connection errors and other unexpected errors
			throw new RetryError(`Connection or parsing error: ${error.message}`);
		}
	});

	// Iterable can't use an event without a timeshift userId
	if (!identity.timeshift) {
		throw new DropEvent('Identity not found');
	}
	event.traits.customerId = event.userId;
	event.userId = identity.timeshift;

	// map all traits to brands.pilatesAnytime
	// some will be dropped by Iterable if they're not in the user field schema
	delete event.traits.userId;
	const traits = snakeToCamel(event.traits);
	delete event.traits;
	event.traits = { brands: { [settings.brand]: { ...traits } } };

	// email, firstName, lastName live at the root user field level
	if (traits.email || traits.username) {
		event.traits.email = traits.email || traits.username;
	}
	if (traits.firstName) {
		event.traits.firstName = traits.firstName;
	}
	if (traits.lastName) {
		event.traits.lastName = traits.lastName;
	}

	console.log(JSON.stringify(event, null, 4));

	return event;
}

function camelToTitleWithSpaces(str) {
	const result = str.replace(/([A-Z])/g, ' $1'); // Insert space before capital letters
	return result.charAt(0).toUpperCase() + result.slice(1); // Capitalize the first letter
}

function snakeToCamel(obj) {
	if (typeof obj !== 'object' || obj === null) {
		return obj; // Return non-objects and null as-is
	}

	if (Array.isArray(obj)) {
		return obj.map(item => snakeToCamel(item)); // Recursively process array elements
	}

	const newObj = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase()); // Convert snake_case to camelCase
			newObj[camelKey] = snakeToCamel(obj[key]); // Recursively process values
		}
	}
	return newObj;
}

/**
 * Handle group event
 * @param  {SegmentGroupEvent} event
 * @param  {FunctionSettings} settings
 */
async function onGroup(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/group/
	throw new EventNotSupported('group is not supported');
}

/**
 * Handle page event
 * @param  {SegmentPageEvent} event
 * @param  {FunctionSettings} settings
 */
async function onPage(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/page/
	throw new EventNotSupported('page is not supported');
}

/**
 * Handle screen event
 * @param  {SegmentScreenEvent} event
 * @param  {FunctionSettings} settings
 */
async function onScreen(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/screen/
	throw new EventNotSupported('screen is not supported');
}

/**
 * Handle alias event
 * @param  {SegmentAliasEvent} event
 * @param  {FunctionSettings} settings
 */
async function onAlias(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/alias/
	throw new EventNotSupported('alias is not supported');
}

/**
 * Handle delete event
 * @param  {SegmentDeleteEvent} event
 * @param  {FunctionSettings} settings
 */
async function onDelete(event, settings) {
	// Learn more at https://segment.com/docs/partners/spec/#delete
	throw new EventNotSupported('delete is not supported');
}
