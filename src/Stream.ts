import { ArrayEntriesStream, ArrayStream } from "./ArrayStream";
import FlatMapStream from "./FlatMapStream";
import Partitions from "./Partitions";
import rangeIterator from "./RangeStream";
import UnzippedPartitions from "./UnzippedPartitions";
import { choice, shuffle, tuple } from "./util/Arrays";
import { isIterable } from "./util/Iterables";

type Flat1<T> = T extends Iterable<infer X> ? X | Extract<T, string> | Exclude<T, Iterable<any>> : never;

type Key<T> = T extends [infer K, any] ? K : T extends readonly [infer K2, any] ? K2 : never;
type Value<T> = T extends [any, infer V] ? V : T extends readonly [any, infer V2] ? V2 : never;

type Unary<T, R = void> = (arg: T) => R;

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
interface Stream<T> extends Iterator<T>, Iterable<T>, IteratorResult<T> {

	done: boolean;
	value: T;
	[Symbol.iterator] (): Iterator<T>;
	[Symbol.asyncIterator] (): AsyncIterableIterator<T extends Promise<infer R> ? R : never>;

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
	filter<X = never> (filter: (val: T) => any): Stream<Exclude<T, X>>;

	/**
	 * Returns a Stream that will loop only over the entries that match the given filter
	 * @param filter A function that returns a truthy value if the entry should be included and a falsey value if it shouldn't
	 *
	 * Note: The only difference between this method and `filter` is the type argument: This method returns the type argument,
	 * while the other excludes it.
	 */
	filter2<X = T> (filter: (val: T) => any): Stream<X>;

	/**
	 * Returns a Stream of type X, using the given mapper function
	 * @param mapper A function that maps an entry of type T to its corresponding type X
	 */
	map<X> (mapper: (val: T) => X): Stream<X>;

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
	flatMap<X> (mapper: (value: T) => Iterable<X>): Stream<X>;
	/**
	 * Returns a new Stream iterating over every value of each value of this iterator. The values in this
	 * Stream must be iterable.
	 */
	flatMap (): Stream<Flat1<T>>;
	/**
	 * Returns a new Stream iterating over every value of each value of this Stream. The values in this
	 * Stream must be iterable.
	 */
	flatMap<X> (): Stream<X>;

	/**
	 * Returns a Stream which will only go through the first X items, where X is the given argument.
	 */
	take (amount: number): Stream<T>;

	/**
	 * Returns a Stream which will only iterate through the items in this Stream until the predicate doesn't match.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	takeWhile (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which will only iterate through the items in this Stream until the predicate matches.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	takeUntil (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which will skip the first X items, where X is the given argument.
	 */
	drop (amount: number): Stream<T>;

	/**
	 * Returns a Stream which will skip the items in this Stream until the predicate doesn't match.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	dropWhile (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which will skip the items in this Stream until the predicate matches.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	dropUntil (predicate: (val: T) => unknown): Stream<T>;

	/**
	 * Returns a Stream which steps through the items in the current Stream using the provided step amount.
	 * @param step A non-zero integer. Positive integers will step forwards through the Stream, negative integers
	 * will step backwards.
	 *
	 * Note: Stepping backwards will require iteration through this entire Stream.
	 */
	step (step: number): Stream<T>;

	/**
	 * Returns a new Stream which contains the sorted contents of this stream. The values are sorted in ascending ASCII order.
	 */
	sorted (): Stream<T>;
	/**
	 * Returns a new Stream which contains the sorted contents of this Stream.
	 * @param comparator A function that returns a "difference" between `a` and `b`, for sorting by.
	 */
	sorted (comparator: (a: T, b: T) => number): Stream<T>;

	/**
	 * Returns a new Stream which contains the contents of this Stream, in reverse order.
	 */
	reverse (): Stream<T>;

	/**
	 * Returns a new Stream which contains only unique items in this Stream.
	 *
	 * Note: Alias of `Stream.from(stream.toSet())`
	 */
	distinct (): Stream<T>;

	/**
	 * Returns a new Stream of the shuffled items in this Stream.
	 */
	shuffle (random?: () => number): Stream<T>;

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
	partition<K> (sorter: (val: T) => K): Partitions<K, T>;

	/**
	 * Returns a `Partitions` instance where the T items (should be 2-value Tuples) of this Stream are split into two
	 * partition Streams: "key" and "value".
	 */
	unzip (): T extends [infer K, infer V] ? UnzippedPartitions<K, V> : never;

	/**
	 * Returns a new Stream containing the items in this Stream and then the items provided.
	 */
	add<N> (...items: N[]): Stream<T | N>;

	/**
	 * Returns a new Stream containing the items in this Stream and then the items in all provided Streams or Iterables.
	 */
	merge<N> (...iterables: (Stream<N> | Iterable<N>)[]): Stream<T | N>;

	/**
	 * Inserts the given items into the beginning of this Stream.
	 */
	insert<N> (...items: N[]): Stream<N | T>;
	/**
	 * Inserts the given items at the given index of this Stream.
	 */
	insertAt<N> (index: number, ...items: N[]): Stream<N | T>;

