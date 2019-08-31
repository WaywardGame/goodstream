export type Implementation<P, K extends keyof P> =
	(this: P, ...args: P[K] extends (...args: infer A) => any ? A : []) => P[K] extends (...args: any[]) => infer R ? R : never;

export default function <P, K extends keyof P> (proto: P | P[], key: K, implementation: Implementation<P, K>) {
	try {
		if (!Array.isArray(proto)) proto = [proto];
		for (const p of proto) {
			Object.defineProperty(p, key, {
				configurable: true,
				writable: true,
				value: implementation,
			});
		}
	} catch (err) {
		console.error(`Unable to apply prototype ${(proto as any).constructor.name}["${key}"]`, err);
	}
}
