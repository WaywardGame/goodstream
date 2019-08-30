import Stream from "../../Stream";
import Define from "../../util/Define";

declare global {
	interface RegExp {
		/**
		 * Returns a Stream for the matches of this string.
		 */
		matches (string: string): Stream<RegExpExecArray>;
	}
}

Define(RegExp.prototype, "matches", function (string) {
	return Stream.iterators(new StreamableMatches(this, string));
});

class StreamableMatches implements Iterator<RegExpExecArray> {

	public done = false;
	public value: RegExpExecArray;

	public constructor (private readonly regex: RegExp, private readonly str: string) { }

	public next () {
		if (this.done) return this;

		const value = this.regex.exec(this.str);
		if (!value) this.done = true;
		else this.value = value;

		return this;
	}
}
