import { ProgressBar } from "./src/CLI.ts";
import { TermColor } from "./src/cli/Colour.ts";
import { BitArray } from "./src/data/BitArray.ts";
import { ConcurrentQueue } from "./src/processing/ConcurrentQueue.ts";
import { sleep } from "./src/Time.ts";
import fs from "node:fs";

const PATH = "./test.bin";


let bits = await BitArray.create(200);
for(let i = 0; i < 27; i++){
	bits.set(i, true);
}
await bits.save(PATH);

let bitsI = await BitArray.load(PATH);

console.log("\n\n");

for(let i = 31; i < 63; i++){
	bits.set(i, true);
}
await bits.save(PATH);

let bits2 = await BitArray.load(PATH);
fs.rmSync(PATH);

console.log("HELLO", bits.length, bits2.length);

console.log("\n\n");

for(let i = 0; i < 200; i++){
	if(bits2.get(i) != bits.get(i)){
		throw new Error(`${i}`);
	}
}
console.log("VALID!");


//
const RUN_QUEUE = true;

let b = BitArray.create(79);

for(let i = 0; i < 100_000; i++){
	let i = Math.floor(Math.random() * b.length);
	let v = Math.random() > 0.5;
	b.set(i, v);
	if(v != b.get(i)){

		throw new Error(`Bit Array is garbage i=${i} v=${v} a=${b.get(i)}`);
	}
}

// RUN QUEUE CODE
let data: number[] = [];
for(let i = 0; i < 100; i++){
	data.push(i);
}

if(RUN_QUEUE){
	console.log("Queue start");
	await ConcurrentQueue(data, async (i: number)=>await sleep(100), {concurrency: 1});
	console.log("Queue end");
}

if(global?.gc){
	console.log("GARBAGE COLLECT");
	global?.gc?.();
}


// Progress BAR
let bar = new ProgressBar();
bar.color = TermColor.BLUE;
bar.backcolor = TermColor.WHITE;
console.log("ProgressBar");
let max = 50 * 8;
for(let i = 0; i <= max; i++){
	process.stdout.write(`     ${bar.render(i, max)}   \r`);
	await sleep(20);
}
console.log(`     ${bar.render(max, max)}   `);
console.log("Done");