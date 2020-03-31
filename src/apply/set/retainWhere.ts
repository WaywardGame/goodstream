import Define from "../../util/Define";

declare global {
	interface Set<T> {
		/**
		 * Retains the values from this set that match the given predicate function, any other values will be removed.
		 * @param predicate A predicate that takes a value, and returns a value which will be checked for truthiness.
		 * @returns whether any values remain.
		 */
		retainWhere (predicate: (val: T) => any): boolean;
	}
}

Define(Set.prototype, "retainWhere", function (predicate) {
	for (const value of Array.from(this))
		if (!predicate(value))
			this.delete(value);
	return this.size > 0;
});
