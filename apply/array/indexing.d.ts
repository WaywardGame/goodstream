declare global {
    interface Array<T> {
        /**
         * Returns the last item in this array, or `undefined` if there are no items in this array.
         * Note: Alias of `Array[0]`
         */
        first(): T | undefined;
        /**
         * Returns the last item in this array, or `undefined` if there are no items in this array.
         * Note: Alias of `Array[Array.length - 1]`
         */
        last(): T | undefined;
        /**
         * Returns the last item in this array, or `undefined` if there are no items in this array.
         * Note: Alias of `Array[index]`
         */
        at(index: number): T | undefined;
    }
    interface ReadonlyArray<T> {
        /**
         * Returns the last item in this array, or `undefined` if there are no items in this array.
         * Note: Alias of `Array[0]`
         */
        first(): T | undefined;
        /**
         * Returns the last item in this array, or `undefined` if there are no items in this array.
         * Note: Alias of `Array[Array.length - 1]`
         */
        last(): T | undefined;
        /**
         * Returns the last item in this array, or `undefined` if there are no items in this array.
         * Note: Alias of `Array[index]`
         */
        at(index: number): T | undefined;
    }
}
export {};
