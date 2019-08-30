import Define from "../../util/Define";

declare global {
	interface Set<T> {
		/**
		 * Removes the values from this set that match the given predicate function.
		 * @param predicate A predicate that takes a value, and returns a value which will be checked for truthiness.
		 * @returns whether any values were deleted.
		 */
		deleteWhere (predicate: (val: T) => any): boolean;
	}
}

Define(Set.prototype, "deleteWhere", function (predicate) {
	let deleted = false;
	for (const value of Array.from(this))
		if (predicate(value) && this.delete(value))
			deleted = true;
	return deleted;
});
