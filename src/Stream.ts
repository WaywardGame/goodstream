import FlatMapStream from "./FlatMapStream";
import { Streamable } from "./IStream";
import Partitions from "./Partitions";
import RangeStream from "./RangeStream";
import { choice, shuffle, tuple } from "./util/Arrays";
import { Override } from "./util/decorator/Override";
import { isIterable } from "./util/Iterables";

type Flat1<T> = T extends Iterable<infer X> ? X | Extract<T, string> | Exclude<T, Iterable<any>> : never;

export interface UnzippedPartitions<K, V> extends Streamable<["key", Stream<K>] | ["value", Stream<V>]> {
	get (partition: "key"): Stream<K>;
	get (partition: "value"): Stream<V>;
	keys (): Stream<K>;
	values (): Stream<V>;
	partitions (): Stream<["key", Stream<K>] | ["value", Stream<V>]>;
}

const LAST = Symbol();

/**
 * Note: When "splatting" a stream, it's actually faster (but not by much) to first collect it into an array:
 * ```ts
 * // slower
 * [...Stream.range(10)]
 *
 * // faster
 * [...Stream.range(10).toArray()]
 * ```
 */
export default abstract class Stream<T> implements Streamable<T>, Iterable<T> {

	public static empty<T = any> () {
		return Stream.of<T[]>();
	}

	public static from<T> (iterable: Iterable<T> | Streamable<T> | (() => IterableIterator<T>)): Stream<T> {
		if (typeof iterable === "function") iterable = iterable();
		return iterable instanceof StreamImplementation ? iterable :
			isIterable(iterable) ? new StreamImplementation((iterable)[Symbol.iterator]()) :
				new StreamImplementation(iterable);
	}

	public static of<A extends any[]> (...args: A): Stream<A[number]> {
		return Stream.from(args);
	}

	public static range (end: number): Stream<number>;
	public static range (start: number, end?: number, step?: number): Stream<number>;
	public static range (start: number, end?: number, step = 1): Stream<number> {
		if (end === undefined) {
			end = start;
			start = 0;
		}

		return Stream.from(new RangeStream(start, end, step));
	}

	/**
	 * Returns a Stream that iterates over the entries of a map, in key-value tuples.
	 */
	public static entries<K, V> (map?: Map<K, V>): Stream<[K, V]>;
	/**
	 * Returns a Stream that iterates over the entries of an array.
	 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
	 * `step` entries. If a negative number, walks backwards through the array.
	 */
	public static entries<T> (arr: T[], step?: number): Stream<[number, T]>;
	/**
	 * Returns a Stream that iterates over the entries of an object, in key-value tuples.
	 */
	public static entries<T extends object> (obj?: T): Stream<[Extract<keyof T, string>, T[Extract<keyof T, string>]]>;
	/**
	 * Returns a Stream that iterates over the entries of an object, in key-value tuples.
	 */
	public static entries<K, V> (obj?: any): Stream<[K, V]>;
	public static entries<T extends object> (obj?: T, step = 1): Stream<[any, any]> {
		if (obj === undefined) {
			return Stream.of() as any;
		}

		if (obj instanceof Map) {
			return new StreamImplementation(obj.entries()) as any;
		}

		if (Array.isArray(obj)) {
			return Stream.from(new ArrayEntriesStream(obj, step));
		}

		// todo: the following call can probably be made more efficient by looping the entries of the object manually
		// rather than calling `Object.entries` and making a Stream from that result array
		return Stream.from(Object.entries(obj));
	}

	/**
	 * Returns a Stream that iterates over the keys of a map.
	 */
	public static keys<K> (map: Map<K, any>): Stream<K>;
	/**
	 * Returns a Stream that iterates over the keys of an object.
	 */
	public static keys<T extends object> (obj: T): Stream<keyof T>;
	/**
	 * Returns a Stream that iterates over the keys of an object.
	 */
	public static keys<K extends string | number> (obj: { [key in K]: any }): Stream<K>;
	public static keys (obj: any): Stream<any> {
		if (obj instanceof Map) {
			return new StreamImplementation(obj.keys());
		}

		// todo: the following call can probably be made more efficient by looping the keys of the object manually
		// rather than calling `Object.keys` and making a Stream from that result array
		return Stream.from(Object.keys(obj));
	}

	/**
	 * Returns a Stream that iterates over the values of a map.
	 */
	public static values<V> (map: Map<any, V>): Stream<V>;
	/**
	 * Returns a Stream that iterates over the values of an array.
	 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
	 * `step` entries. If a negative number, walks backwards through the array.
	 */
	public static values<T> (arr: T[], step?: number): Stream<T>;
	/**
	 * Returns a Stream that iterates over the values of an object.
	 */
	public static values<T extends object> (obj: T): Stream<T[keyof T]>;
	public static values (obj: any, step = 1): Stream<any> {
		if (obj instanceof Map) {
			return new StreamImplementation(obj.values());
		}

		if (Array.isArray(obj)) {
			if (step === 1) {
				return Stream.from(obj);
			}

			return Stream.from(new ArrayStream(obj, step));
		}

		// todo: the following call can probably be made more efficient by looping the values of the object manually
		// rather than calling `Object.values` and making a Stream from that result array
		return Stream.from(Object.values(obj));
	}

