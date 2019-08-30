import Stream from "../../Stream";
import Define from "../../util/Define";

declare global {
	interface Array<T> {
		/**
		 * Returns a Stream that iterates over the values of an array.
		 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
		 * `step` entries. If a negative number, walks backwards through the array.
		 */
		stream (step?: number): Stream<T>;
		/**
		 * Returns a Stream that iterates over the entries of an array.
		 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
		 * `step` entries. If a negative number, walks backwards through the array.
		 */
		entryStream (step?: number): Stream<[number, T]>;
	}

	interface ReadonlyArray<T> {
		/**
		 * Returns a Stream that iterates over the values of an array.
		 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
		 * `step` entries. If a negative number, walks backwards through the array.
		 */
		stream (step?: number): Stream<T>;
		/**
		 * Returns a Stream that iterates over the entries of an array.
		 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
		 * `step` entries. If a negative number, walks backwards through the array.
		 */
		entryStream (step?: number): Stream<[number, T]>;
	}
}

Define(Array.prototype, "stream", function (step) {
	if (step === undefined) return Stream.from(this);
	return Stream.values(this, step);
});

Define(Array.prototype, "entryStream", function (step) {
	return Stream.entries(this, step);
});
