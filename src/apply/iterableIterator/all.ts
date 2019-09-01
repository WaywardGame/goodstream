import Stream from "../../Stream";
import Define from "../../util/Define";
import { PROTOTYPES_ITERABLE_ITERATOR } from "../../util/Prototypes";

declare global {
	interface IterableIterator<T> {
		filter: Stream<T>["filter"];
		filter2: Stream<T>["filter2"];
		map: Stream<T>["map"];
		flatMap: Stream<T>["flatMap"];
		take: Stream<T>["take"];
		takeWhile: Stream<T>["takeWhile"];
		takeUntil: Stream<T>["takeUntil"];
		drop: Stream<T>["drop"];
		dropWhile: Stream<T>["dropWhile"];
		dropUntil: Stream<T>["dropUntil"];
		step: Stream<T>["step"];
		sorted: Stream<T>["sorted"];
		reverse: Stream<T>["reverse"];
		distinct: Stream<T>["distinct"];
		shuffle: Stream<T>["shuffle"];
		partition: Stream<T>["partition"];
		unzip: Stream<T>["unzip"];
		add: Stream<T>["add"];
		merge: Stream<T>["merge"];
		insert: Stream<T>["insert"];
		insertAt: Stream<T>["insertAt"];
		collectStream: Stream<T>["collectStream"];
		entries: Stream<T>["entries"];
		any: Stream<T>["any"];
		some: Stream<T>["some"];
		every: Stream<T>["every"];
		all: Stream<T>["all"];
		none: Stream<T>["none"];
		includes: Stream<T>["includes"];
		contains: Stream<T>["contains"];
		has: Stream<T>["has"];
		includesAll: Stream<T>["includesAll"];
		containsAll: Stream<T>["containsAll"];
		hasAll: Stream<T>["hasAll"];
		intersects: Stream<T>["intersects"];
		count: Stream<T>["count"];
		length: Stream<T>["length"];
		size: Stream<T>["size"];
		fold: Stream<T>["fold"];
		reduce: Stream<T>["reduce"];
		first: Stream<T>["first"];
		find: Stream<T>["find"];
		last: Stream<T>["last"];
		at: Stream<T>["at"];
		random: Stream<T>["random"];
		collect: Stream<T>["collect"];
		splat: Stream<T>["splat"];
		race: Stream<T>["race"];
		rest: Stream<T>["rest"];
		toArray: Stream<T>["toArray"];
		toSet: Stream<T>["toSet"];
		toMap: Stream<T>["toMap"];
		toObject: Stream<T>["toObject"];
		toString: Stream<T>["toString"];
		iterateToEnd: Stream<T>["iterateToEnd"];
		finish: Stream<T>["finish"];
		end: Stream<T>["end"];
		complete: Stream<T>["complete"];
		flush: Stream<T>["flush"];
		forEach: Stream<T>["forEach"];
		splatEach: Stream<T>["splatEach"];
		hasNext: Stream<T>["hasNext"];
	}
}

const methods: (Extract<keyof IterableIterator<any>, keyof Stream<any>>)[] = [
	"filter",
	"filter2",
	"map",
	"flatMap",
	"take",
	"takeWhile",
	"takeUntil",
	"drop",
	"dropWhile",
	"dropUntil",
	"step",
	"sorted",
	"reverse",
	"distinct",
	"shuffle",
	"partition",
	"unzip",
	"add",
	"merge",
	"insert",
	"insertAt",
	"collectStream",
	"entries",
	"any",
	"some",
	"every",
	"all",
	"none",
	"includes",
	"contains",
	"has",
	"includesAll",
	"containsAll",
	"hasAll",
	"intersects",
	"count",
	"length",
	"size",
	"fold",
	"reduce",
	"first",
	"find",
	"last",
	"at",
	"random",
	"collect",
	"splat",
	"race",
	"rest",
	"toArray",
	"toSet",
	"toMap",
	"toObject",
	"toString",
	"iterateToEnd",
	"finish",
	"end",
	"complete",
	"flush",
	"forEach",
	"splatEach",
	"hasNext",
];

for (const method of methods) {
	Define.all(PROTOTYPES_ITERABLE_ITERATOR, method, function (...args) {
		return (Stream.from(this)[method] as (...args: any) => never)(...args);
	});
}
