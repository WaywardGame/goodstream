export default function rangeIterator (start: number, end: number, step: number): Iterator<number> {
	let result: IteratorResult<number, number>;
	if (end === start) {
		result = { done: true, value: NaN };
	} else {
		if (step === 0) {
			throw new Error("Step must be non-zero.");
		}

		if (step < 0) {
			const oldStart = start;
			start = end;
			end = oldStart;
		}

		step = Math.abs(step) * (start > end ? -1 : 1);

		result = { done: false, value: start - step };
	}

	if (step > 0) {
		return {
			next () {
				if (!result.done) {
					result.value += step;
					if (result.value >= end) {
						(result as any).done = true;
					}
				}
				return result;
			},
		};
	} else {
		return {
			next () {
				if (!result.done) {
					result.value += step;
					if (result.value <= end) {
						(result as any).done = true;
					}
				}
				return result;
			},
		};
	}
}
