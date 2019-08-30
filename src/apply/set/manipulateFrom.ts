import Define from "../../util/Define";

declare global {
	interface Set<T> {
		addFrom (...iterables: Iterable<T>[]): this;
		deleteFrom (...iterables: Iterable<T>[]): boolean;
		toggleFrom (has: boolean, ...iterables: Iterable<T>[]): this;
	}
}

const originalAdd = Set.prototype.add;
Define(Set.prototype, "addFrom", function (...iterables) {
	for (const iterable of iterables)
		for (const value of iterable)
			originalAdd.call(this, value);
	return this;
});

const originalDelete = Set.prototype.delete;
Define(Set.prototype, "deleteFrom", function (...iterables) {
	let deleted = false;
	for (const iterable of iterables)
		for (const value of iterable)
			if (originalDelete.call(this, value))
				deleted = true;
	return deleted;
});

Define(Set.prototype, "toggleFrom", function (has, ...iterables) {
	if (has) this.addFrom(...iterables);
	else this.deleteFrom(...iterables);
	return this;
});
