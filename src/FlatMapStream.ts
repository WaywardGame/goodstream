import { Streamable } from "./IStream";

export default class FlatMapStream<T, R> implements Streamable<R> {
	private subIterable: Iterator<any> | undefined;

	private _value: R;
	private _done = false;

	public get value () { return this._value; }
	public get done () { return this._done; }

	public constructor (private readonly stream: Streamable<T>, private readonly mapper?: (value: T) => Iterable<R>) { }

	public next () {
		while (true) {
			while (!this.subIterable) {
				this.stream.next();
				if (this.stream.done) {
					this._done = true;
					return;
				}

				let nextPotentialSubiterable: any = this.stream.value;
				if (this.mapper) {
					nextPotentialSubiterable = this.mapper(this.stream.value);
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

			this._value = value.value;
			break;
		}
	}
}
