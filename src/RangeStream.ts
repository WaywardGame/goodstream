import { Streamable } from "./IStream";

export default class RangeStream implements Streamable<number> {

	private readonly step: number;
	private _done = false;
	private _value: number;

	public get value () { return this.start + this._value * this.step; }
	public get done () { return this._done; }

	public constructor (private start: number, private end: number, step: number) {
		if (end === start) {
			this._done = true;
		}

		if (step === 0) {
			throw new Error("Step must be non-zero.");
		}

		if (step < 0) {
			const oldStart = start;
			this.start = start = end;
			this.end = end = oldStart;
		}

		step = Math.abs(step) * (start > end ? -1 : 1);

		this.step = step;
		this._value = -1;
	}

	public next () {
		if (this._done) {
			return;
		}

		this._value += 1;
		if (this.step > 0 ? this.value >= this.end : this.value <= this.end) {
			this._done = true;
		}
	}
}