	/**
	 * Returns a new Stream of the same type, after first collecting this Stream into an array.
	 *
	 * Why is this useful? It can be used, for example, to prevent concurrent modification errors. Since it collects
	 * everything into an array before streaming the values, it allows doing things such as deletion from the source object.
	 *
	 * Note: This method is an alias of `Stream.from(stream.toArray())`.
	 */
	collectStream (): Stream<T>;

	/**
	 * Returns a new Stream of the values in this stream, and their index.
	 */
	entries (): Stream<[number, T]>;

	////////////////////////////////////
	// Collection
	//

	/**
	 * Returns true if the predicate returns true for any of the items in this Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	any (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns true for any of the items in this Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 *
	 * Note: Alias of `any()`
	 */
	some (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns true for every item in the Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	every (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns true for every item in the Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 *
	 * Note: Alias of `every()`
	 */
	all (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns true if the predicate returns false for every item in the Stream
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	none (predicate: (val: T, index: number) => unknown): boolean;

	/**
	 * Returns whether the Stream includes any of the the given values. Uses strict equality comparison. `===`
	 */
	includes (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes any of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includes()`
	 */
	contains (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes any of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includes()`
	 */
	has (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes all of the the given values. Uses strict equality comparison. `===`
	 */
	includesAll (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes all of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includesAll()`
	 */
	containsAll (...values: T[]): boolean;

	/**
	 * Returns whether the Stream includes all of the the given values. Uses strict equality comparison. `===`
	 *
	 * Note: Alias of `includesAll()`
	 */
	hasAll (...values: T[]): boolean;

	/**
	 * Returns whether this Stream has any items in common with items in the given iterables.
	 */
	intersects<X> (...iterables: Iterable<X>[]): T extends X ? boolean : never;


	/**
	 * Returns the number of items in this Stream.
	 */
	count (): number;
	/**
	 * Returns the number of items in this Stream.
	 * @param predicate Only counts the items that match this predicate
	 */
	count (predicate?: (value: T, index: number) => unknown): number;

	/**
	 * Returns the number of items in this Stream.
	 *
	 * Note: Alias of `count`
	 */
	length (): number;

	/**
	 * Returns the number of items in this Stream.
	 *
	 * Note: Alias of `count`
	 */
	size (): number;

	/**
	 * Returns a new value by combining the items in this Stream using the given reducer function.
	 * @param reducer A function which takes the current value and the next value and returns a new value.
	 */
	fold<R> (initial: R, folder: (current: R, newValue: T, index: number) => R): R;

	/**
	 * **This method does not work like array reduce. If that's what you're looking for, see `fold`**
	 *
	 * Returns a single `T` by combining the items in this Stream using the given reducer function. Returns `undefined`
	 * if there are no items in this Stream.
	 * @param reducer A function which takes the current value and the next value and returns a new value of the same type.
	 */
	reduce (reducer: (current: T, newValue: T, index: number) => T): T | undefined;

	/**
	 * Returns the first item in this Stream, or `undefined` if there are no items.
	 */
	first (): T | undefined;
	/**
	 * Returns the first item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	first<A> (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns the first item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	first<A = never> (predicate?: (val: T, index: number) => unknown, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns the first item in this Stream, or `undefined` if there are no items.
	 *
	 * Note: Alias of `first()`
	 */
	find (): T | undefined;
	/**
	 * Returns the first item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 *
	 * Note: Alias of `first()`
	 */
	find<A> (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => A):
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
	find<A = never> (predicate?: (val: T, index: number) => unknown, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns the last item in this Stream, or `undefined` if there are no items.
	 */
	last (): T | undefined;
	/**
	 * Returns the last item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	last<A> (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns the last item in this Stream that matches a predicate, or `orElse` if there are none.
	 * @param predicate A predicate function that takes a Stream value and its index.
	 */
	last<A = never> (predicate?: (val: T, index: number) => unknown, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns the item at the given index, or `undefined` if it does not exist.
	 *
	 * Note: An alias for `drop(index - 1).first()`.
	 */
	at (index: number): T | undefined;
	/**
	 * Returns the item at the given index, or `orElse` if it does not exist.
	 *
	 * Note: An alias for `drop(index - 1).first(orElse)`.
	 */
	at<A> (index: number, orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns the item at the given index, or, if it does not exist, `orElse`, or `undefined` if `orElse` is not provided.
	 *
	 * Note: An alias for `drop(index - 1).first(orElse)`.
	 */
	at<A = never> (index: number, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns a random item in this Stream, or `undefined` if there are none.
	 */
	random (): T | undefined;
	/**
	 * Returns a random item in this Stream, or `orElse` if there are none.
	 */
	random<A> (random: (() => number) | undefined, orElse: () => A):
		A extends never ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A;
	/**
	 * Returns a random item in this Stream, or `orElse` if there are none.
	 */
	random<A = never> (random?: () => number, orElse?: () => A): undefined | (
		never extends A ? T :
		A extends never[] ? T extends any[] ? T | undefined[] : T | A :
		({}) extends A ? T | Partial<T> :
		T | A);

	/**
	 * Returns a value of type R, generated with the given collector function.
	 * @param collector A function that takes the iterable, and returns type R
	 */
	collect<R> (collector: (stream: Stream<T>) => R): R;
	/**
	 * Returns a value of type R, generated with the given collector function.
	 * @param collector A function that takes the iterable, and returns type R
	 */
	collect<R, A extends any[]> (collector: (stream: Stream<T>, ...args: A) => R, ...args: A): R;

	/**
	 * Returns a value of type R, generated with the given collector function.
	 * @param collector A function that takes the splatted values in this iterable, and returns type R
	 */
	splat<R> (collector: (...args: T[]) => R, ...args: T[]): R;

	/**
	 * Returns a promise that will return the value of the first completed promise in this stream.
	 *
	 * Note: Alias of `Promise.race(stream.toArray())`
	 */
	race (): Promise<T extends Promise<infer R> ? R : never>;

	/**
	 * Returns a promise of a stream with all items await-ed.
	 *
	 * Note: Alias of `Stream.from(Promise.all(stream.toArray()))`
	 */
	rest (): Promise<T extends Promise<infer R> ? Stream<R> : never>;

	/**
	 * Collects the items in this Stream to an array.
	 */
	toArray (): T[];
	/**
	 * Appends the items in this Stream to the end of the given array.
	 */
	toArray<E> (array: T extends E ? E[] : never): E[];
	/**
	 * Collects the items in this Stream to an array, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	toArray<M> (mapper: (value: T, index: number) => M): M[];
	/**
	 * Appends the items in this Stream to the end of the given array, using a mapping function.
	 * @param array The array to insert into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	toArray<E, M extends E> (array: E[], mapper: (value: T, index: number) => M): E[];

	/**
	 * Collects the items in this Stream to a Set.
	 */
	toSet (): Set<T>;
	/**
	 * Appends the items in this Stream to the end of the given Set.
	 */
	toSet<E> (set: T extends E ? Set<E> : never): Set<E>;
	/**
	 * Collects the items in this Stream to a Set, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	toSet<M> (mapper: (value: T, index: number) => M): Set<M>;
	/**
	 * Appends the items in this Stream to the end of the given Set, using a mapping function.
	 * @param set The set to insert into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a replacement item.
	 */
	toSet<E, M extends E> (set: Set<E>, mapper: (value: T, index: number) => M): Set<E>;

	/**
	 * Constructs a Map instance from the key-value pairs in this Stream.
	 */
	toMap (): T extends [infer K, infer V] ? Map<K, V> : never;
	/**
	 * Puts the key-value pairs in this Stream into the given Map.
	 */
	toMap<KE, VE> (map: Unary<Key<T>> extends Unary<KE> ? Unary<Value<T>> extends Unary<VE> ? Map<KE, VE> : never : never): Map<KE, VE>;
	/**
	 * Constructs a Map instance from the items in this Stream, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	toMap<K, V> (mapper: (value: T, index: number) => [K, V]): Map<K, V>;
	/**
	 * Puts the key-value pairs in this Stream into the given Map, using a mapping function.
	 * @param map The map to put key-value pairs into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	toMap<KE, VE, KM extends KE, VM extends VE> (map: Map<KE, VE>, mapper: (value: T, index: number) => [KM, VM]): Map<KE, VE>;

	/**
	 * Constructs an object from the key-value pairs in this Stream.
	 */
	toObject (): T extends [infer K, infer V] ? { [key in Extract<K, string | number | symbol>]: V } : never;
	/**
	 * Constructs an object from the items in this Stream, using a mapping function.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	toObject<K extends string | number | symbol, V> (mapper: (value: T, index: number) => [K, V]): { [key in K]: V };
	/**
	 * Puts the key-value pairs in this Stream into the given object.
	 */
	toObject<E> (obj: Unary<Key<T>> extends Unary<keyof E> ? Unary<Value<T>> extends Unary<E[keyof E]> ? E : never : never): E;
	/**
	 * Puts the key-value pairs in this Stream into the given object, using a mapping function.
	 * @param map The map to put key-value pairs into.
	 * @param mapper A mapping function which takes an item in this Stream and returns a key-value pair.
	 */
	toObject<E, KM extends keyof E, VM extends E[keyof E]> (obj: E, mapper: (value: T, index: number) => [KM, VM]): E;

	/**
	 * Combines the items in this Stream into a string.
	 * @param concatenator A substring to be placed between every item in this Stream. If not provided, uses `""`
	 */
	toString (concatenator?: string): string;
	/**
	 * Combines the items in this Stream into a string, via a reducer function.
	 * @param concatenator Takes the current string and the next value and returns the new string.
	 */
	toString (concatenator: (current: string | undefined, value: T) => string): string;
	/**
	 * Combines the items in this Stream into a string, via a reducer function.
	 * @param concatenator Takes the current string and the next value and returns the new string.
	 * @param startingString Concatenates against this string.
	 */
	toString (concatenator: (current: string, value: T) => string, startingString: string): string;
	/**
	 * Combines the items in this Stream into a string, via a reducer function.
	 * @param concatenator Takes the current string and the next value and returns the new string.
	 * @param toStringFirstValue Calls `toString` on the first value in this Stream for concatenating against future values.
	 */
	toString (concatenator: (current: string, value: T) => string, toStringFirstValue: true): string;
	/**
	 * Combines the items in this Stream into a string, via a reducer function.
	 * @param concatenator Takes the current string and the next value and returns the new string.
	 * @param firstValueMapper A function which converts the first value in the stream into a string, in order to be concatenated with subsequent values.
	 */
	toString (concatenator: (current: string, value: T) => string, firstValueMapper: (value: T) => string): string;

	/**
	 * Iterates through the entire stream.
	 */
	iterateToEnd (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	finish (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	end (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	complete (): void;
	/**
	 * Iterates through the entire stream.
	 *
	 * Note: Alias of `iterateToEnd()`
	 */
	flush (): void;

	////////////////////////////////////
	// Misc
	//

	/**
	 * Runs a function on each item in this Stream.
	 * @param user The function to call for each item
	 */
	forEach (user: (val: T, index: number) => any): void;
	/**
	 * Runs a function on each item in this Stream.
	 * @param user The function to call for each item
	 */
	splatEach (user: T extends Iterable<infer V> ? ((...args: V[]) => any) : never): void;

	next (): IteratorResult<T>;

	/**
	 * Returns whether the Stream has a next entry.
	 */
	hasNext (): boolean;
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

class StreamImplementation<T> implements Stream<T> {

	public value: T;
	public done: boolean;

	private iterators: Iterator<T> | Iterator<T>[];
	private iteratorIndex = 0;
	private doneNext?: boolean;
	private get savedNext (): T[] {
		Object.defineProperty(this, "savedNext", {
			value: [],
			configurable: false,
		});
		return this.savedNext;
	}
	private actionsNeedDeleted?: boolean;
	private parent: StreamImplementation<T>;

	public constructor (iterator?: Iterator<T> | Iterator<T>[], private readonly actions?: Action<T>[]) {
		if (!iterator) {
			this.done = true;
			return;
		}

		this.iterators = iterator === undefined ? [] : iterator;
	}

	public [Symbol.iterator] () {
		return this;
	}

	public [Symbol.asyncIterator] () {
		return {
			next: async () => {
				this.next();
				return {
					done: this.done,
					value: await this.value as any,
				};
			},
		} as any;
	}

	////////////////////////////////////
	// Manipulation
	//

	public filter (filter: (val: T) => any): Stream<any> {
		if (this.savedNext.length) {
			if (!filter(this.savedNext[0])) {
				this.savedNext.pop();
			}
		}

		return this.getWithAction(["filter", filter]);
	}

	public filter2 (filter: (val: T) => any) {
		return this.filter(filter);
	}

	public map (mapper: (val: T) => any): Stream<any> {
		const mappedStream = this.getWithAction(["map", mapper]);
		if (mappedStream.savedNext.length)
			mappedStream.savedNext[0] = mapper(this.savedNext[0]);

		return mappedStream;
	}

	public flatMap (mapper?: (value: T) => Iterable<any>) {
		return new StreamImplementation(new FlatMapStream(this, mapper)) as any;
	}

	public take (amount: number) {
		if (amount < 0 || !Number.isInteger(amount))
			throw new Error("Number of items to take must be a positive integer.");

		if (amount === 0) {
			return StreamImplementation.empty<T>();

		}

		if (this.savedNext.length) {
			amount--;
		}

		return this.getWithAction(["take", amount]);
	}

	public takeWhile (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (!predicate(this.savedNext[0])) {
				this.done = true;
			}
		}

		return this.getWithAction(["takeWhile", predicate]);
	}

	public takeUntil (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (predicate(this.savedNext[0])) {
				this.done = true;
			}
		}

		return this.getWithAction(["takeUntil", predicate]);
	}

	public drop (amount: number) {
		if (amount < 0 || !Number.isInteger(amount))
			throw new Error("Number of items to take must be a positive integer.");

		if (amount === 0) return this;

		if (this.savedNext.length) {
			amount--;
			this.savedNext.pop();
		}

		return this.getWithAction(["drop", amount]);
	}

	public dropWhile (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (predicate(this.savedNext[0])) {
				this.savedNext.pop();

			} else {
				return this;
			}
		}

		return this.getWithAction(["dropWhile", predicate]);
	}

	public dropUntil (predicate: (val: T) => unknown) {
		if (this.savedNext.length) {
			if (!predicate(this.savedNext[0])) {
				this.savedNext.pop();

			} else {
				return this;
			}
		}

		return this.getWithAction(["dropUntil", predicate]);
	}

	public step (step: number) {
		if (step === 1)
			// a step of 1 is default
			return this;

		if (step <= 0)
			// negative iteration is going to require getting the full array anyway, so we just reuse the array step functionality
			return StreamImplementation.values(this.toArray(), step);

		if (!Number.isInteger(step))
			throw new Error("Streams can only be stepped through with a nonzero integer.");

		let current = step;
		if (this.savedNext.length) {
			this.savedNext.pop();
			current--;
		}

		return this.getWithAction(["step", current, step]);
	}

	public sorted (comparator?: (a: T, b: T) => number) {
		return new StreamImplementation(this.toArray().sort(comparator)[Symbol.iterator]());
	}

	public reverse () {
		return new StreamImplementation(this.toArray().reverse()[Symbol.iterator]());
	}

	public distinct () {
		return new StreamImplementation(this.toSet().values());
	}

	public shuffle (random?: () => number) {
		return new StreamImplementation(shuffle(this.toArray(), random)[Symbol.iterator]());
	}

	public partition<K> (sorter: (val: T) => K): Partitions<any, any> {
		return new Partitions(this, sorter, partitionStream => new StreamImplementation(partitionStream));
	}

	public unzip (): any {
		return new UnzippedPartitions(this.flatMap(), partitionStream => new StreamImplementation(partitionStream)) as any;
	}

	public add (...items: any[]) {
		return new StreamImplementation<any>([this, items[Symbol.iterator]()]);
	}

	public insert (...items: any[]) {
		return new StreamImplementation<any>([items[Symbol.iterator](), this]);
	}

	public insertAt (index: number, ...items: any[]) {
		return this.getWithAction(["insert", index, items]);
	}

	public merge (...iterables: Iterable<any>[]) {
		return new StreamImplementation<any>([this, ...iterables
			.map(iterable => iterable instanceof StreamImplementation ? iterable : iterable[Symbol.iterator]())]);
	}

	public collectStream () {
		return new StreamImplementation(this.toArray()[Symbol.iterator]());
	}

	public entries () {
		let i = 0;
		return this.map(value => tuple(i++, value));
	}

	////////////////////////////////////
	// Collection
	//

	public any (predicate: (val: T, index: number) => unknown) {
		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return false;
			}

			if (predicate(this.value, index++)) {
				return true;
			}
		}
	}

	public some (predicate: (val: T, index: number) => unknown) {
		return this.any(predicate);
	}

	public every (predicate: (val: T, index: number) => unknown) {
		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return true;
			}

			if (!predicate(this.value, index++)) {
				return false;
			}
		}
	}

	public all (predicate: (val: T, index: number) => unknown) {
		return this.every(predicate);
	}

	public none (predicate: (val: T, index: number) => unknown) {
		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return true;
			}

			if (predicate(this.value, index++)) {
				return false;
			}
		}
	}

	public includes (...values: T[]) {
		while (true) {
			this.next();
			if (this.done) {
				return values.length === 0;
			}

			if (values.includes(this.value)) {
				return true;
			}
		}
	}

	public contains (...values: T[]) {
		return this.includes(...values);
	}

	public has (...values: T[]) {
		return this.includes(...values);
	}

	public includesAll (...values: T[]) {
		while (true) {
			this.next();
			if (this.done) {
				return values.length === 0;
			}

			const i = values.indexOf(this.value);
			if (i > -1) {
				values.splice(i, 1);
				if (values.length === 0) {
					return true;
				}
			}
		}
	}

	public containsAll (...values: T[]) {
		return this.includesAll(...values);
	}

	public hasAll (...values: T[]) {
		return this.includesAll(...values);
	}

	// tslint:disable-next-line cyclomatic-complexity
	public intersects<X> (...iterables: Iterable<X>[]): T extends X ? boolean : never {
		while (true) {
			this.next();
			if (this.done) {
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
						if ((item as any) === this.value) {
							return true as any;
						}

						replacementArray.push(item);
					}

					iterable = iterables[i] = replacementArray;
				}

				if (Array.isArray(iterable)) {
					if (iterable.includes(this.value)) {
						return true as any;
					}

				} else if (iterable instanceof Set) {
					if (iterable.has(this.value)) {
						return true as any;
					}
				}
			}
		}
	}

	public count (predicate?: (value: T, index: number) => any) {
		let i = 0;
		let count = 0;
		while (true) {
			this.next();
			if (this.done) {
				return count;
			}

			if (!predicate || predicate(this.value, i)) {
				count++;
			}

			i++;
		}
	}

	public length () {
		return this.count();
	}

	public size () {
		return this.count();
	}

	public fold<R> (initial: R, folder: (current: R, newValue: T, index: number) => R) {
		let index = 0;
		let value = initial;
		while (true) {
			this.next();
			if (this.done) {
				return value;
			}

			value = folder(value, this.value, index++);
		}
	}

	public reduce (reducer: (current: T, newValue: T, index: number) => T) {
		this.next();
		let index = 1;
		let value = this.value;
		while (true) {
			this.next();
			if (this.done) {
				return value;
			}

			value = reducer(value, this.value, index++);
		}
	}

	public first (): T | undefined;
	public first (predicate?: (val: T, index: number) => unknown, orElse?: () => T): T | undefined;
	public first (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => T): T;
	public first (predicate?: (val: T, index: number) => unknown, orElse?: () => T) {
		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return orElse ? orElse() : undefined;
			}

			if (!predicate || predicate(this.value, index++)) {
				return this.value;
			}
		}
	}

	public find (): T | undefined;
	public find (predicate?: (val: T, index: number) => unknown, orElse?: () => T): T | undefined;
	public find (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => T): T;
	public find (predicate?: (val: T, index: number) => unknown, orElse?: () => T) {
		return this.first(predicate, orElse);
	}

	public last (): T | undefined;
	public last (predicate?: (val: T, index: number) => unknown, orElse?: () => T): T | undefined;
	public last (predicate: undefined | ((val: T, index: number) => unknown), orElse: () => T): T;
	public last (predicate?: (val: T, index: number) => unknown, orElse?: () => T) {
		let index = 0;
		let last: any = LAST;
		while (true) {
			this.next();
			if (this.done) {
				break;
			}

			if (!predicate || predicate(this.value, index++)) {
				last = this.value;
			}
		}

		return last !== LAST ? last : orElse ? orElse() : undefined;
	}

	public at (index: number): T | undefined;
	public at (index: number, orElse: () => T): T;
	public at (index: number, orElse?: () => T): T | undefined;
	public at (index: number, orElse?: () => T) {
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

	public random (random = Math.random, orElse?: () => any): any {
		if (!this.hasNext()) {
			return orElse ? orElse() : undefined;
		}

		return choice([...this], random)!;
	}

	public collect<R, A extends any[]> (collector: (stream: Stream<T>, ...args: A) => R, ...args: A): R {
		return collector(this, ...args);
	}

	public splat<R> (collector: (...values: T[]) => R, ...args: T[]): R {
		return collector(...this.toArray(), ...args);
	}

	public async race (): Promise<any> {
		return Promise.race(this.toArray()) as any;
	}

	public async rest (): Promise<any> {
		return new StreamImplementation((await Promise.all(this.toArray()))[Symbol.iterator]()) as any;
	}

	public toArray (): T[];
	public toArray<N> (array: N[]): (T | N)[];
	public toArray<M> (mapper: (value: T, index: number) => M): M[];
	public toArray<N, M> (array: N[], mapper: (value: T, index: number) => M): (T | N | M)[];
	public toArray (result: any[] | ((value: any, index: number) => any) = [], mapper?: (value: any, index: number) => any): any {
		if (typeof result === "function") {
			mapper = result;
			result = [];
		}

		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return result as any;
			}

			result.push(mapper ? mapper(this.value, index++) : this.value);
		}
	}

	public toSet (): Set<T>;
	public toSet<N> (set: Set<N>): Set<T | N>;
	public toSet<M> (mapper: (value: T, index: number) => M): Set<M>;
	public toSet<N, M> (set: Set<N>, mapper: (value: T, index: number) => M): Set<T | N | M>;
	public toSet (result: Set<any> | ((value: any, index: number) => any) = new Set(), mapper?: (value: any, index: number) => any): any {
		if (typeof result === "function") {
			mapper = result;
			result = new Set();
		}

		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return result as any;
			}

			result.add(mapper ? mapper(this.value, index++) : this.value);
		}
	}

	public toMap (result?: Map<any, any> | ((value: any, index: number) => [any, any]), mapper?: (value: any, index: number) => [any, any]): any {
		if (typeof result === "function") {
			mapper = result;
			result = new Map();

		} else if (result === undefined) {
			result = new Map();
		}

		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return result;
			}

			if (mapper) {
				result.set(...mapper(this.value, index++));

			} else {
				if (!Array.isArray(this.value)) {
					throw new Error(`Can't convert the stream value "${this.value}" into a key-value pair.`);
				}

				result.set(...this.value as any as [any, any]);
			}
		}
	}

	public toObject (result?: any | ((value: any, index: number) => [any, any]), mapper?: (value: any, index: number) => [any, any]) {
		if (typeof result === "function") {
			mapper = result;
			result = {};

		} else if (result === undefined) {
			result = {};
		}

		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return result;
			}

			if (mapper) {
				const [key, value] = mapper(this.value, index++);
				result[`${key}`] = value;

			} else {
				if (!Array.isArray(this.value)) {
					throw new Error(`Can't convert the stream value "${this.value}" into a key-value pair.`);
				}

				const [key, value] = this.value as any as [any, any];
				result[`${key}`] = value;
			}
		}
	}

