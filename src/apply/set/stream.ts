import Stream from "../../Stream";
import Define from "../../util/Define";

declare global {
	interface Set<T> {
		stream (): Stream<T>;
	}
}

Define(Set.prototype, "stream", function () {
	return Stream.from(this);
});
