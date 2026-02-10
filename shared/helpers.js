/**
 * Convert camelCase string to Title Case With Spaces.
 * e.g. "pilatesAnytime" → "Pilates Anytime"
 * @param {string} str
 * @returns {string}
 */
function camelToTitleWithSpaces(str) {
	const result = str.replace(/([A-Z])/g, ' $1');
	return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Recursively convert all object keys from snake_case to camelCase.
 * Arrays are traversed, non-objects returned as-is.
 * @param {*} obj
 * @returns {*}
 */
function snakeToCamel(obj) {
	if (typeof obj !== 'object' || obj === null) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(item => snakeToCamel(item));
	}

	const newObj = {};
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
			newObj[camelKey] = snakeToCamel(obj[key]);
		}
	}
	return newObj;
}

module.exports = { camelToTitleWithSpaces, snakeToCamel };
