import Define from "../../util/Define";

declare global {
	interface Set<T> {
		add (...values: T[]): this;
		delete (...values: T[]): boolean;
		toggle (has: boolean, ...values: T[]): this;
	}
}

const originalAdd = Set.prototype.add;
Define(Set.prototype, "add", function (...values) {
	for (const value of values)
		originalAdd.call(this, value);
	return this;
});

const originalDelete = Set.prototype.delete;
Define(Set.prototype, "delete", function (...values) {
	let deleted = false;
	for (const value of values)
		if (originalDelete.call(this, value))
			deleted = true;
	return deleted;
});

Define(Set.prototype, "toggle", function (has, ...values) {
	if (has) this.add(...values);
	else this.delete(...values);
	return this;
});
