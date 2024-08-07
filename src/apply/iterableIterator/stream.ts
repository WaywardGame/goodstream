import Stream from "../../Stream";
import Define from "../../util/Define";
import { PROTOTYPES_ITERABLE_ITERATOR } from "../../util/Prototypes";

declare global {
	interface IterableIterator<T> {
		stream (): Stream<T>;
	}
	interface BuiltinIterator<T> {
		stream (): Stream<T>;
	}
	interface Generator<T = unknown, TReturn = any, TNext = any> {
		stream (): Stream<T>;
	}
}

Define.all(PROTOTYPES_ITERABLE_ITERATOR, "stream", function () {
	return Stream.from(this);
});
