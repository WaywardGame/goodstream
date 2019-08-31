export const PROTOTYPES_ITERABLE_ITERATOR: IterableIterator<any>[] = [
	Object.getPrototypeOf(function* (): any { }).prototype,
	Object.getPrototypeOf([][Symbol.iterator]()),
	Object.getPrototypeOf(new Map().keys()),
	Object.getPrototypeOf(new Set().values()),
];
