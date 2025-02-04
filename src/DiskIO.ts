
import { access, constants, mkdir, writeFile} from 'node:fs/promises';
import { Readable } from 'node:stream';
import PQueue from "p-queue";

let DiskQueue = new PQueue({concurrency: 2});

export async function hasFile(path: string){
	return DiskQueue.add(async ()=>{
		try {
			await access(path, constants.R_OK | constants.W_OK);
			return true
		} catch {
			return false;
		}
	}, {priority: 1});
}

// TODO this can grow forever....
const PATH_CACHE = new Set();
export async function createFile(path: string, buffer: string | Uint8Array | Readable | ReadableStream<any>){
	return DiskQueue.add(async ()=>{
		// ensure folder
		if(path.indexOf('/')>=0){
			let folder = path.substring(0, path.lastIndexOf("/"));
			if(!PATH_CACHE.has(folder)){
				await mkdir(folder, {recursive: true});
				PATH_CACHE.add(path);
			}
		}

		// create file
		if(typeof buffer == "string"){
			await writeFile(path, buffer, 'utf8');
		}else{
			await writeFile(path, buffer);
		}
	});
}