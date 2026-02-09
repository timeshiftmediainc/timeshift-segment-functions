/**
 * Handle track event
 * @param  {SegmentTrackEvent} event
 * @param  {FunctionSettings} settings
 */
async function onTrack(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/track/

	// default brand is "Channel Yoga"
	// we should remove this once the backend sends the brand
	if (!event.properties || !event.properties.brand) {
		event.properties.brand = 'Channel Yoga';
	}
	return event;
}

/**
 * Handle identify event
 * @param  {SegmentIdentifyEvent} event
 * @param  {FunctionSettings} settings
 */
/*
 * This function only POSTs to the Timeshift API to create (or append) the brand customerId to the Timeshift identity endpoint.
 * We'll transform the identify call's userId and traits later in the destination insert function.
 */
async function onIdentify(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/identify/
	const getEndpoint = `${settings.apiHost}/user/v1/identity/timeshift/${event.userId}`;
	const getResponse = await fetch(getEndpoint, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${settings.timeshiftApiBearerToken}`,
			'Content-Type': 'application/json'
		}
	});
	if (getResponse.status === 404) {
		// identity does not exist yet, so we need to create it
		const postEndpoint = `${settings.apiHost}/user/v1/identity`;
		const postResponse = await fetch(postEndpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${settings.timeshiftApiBearerToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ timeshift: event.userId })
		});
		console.log(
			`POST'd identity for timeshift ${event.userId}`
		);
	}

	let traits = event.traits || {};
	// traits need to be nested under a brand object
	if (event.traits) {
		let brand = 'Channel Yoga'; // default brand is "Channel Yoga"
		Object.keys(event.traits).forEach(key => {
			// if key starts with "brand_" then we know which brand it belongs to and we can nest it under the correct brand
			if (key.startsWith('brand_')) {
				brand = key.split('_')[1];
				brand = camelToTitleWithSpaces(brand);
			}
		});
	}

	console.log(event);
	return event;
}

/**
 * turn traits from { traits: { plan_status: 'active' } } to { traits: { 'brand_channelYoga': { plan_status: 'active' } } }
 * or leave a properly-shaped traits like { traits: { 'brand_channelYoga': { plan_status: 'active' } } } as is 
 * @param {*} traits 
 */
function normalizeTraitsForBrand(traits) {
	if (!traits) return traits;

	let normalizedTraits = {};
	Object.keys(traits).forEach(key => {
		if (key.startsWith('brand_')) {
			normalizedTraits[key] = traits[key];
		} else {
			normalizedTraits[`brand_channelYoga`][`${key}`] = traits[key];
		}
	});
	return normalizedTraits;
}

function camelToTitleWithSpaces(str) {
	const result = str.replace(/([A-Z])/g, ' $1'); // Insert space before capital letters
	return result.charAt(0).toUpperCase() + result.slice(1); // Capitalize the first letter
}

/**
 * Handle group event
 * @param  {SegmentGroupEvent} event
 * @param  {FunctionSettings} settings
 */
async function onGroup(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/group/
	return event;
}

/**
 * Handle page event
 * @param  {SegmentPageEvent} event
 * @param  {FunctionSettings} settings
 */
async function onPage(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/page/
	return event;
}

/**
 * Handle screen event
 * @param  {SegmentScreenEvent} event
 * @param  {FunctionSettings} settings
 */
async function onScreen(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/screen/
	return event;
}

/**
 * Handle alias event
 * @param  {SegmentAliasEvent} event
 * @param  {FunctionSettings} settings
 */
async function onAlias(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/alias/
	return event;
}

/**
 * Handle delete event
 * @param  {SegmentDeleteEvent} event
 * @param  {FunctionSettings} settings
 */
async function onDelete(event, settings) {
	// Learn more at https://segment.com/docs/partners/spec/#delete
	return event;
}
