# @automaton.systems/snippets

[![https://nodei.co/npm/@automaton.systems/snippets.png?compact=true](https://nodei.co/npm/@automaton.systems/snippets.png?compact=true)](https://www.npmjs.com/package/@automaton.systems/snippets)

A set of snippets that aren't big enough to be worth setting up their own library, but aren't something that should constantly be copy/pasted.

## Snippets

### ThreadedQueue

Runs the provided code in multiple threads.
TODO document/fix numerous cases where this WONT work

```typescript
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
```