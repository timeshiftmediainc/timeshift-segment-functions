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
	if (!event.properties || !event.properties.brand) {
		throw new DropEvent('brand property not provided');
	}
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

	let traits = event?.traits || {};
	// traits need to be nested under a brand object
	if (event.traits) {
		let brandName = traits?.brand || 'channelYoga'; // default brand is Channel Yoga

		// if event.traits has exactly 1 key and that key starts with "brand_" then we don't need to transform the traits
		// otherwise, put all traits under "brand_{brandName}"
		if (
			Object.keys(traits).length !== 1 ||
			!Object.keys(traits)[0].startsWith('brand_')
		) {
			traits = { [`brand_${brandName}`]: event.traits };
		}
	}
	event.traits = traits;

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

	console.log(JSON.stringify(event, null, 2));

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

if (typeof module !== 'undefined') {
	module.exports = {
		onTrack,
		onIdentify,
		onGroup,
		onPage,
		onScreen,
		onAlias,
		onDelete,
		camelToTitleWithSpaces,
		snakeToCamel
	};
}
