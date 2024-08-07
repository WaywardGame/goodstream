import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { describe, it } from "mocha";
import "../apply";
import Stream from "../Stream";
import { tuple } from "../util/Arrays";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("apply", () => {

	describe("array", () => {
		describe("collect", () => {
			it("should run the given function with the given arguments", () => {
				let args;
				[1, 2, 3, 4, 5].collect(a => { args = a; });
				expect(args).ordered.members([1, 2, 3, 4, 5]);
			});

			it("should return the result of the given function", () => {
				expect([1, 2, 3, 4, 5].collect(() => "test")).eq("test");
			});
		});

		describe("splat", () => {
			it("should run the given function with the given arguments splatted", () => {
				let args;
				[1, 2, 3, 4, 5].splat((...a) => { args = a; });
				expect(args).ordered.members([1, 2, 3, 4, 5]);
			});

			it("should return the result of the given function", () => {
				expect([1, 2, 3, 4, 5].splat(() => "test")).eq("test");
			});
		});

		describe("first", () => {
			it("should return the first item in the array, or undefined if it doesn't exist", () => {
				expect([1, 2, 3].first()).eq(1);
				expect([].first()).undefined;
			});
		});

		describe("last", () => {
			it("should return the last item in the array, or undefined if it doesn't exist", () => {
				expect([1, 2, 3].last()).eq(3);
				expect([].last()).undefined;
			});
		});

		describe("at", () => {
			it("should return the item in the array at the specified index, or undefined if it doesn't exist", () => {
				expect([1, 2, 3].at(1)).eq(2);
				expect([1, 2, 3].at(5)).undefined;
				expect([].at(0)).undefined;
			});
		});

		describe("spliceWhere", () => {
			it("should remove items from the array that match the predicate", () => {
				expect([1, 2, 3, 4, 5].spliceWhere(v => v % 2)).ordered.members([2, 4]);
			});
		});

		describe("stream", () => {
			it("should return a stream from this array", () => {
				const stream = [1, 2, 3, 4, 5].stream();
				expect(stream).instanceOf(Stream);
				expect(stream.toArray()).ordered.members([1, 2, 3, 4, 5]);
			});
		});

		describe("'filterNullish'", () => {
			it("should only include values that aren't null or undefined", () => {
				expect([0, "", null, undefined, true, false].filterNullish()).ordered.members([0, "", true, false]);
			});
		});

		describe("'filterFalsey'", () => {
			it("should by default filter out `null`, `undefined`, and `false`", () => {
				expect([0, "", null, undefined, true, false].filterFalsey()).ordered.members([0, "", true]);
			});
			it("should be able to filter out *everything* falsey", () => {
				expect([0, "", null, undefined, true, false].filterFalsey(true)).ordered.members([true]);
			});
		});

		describe("'min'", () => {
			it("should return the smolest value in the stream", () => {
				expect([0, 1, 2].min()).eq(0);
				expect([12, 13, 15, 18, 19.2, 99].reverse().min()).eq(12);
			});

			it("should accept a mapper to get the actual value from the stream items", () => {
				expect([0, 1, 2].map(value => [value]).min(([value]) => value)).deep.eq([0]);
				expect([12, 13, 15, 18, 19.2, 99].reverse().map(value => [value]).min(([value]) => value)).deep.eq([12]);
			});
		});

		describe("'max'", () => {
			it("should return the lorgest value in the stream", () => {
				expect([0, 1, 2].max()).eq(2);
				expect([12, 13, 15, 18, 19.2, 29].reverse().max()).eq(29);
			});

			it("should accept a mapper to get the actual value from the stream items", () => {
				expect([0, 1, 2].map(value => [value]).max(([value]) => value)).deep.eq([2]);
				expect([12, 13, 15, 18, 19.2, 29].reverse().map(value => [value]).max(([value]) => value)).deep.eq([29]);
			});
		});

		describe("'toSet'", () => {
			it("should collect all values in the array into a set", () => {
				expect([...[0, 1, 2].toSet()]).ordered.members([0, 1, 2]);
				expect([...["foo", "bar", "bazz"].toSet()]).ordered.members(["foo", "bar", "bazz"]);
			});

			it("should push the values into the end of an existing set", () => {
				expect([...[0, 1, 2].toSet(new Set([8, 9]))]).ordered.members([8, 9, 0, 1, 2]);
			});

			it("should map the values before creating the set", () => {
				expect([...[0, 1, 2].toSet(v => v + 1)]).ordered.members([1, 2, 3]);
			});

			it("should map the values before pushing values into an existing set", () => {
				expect([...[0, 1, 2].toSet(new Set([8, 9]), v => v + 1)]).ordered.members([8, 9, 1, 2, 3]);
			});
		});

		describe("'toMap'", () => {
			it("should collect all values in the array into a map", () => {
				expect([...[tuple("bar", 8), tuple("foo", 9), tuple("test", 1)].toMap()]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should push the values into the end of an existing map", () => {
				expect([...[tuple("test", 1)].toMap(new Map([["bar", 8], ["foo", 9]]))]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should map the values before creating the map", () => {
				expect([...[0, 1, 2].toMap(v => [`${v}key`, v + 1])]).deep.ordered.members([["0key", 1], ["1key", 2], ["2key", 3]]);
			});

			it("should map the values before pushing values into an existing map", () => {
				expect([...[0, 1, 2].toMap(new Map([["bar", 8], ["foo", 9]]), v => [`${v}key`, v + 1])]).deep.ordered.members([["bar", 8], ["foo", 9], ["0key", 1], ["1key", 2], ["2key", 3]]);
			});
		});

		describe("'toObject'", () => {
			it("should collect all values in the array into a object", () => {
				expect([...Object.entries([tuple("bar", 8), tuple("foo", 9), tuple("test", 1)].toObject())]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should push the values into the end of an existing object", () => {
				expect([...Object.entries([tuple("test", 1)].toObject({ bar: 8, foo: 9 }))]).deep.ordered.members([["bar", 8], ["foo", 9], ["test", 1]]);
			});

			it("should map the values before creating the object", () => {
				expect([...Object.entries([0, 1, 2].toObject(v => [`${v}key`, v + 1]))]).deep.ordered.members([["0key", 1], ["1key", 2], ["2key", 3]]);
			});

			it("should map the values before pushing values into an existing object", () => {
				expect([...Object.entries([0, 1, 2].toObject({ bar: 8, foo: 9 }, v => [`${v}key` as "bar", v + 1]))]).deep.ordered.members([["bar", 8], ["foo", 9], ["0key", 1], ["1key", 2], ["2key", 3]]);
			});
		});
	});

	describe("function", () => {
		function testFunction (num: number, str: string, bool: boolean) {
			return [num, str, bool];
		}

		describe("dropFirst", () => {
			it("should return a function that ignores its first argument, then passes the remaining arguments to the given function and returns that function's result", () => {
				const dropFirstVersion = testFunction.dropFirst();
				expect(dropFirstVersion("bananas", 1, "test", true)).ordered.members([1, "test", true]);
			});
		});

		describe("dropParams", () => {
			it("should return a function that ignores its first x params, then passes the remaining arguments to the given function and returns that function's result", () => {
				const dropParamsVersion = testFunction.dropParams(3);
				expect(dropParamsVersion("bananas", "things", "foo", 4, "wow", false)).ordered.members([4, "wow", false]);
			});
		});
	});

	describe("iterableIterator", () => {
		function* iterableIterators () {
			yield [1, 2, 3, 4, 5].values();
			yield new Map([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]).values();
			yield new Set([1, 2, 3, 4, 5]).values();
			function* generator () {
				yield 1;
				yield 2;
				yield 3;
				yield 4;
				yield 5;
			}
			yield generator();
		}
		describe("stream", () => {
			it("should return a stream from this iterable iterator", () => {
				for (const iterableIterator of iterableIterators()) {
					const stream = iterableIterator.stream();
					expect(stream).instanceOf(Stream);
					expect(stream.toArray()).ordered.members([1, 2, 3, 4, 5]);
				}
			});
		});

		it("should copy over all methods from stream prototype", () => {
			Object.getOwnPropertyNames(Stream.prototype)
				.filter(val => !["constructor", "savedNext", "next", "restreamCurrent", "getWithAction"].includes(val))
				.forEach(functionName => {
					for (const iterableIterator of iterableIterators()) {
						expect(typeof (iterableIterator as any)[functionName]).eq("function", `Missing Stream method "${functionName}" in IterableIterator (${iterableIterator.constructor.name})`);
					}
				});
		});

		it("should call the map method in the stream correctly", () => {
			for (const iterableIterator of iterableIterators()) {
				expect(iterableIterator.map(x => x + 4).toArray()).ordered.members([5, 6, 7, 8, 9]);
			}
		});

		// note that we don't actually test any more of the duplicated methods from the stream prototype
		// they all are just `Stream.from(this)[method name](...args)` so as long as one works, they all do
	});

	describe("map", () => {

		describe("toggle", () => {
			it("should toggle the given entries to/from this map", () => {
				const map = new Map([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]);
				expect(Array.from(map.toggle(false, 2, 4))).deep.members([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]);
				expect(Array.from(map.toggle(false, 3, 4))).deep.members([[1, 1], [5, 3], [235, 4], [25, 5]]);
				expect(Array.from(map.toggle(true, 1, 4))).deep.members([[1, 4], [5, 3], [235, 4], [25, 5]]);
			});
		});

		describe("entryStream", () => {
			it("should return a stream from the entries in the map", () => {
				const stream = new Map([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]).entryStream();
				expect(stream).instanceOf(Stream);
				expect(stream.toArray()).deep.members([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]);
			});
		});

		describe("keyStream", () => {
			it("should return a stream from the keys in the map", () => {
				const stream = new Map([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]).keyStream();
				expect(stream).instanceOf(Stream);
				expect(stream.toArray()).members([1, 3, 5, 235, 25]);
			});
		});

		describe("valueStream", () => {
			it("should return a stream from the keys in the map", () => {
				const stream = new Map([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]).valueStream();
				expect(stream).instanceOf(Stream);
				expect(stream.toArray()).members([1, 2, 3, 4, 5]);
			});
		});

		describe("getOrDefault", () => {
			it("should get a value from the map if it exists", () => {
				expect(new Map([["test", true]]).getOrDefault("test", () => false)).true;
			});

			it("should pass the needed key to the value generator", () => {
				expect(new Map().getOrDefault("test", key => key)).eq("test");
			});

			it("should pass the needed key to the value generator", () => {
				let key;
				new Map().getOrDefault("test", k => { key = k; });
				expect(key).eq("test");
			});

			it("should return the result of the value generator if the key doesn't exist", () => {
				expect(new Map().getOrDefault("test", () => "banana")).eq("banana");
			});

			it("should not assign the key/value to the map", () => {
				const map = new Map();
				expect(map.getOrDefault("test", () => "banana")).eq("banana");
				expect(map.has("test")).false;
			});

			it("should assign the key/value to the map if `true` is passed", () => {
				const map = new Map();
				expect(map.getOrDefault("test", () => "banana", true)).eq("banana");
				expect(map.get("test")).eq("banana");
			});
		});

		describe("retainWhere", () => {
			describe("without key param", () => {
				it("should retain the entries from this map where the given predicate returns true", () => {
					const map = new Map([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]);
					expect(map.retainWhere(v => v % 2)).true;
					expect(Array.from(map)).deep.members([[1, 1], [5, 3], [25, 5]]);
					expect(map.retainWhere((v, k) => typeof k === "number")).true;
					expect(Array.from(map)).deep.members([[1, 1], [5, 3], [25, 5]]);
					expect(map.retainWhere(v => typeof v === "string")).false;
					expect(Array.from(map)).deep.members([]);
				});
			});

			describe("with key param", () => {
				it("should retain the entries from this map where the given predicate returns true", () => {
					let map = new Map([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]);
					expect(map.retainWhere(1, v => v % 2)).true;
					expect(Array.from(map)).deep.members([[1, 1], [3, 2], [5, 3], [235, 4], [25, 5]]);
					expect(map.retainWhere(3, v => v % 2)).true;
					expect(Array.from(map)).deep.members([[1, 1], [5, 3], [235, 4], [25, 5]]);
					expect(map.retainWhere(5, (v, k) => typeof k === "number")).true;
					expect(Array.from(map)).deep.members([[1, 1], [5, 3], [235, 4], [25, 5]]);
					expect(map.retainWhere(235, v => typeof v === "string")).true;
					expect(Array.from(map)).deep.members([[1, 1], [5, 3], [25, 5]]);
					map = new Map([[1, 2]]);
					expect(map.retainWhere(1, v => false)).false;
					expect(Array.from(map)).deep.members([]);
				});

				it("should never loop over missing keys", () => {
					const map = new Map([[1, "test"]]);
					let result = "thing";
					expect(() => { map.retainWhere(2, val => result = val); }).not.throw();
					expect(result).not.eq(undefined);
					expect(map.size).eq(1);
				});
			});
		});
	});

	describe("regex", () => {
		describe("matches", () => {
			it("should return a stream of matches", () => {
				const matches = /hello, ([^!]*)!/g.matches("hello, test! hello, joe! hello, mary!");
				expect(matches).instanceOf(Stream);
				const matchArray = matches.toArray();
				expect(matchArray.length).eq(3);
				expect(matchArray.map(arr => arr[1])).ordered.members(["test", "joe", "mary"]);
			});
		});
	});

	describe("set", () => {
		describe("add", () => {
			it("should add the given values to this set", () => {
				expect(Array.from(new Set().add(1, 2, 3, 4, 5))).members([1, 2, 3, 4, 5]);
			});
		});

		describe("delete", () => {
			it("should delete the given values from this set", () => {
				const set = new Set([1, 2, 3, 4, 5]);
				expect(set.delete()).false;
				expect(set.delete(8)).false;
				expect(set.delete(1, 3, 5)).true;
				expect(Array.from(set)).members([2, 4]);
			});
		});

		describe("toggle", () => {
			it("should toggle the given values to/from this set", () => {
				const set = new Set([1, 2, 3, 4, 5]);
				expect(Array.from(set.toggle(false, 2, 4))).members([1, 3, 5]);
				expect(Array.from(set.toggle(true, 1, 4, 7))).members([1, 3, 5, 4, 7]);
			});
		});

		describe("addFrom", () => {
			it("should add the given values to this set", () => {
				expect(Array.from(new Set().addFrom([1, 2, 3], [], [4, 5]))).members([1, 2, 3, 4, 5]);
			});
		});

		describe("deleteFrom", () => {
			it("should delete the given values from this set", () => {
				const set = new Set([1, 2, 3, 4, 5]);
				expect(set.deleteFrom()).false;
				expect(set.deleteFrom([])).false;
				expect(set.deleteFrom([8])).false;
				expect(set.deleteFrom([1], [3, 5], [])).true;
				expect(Array.from(set)).members([2, 4]);
			});
		});

		describe("toggleFrom", () => {
			it("should toggle the given values to/from this set", () => {
				const set = new Set([1, 2, 3, 4, 5]);
				expect(Array.from(set.toggleFrom(false, [], [2], [3, 4]))).members([1, 5]);
				expect(Array.from(set.toggleFrom(true, [1, 4], [], [7]))).members([1, 5, 4, 7]);
			});
		});

		describe("deleteWhere", () => {
			it("should delete the values from this set where the given predicate returns true", () => {
				const set = new Set([1, 2, 3, 4, 5]);
				expect(set.deleteWhere(v => v % 2)).true;
				expect(Array.from(set)).members([2, 4]);
				expect(set.deleteWhere(v => false)).false;
				expect(Array.from(set)).members([2, 4]);
			});
		});

		describe("retainWhere", () => {
			it("should retain the values from this set where the given predicate returns true", () => {
				const set = new Set([1, 2, 3, 4, 5]);
				expect(set.retainWhere(v => v % 2)).true;
				expect(Array.from(set)).members([1, 3, 5]);
				expect(set.retainWhere(v => typeof v === "number")).true;
				expect(Array.from(set)).members([1, 3, 5]);
				expect(set.retainWhere(v => typeof v === "string")).false;
				expect(Array.from(set)).members([]);
			});
		});

		describe("retainNot", () => {
			it("should delete the given value, and return whether there's any value left", () => {
				const set = new Set([1, 2, 3, 4, 5]);
				expect(set.retainNot(1)).true;
				expect(Array.from(set)).members([2, 3, 4, 5]);
				expect(set.retainNot(1)).true;
				expect(Array.from(set)).members([2, 3, 4, 5]);
				expect(set.retainNot(2)).true;
				expect(set.retainNot(3)).true;
				expect(set.retainNot(4)).true;
				expect(set.retainNot(5)).false;
				expect(set.retainNot(5)).false;
				expect(Array.from(set)).members([]);
			});
		});

		describe("stream", () => {
			it("should return a stream from this set", () => {
				const stream = new Set([1, 2, 3, 4, 5]).stream();
				expect(stream).instanceOf(Stream);
				expect(stream.toArray()).members([1, 2, 3, 4, 5]);
			});
		});
	});

});
