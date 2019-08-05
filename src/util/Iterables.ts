export function isIterable (obj: any): obj is Iterable<any> {
	return typeof obj === "object" && obj !== null && Symbol.iterator in obj;
}
