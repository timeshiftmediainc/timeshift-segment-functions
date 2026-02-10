/**
 * Handle track event
 * @param  {SegmentTrackEvent} event
 * @param  {FunctionSettings} settings
 */
async function onTrack(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/track/
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
	const customerId = event.userId;
	const getEndpoint = `${settings.apiHost}/user/v1/identity/${settings.brand}/${customerId}`;
	const getResponse = await fetch(getEndpoint, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${settings.timeshiftApiBearerToken}`,
			'Content-Type': 'application/json'
		}
	});
	if (getResponse.status === 404) {
		// identity does not exist yet, so we need to create it
		const hash = crypto
			.createHash('sha256')
			.update(`${event.traits.email}timeshiftMEDIA@@@@@@@@@@@@@@@@@@@@@@@@@`)
			.digest('hex');
		const userId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
		const endpoint = `${settings.apiHost}/user/v1/identity`;
		const postResponse = await fetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${settings.timeshiftApiBearerToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ [settings.brand]: customerId, timeshift: userId })
		});
		console.log(
			`POST'd identity for ${settings.brand} ${customerId} : ${userId}`
		);
	}
	console.log(event);
	return event;
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

if (typeof module !== 'undefined') {
	module.exports = { onTrack, onIdentify, onGroup, onPage, onScreen, onAlias, onDelete };
}
