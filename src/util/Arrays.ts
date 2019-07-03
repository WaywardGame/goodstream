/**
 * Shuffles the contents of the given array using the Fisher-Yates Shuffle: https://bost.ocks.org/mike/shuffle/
 * @returns The given array after shuffling its contents.
 */
export function shuffle<T> (arr: T[], r = Math.random): T[] {
	let currentIndex = arr.length;
	let temporaryValue: T;
	let randomIndex: number;

	while (0 !== currentIndex) {
		randomIndex = randomInt(r, currentIndex);
		currentIndex -= 1;
		temporaryValue = arr[currentIndex];
		arr[currentIndex] = arr[randomIndex];
		arr[randomIndex] = temporaryValue;
	}

	return arr;
}

export function tuple<T extends any[]> (...items: T): T {
	return items;
}

export function choice<T> (arr: T[], r = Math.random) {
	return arr.length === 0 ? undefined : arr[randomInt(r, arr.length)];
}

function randomInt (randomFunction: () => number, max: number) {
	return Math.floor(randomFunction() * max);
}
