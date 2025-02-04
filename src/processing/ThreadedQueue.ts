import cluster from 'node:cluster';
import process from 'node:process';
import { sleep } from '../Time.ts';
import { ProgressBar } from '../CLI.ts';
import PQueue from 'p-queue';
import { BitArray } from '../data/BitArray.ts';
import { hasFile } from '../DiskIO.ts';

type ThreadedQueueOptions = {
	threads: number // number of threads to create
	concurrency: number // number of concurrent processes in a thread
	retry: number // number of attempts to rerun
	chunk: number
	cache: string|null
}

const THREADED_QUEUE_DEFAULTS: ThreadedQueueOptions = {
	threads: 3, 
	concurrency: 10,
	retry: 5,
	chunk: 1000,
	cache: null
}

export async function ThreadedQueue<T>(loader: ()=>Promise<T[]>, func: (i: T)=>void, _options?: Partial<ThreadedQueueOptions>){

	let options = {...THREADED_QUEUE_DEFAULTS, ...(_options ?? {})}

	if (cluster.isPrimary) {
		console.log(`Primary ${process.pid} is running`);

		let items = await loader();

		let index = 0;
		let done = 0;

		let doneArray: BitArray;
		if(options.cache && await hasFile(options.cache)){
			doneArray = await BitArray.load(options.cache);
		}else{
			doneArray = BitArray.create(items.length);
		}

		// todo auto tune chunk size to be at least 10s of work
		let chunkSize = options.chunk;

		let nextWorkChunk = ()=>{
			if(index >= items.length)
				return null;
			let chunk: [number, T][] = [];
			while(index < items.length){
				if(!doneArray.get(index)){
					chunk.push([index, items[index]]);
					if(chunk.length >= chunkSize)
						break;
				}else{
					done++;
				}
				index++;
			}
			return chunk;
		}

		// Fork workers.
		let open = 0;
		for (let i = 0; i < options.threads; i++) {
			open++;
			let worker = cluster.fork({"MAGIC_WORKER_INDEX": i});
			worker.on("message", m=>{
				if(m.done){
					// update stats
					for(let index of m.done){
						doneArray.set(index, true);
						done++;
					}
				}
				if(m.ready === true){
					// send more work
					let chunk = nextWorkChunk();
					if(chunk){
						worker.send(chunk);
					}else{
						worker.kill();
						open--;
					}
				}
			});
		}

		let bar = new ProgressBar();
		let i = 0;
		while(true){
			if(open == 0)
				break;
			await sleep(1000);
			process.stdout.write("    " + bar.render(done, items.length) + "\r");

			i++;
			if(options.cache){
				if(i % 10 == 0){
					await doneArray.save(options.cache);
				}
			}
		}

		if(options.cache){
			await doneArray.save(options.cache);
		}
		console.log("ThreadedQueue COMPLETE");
	} else {
		let queue = new PQueue({concurrency: options.concurrency});
		let done: number[] = [];

		process.on("message", async (data)=>{
			let items = <[number,T][]>data;

			for(let item of items){
				// precheck??
				await queue.onSizeLessThan(100);

				// add item to queue
				void queue.add(async ()=>{
					for(let i = 0; i < 5; i++){
						try{
							await func(item[1]);
							done.push(item[0]);
							return;
						}catch(e){
							console.warn(e);
						}
					}
				});
			}

			await queue.onIdle();

			// request more work
			let sdone = done;
			done = [];
			process.send?.({ready: true, done: sdone});
			
		});

		// periodically report progress
		setInterval(()=>{
			if(done.length > 0){
				let sdone = done;
				done = [];
				process.send?.({done: sdone});
			}
		}, 1_000);

		// request work
		process.send?.({ready: true});
		
		// Loop FOREVER to prevent executing anything else
		while(true){
			await sleep(100_000);
		}
	}
}