/**
 * Handle track event
 * @param  {SegmentTrackEvent} event
 * @param  {FunctionSettings} settings
 */
async function onTrack(event, settings) {
	// Learn more at https://segment.com/docs/connections/spec/track/

	// TODO handle mapping from PA/YA customerId to Timeshift userId

	// default brand is "Channel Yoga"
	// once the backend sends the brand, we should drop events missing the brand property
	if (!event.properties || !event.properties.brand) {
		event.properties.brand = 'Channel Yoga';
	}
	console.log(event);
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

	// TODO handle mapping from PA/YA customerId to Timeshift userId
	// TODO map the traits to brand_pilatesAnytime or brand_channelYoga ?
	// we may need to do this upstream at the Segment implementation because we might not know the brand

	let traits = event?.traits || {};
	// traits need to be nested under a brand object
	if (event.traits) {
		let brand = traits?.brand || 'channelYoga'; // default brand is Channel Yoga

		// if event.traits has exactly 1 key and that key starts with "brand_" then we don't need to transform the traits
		// otherwise, put all traits under "brand_{brandName}"
		if (
			Object.keys(traits).length !== 1 ||
			!Object.keys(traits)[0].startsWith('brand_')
		) {
			event.traits = { [`brand_${brand}`]: traits };
		}
	}

	console.log(event);
	return event;
}

function camelToTitleWithSpaces(str) {
	const result = str.replace(/([A-Z])/g, ' $1').trim(); // Insert space before capital letters
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

if (typeof module !== 'undefined') {
	module.exports = { onTrack, onIdentify, onGroup, onPage, onScreen, onAlias, onDelete, camelToTitleWithSpaces };
}
