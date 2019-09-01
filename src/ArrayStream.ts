import { tuple } from "./util/Arrays";
import { Override } from "./util/decorator/Override";

export class ArrayStream<T, R = T> implements Iterator<R> {
	public done = false;
	public value: R;
	protected index: number;
	private readonly step: number;

	public constructor (protected readonly array: T[], step: number) {
		if (step === 0 || !Number.isInteger(step)) {
			throw new Error(`Step "${step}" is invalid. Must be a non-zero positive or negative integer.`);
			step = 1;
		}

		this.step = step;
		this.index = step > 0 ? -1 : array.length;
	}

	public next () {
		if (!this.done) {
			this.index += this.step;
			this.value = this.getValue();
			if (this.step > 0 ? this.index >= this.array.length : this.index < 0) {
				this.done = true;
			}
		}

		return this;
	}

	protected getValue (): R {
		return this.array[this.index] as any;
	}
}

export class ArrayEntriesStream<T> extends ArrayStream<T, [number, T]> {
	@Override public getValue () {
		return tuple(this.index, this.array[this.index]);
	}
}
