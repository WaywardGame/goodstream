import Partitions from "./Partitions";
import Stream from "./Stream";

class UnzippedPartitionsImplementation<K, V> extends Partitions<any, any> implements UnzippedPartitions<K, V> {
	public constructor (stream: Stream<[K, V]>, streamMapper: <V2>(val: Iterator<V2>) => Stream<V2>) {
		super(stream.flatMap(), (value, index) => index % 2 ? "value" : "key", streamMapper);
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

interface UnzippedPartitions<K, V> extends Iterator<["key", Stream<K>] | ["value", Stream<V>]> {
	get (partition: "key"): Stream<K>;
	get (partition: "value"): Stream<V>;
	keys (): Stream<K>;
	values (): Stream<V>;
	partitions (): Stream<["key", Stream<K>] | ["value", Stream<V>]>;
}

const UnzippedPartitions = UnzippedPartitionsImplementation;

export default UnzippedPartitions;
