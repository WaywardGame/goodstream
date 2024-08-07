import Stream from "../../Stream";
declare global {
    interface IterableIterator<T> {
        stream(): Stream<T>;
    }
    interface BuiltinIterator<T> {
        stream(): Stream<T>;
    }
    interface Generator<T = unknown, TReturn = any, TNext = any> {
        stream(): Stream<T>;
    }
}
