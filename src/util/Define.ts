export type Implementation<P, K extends keyof P> =
	(this: P, ...args: P[K] extends (...args: infer A) => any ? A : []) => P[K] extends (...args: any[]) => infer R ? R : never;

export default function <P, K extends keyof P> (proto: P, key: K, implementation: Implementation<P, K>) {
	try {
		Object.defineProperty(proto, key, {
			configurable: true,
			writable: true,
			value: implementation,
		});
		Object.defineProperty(proto, key, {
			configurable: true,
			writable: true,
			value: implementation,
		});
	} catch (err) {
		console.error(`Unable to apply prototype ${(proto as any).constructor.name}["${key}"]`, err);
	}
}
