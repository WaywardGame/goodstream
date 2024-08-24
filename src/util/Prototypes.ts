export const PROTOTYPES_ITERABLE_ITERATOR: IterableIterator<any>[] = [
	Object.getPrototypeOf(function* (): any { }).prototype,
	Object.getPrototypeOf([][Symbol.iterator]()),
	Object.getPrototypeOf(new Map()[Symbol.iterator]()),
	Object.getPrototypeOf(new Set()[Symbol.iterator]()),
	Object.getPrototypeOf(""[Symbol.iterator]()),
];
