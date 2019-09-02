import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Stream from "../build/Stream";
import { tuple } from "../build/util/Arrays";

chai.use(chaiAsPromised);
const expect = chai.expect;

async function sleep<T> (ms: number, returnValue?: T) {
	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
}

describe("Stream", () => {

	describe("misc helper", () => {
		describe("'is'", () => {
			it("should return whether a value is a stream instance", () => {
				expect(Stream.is(Stream.of())).true;
				expect(Stream.is(true)).false;
				expect(Stream.is(0)).false;
				expect(Stream.is(1)).false;
				expect(Stream.is("test")).false;
				expect(Stream.is([])).false;
				expect(Stream.is([][Symbol.iterator]())).false;
			});
		});

		it("'forEach'", () => {
			const arr: [string, number][] = [];
			Stream.range(3).map(val => `val${val}`).forEach((value, index) => arr.push([value, index]));
			expect(arr).deep.ordered.members([["val0", 0], ["val1", 1], ["val2", 2]]);
		});

		describe("'splatEach'", () => {
			it("should execute a callback for each iterable member of this stream, splatting all values into the call", () => {
				const arr: number[][] = [];
				Stream.range(3).map(() => Stream.range(3)).splatEach((...numbers) => arr.push(numbers));
				expect(arr).deep.ordered.members([[0, 1, 2], [0, 1, 2], [0, 1, 2]]);
			});
		});

		describe("'hasNext'", () => {
			it("should return whether there's a next value without moving past it", () => {
				expect(Stream.of().hasNext()).false;
				const streamWithItem = Stream.range(3);
				expect(streamWithItem.hasNext()).true;
				expect([...streamWithItem]).ordered.members([0, 1, 2]);
			});
		});

		////////////////////////////////////
		// iterateToEnd aliases
		//

		it("'iterateToEnd'", () => {
			const arr: number[] = [];
			Stream.range(3).map(val => arr.push(val)).iterateToEnd();
			expect(arr).ordered.members([0, 1, 2]);
		});

		it("'finish'", () => {
			const arr: number[] = [];
			Stream.range(3).map(val => arr.push(val)).finish();
			expect(arr).ordered.members([0, 1, 2]);
		});

		it("'end'", () => {
			const arr: number[] = [];
			Stream.range(3).map(val => arr.push(val)).end();
			expect(arr).ordered.members([0, 1, 2]);
		});

		it("'complete'", () => {
			const arr: number[] = [];
			Stream.range(3).map(val => arr.push(val)).complete();
			expect(arr).ordered.members([0, 1, 2]);
		});

		it("'flush'", () => {
			const arr: number[] = [];
			Stream.range(3).map(val => arr.push(val)).flush();
			expect(arr).ordered.members([0, 1, 2]);
		});
	});

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

					expect([...Stream.of(...set)]).ordered.members([...set]);
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
				const partitions = Stream.range(10).partition(n => `k${n % 2}`);
				expect([...partitions.partitions().map(([partitionKey, values]) => [partitionKey, [...values]])])
					.deep.ordered.members([["k0", [0, 2, 4, 6, 8]], ["k1", [1, 3, 5, 7, 9]]]);
			});

			it("should accept a mapper for the values in the partitions", () => {
				const partitions = Stream.range(10).partition(n => `k${n % 2}`, n => n + 3);
				expect([...partitions.partitions().map(([partitionKey, values]) => [partitionKey, [...values]])])
					.deep.ordered.members([["k0", [3, 5, 7, 9, 11]], ["k1", [4, 6, 8, 10, 12]]]);
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

			it("should allow converting to a map", () => {
				expect(Stream.range(10).partition(n => n % 3).toMap()).instanceOf(Map);
				const partitionedMap = [...Stream.range(10).partition(n => n % 3).toMap().entries()];
				expect(partitionedMap.length).equals(3);
				expect(partitionedMap.map(([k]) => k)).ordered.members([0, 1, 2]);
				for (const [, v] of partitionedMap) expect(v).instanceOf(Stream);
				expect(partitionedMap.map(([, v]) => [...v])).deep.ordered.members([[0, 3, 6, 9], [1, 4, 7], [2, 5, 8]]);
			});

			it("should allow converting to a map with a mapper", () => {
				expect([...Stream.range(10).partition(n => n % 3).toMap(partitionValueStream => [...partitionValueStream]).entries()])
					.deep.ordered.members([[0, [0, 3, 6, 9]], [1, [1, 4, 7]], [2, [2, 5, 8]]]);
			});

			it("should allow inserting into an existing map", () => {
				const partitionedMap = [...Stream.range(10).partition(n => n % 3).toMap(new Map([["foo", "bar"]])).entries()];
				expect(partitionedMap.length).equals(4);
				expect(partitionedMap.map(([k]) => k)).ordered.members(["foo", 0, 1, 2]);
				for (const [, v] of partitionedMap) expect(typeof v === "string" || v instanceof Stream).true;
				expect(partitionedMap.map(([, v]) => [...v])).deep.ordered.members([["b", "a", "r"], [0, 3, 6, 9], [1, 4, 7], [2, 5, 8]]);
			});

			it("should allow inserting into an existing map, with a mapper", () => {
				expect([...Stream.range(10).partition(n => n % 3).toMap(new Map([["foo", "bar"]]), partitionValueStream => [...partitionValueStream]).entries()])
					.deep.ordered.members([["foo", "bar"], [0, [0, 3, 6, 9]], [1, [1, 4, 7]], [2, [2, 5, 8]]]);
			});

			it("should allow converting to a map of arrays", () => {
				expect([...Stream.range(10).partition(n => n % 3).toArrayMap().entries()])
					.deep.ordered.members([[0, [0, 3, 6, 9]], [1, [1, 4, 7]], [2, [2, 5, 8]]]);
			});

			it("should allow inserting into an existing map as arrays", () => {
				expect([...Stream.range(10).partition(n => n % 3).toArrayMap(new Map([["foo", "bar"]])).entries()])
					.deep.ordered.members([["foo", "bar"], [0, [0, 3, 6, 9]], [1, [1, 4, 7]], [2, [2, 5, 8]]]);
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
				expect([...Stream.range(3).add(3, 4, 5)]).ordered.members([0, 1, 2, 3, 4, 5]);
			});
		});

		describe("'insert'", () => {
			it("should insert new items to the beginning of the stream", () => {
				expect([...Stream.range(3).insert()]).ordered.members([0, 1, 2]);
				expect([...Stream.empty().insert(3, 4, 5)]).ordered.members([3, 4, 5]);
				expect([...Stream.range(3).insert(3, 4, 5)]).ordered.members([3, 4, 5, 0, 1, 2]);
			});
		});

		describe("'insertAt'", () => {
			it("should insert new items into the stream", () => {
				expect([...Stream.range(3).insertAt(1)]).ordered.members([0, 1, 2]);
				expect([...Stream.range(3).insertAt(1, 3, 4, 5)]).ordered.members([0, 3, 4, 5, 1, 2]);
			});

			it("should add to the end of the stream when the position is after the stream's other contents", () => {
				expect([...Stream.empty().insertAt(1, 3, 4, 5)]).ordered.members([3, 4, 5]);
				expect([...Stream.range(3).insertAt(5, 3, 4, 5)]).ordered.members([0, 1, 2, 3, 4, 5]);
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

	describe("collection method", () => {

		describe("'any'", () => {
			it("should return whether any values match the predicate", () => {
				expect(Stream.range(3).any(val => val === 2)).equal(true);
				expect(Stream.range(3).any(val => val === 3)).equal(false);
			});

			it("should return false with an empty stream", () => {
				expect(Stream.of().any(() => true)).equal(false);
				expect(Stream.of().any(() => false)).equal(false);
			});
		});

		describe("'some'", () => {
			it("should return whether any values match the predicate", () => {
				expect(Stream.range(3).some(val => val === 2)).equal(true);
				expect(Stream.range(3).some(val => val === 3)).equal(false);
			});

			it("should return false with an empty stream", () => {
				expect(Stream.of().some(() => true)).equal(false);
				expect(Stream.of().some(() => false)).equal(false);
			});
		});

		describe("'every'", () => {
			it("should return whether all values match the predicate", () => {
				expect(Stream.range(3).every(val => val < 2)).equal(false);
				expect(Stream.range(3).every(val => val < 3)).equal(true);
			});

			it("should return true with an empty stream", () => {
				expect(Stream.of().every(() => true)).equal(true);
				expect(Stream.of().every(() => false)).equal(true);
			});
		});

		describe("'all'", () => {
			it("should return whether all values match the predicate", () => {
				expect(Stream.range(3).all(val => val < 2)).equal(false);
				expect(Stream.range(3).all(val => val < 3)).equal(true);
			});

			it("should return true with an empty stream", () => {
				expect(Stream.of().all(() => true)).equal(true);
				expect(Stream.of().all(() => false)).equal(true);
			});
		});

		describe("'none'", () => {
			it("should return whether no values match the predicate", () => {
				expect(Stream.range(3).none(val => val === 2)).equal(false);
				expect(Stream.range(3).none(val => val === 3)).equal(true);
			});

			it("should return true with an empty stream", () => {
				expect(Stream.of().none(() => true)).equal(true);
				expect(Stream.of().none(() => false)).equal(true);
			});
		});

		describe("'includes'", () => {
			it("should return whether the stream contains any of the given values", () => {
				expect(Stream.range(3).includes(0)).equal(true);
				expect(Stream.range(3).includes(4)).equal(false);
				expect(Stream.range(3).includes(0, 4)).equal(true);
				expect(Stream.range(3).includes(4, 0)).equal(true);
				expect(Stream.range(3).includes(4, 5)).equal(false);
				expect(Stream.range(3).includes(5, 4)).equal(false);
			});

			it("should return true with an empty stream if no values are given", () => {
				expect(Stream.of().includes()).equal(true);
			});

			it("should return false with an empty stream if values are given", () => {
				expect(Stream.of<number[]>().includes(1)).equal(false);
			});
		});

		describe("'contains'", () => {
			it("should return whether the stream contains any of the given values", () => {
				expect(Stream.range(3).contains(0)).equal(true);
				expect(Stream.range(3).contains(4)).equal(false);
				expect(Stream.range(3).contains(0, 4)).equal(true);
				expect(Stream.range(3).contains(4, 0)).equal(true);
				expect(Stream.range(3).contains(4, 5)).equal(false);
				expect(Stream.range(3).contains(5, 4)).equal(false);
			});

			it("should return true with an empty stream if no values are given", () => {
				expect(Stream.of().contains()).equal(true);
			});

			it("should return false with an empty stream if values are given", () => {
				expect(Stream.of<number[]>().contains(1)).equal(false);
			});
		});

		describe("'has'", () => {
			it("should return whether the stream contains any of the given values", () => {
				expect(Stream.range(3).has(0)).equal(true);
				expect(Stream.range(3).has(4)).equal(false);
				expect(Stream.range(3).has(0, 4)).equal(true);
				expect(Stream.range(3).has(4, 0)).equal(true);
				expect(Stream.range(3).has(4, 5)).equal(false);
				expect(Stream.range(3).has(5, 4)).equal(false);
			});

			it("should return true with an empty stream if no values are given", () => {
				expect(Stream.of().has()).equal(true);
			});

			it("should return false with an empty stream if values are given", () => {
				expect(Stream.of<number[]>().has(1)).equal(false);
			});
		});

		describe("'includesAll'", () => {
			it("should return whether the stream contains all of the given values", () => {
				expect(Stream.range(3).includesAll(0)).equal(true);
				expect(Stream.range(3).includesAll(4)).equal(false);
				expect(Stream.range(3).includesAll(0, 4)).equal(false);
				expect(Stream.range(3).includesAll(4, 0)).equal(false);
				expect(Stream.range(3).includesAll(5, 4)).equal(false);
				expect(Stream.range(3).includesAll(1, 2)).equal(true);
			});

			it("should return true with an empty stream if no values are given", () => {
				expect(Stream.of().includesAll()).equal(true);
			});

			it("should return false with an empty stream if values are given", () => {
				expect(Stream.of<number[]>().includesAll(1)).equal(false);
			});
		});

		describe("'containsAll'", () => {
			it("should return whether the stream contains all of the given values", () => {
				expect(Stream.range(3).containsAll(0)).equal(true);
				expect(Stream.range(3).containsAll(4)).equal(false);
				expect(Stream.range(3).containsAll(0, 4)).equal(false);
				expect(Stream.range(3).containsAll(4, 0)).equal(false);
				expect(Stream.range(3).containsAll(5, 4)).equal(false);
				expect(Stream.range(3).containsAll(1, 2)).equal(true);
			});

			it("should return true with an empty stream if no values are given", () => {
				expect(Stream.of().containsAll()).equal(true);
			});

			it("should return false with an empty stream if values are given", () => {
				expect(Stream.of<number[]>().containsAll(1)).equal(false);
			});
		});

		describe("'hasAll'", () => {
			it("should return whether the stream contains all of the given values", () => {
				expect(Stream.range(3).hasAll(0)).equal(true);
				expect(Stream.range(3).hasAll(4)).equal(false);
				expect(Stream.range(3).hasAll(0, 4)).equal(false);
				expect(Stream.range(3).hasAll(4, 0)).equal(false);
				expect(Stream.range(3).hasAll(5, 4)).equal(false);
				expect(Stream.range(3).hasAll(1, 2)).equal(true);
			});

			it("should return true with an empty stream if no values are given", () => {
				expect(Stream.of().hasAll()).equal(true);
			});

			it("should return false with an empty stream if values are given", () => {
				expect(Stream.of<number[]>().hasAll(1)).equal(false);
			});
		});

		describe("'intersects'", () => {
			it("should return whether any of the given iterables contain values in this stream", () => {
				expect(Stream.range(3).intersects(Stream.range(3))).equal(true);
				expect(Stream.range(3).intersects(Stream.range(3, 6))).equal(false);
				expect(Stream.range(3).intersects(Stream.range(3, 6), [0])).equal(true);
				expect(Stream.range(3).intersects(Stream.range(3, 6), new Set([2]))).equal(true);
			});

			it("should return true with an empty stream if no values are given", () => {
				expect(Stream.of().intersects()).equal(true);
			});

			it("should return false with an empty stream if values are given", () => {
				expect(Stream.of().intersects(Stream.of(1))).equal(false);
				expect(Stream.of().intersects([1])).equal(false);
				expect(Stream.of().intersects(new Set([1]))).equal(false);
				expect(Stream.of().intersects([1][Symbol.iterator]())).equal(false);
			});

			it("should return false with an empty stream if the iterables being compared against are also empty", () => {
				expect(Stream.of().intersects(Stream.of())).equal(false);
				expect(Stream.of().intersects([])).equal(false);
				expect(Stream.of().intersects(new Set())).equal(false);
				expect(Stream.of().intersects([][Symbol.iterator]())).equal(false);
				expect(Stream.of().intersects(Stream.of(), [], [][Symbol.iterator](), new Set())).equal(false);
			});
		});

		describe("'count'", () => {
			it("should return the number of items in the stream", () => {
				expect(Stream.range(3).count()).equal(3);
				expect(Stream.range(5).count()).equal(5);
				expect(Stream.of().count()).equal(0);
			});

			it("should accept a predicate and only count the items that match the predicate", () => {
				expect(Stream.range(5).count(val => val % 2)).equal(2);
			});
		});

		describe("'length'", () => {
			it("should return the number of items in the stream", () => {
				expect(Stream.range(3).length()).equal(3);
				expect(Stream.range(5).length()).equal(5);
				expect(Stream.of().length()).equal(0);
			});
		});

		describe("'size'", () => {
			it("should return the number of items in the stream", () => {
				expect(Stream.range(3).size()).equal(3);
				expect(Stream.range(5).size()).equal(5);
				expect(Stream.of().size()).equal(0);
			});
		});

		describe("'at'", () => {
			it("should return the value at the given index", () => {
				expect(Stream.range(3).at(2)).equal(2);
				expect(Stream.range(3).at(1)).equal(1);
				expect(Stream.range(3).at(0)).equal(0);
			});

			it("should accept negative indices", () => {
				expect(Stream.range(3).at(-1)).equal(2);
				expect(Stream.range(3).at(-2)).equal(1);
				expect(Stream.range(3).at(-3)).equal(0);
			});

			it("should return undefined if the index doesn't exist", () => {
				expect(Stream.range(3).at(3)).equal(undefined);
				expect(Stream.range(3).at(-4)).equal(undefined);
			});

			it("should error if given a non-integer", () => {
				expect(() => Stream.range(3).at(0.1)).throw();
			});

			it("should allow providing an 'orElse' method for generating replacement values", () => {
				expect(Stream.range(3).at(0, () => 10)).equal(0);
				expect(Stream.range(3).at(2, () => 11)).equal(2);
				expect(Stream.range(3).at(5, () => 12)).equal(12);
				expect(Stream.range(3).at(-1, () => 13)).equal(2);
				expect(Stream.range(3).at(-3, () => 14)).equal(0);
				expect(Stream.range(3).at(-5, () => 15)).equal(15);
			});

			it("should not use the 'orElse' method when the value in the stream is 'undefined'", () => {
				expect(Stream.of(undefined, undefined, undefined).at(0, () => 10)).equal(undefined);
				expect(Stream.of(undefined, undefined, undefined).at(1, () => 10)).equal(undefined);
				expect(Stream.of(undefined, undefined, undefined).at(-2, () => 10)).equal(undefined);
			});
		});

		describe("'random'", () => {
			it("should return a random item in the stream", () => {
				const originalMathRandom = Math.random;
				let i = 0;
				Math.random = () => i += 3 / 15;
				expect(Stream.range(15).random()).equal(3);
				expect(Stream.range(15).random()).equal(6);
				expect(Stream.range(15).random()).equal(9);
				Math.random = originalMathRandom;
			});

			it("should return the given value or undefined if the stream is empty", () => {
				expect(Stream.of().random()).undefined;
				expect(Stream.of().random(undefined, () => 1)).equal(1);
			});

			it("should use the given random number generator", () => {
				let i = 0;
				const random = () => i += 2 / 10;
				expect(Stream.range(10).random(random)).equal(2);
				expect(Stream.range(10).random(random)).equal(4);
				expect(Stream.range(10).random(random)).equal(6);
			});
		});

		describe("'collect'", () => {
			it("should return the result of the given function, passing the stream as an argument", () => {
				expect(Stream.range(3).collect(() => "foo")).equal("foo");
				expect(Stream.range(3).collect(nums => [...nums])).ordered.members([0, 1, 2]);
			});

			it("should also pass any additional arguments", () => {
				expect(Stream.range(3).collect((nums, multiplier) => [...nums].map(n => n * multiplier), 3)).ordered.members([0, 3, 6]);
			});
		});

		describe("'splat'", () => {
			it("should return the result of the given function, passing the contents of the stream as arguments", () => {
				expect(Stream.range(3).splat(() => "foo")).equal("foo");
				expect(Stream.range(3).splat((...nums) => nums)).ordered.members([0, 1, 2]);
			});

			it("should also pass any additional arguments", () => {
				expect(Stream.range(3).splat((...nums) => nums, 3, 4, 5)).ordered.members([0, 1, 2, 3, 4, 5]);
			});
		});

		describe("'race'", () => {
			it("should return the first completed promise in the stream", () => {
				return Promise.all([
					expect(Stream.of(sleep(100, 0), sleep(200, 1), sleep(300, 2)).race()).eventually.eq(0),
					expect(Stream.of(sleep(1000, 0), sleep(200, 1), sleep(300, 2)).race()).eventually.eq(1),
					expect(Stream.of(sleep(1000, 0), sleep(0, 1), sleep(300, 2)).race()).eventually.eq(1),
					expect(Stream.of(0, sleep(100, 1), 2).race()).eventually.eq(0),
				]);
			});

			it("should reject the entire thing if a value is a rejected promise", () => {
				return Promise.all([
					expect(Stream.of(Promise.reject("rejected")).race()).rejectedWith("rejected"),
				]);
			});

			it("should not reject the entire thing if a promise is resolved before a promise is rejected", () => {
				return Promise.all([
					expect(Stream.of(Promise.resolve("resolved"), Promise.reject("rejected")).race()).eventually.eq("resolved"),
				]);
			});
		});

		describe("'rest'", () => {
			it("should return a new stream with all values awaited", () => {
				return Promise.all([
					expect(Stream.of(sleep(100, 0), sleep(200, 1), sleep(300, 2)).rest().then(s => [...s])).eventually.ordered.members([0, 1, 2]),
					expect(Stream.of(sleep(1000, 0), sleep(200, 1), sleep(300, 2)).rest().then(s => [...s])).eventually.ordered.members([0, 1, 2]),
					expect(Stream.of(sleep(1000, 0), sleep(100, 1), sleep(3, 2)).rest().then(s => [...s])).eventually.ordered.members([0, 1, 2]),
					expect(Stream.of(0, sleep(100, 1), 2).rest().then(s => [...s])).eventually.ordered.members([0, 1, 2]),
				]);
			});

			it("should reject the entire thing if a value is a rejected promise", () => {
				return Promise.all([
					expect(Stream.of(Promise.reject("rejected")).rest().then(s => [...s])).rejectedWith("rejected"),
				]);
			});
		});

		describe("'toArray'", () => {
			it("should collect all values in the stream into an array", () => {
				expect(Stream.range(3).toArray()).ordered.members([0, 1, 2]);
				expect(Stream.of("foo", "bar", "bazz").toArray()).ordered.members(["foo", "bar", "bazz"]);
			});

			it("should push the values into the end of an existing array", () => {
				expect(Stream.range(3).toArray([8, 9])).ordered.members([8, 9, 0, 1, 2]);
			});

			it("should map the values before creating the array", () => {
				expect(Stream.range(3).toArray(v => v + 1)).ordered.members([1, 2, 3]);
			});

			it("should map the values before pushing values into an existing array", () => {
				expect(Stream.range(3).toArray([8, 9], v => v + 1)).ordered.members([8, 9, 1, 2, 3]);
			});
		});

		describe("'toSet'", () => {
			it("should collect all values in the stream into a set", () => {
				expect([...Stream.range(3).toSet()]).ordered.members([0, 1, 2]);
				expect([...Stream.of("foo", "bar", "bazz").toSet()]).ordered.members(["foo", "bar", "bazz"]);
			});

			it("should push the values into the end of an existing set", () => {
				expect([...Stream.range(3).toSet(new Set([8, 9]))]).ordered.members([8, 9, 0, 1, 2]);
			});

			it("should map the values before creating the set", () => {
				expect([...Stream.range(3).toSet(v => v + 1)]).ordered.members([1, 2, 3]);
			});

			it("should map the values before pushing values into an existing set", () => {
				expect([...Stream.range(3).toSet(new Set([8, 9]), v => v + 1)]).ordered.members([8, 9, 1, 2, 3]);
			});
		});

		describe("'toMap'", () => {
			it("should collect all values in the stream into a map", () => {
				expect([...Stream.of(tuple("bar", 8), tuple("foo", 9), tuple("test", 1)).toMap()]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should push the values into the end of an existing map", () => {
				expect([...Stream.of(tuple("test", 1)).toMap(new Map([["bar", 8], ["foo", 9]]))]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should map the values before creating the map", () => {
				expect([...Stream.range(3).toMap(v => [`${v}key`, v + 1])]).deep.ordered.members([["0key", 1], ["1key", 2], ["2key", 3]]);
			});

			it("should map the values before pushing values into an existing map", () => {
				expect([...Stream.range(3).toMap(new Map([["bar", 8], ["foo", 9]]), v => [`${v}key`, v + 1])]).deep.ordered.members([["bar", 8], ["foo", 9], ["0key", 1], ["1key", 2], ["2key", 3]]);
			});
		});

		describe("'toObject'", () => {
			it("should collect all values in the stream into a object", () => {
				expect([...Object.entries(Stream.of(tuple("bar", 8), tuple("foo", 9), tuple("test", 1)).toObject())]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should push the values into the end of an existing object", () => {
				expect([...Object.entries(Stream.of(tuple("test", 1)).toObject({ bar: 8, foo: 9 }))]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should map the values before creating the object", () => {
				expect([...Object.entries(Stream.range(3).toObject(v => [`${v}key`, v + 1]))]).deep.ordered.members([["0key", 1], ["1key", 2], ["2key", 3]]);
			});

			it("should map the values before pushing values into an existing object", () => {
				expect([...Object.entries(Stream.range(3).toObject({ bar: 8, foo: 9 }, v => [`${v}key` as "bar", v + 1]))]).deep.ordered.members([["bar", 8], ["foo", 9], ["0key", 1], ["1key", 2], ["2key", 3]]);
			});
		});

		describe("'toString'", () => {
			it("should collect all values in the stream into a string", () => {
				expect(Stream.range(3).toString()).eq("012");
			});

			it("should accept a string concatenator", () => {
				expect(Stream.range(3).toString(",")).eq("0,1,2");
			});

			it("should accept a concatenator function", () => {
				expect(Stream.range(3).toString((str, value) => `${value},${str}`)).eq("2,1,0,undefined");
				expect(Stream.range(3).toString((str, value) => `${value},${str}`, true)).eq("2,1,0");
				expect(Stream.range(3).toString((str, value) => `${value},${str}`, value => `thing${value}`)).eq("2,1,thing0");
			});
		});
	});
});