	/**
	 * Takes two iterables representing "keys" and "values", and turns them into a Stream of 2-value tuples. The resulting
	 * Stream will end when either of the iterables runs out of items. (Its size will be that of the smaller of the two
	 * input iterables/streams).
	 */
	public static zip<K, V> (keysIterable: Iterable<K> | Stream<K>, valuesIterable: Iterable<V> | Stream<V>): Stream<[K, V]> {
		const values = valuesIterable instanceof Stream ? new StreamImplementation(valuesIterable) : Stream.from(valuesIterable);
		return (keysIterable instanceof Stream ? new StreamImplementation(keysIterable) : Stream.from(keysIterable))
			.takeWhile(() => {
				values.next();
				return !values.done;
			})
			.map((key: any) => tuple(key, values.value));
	}

	public done: boolean;
	public value: T;
	public abstract [Symbol.iterator] (): Iterator<T>;
	public abstract [Symbol.asyncIterator] (): AsyncIterableIterator<T extends Promise<infer R> ? R : never>;

	////////////////////////////////////
	// Manipulation
	//

	/**
	 * Returns a Stream that will loop only over the entries that match the given filter
	 * @param filter A function that returns a truthy value if the entry should be included and a falsey value if it shouldn't
	 *
	 * Note: The only difference between this method and `filter2` is the type argument: This method excludes the type argument,
	 * while the other returns it.
	 */
	public abstract filter<X = never> (filter: (val: T) => any): Stream<Exclude<T, X>>;

	/**
	 * Returns a Stream that will loop only over the entries that match the given filter
	 * @param filter A function that returns a truthy value if the entry should be included and a falsey value if it shouldn't
	 *
	 * Note: The only difference between this method and `filter` is the type argument: This method returns the type argument,
	 * while the other excludes it.
	 */
	public abstract filter2<X = T> (filter: (val: T) => any): Stream<X>;

	/**
	 * Returns a Stream of type X, using the given mapper function
	 * @param mapper A function that maps an entry of type T to its corresponding type X
	 */
	public abstract map<X> (mapper: (val: T) => X): Stream<X>;

	/**
	 * Returns a new Stream iterating over each value of the current iterator, first run through the given mapper function.
	 *
	 * For example:
	 * ```ts
	 * [[1, 2, 3], [4, 5, 6]]
	 * 	.flatMap(numberArray => numberArray
	 * 		.map(num => num + 1))
	 * // result: [2, 3, 4, 5, 6, 7]
	 * ```
	 */
	public abstract flatMap<X> (mapper: (value: T) => Iterable<X>): Stream<X>;
	/**
	 * Returns a new Stream iterating over every value of each value of this iterator. The values in this
	 * Stream must be iterable.
	 */
	public abstract flatMap (): Stream<Flat1<T>>;
	/**
	 * Returns a new Stream iterating over every value of each value of this Stream. The values in this
	 * Stream must be iterable.
	 */
	public abstract flatMap<X> (): Stream<X>;

	/**
	 * Returns a Stream which will only go through the first X items, where X is the given argument.
	 */
	public abstract take (amount: number): Stream<T>;

	/**
	 * Returns a Stream which will only iterate through the items in this Stream until the predicate doesn't match.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract takeWhile (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which will only iterate through the items in this Stream until the predicate matches.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract takeUntil (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which will skip the first X items, where X is the given argument.
	 */
	public abstract drop (amount: number): Stream<T>;

	/**
	 * Returns a Stream which will skip the items in this Stream until the predicate doesn't match.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract dropWhile (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which will skip the items in this Stream until the predicate matches.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract dropUntil (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which steps through the items in the current Stream using the provided step amount.
	 * @param step A non-zero integer. Positive integers will step forwards through the Stream, negative integers
	 * will step backwards.
	 *
	 * Note: Stepping backwards will require iteration through this entire Stream.
	 */
	public abstract step (step: number): Stream<T>;

	/**
	 * Returns a new Stream which contains the sorted contents of this stream. The values are sorted in ascending ASCII order.
	 */
	public abstract sorted (): Stream<T>;
	/**
	 * Returns a new Stream which contains the sorted contents of this Stream.
	 * @param comparator A function that returns a "difference" between `a` and `b`, for sorting by.
	 */
	public abstract sorted (comparator: (a: T, b: T) => number): Stream<T>;

	/**
	 * Returns a new Stream which contains the contents of this Stream, in reverse order.
	 */
	public abstract reverse (): Stream<T>;

	/**
	 * Returns a new Stream which contains only unique items in this Stream.
	 *
	 * Note: Alias of `Stream.from(stream.toSet())`
	 */
	public abstract distinct (): Stream<T>;

	/**
	 * Returns a new Stream of the shuffled items in this Stream.
	 */
	public abstract shuffle (random?: () => number): Stream<T>;

	/**
	 * Returns a `Partitions` instance which allows sorting items of this Stream into separate sub-streams, or "partitions".
	 * @param sorter A function which takes an item in this Stream and maps it to the "key" of its partition.
	 *
	 * Example:
	 * ```ts
	 * Stream.of("dog", "horse", "cat", "pig", "goat", "chicken", "cow")
	 * 	.partition(animal => animal.length) // splits the animal list into partitions by the length of their names
	 * 	.get(3) // gets the partition of animals with 3 letter long names
	 * 	.toArray(); // ["dog", "cat", "pig", "cow"]
	 * ```
	 */
	public abstract partition<K> (sorter: (val: T) => K): Partitions<K, T>;

	/**
	 * Returns a `Partitions` instance where the T items (should be 2-value Tuples) of this Stream are split into two
	 * partition Streams: "key" and "value".
	 */
	public abstract unzip (): T extends [infer K, infer V] ? UnzippedPartitions<K, V> : never;

