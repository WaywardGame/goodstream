import Define from "../../util/Define";

declare global {
	interface Array<T> {
		/**
		 * Remove `undefined` values from an array
		 */
		filterNullish (): Exclude<T, undefined | null>[];
		/**
		 * Remove all falsey values from an array (does not filter out `0` and `""`)
		 */
		filterFalsey (): Exclude<T, undefined | null | false>[];
		/**
		 * Remove all falsey values from an array, including `0` and `""`
		 */
		filterFalsey (removeZeroAndEmptyString: true): Exclude<T, undefined | null | false | 0 | "">[];
	}

	interface ReadonlyArray<T> {
		/**
		 * Remove `undefined` and `null` values from an array
		 */
		filterNullish (): Exclude<T, undefined | null>[];
		/**
		 * Remove all falsey values from an array (does not filter out `0` and `""`)
		 */
		filterFalsey (): Exclude<T, undefined | null | false>[];
		/**
		 * Remove all falsey values from an array, including `0` and `""`
		 */
		filterFalsey (removeZeroAndEmptyString: true): Exclude<T, undefined | null | false | 0 | "">[];
	}
}

Define(Array.prototype, "filterNullish", function (this: any[]) {
	return this.filter(v => v !== undefined && v !== null);
});
Define(Array.prototype, "filterFalsey", function (this: any[], removeZeroAndEmptyString: boolean = false) {
	return this.filter(v => removeZeroAndEmptyString ? v : v !== undefined && v !== null && v !== false);
});
