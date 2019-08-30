import Define from "../../util/Define";

declare global {
	interface Array<T> {
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.  
		 * Note: Alias of `Array[0]`
		 */
		first (): T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Note: Alias of `Array[Array.length - 1]`
		 */
		last (): T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Note: Alias of `Array[index]`
		 */
		at (index: number): T | undefined;
	}

	interface ReadonlyArray<T> {
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.  
		 * Note: Alias of `Array[0]`
		 */
		first (): T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Note: Alias of `Array[Array.length - 1]`
		 */
		last (): T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Note: Alias of `Array[index]`
		 */
		at (index: number): T | undefined;
	}
}

Define(Array.prototype, "first", function () {
	return this[0];
});

Define(Array.prototype, "last", function () {
	return this[this.length - 1];
});

Define(Array.prototype, "at", function (index) {
	return this[index];
});
