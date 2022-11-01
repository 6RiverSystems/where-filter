

// Where-like filter to support syntax expressions like:
// {a: 1}
// {and: [{a: 1}, {b: "2"}]}
// {or: [{a: 1}, {b: "2"}]}

function getValue(obj, path) {
	/* eslint-disable-next-line eqeqeq */
	if (obj == null) {
		return undefined;
	}

	if (path.indexOf('.') < 0) return obj[path];

	const keys = path.split('.');
	let val = obj;

	for (let i = 0, n = keys.length; i < n; i++) {
		val = val[keys[i]];
		/* eslint-disable-next-line eqeqeq */
		if (val == null) {
			return val;
		}
	}
	return val;
}

/**
 * Compare two values
 * @param {*} val1 The 1st value
 * @param {*} val2 The 2nd value
 * @return {number} 0: =, positive: >, negative <
 * @private
 */
function compare(val1, val2) {
	/* eslint-disable-next-line eqeqeq */
	if (val1 == null || val2 == null) {
		// Either val1 or val2 is null or undefined
		/* eslint-disable-next-line eqeqeq */
		return val1 == val2 ? 0 : NaN;
	}
	if (typeof val1 === 'number') {
		return val1 - val2;
	}
	if (typeof val1 === 'string') {
		if (val2 instanceof Date) {
			val1 = Date.parse(val1);
			return val1 - val2;
		}
		if (val1 > val2) {
			return 1;
		} else {
			if (val1 < val2) {
				return -1;
			} else {
				/* eslint-disable-next-line eqeqeq */
				if (val1 == val2) {
					return 0;
				}
			}
		}
		return NaN;
	}
	if (typeof val1 === 'boolean') {
		return val1 - val2;
	}
	if (val1 instanceof Date) {
		if (typeof val2 === 'string') {
			val2 = Date.parse(val2);
		}
		return val1 - val2;
	}
	// Return NaN if we don't know how to compare
	/* eslint-disable-next-line eqeqeq */
	return val1 == val2 ? 0 : NaN;
}


function testInEquality(example, val) {
	if ('gt' in example) {
		return compare(val, example.gt) > 0;
	}
	if ('gte' in example) {
		return compare(val, example.gte) >= 0;
	}
	if ('lt' in example) {
		return compare(val, example.lt) < 0;
	}
	if ('lte' in example) {
		return compare(val, example.lte) <= 0;
	}
	return false;
}


function toRegExp(pattern) {
	if (pattern instanceof RegExp) {
		return pattern;
	}
	let regex = '';

	// Escaping user input to be treated as a literal string within a regular expression
	// https://developer.mozilla.org/en-US/docs/Web/
	// JavaScript/Guide/Regular_Expressions#Writing_a_Regular_Expression_Pattern
	// pattern = pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');

	for (let i = 0, n = pattern.length; i < n; i++) {
		const char = pattern.charAt(i);

		if (char === '\\') {
			i++; // Skip to next char
			// match backslash-escaped chars verbatim, escape them in the regex too
			// but a trailing backslash only matches itself
			regex += i < n ? '\\' + pattern.charAt(i) : '\\\\';
		} else if (char === '%') {
			// sql substring wildcard
			regex += '.*';
		} else if (char === '_') {
			// sql single-char wildcard
			regex += '.';
		} else {
			// all other chars, including metachars, included in the regex as-is
			regex += char;
		}
	}
	return regex;
}

