import { ThreadedQueue } from '../src/processing/ThreadedQueue.ts';
import { sleep } from '../src/utils/Time.ts';

let loadData = async ()=>{
	console.log("LOADED DATA");
	let array = new Array(10_000);
	for(let i = 0; i < array.length; i++)
		array[i] = i;
	return array;
}

let func = async (i: number)=>{
	await sleep(Math.random() * 2000 + 500);
}

await ThreadedQueue(loadData, func);