	/**
	 * Returns a new Stream containing the items in this Stream and then the items provided.
	 */
	public abstract add<N> (...items: N[]): Stream<T | N>;

	/**
	 * Returns a new Stream containing the items in this Stream and then the items in all provided Streams or Iterables.
	 */
	public abstract merge<N> (...iterables: (Stream<N> | Iterable<N>)[]): Stream<T | N>;

	/**
	 * Inserts the given items into the beginning of this Stream.
	 */
	public abstract insert<N> (...items: N[]): Stream<N | T>;
	/**
	 * Inserts the given items at the given index of this Stream.
	 */
	public abstract insertAt<N> (index: number, ...items: N[]): Stream<N | T>;

	/**
	 * Returns a new Stream of the same type, after first collecting this Stream into an array.
	 *
	 * Why is this useful? It can be used, for example, to prevent concurrent modification errors. Since it collects
	 * everything into an array before streaming the values, it allows doing things such as deletion from the source object.
	 *
	 * Note: This method is an alias of `Stream.from(stream.toArray())`.
	 */
	public abstract collectStream (): Stream<T>;

	/**
	 * Returns a new Stream of the values in this stream, and their index.
	 */
	public abstract entries (): Stream<[number, T]>;

	////////////////////////////////////
	// Collection
	//

