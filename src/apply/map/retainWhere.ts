import Define from "../../util/Define";

declare global {
	interface Map<K, V> {
		/**
		 * Retains the entries from this set that match the given predicate function, any other entries will be deleted.
		 * @param predicate A predicate that takes a key and a value, and returns a value which will be checked for truthiness.
		 * @returns whether any entries remain.
		 */
		retainWhere (predicate: (val: V, key: K) => any): boolean;
		/**
		 * If this map contains the given key, checks whether the entry matches the given predicate. 
		 * If it does, it is kept. If not, it's deleted.
		 * @param predicate A predicate that takes a key and a value, and returns a value which will be checked for truthiness.
		 * @returns whether any entries remain in this map.
		 */
		retainWhere (key: K, predicate: (val: V, key: K) => any): boolean;
	}
}

Define(Map.prototype, "retainWhere", function (retainKey, predicate) {
	if (predicate === undefined) {
		predicate = retainKey;
		for (const [key, value] of Array.from(this))
			if (!predicate(value, key))
				this.delete(key);

	} else if (this.has(retainKey)) {
		const value = this.get(retainKey);
		if (!predicate(value, retainKey))
			this.delete(retainKey);
	}

	return this.size > 0;
});
