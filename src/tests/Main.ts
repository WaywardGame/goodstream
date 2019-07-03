/// <reference types="mocha" />

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Stream from "../Stream";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Stream", () => {
	describe("creation helper", () => {
		describe("'empty'", () => {
			it("should produce an empty stream", () => {
				expect([...Stream.empty()]).empty;
			});
		});

		describe("'of'", () => {
			it("should contain the exact items passed", () => {
				for (let i = 0; i < 100; i++) {
					const set = new Set();
					for (let j = 0; j < i; j++)
						set.add(`${Math.random()}-${j}-${i}`);

					const stream = Stream.of(...set);
					for (const value of stream)
						set.add(value);

					expect(set.size).eq(i);
				}
			});
		});

		describe("'from'", () => {
			it("should stream the iterator of an array", () => {
				expect([...Stream.from([1, 2, 3])]).ordered.members([1, 2, 3]);
			});

			it("should stream the iterator of a set", () => {
				expect([...Stream.from(new Set([1, 2, 3]))]).ordered.members([1, 2, 3]);
			});

			it("should stream the entries of a map", () => {
				expect([...Stream.from(new Map([[1, 2], [2, 3]]))]).deep.ordered.members([[1, 2], [2, 3]]);
			});

			it("should stream the entries of another stream", () => {
				expect([...Stream.from(Stream.of(1, 2, 3))]).ordered.members([1, 2, 3]);
			});

			it("should stream the entries of an iterable", () => {
				expect([...Stream.from([1, 2, 3][Symbol.iterator]())]).ordered.members([1, 2, 3]);
			});
		});

		describe("'values'", () => {
			it("should stream the values of a map", () => {
				expect([...Stream.values(new Map([[1, 2], [8, 9]]))]).ordered.members([2, 9]);
			});

			it("should stream the values of an array", () => {
				expect([...Stream.values([1, 2, 3])]).ordered.members([1, 2, 3]);
			});

			it("should error on streaming an array with a decimal step", () => {
				expect(() => Stream.values([1, 2, 3], 0.1)).throw();
			});

			it("should skip the values of an array with a positive step", () => {
				expect([...Stream.values([1, 2, 3, 4], 2)]).ordered.members([2, 4]);
			});

			it("should reverse the values of an array with negative step", () => {
				expect([...Stream.values([1, 2, 3, 4], -1)]).ordered.members([4, 3, 2, 1]);
				expect([...Stream.values([1, 2, 3, 4], -2)]).ordered.members([3, 1]);
			});

			it("should stream the values of an object", () => {
				expect([...Stream.values({ foo: 0, bar: 1 })]).members([0, 1]);
			});
		});

		describe("'keys'", () => {
			it("should stream the keys of a map", () => {
				expect([...Stream.keys(new Map([[1, 2], [8, 9]]))]).ordered.members([1, 8]);
			});

			it("should stream the keys of an object", () => {
				expect([...Stream.keys({ foo: 0, bar: 1 })]).members(["foo", "bar"]);
			});
		});

		describe("'entries'", () => {
			it("should stream the entries of a map", () => {
				expect([...Stream.entries(new Map([[1, 2], [8, 9]]))]).deep.ordered.members([[1, 2], [8, 9]]);
			});

			it("should stream the entries of an array", () => {
				expect([...Stream.entries([1, 2, 3])]).deep.ordered.members([[0, 1], [1, 2], [2, 3]]);
			});

			it("should error on streaming an array with a decimal step", () => {
				expect(() => Stream.entries([1, 2, 3], 0.1)).throw();
			});

			it("should skip the entries of an array with a positive step", () => {
				expect([...Stream.entries([1, 2, 3, 4], 2)]).deep.ordered.members([[1, 2], [3, 4]]);
			});

			it("should reverse the entries of an array with negative step", () => {
				expect([...Stream.entries([1, 2, 3, 4], -1)]).deep.ordered.members([[3, 4], [2, 3], [1, 2], [0, 1]]);
				expect([...Stream.entries([1, 2, 3, 4], -2)]).deep.ordered.members([[2, 3], [0, 1]]);
			});

			it("should stream the entries of an object", () => {
				expect([...Stream.entries({ foo: 0, bar: 1 })]).deep.members([["foo", 0], ["bar", 1]]);
			});
		});

		describe("'range'", () => {
			it("should contain ints from zero till the given number (exclusive)", () => {
				expect([...Stream.range(3)]).ordered.members([0, 1, 2]);
			});

			it("should contain ints from the given start (inclusive) till the given end (exclusive)", () => {
				expect([...Stream.range(1, 3)]).ordered.members([1, 2]);
			});

			it("should produce decimal numbers with decimal start or end", () => {
				expect([...Stream.range(1.5)]).ordered.members([0, 1]);
				expect([...Stream.range(2, 5.5)]).ordered.members([2, 3, 4, 5]);
				expect([...Stream.range(3.5, 6.5)]).ordered.members([3.5, 4.5, 5.5]);
			});

			it("should produce a range in reverse if the end is less than the start", () => {
				expect([...Stream.range(3, 1)]).ordered.members([3, 2]);
			});

			it("should produce a range in reverse if the end is less than the start", () => {
				expect([...Stream.range(3, 1)]).ordered.members([3, 2]);
			});

			it("should error if given a step of zero", () => {
				expect(() => Stream.range(0, 1, 0)).throw();
			});

			it("should skip around with a different step", () => {
				expect([...Stream.range(0, 6, 2)]).ordered.members([0, 2, 4]);
				expect([...Stream.range(0, 6, -2)]).ordered.members([6, 4, 2]);
			});

			it("should produce decimal numbers with a decimal step", () => {
				expect([...Stream.range(0, 1, 0.2)]).ordered.members([0, 0.2, 0.4, 0.2 * 3, 0.8]);
			});
		});

		describe("'zip'", () => {
			it("should produce an array of tuples", () => {
				expect([...Stream.zip([1, 2, 3], [4, 5, 6])]).deep.ordered.members([[1, 4], [2, 5], [3, 6]]);
			});

			it("should ignore extra values from the bigger list", () => {
				expect([...Stream.zip([1, 2, 3], [4])]).deep.ordered.members([[1, 4]]);
				expect([...Stream.zip([5], [2, 7, 3])]).deep.ordered.members([[5, 2]]);
			});
		});
	});

	describe("manipulation method", () => {
		describe("'filter'/'filter2'", () => {
			it("should only include values that pass a predicate", () => {
				expect([...Stream.range(5).filter(v => v % 2)]).ordered.members([1, 3]);
				expect([...Stream.range(5).filter2(v => v % 2)]).ordered.members([1, 3]);
			});
		});

		describe("'map'", () => {
			it("should replace values with a mapped version", () => {
				expect([...Stream.range(3).map(v => v * 2)]).ordered.members([0, 2, 4]);
			});
		});

		describe("'flatMap'", () => {
			it("should iterate through each value of each iterable", () => {
				expect([...Stream.of([0, 0], [1, 2], [2, 4]).flatMap()]).ordered.members([0, 0, 1, 2, 2, 4]);
			});

			it("should stream non-iterable values normally", () => {
				expect([...Stream.of(0, [1, 2], [2, 4]).flatMap()]).ordered.members([0, 1, 2, 2, 4]);
			});

			it("should not break apart strings", () => {
				expect([...Stream.of("foo", "bar").flatMap()]).ordered.members(["foo", "bar"]);
			});

			it("should allow a mapping function to be passed", () => {
				expect([...Stream.of("foo", "bar").flatMap(str => str.split(""))]).ordered.members(["f", "o", "o", "b", "a", "r"]);
			});

			it("should not split strings produced by the mapping function", () => {
				expect([...Stream.of("foo", "bar").flatMap(str => str)]).ordered.members(["foo", "bar"]);
			});
		});
	});
});
