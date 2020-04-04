import Define from "../../util/Define";

declare global {
	interface Map<K, V> {
		toggle (has: boolean, key: K, value: V): this;
	}
}

Define(Map.prototype, "toggle", function (has, key, value) {
	if (has) this.set(key, value);
	else this.delete(key);
	return this;
});
