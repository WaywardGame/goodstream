export type Implementation<P, K extends keyof P> =
	(this: P, ...args: P[K] extends (...args: infer A) => any ? A : []) => P[K] extends (...args: any[]) => infer R ? R : never;

function Define<P, K extends keyof P> (proto: P, key: K, implementation: Implementation<P, K>) {
	try {
		Object.defineProperty(proto, key, {
			configurable: true,
			writable: true,
			value: implementation,
		});
	} catch (err) {
		console.error(`Unable to apply prototype ${(proto as any).constructor.name}["${key}"]`, err);
	}
}

module Define {
	export function all<P, K extends keyof P> (protos: P[], key: K, implementation: Implementation<P, K>) {
		for (const proto of protos) Define(proto, key, implementation);
	}
}

export default Define;