	public toString (concatenator?: string): string;
	public toString (concatenator: (current: string | undefined, value: T) => string): string;
	public toString (concatenator: (current: string, value: T) => string, startingValue: string | true | ((value: T) => string)): string;
	public toString (concatenator: string | ((current: string, value: T) => string) = "", startingValue?: string | true | ((value: T) => string)) {
		let result: string | undefined;
		while (true) {
			this.next();
			if (this.done) {
				return result === undefined ? ""
					: typeof concatenator === "string" ? result.slice(concatenator.length) : result;
			}

			if (typeof concatenator === "string") {
				if (result === undefined) result = "";
				result += `${concatenator}${this.value}`;

			} else {
				if (result !== undefined) result = concatenator(result, this.value);
				else result = typeof startingValue === "function" ? startingValue(this.value)
					: startingValue === true ? `${this.value}`
						: concatenator(startingValue!, this.value);
			}
		}
	}

	public iterateToEnd () {
		while (true) {
			this.next();
			if (this.done) {
				return;
			}
		}
	}
	public finish () { this.iterateToEnd(); }
	public end () { this.iterateToEnd(); }
	public complete () { this.iterateToEnd(); }
	public flush () { this.iterateToEnd(); }

	////////////////////////////////////
	// Misc
	//

	public forEach (user: (val: T, index: number) => any) {
		let index = 0;
		while (true) {
			this.next();
			if (this.done) {
				return;
			}

			user(this.value, index++);
		}
	}

