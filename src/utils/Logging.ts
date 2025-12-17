import fs from 'node:fs/promises';
// import chalk from "chalk";
import { Nullable } from '../Types';
import { TermText, TextTransforms } from '../cli/Colour';
import { sleep } from './Time';
// import { BasicSourceMapConsumer, IndexedSourceMapConsumer, SourceMapConsumer } from 'source-map';
type BasicSourceMapConsumer = {};
type IndexedSourceMapConsumer = {};

//import { getRoot } from './FileAPI.js';
//import { sleep } from './Sleep.js';
//import { Nullable } from './types/Core.js';
//import { TermText } from '@automaton.systems/snippets';

const ROOT = process.cwd();//getRoot();

export async function setup(filename: Nullable<string>, name: string, rgb: [number, number, number], addTimer = false){
	const prefix = TermText.white.bgRgb(rgb[0], rgb[1], rgb[2])(`   ${name}   `)+ " ";
	
	(<any>globalThis)["NAME"] = name;
	// load the source map for this code
	let sourceMap: Nullable<BasicSourceMapConsumer | IndexedSourceMapConsumer> = null;
	if(filename){
		const text = await fs.readFile(`${ROOT}game/dist/${filename}.map`, {encoding: "utf8"});
		// sourceMap = await new SourceMapConsumer(text);
	}

	const ologger = console.log;

	console.trace = (...args: any[])=>makeStackTrace(sourceMap, ologger, prefix, args);//makeLogger(sourceMap, console.trace, prefix, chalk.grey, addTimer);
	console.debug = makeLogger(sourceMap, console.debug, prefix, TextTransforms.dim, addTimer);
	console.log = makeLogger(sourceMap, console.log, prefix, TextTransforms.grey, addTimer);
	console.warn = makeLogger(sourceMap, console.warn, prefix, TextTransforms.yellow, addTimer);
	console.error = makeLogger(sourceMap, console.error, prefix, TextTransforms.red, addTimer);

	console.log("Logging setup");
}

export async function ThreadName(){
	let wait = 10;
	while(!(<any>globalThis)["NAME"]){
		await sleep(100);
		wait --;
		if(wait < 0){
			console.warn("still waiting for thread name....");
		}
	}
	return (<any>globalThis)["NAME"];
}

function makeStackTrace(sourceMap: Nullable<BasicSourceMapConsumer | IndexedSourceMapConsumer>, logger: typeof console.log, prefix: string, args: any[]){
	let unstack = 1;
	let e = args.find(a=>a instanceof Error);
	if(!e){
		e = new Error();
		unstack = 2;
	}
	let stack = e.stack;
	let data = ["?"];
	if(stack){
		const lines = stack.split("\n");
		while(unstack--)
			lines.shift();
		data = lines.map(line=>resolveStackLine(sourceMap, line, " at "));
		data.unshift("\n    " + e.message);
	}
	logger(prefix + args.filter(a=>!(a instanceof Error)).join(", "), data.join("\n\t"));
}

function makeLogger(sourceMap: Nullable<BasicSourceMapConsumer | IndexedSourceMapConsumer>, logger: typeof console.log, prefix: string, color: (s:string) => string, addTimer: boolean){
	return (...data: any[])=> {
		// from the stack trace compute the filename/linenumber
		const e = new Error();
		let fileloc = `???`;
		let stack = e.stack;
		if(stack){
			const match = stack.split("\n")[2];
			if(match.indexOf("MessagePort.firstMessageHandler") > 0){
				fileloc = `Worker.js`;
			}else{
				fileloc = resolveStackLine(sourceMap, match);
			}
		}

		logger(prefix + (addTimer?time(performance.now()):'') + color(fileloc), ...data);
	};
}

function p(t: number){
	return (t+"").padStart(2, "0");
}

function time(tms: number){
	const h = Math.floor(tms / (60*60*1000));
	const m = Math.floor( (tms - h*(60*60*1000)) / (60*1000));
	const s = Math.floor( (tms - m*(60*1000)) / (1000));
	return TextTransforms.blue(` ${p(h)}:${p(m)}:${p(s)} `);
}

function resolveStackLine(sourceMap: Nullable<BasicSourceMapConsumer | IndexedSourceMapConsumer>, input: string, prefix: string = ""){
	const loc = input.substring(input.lastIndexOf(".js")+4, input.lastIndexOf(")"));
	if(loc.length == 0){
		return input;
	}
	if(sourceMap){
		const [line, column] = loc.split(':').map(i=>parseInt(i));
		const pos:any = {};//sourceMap.originalPositionFor({line: line, column});
		if(pos.source){
			pos.source = pos.source.replace("../../", "");
			pos.source = pos.source.replace("../", "game/");
			return `${prefix}${pos.source}:${pos.line}:${pos.column}`;
		}
	}else{
		let results = /.*at (.+) .*\\src\\(.*):([0-9]+):([0-9]+)\)/.exec(input);
		if(results)
			return `src/${results[2].replaceAll("\\","/")}:${results[3]}:${results[4]} ${TextTransforms.bold(results[1])}`;
		else
			return input
	}

	return loc;
}