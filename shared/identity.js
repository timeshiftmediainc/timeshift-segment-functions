const crypto = require('crypto');

/* this salt string is used to ensure that the generated userId is unique to Timeshift and cannot be easily reverse-engineered from the email alone.
 * It should be kept secret and not shared publicly.
 * The same string is also used in the timeshift-platform-api to generate userIds from email addresses.
 */
const TIMESHIFT_SALT = 'timeshiftMEDIA@@@@@@@@@@@@@@@@@@@@@@@@@';

/**
 * Generate a deterministic Timeshift userId from an email address.
 * Produces a UUID-formatted string from a SHA256 hash of (email + salt).
 * @param {string} email
 * @returns {string} UUID-formatted userId
 */
function generateTimeshiftUserId(email) {
	const normalized = email.trim().toLowerCase();
	const hash = crypto
		.createHash('sha256')
		.update(`${normalized}${TIMESHIFT_SALT}`)
		.digest('hex');
	return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

module.exports = { generateTimeshiftUserId, TIMESHIFT_SALT };
