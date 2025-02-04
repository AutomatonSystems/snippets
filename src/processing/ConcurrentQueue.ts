import PQueue from "p-queue";

import * as DiskIO from "../DiskIO.js";
import { readFile } from "fs/promises";
import { keyInput, ProgressBar, TerminalSpinner } from "../CLI.js";
import { TermColor, TermText } from "../cli/Colour.js";
import { ensureCalled } from "../Garbage.js";


type QueueStats = {
	size: number
	done: number
	skip: number
	precheck: number
	ran: number

	last: any // last completed input
}

type QueueOptions<T> = {
	concurrency: number

	id?: string
	precheck?: (i: T)=>Promise<boolean>
	skip?: number
}

const QUEUE_DEFAULTS: QueueOptions<void> = {
	concurrency: 3
}

export async function ConcurrentQueue<T>(
		items: T[], 
		run: (i: T)=>Promise<void>,
		_options?: Partial<QueueOptions<T>>
	){

	let options = {...(<QueueOptions<T>>QUEUE_DEFAULTS), ...(_options ?? {})};

	const id = (options.id ?? "").replaceAll("/", "__");
	if(id){
		console.log(id);
	}

	let queue = new PQueue({concurrency: options.concurrency});

	console.log("Queue running...");

	let stats: QueueStats = {
		size: items.length,
		done: 0,
		// how they were done
		skip: 0, // items skipped
		precheck: 0, // items failed precheck
		ran: 0, // items ran
		last: ""
	}

	if(id){
		try{
			let json = JSON.parse(await readFile(`${id}.queue`, 'utf8'));
			options.skip = json.skip;
			console.log(`RESUME @ ${options.skip}`);
		}catch(e){

		}
	}

	let crashResume = stoppable(60_000, async ()=>{
		if(id){
			let skip = Math.floor(stats.done / 1000) * 1000;
			await DiskIO.createFile(`${id}.queue`, `{"skip": ${skip}}`);
		}
	});

	let inputListener = keyInput((c)=>{
		if(c == "+"){
			queue.concurrency = Math.round(queue.concurrency * 1.1  + 1);
			console.log(`+ concurrency ${queue.concurrency}`);
		}else if(c == "-"){
			queue.concurrency = Math.max(1, Math.round(queue.concurrency * 0.9 - 1));
			console.log(`- concurrency ${queue.concurrency}`);
		}
	});
	let logger = createLogger(queue, stats);
	
	for(let item of items){
		if(stats.done < (options.skip ?? 0)){
			stats.done ++;
			stats.skip++;
			continue;
		}
		// if an item doesn't pass (optional) precheck - skip
		if(options.precheck && !await options.precheck(item)){
			stats.done ++;
			stats.precheck++;
			continue;
		}

		if(queue.size > 1_000){
			await queue.onSizeLessThan(1_000);
		}

		void queue.add(async ()=>{
			for(let i = 0; i < 5; i++){
				try{
					await run(item);
					stats.done++;
					stats.ran++;
					stats.last = item;
					return;
				}catch(e){
					console.warn(e);
				}
			}
		});
	}

	await queue.onIdle();
	logger.log();
	logger.stop();
	inputListener.stop();
	crashResume.stop();
}

function stoppable(interval: number, func: ()=>void):{stop:()=>void}{
	let i = setInterval(func, interval);
	return {
		stop: ()=>clearInterval(i)
	}
}

function createLogger(queue: PQueue, stats: QueueStats): {stop: ()=>void, log:()=>void}{
	const BAR = new ProgressBar();
	const SPINNER = new TerminalSpinner();

	const BAR_LOG_INTERVAL_SECONDS = 1;

	let log = ()=>{
		let text = ` ${BAR.render(stats.done, stats.size)} `;
		process.stdout.write("     "+ text + ` ${stats.last}\r`);
	}

	log();
	let logger = setInterval(log, BAR_LOG_INTERVAL_SECONDS * 1_000);
	let fastlogger = setInterval(()=>{
		process.stdout.write("  "+
			TermText.render(SPINNER.render(), 
				queue.size > 0 ? TermColor.BLUE : 
				queue.pending == queue.concurrency ? TermColor.YELLOW :
				TermColor.RED)
			+ "\r");
	}, 200)

	let stop = ()=>{
		clearInterval(fastlogger);
		clearInterval(logger);
	}

	return {
		log: log,
		stop: ensureCalled(stop)
	};
}