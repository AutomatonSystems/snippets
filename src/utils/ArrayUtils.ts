import { Nullable } from "../Types";

/**
 * 
 * Ensure the provided var is a Array
 * 
 * array = array
 * null/undefined = []
 * single non-array item = [obj]
 * 
 * @param arrOrObject 
 * 
 * @returns 
 */
export function arr<T>(arrOrObject: T[]|T): Exclude<T, undefined>[]{
	if(arrOrObject===null || arrOrObject === undefined) {
		return [];
	}
	if(Array.isArray(arrOrObject)) {
		return <Exclude<T, undefined>[]>arrOrObject;
	}
	return [<Exclude<T, undefined>>arrOrObject];
}

/**
 * shuffle the contents of an array
 * 
 * @param {*[]} array 
 */
export function shuffle<T>(array: T[]): T[] {
	let currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

export function random<T>(array: T[]){
	return array[Math.floor(array.length * Math.random())];
}

export function max<T>(array: T[], func: (t:T)=>number, min: number = -Infinity): T|null{
	let best = min;
	let value: Nullable<T> = null;
	for(let t of array){
		let score = func(t);
		if(score > best){
			best = score;
			value = t;
		}
	}
	return value;
}

export function min<T>(array: T[], func: (t:T)=>number, max: number = Infinity): T|null{
	let best = max;
	let value: Nullable<T> = null;
	for(let t of array){
		let score = func(t);
		if(score < best){
			best = score;
			value = t;
		}
	}
	return value;
}

export function sum<T>(array: T[], func: (t:T)=>number): number{
	let value = 0;
	for(let t of array){
		value += func(t);
	}
	return value;
}