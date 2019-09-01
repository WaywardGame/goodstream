import Stream from "./Stream";

export default class Partitions<K, V> implements Iterator<[K, Stream<V>]> {
	public value: [K, Stream<V>];
	public done = false;

	private readonly _partitions: Map<K, [Partition<V>, Stream<V>]> = new Map();
	private readonly partitionKeys: K[] = [];
	private partitionKeyIndex = 0;

	private index = 0;

	public constructor (
		private readonly stream: Iterator<V>,
		private readonly sorter: (val: V, index: number) => K,
		private readonly streamMapper: <V2>(val: Iterator<V2>) => Stream<V2>,
	) { }

	/**
	 * Returns a single partitioned Stream by the given key.
	 * @param key The key of the partitioned Stream.
	 *
	 * Note: The partition Streams returned from this method are the same as returned by `partitions()`. Iterating through
	 * a stream in either location will also empty it in the other.
	 */
	public get (key: K) {
		return this.getPartition(key)[1];
	}

	/**
	 * Returns a Stream of tuples for all the partitioned Streams.
	 *
	 * Note: The partition Streams returned from this method are the same as returned by `partitions()`. Iterating through
	 * a stream in either location will also empty it in the other.
	 */
	public partitions () {
		return this.streamMapper(this);
	}

	/**
	 * Constructs a Map instance from the partitions.
	 */
	public toMap (): Map<K, Stream<V>>;
	/**
	 * Puts the partitions into the given Map.
	 */
	public toMap<KE, VE> (map: Map<KE, VE>): Map<K | KE, Stream<V> | VE>;
	/**
	 * Constructs a Map instance from the partitions using a mapping function.
	 * @param mapper A mapping function which takes a Stream of partitioned values and returns a replacement value.
	 */
	public toMap<VN> (mapper: (value: Stream<V>, key: K) => VN): Map<K, VN>;
	/**
	 * Puts the partitions into the given Map using a mapping function.
	 * @param map The map to put key-partition pairs into.
	 * @param mapper A mapping function which takes a Stream of partitioned values and returns a replacement value.
	 */
	public toMap<VN, KE, VE> (map: Map<KE, VE>, mapper: (value: Stream<V>, key: K) => VN): Map<K | KE, VN | VE>;
	public toMap (result?: Map<any, any> | ((value: Stream<V>, key: K) => any), mapper?: (value: Stream<V>, key: K) => any): any {
		if (typeof result === "function") {
			mapper = result;
			result = new Map();
		} else if (result === undefined) {
			result = new Map();
		}

		while (true) {
			this.next();
			if (this.done) {
				return result;
			}

			const [key, value] = this.value;
			result.set(key, mapper ? mapper(value, key) : value);
		}
	}

	/**
	 * Constructs a Map instance from the partitions, each stream of values first being converted to an array.
	 */
	public toArrayMap (): Map<K, V[]>;
	/**
	 * Inserts the partitions into the given Map, each stream of values first being converted to an array.
	 */
	public toArrayMap<KE, VE> (map: Map<KE, VE>): Map<K | KE, V[] | VE>;
	public toArrayMap<KE, VE> (map?: Map<KE, VE>): Map<K | KE, V[] | VE> {
		return this.toMap(map!, partitionValueStream => partitionValueStream.toArray());
	}

	public next () {
		let key: K;
		let partitionStream: Stream<V>;
		if (this.partitionKeyIndex < this.partitionKeys.length) {
			key = this.partitionKeys[this.partitionKeyIndex++];
			[, partitionStream] = this.getPartition(key);
			this.value = [key, partitionStream];
			return this;
		}

		while (true) {
			const { done, value } = this.stream.next();
			if (done) {
				this.done = true;
				return this;
			}

			let willContinue = false;
			const sortedKey = this.sorter(value, this.index++);
			if (this._partitions.has(sortedKey)) {
				willContinue = true;
			}

			let partition: Partition<V>;
			[partition, partitionStream] = this.getPartition(sortedKey);
			partition.add(value);

			if (willContinue) {
				continue;
			}

			this.value = [sortedKey, partitionStream];
			this.partitionKeyIndex++;
			return this;
		}
	}

	private getPartition (key: K): [Partition<V>, Stream<V>] {
		let partition = this._partitions.get(key);
		if (partition === undefined) {
			this.partitionKeys.push(key);
			const partitionStream = new Partition<V>(this.getFunctionForRetrievingNextInPartition(key));
			this._partitions.set(key, partition = [partitionStream, this.streamMapper(partitionStream)]);
		}

		return partition;
	}

	private getFunctionForRetrievingNextInPartition (key: K) {
		return () => {
			while (true) {
				const { done, value } = this.stream.next();
				if (done) {
					return { done: true, value: undefined };
				}

				const sortedKey = this.sorter(value, this.index++);
				if (sortedKey === key) {
					return { done: false, value };
				}

				const [partition] = this.getPartition(sortedKey);
				partition.add(value);
			}
		};
	}
}

class Partition<T> implements Iterator<T> {
	public value: T;
	public done = false;

	private readonly items: T[] = [];
	private index = 0;

	public constructor (private readonly getNext: () => { done: boolean; value?: T }) { }

	public next () {
		if (this.index < this.items.length) {
			this.value = this.items[this.index++];
			return this;
		}

		const value = this.getNext();
		if (value.done) {
			this.done = true;
			return this;
		}

		this.value = value.value!;
		return this;
	}

	public add (...items: T[]) {
		this.items.push(...items);
	}
}
