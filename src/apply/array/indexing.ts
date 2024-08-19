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
		 * @param mapper Map the value to what will actually be returned
		 */
		first<R> (mapper: (value: T) => R): R | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Note: Alias of `Array[Array.length - 1]`
		 */
		last (): T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * @param mapper Map the value to what will actually be returned
		 */
		last<R> (mapper: (value: T) => R): R | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Works with negative numbers to get from the end.
		 */
		at<INDEX extends number> (index: INDEX): this extends { [KEY in INDEX]: infer T } ? T : T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Works with negative numbers to get from the end.
		 * @param mapper Map the value to what will actually be returned
		 */
		at<INDEX extends number, R> (index: INDEX, mapper: (value: this extends { [KEY in INDEX]: infer T } ? T : T | undefined) => R): this extends { [KEY in INDEX]: T } ? R : R | undefined;
	}

	interface ReadonlyArray<T> {
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.  
		 * Note: Alias of `Array[0]`
		 */
		first (): T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.  
		 * @param mapper Map the value to what will actually be returned
		 */
		first<R> (mapper: (value: T) => R): R | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Note: Alias of `Array[Array.length - 1]`
		 */
		last (): T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * @param mapper Map the value to what will actually be returned
		 */
		last<R> (mapper: (value: T) => R): R | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Works with negative numbers to get from the end.
		 */
		at<INDEX extends number> (index: INDEX): this extends { [KEY in INDEX]: infer T } ? T : T | undefined;
		/**
		 * Returns the last item in this array, or `undefined` if there are no items in this array.
		 * Works with negative numbers to get from the end.
		 * @param mapper Map the value to what will actually be returned
		 */
		at<INDEX extends number, R> (index: INDEX, mapper: (value: this extends { [KEY in INDEX]: infer T } ? T : T | undefined) => R): this extends { [KEY in INDEX]: T } ? R : R | undefined;
	}
}

Define(Array.prototype, "first", function (mapper) {
	if (!this.length)
		return undefined;

	const value = this[0];
	return mapper ? mapper(value) : value;
});

Define(Array.prototype, "last", function (mapper) {
	if (!this.length)
		return undefined;

	const value = this[this.length - 1];
	return mapper ? mapper(value) : value;
});

Define(Array.prototype, "at", function (index, mapper) {
	index = index < 0 ? this.length + index : index;
	if (index < 0 || index >= this.length)
		return undefined;

	const value = this[index];
	return mapper ? mapper(value) : value;
});
