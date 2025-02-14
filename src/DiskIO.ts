
import { access, constants, mkdir, readdir, writeFile} from 'node:fs/promises';
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

export async function* getFiles(dir: string, recursive=false, afterFolder?: (path: string)=>Promise<void>): AsyncGenerator<string> {
	const dirents = await readdir(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const fullPath = dir + "/" + dirent.name;
		if (dirent.isDirectory()) {
			if(recursive){
				yield* getFiles(fullPath, recursive, afterFolder);
				if(afterFolder){
					afterFolder(fullPath);
				}
			}
		} else if (dirent.isSymbolicLink()) {
			// ???
		} else{
			yield fullPath;
		}
	}
}

export async function* getFolders(dir: string, recursive=false): AsyncGenerator<string> {
	const dirents = await readdir(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const fullPath = dir + "/" + dirent.name;
		if (dirent.isDirectory()) {
			yield fullPath;
			if(recursive){
				yield* getFolders(fullPath, recursive);
			}
		} else if (dirent.isSymbolicLink()) {
			// ???
		} else{
			// noop
		}
	}
}