/**
 * Compares two values to determine if they are different.
 *
 * This function performs a deep comparison for objects and arrays,
 * ensuring that nested structures are also compared. Primitive values
 * are compared using strict equality. Returns `true` if the values
 * are different and `false` if they are the same.
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @returns `true` if the values are different, otherwise `false`.
 *
 * @example
 * diff(1, 2); // true
 * diff({ a: 1 }, { a: 1 }); // false
 * diff([1, 2], [1, 2, 3]); // true
 * diff(null, undefined); // true
 */
export function diff(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		// If they are the same (using Object.is), return false (no difference)
		return false;
	}

	// If either is null or not an object, we can compare them directly
	if (
		a === null ||
		b === null ||
		typeof a !== "object" ||
		typeof b !== "object"
	) {
		return a !== b;
	}

	// If both are arrays, compare their elements
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			return true;
		}
		for (let i = 0; i < a.length; i++) {
			if (diff(a[i], b[i])) {
				return true;
			}
		}
		return false;
	}

	// If either is an array but not both, they are different
	if (Array.isArray(a) || Array.isArray(b)) {
		return true;
	}

	// Compare object keys and their values
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) {
		return true;
	}

	for (const key of keysA) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
		if (!keysB.includes(key) || diff((a as any)[key], (b as any)[key])) {
			return true;
		}
	}

	return false; // No differences found
}