	/**
	 * Returns true if the predicate returns true for any of the items in this Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract any (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns true for any of the items in this Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 *
	 * Note: Alias of `any()`
	 */
	public abstract some (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns true for every item in the Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract every (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns true for every item in the Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 *
	 * Note: Alias of `every()`
	 */
	public abstract all (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns false for every item in the Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract none (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns whether the Stream includes any of the the given values. Uses strict equality comparison. `===`
	 */
	public abstract includes (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes any of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includes()`
	 */
	public abstract contains (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes any of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includes()`
	 */
	public abstract has (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes all of the the given values. Uses strict equality comparison. `===`
	 */
	public abstract includesAll (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes all of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includesAll()`
	 */
	public abstract containsAll (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes all of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includesAll()`
	 */
	public abstract hasAll (...values: T[]): boolean;

	/**
	 * Returns whether this Stream has any items in common with items in the given iterables.
	 */
	public abstract intersects<X> (...iterables: Iterable<X>[]): T extends X ? boolean : never;


	/**
	 * Returns the number of items in this Stream.
	 */
	public abstract count (): number;
	/**
	 * Returns the number of items in this Stream.
	 * @param predicate Only counts the items that match this predicate
	 */
	public abstract count (predicate?: (value: T, index: number) => unknown): number;

	/**
	 * Returns the number of items in this Stream.
	 *
	 * Note: Alias of `count`
	 */
	public abstract length (): number;

	/**
	 * Returns the number of items in this Stream.
	 *
	 * Note: Alias of `count`
	 */
	public abstract size (): number;

	/**
	 * Returns a new value by combining the items in this Stream using the given reducer function.
	 * @param reducer A function which takes the current value and the next value and returns a new value.
	 */
	public abstract fold<R> (initial: R, folder: (current: R, newValue: T, index: number) => R): R;

	/**
	 * **This method does not work like array reduce. If that's what you're looking for, see `fold`**
	 *
	 * Returns a single `T` by combining the items in this Stream using the given reducer function. Returns `undefined`
	 * if there are no items in this Stream.
	 * @param reducer A function which takes the current value and the next value and returns a new value of the same type.
	 */
	public abstract reduce (reducer: (current: T, newValue: T, index: number) => T): T | undefined;

	/**
	 * Returns the first item in this Stream, or `undefined` if there are no items.
	 */
	public abstract first (): T | undefined;
	/**
	 * Returns the first item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract first<A> (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns the first item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract first<A = never> (predicate?: (val: T, index: number) => unknown, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns the first item in this Stream, or `undefined` if there are no items.
	 *
	 * Note: Alias of `first()`
	 */
	public abstract find (): T | undefined;
	/**
	 * Returns the first item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 *
	 * Note: Alias of `first()`
	 */
	public abstract find<A> (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns the first item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 *
	 * Note: Alias of `first()`
	 */
	public abstract find<A = never> (predicate?: (val: T, index: number) => unknown, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns the last item in this Stream, or `undefined` if there are no items.
	 */
	public abstract last (): T | undefined;
	/**
	 * Returns the last item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract last<A> (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns the last item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	public abstract last<A = never> (predicate?: (val: T, index: number) => unknown, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns the item at the given index, or `undefined` if it does not exist.
	 *
	 * Note: An alias for `drop(index - 1).first()`.
	 */
	public abstract at (index: number): T | undefined;
	/**
	 * Returns the item at the given index, or `orElse` if it does not exist.
	 *
	 * Note: An alias for `drop(index - 1).first(orElse)`.
	 */
	public abstract at<A> (index: number, orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns the item at the given index, or, if it does not exist, `orElse`, or `undefined` if `orElse` is not provided.
	 *
	 * Note: An alias for `drop(index - 1).first(orElse)`.
	 */
	public abstract at<A = never> (index: number, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns a random item in this Stream, or `undefined` if there are none.
	 */
	public abstract random (): T | undefined;
	/**
	 * Returns a random item in this Stream, or `orElse` if there are none.
	 */
	public abstract random<A> (random: (() => number) | undefined, orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns a random item in this Stream, or `orElse` if there are none.
	 */
	public abstract random<A = never> (random?: () => number, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns a value of type R, generated with the given collector function.
	 * @param collector A function that takes the iterable, and returns type R
	 */
	public abstract collect<R> (collector: (stream: Stream<T>) => R): R;
	/**
	 * Returns a value of type R, generated with the given collector function.
	 * @param collector A function that takes the iterable, and returns type R
	 */
	public abstract collect<R, A extends any[]> (collector: (stream: Stream<T>, ...args: A) => R, ...args: A): R;

	/**
	 * Returns a value of type R, generated with the given collector function.
	 * @param collector A function that takes the splatted values in this iterable, and returns type R
	 */
	public abstract splat<R> (collector: (...args: T[]) => R, ...args: T[]): R;

	/**
	 * Returns a promise that will return the value of the first completed promise in this stream.
	 *
	 * Note: Alias of `Promise.race(stream.toArray())`
	 */
	public abstract race (): Promise<T extends Promise<infer R> ? R : never>;

	/**
	 * Returns a promise of a stream with all items await-ed.
	 *
	 * Note: Alias of `Stream.from(Promise.all(stream.toArray()))`
	 */
	public abstract rest (): Promise<T extends Promise<infer R> ? Stream<R> : never>;

	/**
	 * Collects the items in this Stream to an array.
	 */
	public abstract toArray (): T[];
	/**
	 * Appends the items in this Stream to the end of the given array.
	 */
	public abstract toArray<N> (array: N[]): (T | N)[];
	/**
	 * Collects the items in this Stream to an array, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	public abstract toArray<M> (mapper: (value: T, index: number) => M): M[];
	/**
	 * Appends the items in this Stream to the end of the given array, using a mapping function.
	 * @param array The array to insert into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	public abstract toArray<N, M> (array: N[], mapper: (value: T, index: number) => M): (T | N | M)[];

	/**
	 * Collects the items in this Stream to a Set.
	 */
	public abstract toSet (): Set<T>;
	/**
	 * Appends the items in this Stream to the end of the given Set.
	 */
	public abstract toSet<N> (set: Set<N>): Set<T | N>;
	/**
	 * Collects the items in this Stream to a Set, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	public abstract toSet<M> (mapper: (value: T, index: number) => M): Set<M>;
	/**
	 * Appends the items in this Stream to the end of the given Set, using a mapping function.
	 * @param set The set to insert into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	public abstract toSet<N, M> (set: Set<N>, mapper: (value: T, index: number) => M): Set<T | N | M>;

	/**
	 * Constructs a Map instance from the key-value pairs in this Stream.
	 */
	public abstract toMap (): T extends [infer K, infer V] ? Map<K, V> : never;
	/**
	 * Puts the key-value pairs in this Stream into the given Map.
	 */
	public abstract toMap<KE, VE> (map: Map<KE, VE>): T extends [infer K, infer V] ? Map<K | KE, V | VE> : never;
	/**
	 * Constructs a Map instance from the items in this Stream, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	public abstract toMap<K, V> (mapper: (value: T, index: number) => [K, V]): Map<K, V>;
	/**
	 * Puts the key-value pairs in this Stream into the given Map, using a mapping function.
	 * @param map The map to put key-value pairs into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	public abstract toMap<K, V, KE, VE> (map: Map<KE, VE>, mapper: (value: T, index: number) => [K, V]): Map<K | KE, V | VE>;

	/**
	 * Constructs an object from the key-value pairs in this Stream.
	 */
	public abstract toObject (): T extends [infer K, infer V] ? { [key in Extract<K, string | number | symbol>]: V } : never;
	/**
	 * Puts the key-value pairs in this Stream into the given object.
	 */
	public abstract toObject<O> (obj: O): T extends [infer K, infer V] ? O & { [key in Extract<K, string | number | symbol>]: V } : never;
	/**
	 * Constructs an object from the items in this Stream, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	public abstract toObject<K extends string | number | symbol, V> (mapper: (value: T, index: number) => [K, V]): { [key in K]: V };
	/**
	 * Puts the key-value pairs in this Stream into the given object, using a mapping function.
	 * @param map The map to put key-value pairs into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	public abstract toObject<K extends string | number | symbol, V, O> (obj: O, mapper: (value: T, index: number) => [K, V]): O & { [key in K]: V };

	/**
	 * Combines the items in this Stream into a string.
	 * @param concatenator A substring to be placed between every item in this Stream. If not provided, uses `""`
	 */
	public abstract toString (concatenator?: string): string;
	/**
	 * Combines the items in this Stream into a string, via a reducer function.
	 * @param concatenator Takes the current string and the next value and returns the new string.
	 */
	public abstract toString (concatenator: (current: string, value: T) => string): string;

	/**
	 * Iterates through the entire stream.
	 */
	public abstract iterateToEnd (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	public abstract finish (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	public abstract end (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	public abstract complete (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	public abstract flush (): void;

	////////////////////////////////////
	// Misc
	//

	/**
	 * Runs a function on each item in this Stream.
	 * @param user The function to call for each item
	 */
	public abstract forEach (user: (val: T, index: number) => any): void;
	/**
	 * Runs a function on each item in this Stream.
	 * @param user The function to call for each item
	 */
	public abstract splatEach (user: T extends any[] ? ((...args: T) => any) : never): void;

	public abstract next (): void;

	/**
	 * Returns whether the Stream has a next entry.
	 */
	public abstract hasNext (): boolean;
}

type Action<T> =
	["filter", (val: T) => unknown] |
	["map", (val: T) => any] |
	["take", number] |
	["takeWhile", (val: T) => unknown] |
	["takeUntil", (val: T) => unknown] |
	["drop", number] |
	["dropWhile", (val: T) => unknown] |
	["dropUntil", (val: T) => unknown] |
	["step", number, number] |
	["insert", number, any[]] |
	[undefined, any?, any?];

class StreamImplementation<T> extends Stream<T> {

	private readonly iterators: (Iterator<T> | Streamable<T>)[];
	private iteratorIndex = 0;
	private actions: Action<T>[] = [];
	private _value: T;
	private _done = false;
	private doneNext = false;
	private readonly savedNext: T[] = [];
	private actionsNeedDeleted = false;
	private parent: StreamImplementation<T>;

	@Override public get value () { return this._value; }
	@Override public get done () { return this._done; }

	public constructor (...iterators: (Iterator<T> | Streamable<T>)[]) {
		super();
		this.iterators = iterators;
	}

	public [Symbol.iterator] () {
		return {
			next: () => {
				this.next();
				return {
					done: this._done,
					value: this._value,
				};
			},
		};
	}

	public [Symbol.asyncIterator] () {
		return {
			next: async () => {
				this.next();
				return {
					done: this._done,
					value: await this._value as any,
				};
			},
		} as any;
	}

	////////////////////////////////////
	// Manipulation
	//

	@Override public filter (filter: (val: T) => any): Stream<any> {
		if (this.savedNext.length) {
			if (!filter(this.savedNext[0])) {
				this.savedNext.pop();
			}
		}

		return this.getWithAction(["filter", filter]);
	}

	@Override public filter2 (filter: (val: T) => any) {
		return this.filter(filter);
	}

	@Override public map (mapper: (val: T) => any): Stream<any> {
		const mappedStream = this.getWithAction(["map", mapper]);
		if (mappedStream.savedNext.length)
			mappedStream.savedNext[0] = mapper(this.savedNext[0]);

		return mappedStream;
	}

	@Override public flatMap (mapper?: (value: T) => Iterable<any>) {
		return new StreamImplementation(new FlatMapStream(this, mapper)) as any;
	}

	@Override public take (amount: number) {
		if (amount < 0 || !Number.isInteger(amount))
			throw new Error("Number of items to take must be a positive integer.");

		if (amount === 0) {
			return Stream.empty<T>();

		}

		if (this.savedNext.length) {
			amount--;
		}

		return this.getWithAction(["take", amount]);
	}

	@Override public takeWhile (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (!predicate(this.savedNext[0])) {
				this._done = true;
			}
		}

		return this.getWithAction(["takeWhile", predicate]);
	}

	@Override public takeUntil (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (predicate(this.savedNext[0])) {
				this._done = true;
			}
		}

		return this.getWithAction(["takeUntil", predicate]);
	}

	@Override public drop (amount: number) {
		if (amount < 0 || !Number.isInteger(amount))
			throw new Error("Number of items to take must be a positive integer.");

		if (amount === 0) return this;

		if (this.savedNext.length) {
			amount--;
			this.savedNext.pop();
		}

		return this.getWithAction(["drop", amount]);
	}

	@Override public dropWhile (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (predicate(this.savedNext[0])) {
				this.savedNext.pop();

			} else {
				return this;
			}
		}

		return this.getWithAction(["dropWhile", predicate]);
	}

	@Override public dropUntil (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (!predicate(this.savedNext[0])) {
				this.savedNext.pop();

			} else {
				return this;
			}
		}

		return this.getWithAction(["dropUntil", predicate]);
	}

	@Override public step (step: number) {
		if (step === 1)
			// a step of 1 is default
			return this;

		if (step <= 0)
			// negative iteration is going to require getting the full array anyway, so we just reuse the array step functionality
			return Stream.values(this.toArray(), step);

		if (!Number.isInteger(step))
			throw new Error("Streams can only be stepped through with a nonzero integer.");

		let current = step;
		if (this.savedNext.length) {
			this.savedNext.pop();
			current--;
		}

		return this.getWithAction(["step", current, step]);
	}

	@Override public sorted (comparator?: (a: T, b: T) => number) {
		return Stream.from(this.toArray().sort(comparator));
	}

	@Override public reverse () {
		return Stream.from(this.toArray().reverse());
	}

	@Override public distinct () {
		return Stream.from(this.toSet());
	}

	@Override public shuffle (random?: () => number) {
		return Stream.from(shuffle(this.toArray(), random));
	}

	@Override public partition<K> (sorter: (val: T) => K): Partitions<any, any> {
		return new Partitions(this, sorter, partitionStream => new StreamImplementation(partitionStream));
	}

	@Override public unzip (): any {
		return new UnzippedPartitionsImplementation(this.flatMap());
	}

	@Override public add (...items: any[]) {
		return new StreamImplementation<any>(this, items[Symbol.iterator]());
	}

	@Override public insert (...items: any[]) {
		return new StreamImplementation(items[Symbol.iterator](), this);
	}

	@Override public insertAt (index: number, ...items: any[]) {
		return this.getWithAction(["insert", index, items]);
	}

	@Override public merge (...iterables: Iterable<any>[]) {
		return new StreamImplementation(this, ...iterables
			.map(iterable => iterable instanceof StreamImplementation ? iterable : iterable[Symbol.iterator]()));
	}

	@Override public collectStream () {
		return Stream.from(this.toArray());
	}

	@Override public entries () {
		let i = 0;
		return this.map(value => tuple(i++, value));
	}

	////////////////////////////////////
	// Collection
	//

	@Override public any (predicate: (val: T, index: number) => unknown) {
		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return false;
			}

			if (predicate(this._value, index++)) {
				return true;
			}
		}
	}

	@Override public some (predicate: (val: T, index: number) => unknown) {
		return this.any(predicate);
	}

	@Override public every (predicate: (val: T, index: number) => unknown) {
		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return true;
			}

			if (!predicate(this._value, index++)) {
				return false;
			}
		}
	}

	@Override public all (predicate: (val: T, index: number) => unknown) {
		return this.every(predicate);
	}

	@Override public none (predicate: (val: T, index: number) => unknown) {
		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return true;
			}

			if (predicate(this._value, index++)) {
				return false;
			}
		}
	}

	@Override public includes (...values: T[]) {
		while (true) {
			this.next();
			if (this._done) {
				return values.length === 0;
			}

			if (values.includes(this._value)) {
				return true;
			}
		}
	}

	@Override public contains (...values: T[]) {
		return this.includes(...values);
	}

	@Override public has (...values: T[]) {
		return this.includes(...values);
	}

	@Override public includesAll (...values: T[]) {
		while (true) {
			this.next();
			if (this._done) {
				return values.length === 0;
			}

			const i = values.indexOf(this._value);
			if (i > -1) {
				values.splice(i, 1);
				if (values.length === 0) {
					return true;
				}
			}
		}
	}

	@Override public containsAll (...values: T[]) {
		return this.includesAll(...values);
	}

	@Override public hasAll (...values: T[]) {
		return this.includesAll(...values);
	}

	// tslint:disable-next-line cyclomatic-complexity
	@Override public intersects<X> (...iterables: Iterable<X>[]): T extends X ? boolean : never {
		while (true) {
			this.next();
			if (this._done) {
				return (iterables.length === 0) as any;
			}

			for (let i = 0; i < iterables.length; i++) {
				let iterable = iterables[i];
				// the first time we check each iterable to see if it contains the current value, we
				// turn it into an array (or leave sets) so we can take advantage of the (probably)
				// faster native `includes`/`has` checking.
				// however, we only loop through the iterable as much as is required -- if we happen
				// to run into the current value, we return true then
				if (!Array.isArray(iterable) && !(iterable instanceof Set)) {
					const replacementArray = [];
					for (const item of iterable) {
						if ((item as any) === this._value) {
							return true as any;
						}

						replacementArray.push(item);
					}

					iterable = iterables[i] = replacementArray;
				}

				if (Array.isArray(iterable)) {
					if (iterable.includes(this._value)) {
						return true as any;
					}

				} else if (iterable instanceof Set) {
					if (iterable.has(this._value)) {
						return true as any;
					}
				}
			}
		}
	}

	@Override public count (predicate?: (value: T, index: number) => any) {
		let i = 0;
		let count = 0;
		while (true) {
			this.next();
			if (this._done) {
				return count;
			}

			if (!predicate || predicate(this._value, i)) {
				count++;
			}

			i++;
		}
	}

	@Override public length () {
		return this.count();
	}

	@Override public size () {
		return this.count();
	}

	@Override public fold<R> (initial: R, folder: (current: R, newValue: T, index: number) => R) {
		let index = 0;
		let value = initial;
		while (true) {
			this.next();
			if (this._done) {
				return value;
			}

			value = folder(value, this._value, index++);
		}
	}

	@Override public reduce (reducer: (current: T, newValue: T, index: number) => T) {
		this.next();
		let index = 1;
		let value = this._value;
		while (true) {
			this.next();
			if (this._done) {
				return value;
			}

			value = reducer(value, this._value, index++);
		}
	}

	public first (): T | undefined;
	public first (predicate?: (val: T, index: number) => unknown, orElse?: () => T): T | undefined;
	public first (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => T): T;
	@Override public first (predicate?: (val: T, index: number) => unknown, orElse?: () => T) {
		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return orElse ? orElse() : undefined;
			}

			if (!predicate || predicate(this._value, index++)) {
				return this._value;
			}
		}
	}

	public find (): T | undefined;
	public find (predicate?: (val: T, index: number) => unknown, orElse?: () => T): T | undefined;
	public find (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => T): T;
	@Override public find (predicate?: (val: T, index: number) => unknown, orElse?: () => T) {
		return this.first(predicate, orElse);
	}

	public last (): T | undefined;
	public last (predicate?: (val: T, index: number) => unknown, orElse?: () => T): T | undefined;
	public last (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => T): T;
	@Override public last (predicate?: (val: T, index: number) => unknown, orElse?: () => T) {
		let index = 0;
		let last: any = LAST;
		while (true) {
			this.next();
			if (this._done) {
				break;
			}

			if (!predicate || predicate(this._value, index++)) {
				last = this._value;
			}
		}

		return last !== LAST ? last : orElse ? orElse() : undefined;
	}

	public at (index: number): T | undefined;
	public at (index: number, orElse: () => T): T;
	public at (index: number, orElse?: () => T): T | undefined;
	@Override public at (index: number, orElse?: () => T) {
		if (!Number.isInteger(index)) {
			throw new Error("Can only retrieve values at integer indices.");
		}

		if (index >= 0)
			return this.drop(index).first(undefined, orElse);

		const array = this.toArray();
		index += array.length;
		if (index < 0)
			return orElse ? orElse() : undefined;

		return array[index];
	}

	@Override public random (random = Math.random, orElse?: () => any): any {
		if (!this.hasNext()) {
			return orElse ? orElse() : undefined;
		}

		return choice([...this], random)!;
	}

	@Override public collect<R, A extends any[]> (collector: (stream: Stream<T>, ...args: A) => R, ...args: A): R {
		return collector(this, ...args);
	}

	@Override public splat<R> (collector: (...values: T[]) => R, ...args: T[]): R {
		return collector(...this.toArray(), ...args);
	}

	@Override public async race (): Promise<any> {
		return Promise.race(this.toArray()) as any;
	}

	@Override public async rest (): Promise<any> {
		return new StreamImplementation((await Promise.all(this.toArray())).values()) as any;
	}

	public toArray (): T[];
	public toArray<N> (array: N[]): (T | N)[];
	public toArray<M> (mapper: (value: T, index: number) => M): M[];
	public toArray<N, M> (array: N[], mapper: (value: T, index: number) => M): (T | N | M)[];
	@Override public toArray (result: any[] | ((value: any, index: number) => any) = [], mapper?: (value: any, index: number) => any): any {
		if (typeof result === "function") {
			mapper = result;
			result = [];
		}

		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return result as any;
			}

			result.push(mapper ? mapper(this._value, index++) : this._value);
		}
	}

	public toSet (): Set<T>;
	public toSet<N> (set: Set<N>): Set<T | N>;
	public toSet<M> (mapper: (value: T, index: number) => M): Set<M>;
	public toSet<N, M> (set: Set<N>, mapper: (value: T, index: number) => M): Set<T | N | M>;
	@Override public toSet (result: Set<any> | ((value: any, index: number) => any) = new Set(), mapper?: (value: any, index: number) => any): any {
		if (typeof result === "function") {
			mapper = result;
			result = new Set();
		}

		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return result as any;
			}

			result.add(mapper ? mapper(this._value, index++) : this._value);
		}
	}

	@Override public toMap (result?: Map<any, any> | ((value: any, index: number) => [any, any]), mapper?: (value: any, index: number) => [any, any]): any {
		if (typeof result === "function") {
			mapper = result;
			result = new Map();

		} else if (result === undefined) {
			result = new Map();
		}

		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return result;
			}

			if (mapper) {
				result.set(...mapper(this._value, index++));

			} else {
				if (!Array.isArray(this._value)) {
					console.warn("[Stream]", "Can't convert the stream value", this._value, "into a key-value pair.");
					continue;
				}

				result.set(...this._value as any as [any, any]);
			}
		}
	}

	@Override public toObject (result?: any | ((value: any, index: number) => [any, any]), mapper?: (value: any, index: number) => [any, any]) {
		if (typeof result === "function") {
			mapper = result;
			result = {};

		} else if (result === undefined) {
			result = {};
		}

		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return result;
			}

			if (mapper) {
				const [key, value] = mapper(this._value, index++);
				result[`${key}`] = value;

			} else {
				if (!Array.isArray(this._value)) {
					console.warn("[Stream]", "Can't convert the stream value", this._value, "into a key-value pair.");
					continue;
				}

				const [key, value] = this._value as any as [any, any];
				result[`${key}`] = value;
			}
		}
	}

	public toString (concatenator?: string): string;
	public toString (concatenator: (current: string, value: T) => string): string;
	@Override public toString (concatenator: string | ((current: string, value: T) => string) = "") {
		let result = "";
		while (true) {
			this.next();
			if (this._done) {
				return typeof concatenator === "string" ? result.slice(concatenator.length) : result;
			}

			if (typeof concatenator === "string") {
				result += `${concatenator}${this._value}`;

			} else {
				result = concatenator(result, this._value);
			}
		}
	}

	@Override public iterateToEnd () {
		while (true) {
			this.next();
			if (this._done) {
				return;
			}
		}
	}
	@Override public finish () { this.iterateToEnd(); }
	@Override public end () { this.iterateToEnd(); }
	@Override public complete () { this.iterateToEnd(); }
	@Override public flush () { this.iterateToEnd(); }

	////////////////////////////////////
	// Misc
	//

	@Override public forEach (user: (val: T, index: number) => any) {
		let index = 0;
		while (true) {
			this.next();
			if (this._done) {
				return;
			}

			user(this._value, index++);
		}
	}

	@Override public splatEach (user?: (...args: any[]) => any) {
		while (true) {
			this.next();
			if (this._done) {
				return;
			}

			const value = this._value;
			if (!isIterable(value)) {
				throw new Error(`This stream contains a non-iterable value (${value}), it can't be splatted into the user function.`);
			}

			user!(...value as any);
		}
	}

	// tslint:disable-next-line cyclomatic-complexity
	@Override public next () {
		if (this.doneNext || this._done) {
			this._done = true;
			return;
		}

		if (this.savedNext.length) {
			this._value = this.savedNext.pop()!;
			return;
		}

		FindNext:
		while (true) {
			const { done, value } = this.iterators[this.iteratorIndex].next() || (this.iterators[this.iteratorIndex] as Streamable<T>);
			this._value = value;
			if (done) {
				this.iteratorIndex++;
				if (this.iteratorIndex >= this.iterators.length) {

					////////////////////////////////////
					// "Last Chance" actions — actions that can extend the stream
					//
					for (const action of this.actions) {
						switch (action[0]) {
							case "insert": {
								this.iterators.push(action[2][Symbol.iterator]());
								(action as Action<T>)[0] = undefined;
								continue FindNext;
							}
						}
					}

					////////////////////////////////////
					// We're out of values!
					//
					this._done = true;
					return;
				}

				continue;
			}

			if (this.actionsNeedDeleted) {
				// delete any unused actions
				this.actions = this.actions.filter(([actionType]) => actionType !== undefined);
				this.actionsNeedDeleted = false;
			}

			for (const action of this.actions) {
				switch (action[0]) {
					case "filter": {
						const filter = action[1];
						if (!filter(this._value)) {
							continue FindNext;
						}

						break;
					}
					case "map": {
						const mapper = action[1];
						this._value = mapper(this._value);
						break;
					}
					case "take": {
						// this "take" implementation is simple and fun, the way it works is it stores the number
						// left to take in the action itself, so that every time it hits the "take" action, it checks
						// if enough have been taken already. If not, it continues as per normal. Otherwise, it marks
						// this stream as finishing on the next "next" call. (Before processing it.)
						const amount = action[1];
						if (amount === 1) {
							this.doneNext = true;
							return;
						}

						action[1] = amount - 1;
						break;
					}
					case "drop": {
						// this is one more item to encounter, so we skip it and reduce the number we still need to skip by one
						const amount = action[1]--;

						// mark action for deletion when it won't need to be used anymore
						if (amount === 1) (action as Action<T>)[0] = undefined;

						// if there's more than zero items to drop, we skip this item and find the next
						if (amount > 0) continue FindNext;

						// the code should never get to this point
						break;
					}
					case "takeWhile": {
						const predicate = action[1];
						if (!predicate(this._value)) {
							this._done = true;
							if (this.parent) this.parent.restreamCurrent();
							return;
						}

						break;
					}
					case "takeUntil": {
						const predicate = action[1];
						if (predicate(this._value)) {
							this._done = true;
							if (this.parent) this.parent.restreamCurrent();
							return;
						}

						break;
					}
					case "dropWhile": {
						const predicate = action[1];
						if (predicate!(this._value)) {
							continue FindNext;
						}

						// we delete the action name, marking this action for removal
						(action as Action<T>)[0] = undefined;
						this.actionsNeedDeleted = true;

						break;
					}
					case "dropUntil": {
						const predicate = action[1];
						if (!predicate!(this._value)) {
							continue FindNext;
						}

						// we delete the predicate, marking this action for removal
						(action as Action<T>)[0] = undefined;
						this.actionsNeedDeleted = true;

						break;
					}
					case "step": {
						// this is a fun one too, so i'll explain how it works:
						// 1. we store the "step size" and the "current step" in the action.
						// - action[1] is the current,
						// - action[2] is the size
						// 2. when the action is performed, we subtract one from the current step
						// 3. if the step is 0:
						// - that means this current value is the new value
						// - we reset the current step to the step size and allow it to continue again next time

						// action[1] is the current step
						action[1]--;
						if (action[1] > 0) {
							continue FindNext;
						}

						// action[2] is the step size
						action[1] = action[2];

						break;
					}
					case "insert": {
						// this is more to go before iterating over the inserted items, so we reduce the number remaining by one
						const amount = action[1]--;

						if (amount === 1) {
							// mark action for deletion, it won't need to be used anymore
							(action as Action<T>)[0] = undefined;

							// we're inserting our replacement stuff next
							this.iterators.splice(this.iteratorIndex, 0, action[2][Symbol.iterator]());
						}

						break;
					}
				}
			}

			// if we made it this far, we found the next value to return
			return;
		}
	}

	@Override public hasNext () {
		if (!this.savedNext.length) {
			this.next();
			if (this._done) {
				return false;
			}

			this.savedNext.push(this._value);
		}

		return true;
	}

	private restreamCurrent () {
		this.savedNext.push(this._value);
		if (this.parent) this.parent.restreamCurrent();
	}

	private getWithAction (action: Action<T>): StreamImplementation<any> {
		const newStream = new StreamImplementation(this);
		newStream.actions.push(action);
		newStream.parent = this;
		return newStream;
	}
}

