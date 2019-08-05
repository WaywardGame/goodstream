export default class FlatMapStream<T, R> implements Iterator<R>, IteratorResult<R> {
	public value: R;
	public done = false;

	private subIterable: Iterator<any> | undefined;

	public constructor (private readonly stream: Iterator<T>, private readonly mapper?: (value: T) => Iterable<R>) { }

	public next () {
		while (true) {
			while (!this.subIterable) {
				const { done, value: nextIterable } = this.stream.next();
				if (done) {
					this.done = true;
					return this;
				}

				let nextPotentialSubiterable: any = nextIterable;
				if (this.mapper) {
					nextPotentialSubiterable = this.mapper(nextIterable);
				}

				if (typeof nextPotentialSubiterable !== "object" || !(Symbol.iterator in nextPotentialSubiterable)) {
					// we allow "flatMap" to be called on Streams containing `X | Iterable<X>` currently
					// if we don't want that, we can uncomment the following lines:
					// Log.warn(LogSource.Utilities, "Stream")("Can't use flat map on item, not iterable: ", this.stream.value);
					// continue;
					this.subIterable = [nextPotentialSubiterable][Symbol.iterator]();

				} else {
					this.subIterable = nextPotentialSubiterable[Symbol.iterator]();
				}
			}

			const value = this.subIterable.next();
			if (value.done) {
				this.subIterable = undefined;
				continue;
			}

			this.value = value.value;
			return this;
		}
	}
}