function test(example, value) {
	if (typeof value === 'string' && example instanceof RegExp) {
		return value.match(example);
	}

	if (example === undefined) {
		return undefined;
	}

	if (typeof example === 'object' && example !== null) {
		if (example.regexp) {
			return value ? value.match(example.regexp) : false;
		}

		if (example.inq) {
			for (let i = 0; i < example.inq.length; i++) {
				/* eslint-disable-next-line eqeqeq */
				if (example.inq[i] == value) {
					return true;
				}
			}
			return false;
		}

		if (example.nin) {
			for (let i = 0; i < example.nin.length; i++) {
				/* eslint-disable-next-line eqeqeq */
				if (example.nin[i] == value) {
					return false;
				}
			}
			return true;
		}

		if ('neq' in example) {
			return compare(example.neq, value) !== 0;
		}

		if ('eq' in example) {
			return compare(example.eq, value) === 0;
		}

		if ('between' in example) {
			return testInEquality({gte: example.between[0]}, value) &&
				testInEquality({lte: example.between[1]}, value);
		}

		if (example.like || example.nlike || example.ilike || example.nilike) {
			let like = example.like || example.nlike || example.ilike || example.nilike;

			if (typeof like === 'string') {
				like = toRegExp(like);
			}
			if (example.like) {
				return !!new RegExp(like).test(value);
			}

			if (example.nlike) {
				return !new RegExp(like).test(value);
			}

			if (example.ilike) {
				return !!new RegExp(like, 'i').test(value);
			}

			if (example.nilike) {
				return !new RegExp(like, 'i').test(value);
			}
		}


		if (testInEquality(example, value)) {
			return true;
		}

		// unlike mongo, test() does not match objects {a: 1} == {a: 1} and {a: 1} != {b: 1}
		// The fall-through default is to match as strings, often "[object Object]"
	}

	// not strict equality
	// CAUTION: objects are converted and compared as strings, ie "[object Object]"
	/* eslint-disable-next-line eqeqeq */
	return (example !== null ? example.toString() : example) == (value != null ? value.toString() : value);
}

function whereFilter(where) {
	if (typeof where === 'function') {
		return where;
	}

	const keys = Object.keys(where);

	return function(obj) {
		return keys.every(function(key) {
			// the expected value can identity-match only if value is string/number/boolean/null
			if (where[key] === obj[key]) return true;

			if (key === 'and' || key === 'or') {
				if (Array.isArray(where[key])) {
					if (key === 'and') {
						return where[key].every(function(cond) {
							return whereFilter(cond)(obj);
						});
					}
					if (key === 'or') {
						return where[key].some(function(cond) {
							return whereFilter(cond)(obj);
						});
					}
				}
			}

			const value = getValue(obj, key);

			if (Array.isArray(value)) {
				const matcher = where[key];

				if (matcher.some) {
					return value.some(function(v) {
						return whereFilter(matcher.some)(v);
					});
				}
				if (matcher.all) {
					return value.every(function(v) {
						return whereFilter(matcher.all)(v);
					});
				}

				// below is code for doing `arrayOfScalars: singleContainedValue`
				// or an `neq` variant of that

				// The following condition is for the case where we are querying with
				// a neq filter, and when the value is an empty array ([]).
				// the empty array [] matches all neq values
				// CAUTION: when an array of and-conditions is applied to an array, the test
				// will pass if each condition is matched by _any_ element in the array.
				if (matcher.neq !== undefined && value.length <= 0) {
					return true;
				}
				return value.some(function(v, i) {
					const cond = {};

					cond[i] = matcher;
					return whereFilter(cond)(value);
				});
			}

			if (test(where[key], value)) {
				return true;
			}

			// If we have a composed key a.b and b would resolve to a property of an object inside an array
			// then, we attempt to emulate mongo db matching. Helps for embedded relations
			const dotIndex = key.indexOf('.');
			if (dotIndex !== -1) {
				const subValue = obj[key.substring(0, dotIndex)];

				const subWhere = {};
				const subKey = key.substring(dotIndex + 1);

				subWhere[subKey] = where[key];
				if (Array.isArray(subValue)) {
					return subValue.some(whereFilter(subWhere));
				} else if (typeof subValue === 'object' && subValue !== null) {
					return whereFilter(subWhere)(subValue);
				}
			}

			return false;
		});
	};
}

module.exports = whereFilter;