	public splatEach (user?: (...args: any[]) => any) {
		while (true) {
			this.next();
			if (this.done) {
				return;
			}

			const value = this.value;
			if (!isIterable(value)) {
				throw new Error(`This stream contains a non-iterable value (${value}), it can't be splatted into the user function.`);
			}

			user!(...value as any);
		}
	}

	// tslint:disable-next-line cyclomatic-complexity
	public next () {
		if (this.doneNext || this.done) {
			this.done = true;
			return this;
		}

		if (this.savedNext.length) {
			this.value = this.savedNext.pop()!;
			return this;
		}

		if (!Array.isArray(this.iterators)) {
			this.iterators = [this.iterators];
		}

		FindNext:
		while (true) {
			const { done, value } = this.iterators[this.iteratorIndex].next();
			this.value = value;
			if (done) {
				this.iteratorIndex++;
				if (this.iteratorIndex >= this.iterators.length) {

					////////////////////////////////////
					// "Last Chance" actions — actions that can extend the stream
					//
					if (this.actions) {
						for (const action of this.actions) {
							switch (action[0]) {
								case "insert": {
									this.iterators.push(action[2][Symbol.iterator]());
									(action as Action<T>)[0] = undefined;
									continue FindNext;
								}
							}
						}
					}

					////////////////////////////////////
					// We're out of values!
					//
					this.done = true;
					return this;
				}

				continue;
			}

			if (this.actionsNeedDeleted) {
				// delete any unused actions
				for (let i = 0; i < this.actions!.length; i++) {
					const [actionType] = this.actions![i];
					if (actionType === undefined) {
						this.actions!.splice(i, 1);
						i--;
					}
				}
				// this.actions = this.actions.filter(([actionType]) => actionType !== undefined);
				this.actionsNeedDeleted = false;
			}

			if (this.actions) {
				for (const action of this.actions) {
					switch (action[0]) {
						case "filter": {
							const filter = action[1];
							if (!filter(this.value)) {
								continue FindNext;
							}

							break;
						}
						case "map": {
							const mapper = action[1];
							this.value = mapper(this.value);
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
								return this;
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
							if (!predicate(this.value)) {
								this.done = true;
								if (this.parent) this.parent.restreamCurrent();
								return this;
							}

							break;
						}
						case "takeUntil": {
							const predicate = action[1];
							if (predicate(this.value)) {
								this.done = true;
								if (this.parent) this.parent.restreamCurrent();
								return this;
							}

							break;
						}
						case "dropWhile": {
							const predicate = action[1];
							if (predicate!(this.value)) {
								continue FindNext;
							}

							// we delete the action name, marking this action for removal
							(action as Action<T>)[0] = undefined;
							this.actionsNeedDeleted = true;

							break;
						}
						case "dropUntil": {
							const predicate = action[1];
							if (!predicate!(this.value)) {
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
			}

			// if we made it this far, we found the next value to return
			return this;
		}
	}

	public hasNext () {
		if (!this.savedNext.length) {
			this.next();
			if (this.done) {
				return false;
			}

			this.savedNext.push(this.value);
		}

		return true;
	}

	private restreamCurrent () {
		this.savedNext.push(this.value);
		if (this.parent) this.parent.restreamCurrent();
	}

	private getWithAction (action: Action<T>): StreamImplementation<any> {
		const newStream = new StreamImplementation(this, [action]);
		newStream.parent = this;
		return newStream;
	}
}

module StreamImplementation {

	export function is<T = any> (value: unknown): value is Stream<T> {
		return value instanceof StreamImplementation;
	}

	export function empty<T = any> (): Stream<T> {
		return new StreamImplementation<T>();
	}

	export function from<T> (iterable: Iterable<T> | (() => IterableIterator<T>)): Stream<T> {
		// if (typeof iterable === "function") return new StreamImplementation(iterable());
		// if (iterable instanceof StreamImplementation) return iterable;
		// if (Symbol.iterator in iterable)
		return new StreamImplementation((iterable as any)[Symbol.iterator]()) as any;
		// throw new Error(`Not an iterable value: ${iterable}`);
	}

	export function of<A extends any[]> (...args: A): Stream<A[number]> {
		return new StreamImplementation(args[Symbol.iterator]());
	}

	export function range (end: number): Stream<number>;
	export function range (start: number, end?: number, step?: number): Stream<number>;
	export function range (start: number, end?: number, step = 1): Stream<number> {
		if (end === undefined) {
			end = start;
			start = 0;
		}

		return new StreamImplementation<number>(rangeIterator(start, end, step)) as any;
	}

	/**
	 * Returns a Stream that iterates over the entries of a map, in key-value tuples.
	 */
	export function entries<K, V> (map?: Map<K, V>): Stream<[K, V]>;
	/**
	 * Returns a Stream that iterates over the entries of an array.
	 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
	 * `step` entries. If a negative number, walks backwards through the array.
	 */
	export function entries<T> (arr: T[], step?: number): Stream<[number, T]>;
	/**
	 * Returns a Stream that iterates over the entries of an object, in key-value tuples.
	 */
	export function entries<T extends object> (obj?: T): Stream<[Extract<keyof T, string>, T[Extract<keyof T, string>]]>;
	/**
	 * Returns a Stream that iterates over the entries of an object, in key-value tuples.
	 */
	export function entries<K, V> (obj?: any): Stream<[K, V]>;
	export function entries<T extends object> (obj?: T, step = 1): Stream<[any, any]> {
		if (obj === undefined) {
			return of() as any;
		}

		if (obj instanceof Map) {
			return new StreamImplementation(obj.entries()) as any;
		}

		if (Array.isArray(obj)) {
			return new StreamImplementation(new ArrayEntriesStream(obj, step)) as any;
		}

		// todo: the following call can probably be made more efficient by looping the entries of the object manually
		// rather than calling `Object.entries` and making a Stream from that result array
		return from(Object.entries(obj));
	}

	/**
	 * Returns a Stream that iterates over the keys of a map.
	 */
	export function keys<K> (map: Map<K, any>): Stream<K>;
	/**
	 * Returns a Stream that iterates over the keys of an object.
	 */
	export function keys<T extends object> (obj: T): Stream<keyof T>;
	/**
	 * Returns a Stream that iterates over the keys of an object.
	 */
	export function keys<K extends string | number> (obj: { [key in K]: any }): Stream<K>;
	export function keys (obj: any): Stream<any> {
		if (obj instanceof Map) {
			return new StreamImplementation(obj.keys());
		}

		// todo: the following call can probably be made more efficient by looping the keys of the object manually
		// rather than calling `Object.keys` and making a Stream from that result array
		return from(Object.keys(obj));
	}

	/**
	 * Returns a Stream that iterates over the values of a map.
	 */
	export function values<V> (map: Map<any, V>): Stream<V>;
	/**
	 * Returns a Stream that iterates over the values of an array.
	 * @param step If not provided, walks through the array one item at a time. If a positive number, walks forwards, every
	 * `step` entries. If a negative number, walks backwards through the array.
	 */
	export function values<T> (arr: T[], step?: number): Stream<T>;
	/**
	 * Returns a Stream that iterates over the values of an object.
	 */
	export function values<T extends object> (obj: T): Stream<T[keyof T]>;
	export function values (obj: any, step = 1): Stream<any> {
		if (obj instanceof Map) {
			return new StreamImplementation(obj.values());
		}

		if (Array.isArray(obj)) {
			if (step === 1) {
				return from(obj);
			}

			return new StreamImplementation(new ArrayStream(obj, step)) as any;
		}

		// todo: the following call can probably be made more efficient by looping the values of the object manually
		// rather than calling `Object.values` and making a Stream from that result array
		return from(Object.values(obj));
	}

	/**
	 * Takes two iterables representing "keys" and "values", and turns them into a Stream of 2-value tuples. The resulting
	 * Stream will end when either of the iterables runs out of items. (Its size will be that of the smaller of the two
	 * input iterables/streams).
	 */
	export function zip<K, V> (keysIterable: Iterable<K> | Stream<K>, valuesIterable: Iterable<V> | Stream<V>): Stream<[K, V]> {
		const valueStream = valuesIterable instanceof StreamImplementation ? new StreamImplementation(valuesIterable) : from(valuesIterable);
		return (keysIterable instanceof StreamImplementation ? new StreamImplementation(keysIterable) : from(keysIterable))
			.takeWhile(() => {
				valueStream.next();
				return !valueStream.done;
			})
			.map((key: any) => tuple(key, valueStream.value));
	}
}

type StreamImplementationClass = typeof StreamImplementation;
interface StreamExportClass extends StreamImplementationClass {
	prototype: Stream<any>;
}

const Stream = StreamImplementation as any as StreamExportClass;

export default Stream;
