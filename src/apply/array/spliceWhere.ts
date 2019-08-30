import Define from "../../util/Define";

declare global {
	interface Array<T> {
		/**
		 * Removes the values from this array that match the given predicate function.
		 * @param predicate A predicate that takes a value and its index in the array, and returns a value which will be checked for truthiness.
		 * 
		 * Note: Unlike `splice`, this method does *not* return the deleted values! This is due to performance reasons.
		 */
		spliceWhere (predicate: (val: T, index: number) => any): this;
	}
}

Define(Array.prototype, "spliceWhere", function (predicate) {
	// choose the faster method based on the array length
	if (this.length > 10) {
		let i = 0;
		this.splice(0, Infinity, ...this.filter(v => !predicate(v, i++)));

	} else {
		for (let i = 0; i < this.length; i++) {
			if (predicate(this[i], i)) {
				this.splice(i--, 1);
			}
		}
	}

	return this;
});
