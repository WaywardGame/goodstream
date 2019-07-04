/// <reference types="mocha" />

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Stream from "../Stream";
import { tuple } from "../util/Arrays";

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

			it("should not filter the current stream", () => {
				const stream = Stream.range(7);
				const filteredStream = stream.filter(v => v % 2);
				filteredStream.next();
				filteredStream.next();
				expect([...stream]).ordered.members([4, 5, 6]);
			});
		});

		describe("'map'", () => {
			it("should replace values with a mapped version", () => {
				expect([...Stream.range(3).map(v => v * 2)]).ordered.members([0, 2, 4]);
			});

			it("should not replace values in the current stream", () => {
				const stream = Stream.range(5);
				const mappedStream = stream.map(v => v * 2);
				mappedStream.next();
				mappedStream.next();
				expect([...stream]).ordered.members([2, 3, 4]);
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

			it("should not replace values in the current stream", () => {
				const stream = Stream.of([0, 0], [1, 2], [2, 4]);
				const flatMappedStream = stream.flatMap();
				flatMappedStream.next();
				flatMappedStream.next();
				flatMappedStream.next();
				expect([...stream]).deep.ordered.members([[2, 4]]);
			});
		});

		describe("'take'", () => {
			it("should only stream the number of items requested", () => {
				expect([...Stream.range(5).take(3)]).ordered.members([0, 1, 2]);
			});

			it("should error when given a negative number", () => {
				expect(() => Stream.range(5).take(-3)).throw();
			});

			it("should error when given a decimal number", () => {
				expect(() => Stream.range(5).take(1.5)).throw();
			});

			it("should only return the items in the stream when given a number than the count", () => {
				expect([...Stream.range(3).take(5)]).ordered.members([0, 1, 2]);
			});

			it("should not end the current stream", () => {
				const stream = Stream.range(5);
				[...stream.take(2)];
				expect([...stream]).ordered.members([2, 3, 4]);
			});
		});

		describe("'takeWhile'", () => {
			it("should stream all items until a condition is false", () => {
				expect([...Stream.range(5).takeWhile(val => val !== 3)]).ordered.members([0, 1, 2]);
			});

			it("should stream all items from the stream if the predicate never returns false", () => {
				expect([...Stream.range(5).takeWhile(() => true)]).ordered.members([0, 1, 2, 3, 4]);
			});

			it("should stream no items from the stream if the predicate instantly returns false", () => {
				expect([...Stream.range(5).takeWhile(() => false)]).members([]);
			});

			it("should not end the current stream", () => {
				const stream = Stream.range(5);
				[...stream.takeWhile(val => val !== 3)];
				expect([...stream]).ordered.members([3, 4]);
			});
		});

		describe("'takeUntil'", () => {
			it("should stream all items until a condition is true", () => {
				expect([...Stream.range(5).takeUntil(val => val === 3)]).ordered.members([0, 1, 2]);
			});

			it("should stream all items from the stream if the predicate never returns true", () => {
				expect([...Stream.range(5).takeUntil(() => false)]).ordered.members([0, 1, 2, 3, 4]);
			});

			it("should stream no items from the stream if the predicate instantly returns true", () => {
				expect([...Stream.range(5).takeUntil(() => true)]).members([]);
			});

			it("should not end the current stream", () => {
				const stream = Stream.range(5);
				[...stream.takeUntil(val => val === 3)];
				expect([...stream]).ordered.members([3, 4]);
			});
		});

		describe("'drop'", () => {
			it("should skip the number of items requested", () => {
				expect([...Stream.range(5).drop(3)]).ordered.members([3, 4]);
			});

			it("should error when given a negative number", () => {
				expect(() => Stream.range(5).drop(-3)).throw();
			});

			it("should error when given a decimal number", () => {
				expect(() => Stream.range(5).drop(1.5)).throw();
			});

			it("should stream no items when given a number bigger than the stream count", () => {
				expect([...Stream.range(3).drop(5)]).ordered.members([]);
			});
		});

		describe("'dropWhile'", () => {
			it("should skip all items until a condition is false", () => {
				expect([...Stream.range(5).dropWhile(val => val !== 3)]).ordered.members([3, 4]);
			});

			it("should skip all items from the stream if the predicate never returns false", () => {
				expect([...Stream.range(5).dropWhile(() => true)]).ordered.members([]);
			});

			it("should skip no items from the stream if the predicate instantly returns false", () => {
				expect([...Stream.range(5).dropWhile(() => false)]).members([0, 1, 2, 3, 4]);
			});
		});

		describe("'dropUntil'", () => {
			it("should skip all items until a condition is true", () => {
				expect([...Stream.range(5).dropUntil(val => val === 3)]).ordered.members([3, 4]);
			});

			it("should skip all items from the stream if the predicate never returns true", () => {
				expect([...Stream.range(5).dropUntil(() => false)]).ordered.members([]);
			});

			it("should skip no items from the stream if the predicate instantly returns true", () => {
				expect([...Stream.range(5).dropUntil(() => true)]).members([0, 1, 2, 3, 4]);
			});
		});

		describe("'step'", () => {
			it("should error when given zero or a decimal number", () => {
				expect(() => Stream.range(5).step(0)).throw();
				expect(() => Stream.range(5).step(1.5)).throw();
			});

			it("should skip values when given a positive integer", () => {
				expect([...Stream.range(5).step(2)]).ordered.members([1, 3]);
			});

			it("should skip values in reverse when given a negative integer", () => {
				expect([...Stream.range(5).step(-2)]).ordered.members([3, 1]);
			});

			it("should not affect the current stream", () => {
				const stream = Stream.range(8);
				const steppedStream = stream.step(2);
				steppedStream.next();
				steppedStream.next();
				expect([...stream]).ordered.members([4, 5, 6, 7]);
			});
		});

		describe("'sorted'", () => {
			it("should sort the entries in the stream", () => {
				expect([...Stream.range(50).sorted()]).ordered.members([...Stream.range(50)].sort());
			});

			it("should sort the entries in the stream with a custom comparator", () => {
				expect([...Stream.range(50).sorted((a, b) => a - b)]).ordered.members([...Stream.range(50)].sort((a, b) => a - b));
			});
		});

		describe("'reverse'", () => {
			it("should reverse the entries in the stream", () => {
				expect([...Stream.range(50).reverse()]).ordered.members([...Stream.range(50)].reverse());
			});
		});

		describe("'distinct'", () => {
			it("should remove duplicate entries", () => {
				expect([...Stream.of(1, 2, 2, 2, 2, 3, 4, 4, 5, 5, 2, 5).distinct()]).ordered.members([1, 2, 3, 4, 5]);
			});
		});

		describe("'shuffle'", () => {
			it("should reorganise the items in the stream", () => {
				// technically this isn't a perfect test because it's random,
				// but the odds of this failing are astronomically low so it's probably okay right?
				expect([...Stream.range(10000).shuffle()])
					.members([...Stream.range(10000)])
					.and.not.ordered.members([...Stream.range(10000)]);
			});
		});

		describe("'partition'", () => {
			it("should produce a 'partitions' object containing streams of items, each stream having its own 'key' which was decided by a sorting function", () => {
				const partitions = Stream.range(10).partition(n => n % 2);
				expect([...partitions.partitions().map(([partitionKey, values]) => [partitionKey, [...values]])])
					.deep.ordered.members([[0, [0, 2, 4, 6, 8]], [1, [1, 3, 5, 7, 9]]]);
			});

			it("should allow retrieving one of the partitions before streaming the rest", () => {
				let partitions = Stream.range(10).partition(n => n % 3);
				expect([...partitions.get(0)]).ordered.members([0, 3, 6, 9]);
				expect([...partitions.partitions().map(([partitionKey, values]) => [partitionKey, [...values]])])
					.deep.ordered.members([
						// this first partition is empty because it exists but has already been streamed to completion
						[0, []],
						[1, [1, 4, 7]],
						[2, [2, 5, 8]],
					]);

				partitions = Stream.range(10).partition(n => n % 3);
				expect([...partitions.get(0).take(2)]).ordered.members([0, 3]); // let's not stream it to completion this time
				expect([...partitions.partitions().map(([partitionKey, values]) => [partitionKey, [...values]])])
					.deep.ordered.members([
						[0, [6, 9]],
						[1, [1, 4, 7]],
						[2, [2, 5, 8]],
					]);
			});

			it("should allow retrieving partitions after streaming them all", () => {
				const partitions = Stream.range(10).partition(n => n % 3);
				[...partitions.partitions()];
				expect([...partitions.get(0)]).ordered.members([0, 3, 6, 9]);
			});
		});

		describe("'unzip'", () => {
			it("should separate the keys and values into two streams", () => {
				const unzipped = Stream.of(tuple(0, 1), tuple(2, 3), tuple(4, 5)).unzip();
				expect([...unzipped.partitions().map(([key]) => key)]).members(["key", "value"]);
				expect([...unzipped.get("key")]).ordered.members([0, 2, 4]);
				expect([...unzipped.get("value")]).ordered.members([1, 3, 5]);
			});

			it("should work with an empty input", () => {
				const unzipped = Stream.empty().unzip();
				expect([...unzipped.partitions().map(([key]) => key)]).members(["key", "value"]);
			});
		});

		describe("'add'", () => {
			it("should add new items to the end of the stream", () => {
				expect([...Stream.range(3).add()]).ordered.members([0, 1, 2]);
				expect([...Stream.empty().add(3, 4, 5)]).ordered.members([3, 4, 5]);
			});
		});

		describe("'merge'", () => {
			it("should add the items from the given iterables to the end of the stream", () => {
				expect([...Stream.range(3).merge(Stream.range(3), Stream.range(3))]).ordered.members([0, 1, 2, 0, 1, 2, 0, 1, 2]);
				expect([...Stream.range(3).merge()]).ordered.members([0, 1, 2]);
				expect([...Stream.empty().merge(Stream.range(3))]).ordered.members([0, 1, 2]);
			});
		});

		describe("'collectStream'", () => {
			it("should iterate through the entire stream, then create a new stream from the beginning", () => {
				const values = [1, 2, 3, 4];
				const collectedStream = Stream.from(values).collectStream();
				values.splice(0, Infinity);
				expect([...collectedStream]).ordered.members([1, 2, 3, 4]);
			});
		});

		describe("'entries'", () => {
			it("should return a stream containing tuples representing the stream index and current value", () => {
				expect([...Stream.of("foo", "bar", "bazz").entries()]).deep.ordered.members([[0, "foo"], [1, "bar"], [2, "bazz"]]);
			});
		});
	});
});