class InternalArrayStream<T> {
	protected index: number;
	private _done = false;
	private readonly step: number;

	public get done () { return this._done; }

	public constructor (protected readonly array: T[], step: number) {
		if (step === 0 || !Number.isInteger(step)) {
			throw new Error(`Step "${step}" is invalid. Must be a non-zero positive or negative integer.`);
			step = 1;
		}

		this.step = step;
		this.index = step > 0 ? -1 : array.length;
	}

	public next () {
		if (this._done) {
			return;
		}

		this.index += this.step;
		if (this.step > 0 ? this.index >= this.array.length : this.index < 0) {
			this._done = true;
		}
	}
}

class ArrayStream<T> extends InternalArrayStream<T> implements Streamable<T> {
	public get value () { return this.array[this.index]; }
	public constructor (array: T[], step: number) {
		super(array, step);
	}
}

class ArrayEntriesStream<T> extends InternalArrayStream<T> implements Streamable<[number, T]> {
	public get value () { return tuple(this.index, this.array[this.index]); }
	public constructor (array: T[], step: number) {
		super(array, step);
	}
}

class UnzippedPartitionsImplementation<K, V> extends Partitions<any, any> implements UnzippedPartitions<K, V> {
	public constructor (stream: StreamImplementation<[K, V]>) {
		super(stream.flatMap(), (value, index) => index % 2 ? "value" : "key", partitionStream => new StreamImplementation(partitionStream));
		// initialize partitions for "key" and "value" so they appear in the `.partitions()` stream
		this.get("key");
		this.get("value");
	}

	public keys (): Stream<K> {
		return this.get("key");
	}

	public values (): Stream<V> {
		return this.get("value");
	}
}
