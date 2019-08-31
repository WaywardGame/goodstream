import Stream from "../../Stream";
import Define from "../../util/Define";
import { PROTOTYPES_ITERABLE_ITERATOR } from "../../util/Prototypes";

declare global {
	interface IterableIterator<T> {
		stream (): Stream<T>;
	}
}

Define(PROTOTYPES_ITERABLE_ITERATOR, "stream", function () {
	return Stream.from(this);
});
