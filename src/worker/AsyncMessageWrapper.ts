import {ChildProcess} from "node:child_process";
import Process from "process";

export type AsyncWorkerPort = {
	async: (msg: any, transferable?: any[])=>Promise<any>;

	send: (msg: any, transferable?: any[])=>void;
	postMessage: (msg: any, transferable?: any [])=>void;
}

export function CreateAsyncMessagePort(port: MessagePort|ChildProcess): AsyncWorkerPort{
	let ASYNC_ID = 1;
	let promises: Map<number, any> = new Map<number, any>();
	
	let listen =  (message: MessageEvent, ...args: any)=>{
		let data = message.data ?? message;
		// handle async callbacks
		let asyncID = data.async;
		if(asyncID){
			if(promises.has(asyncID)){
				let res = promises.get(asyncID);
				promises.delete(data.async);
				res(data.packet);
			}
		}
	};
	if(port instanceof ChildProcess){
		port.addListener("message", listen);
	}else{
		port.addEventListener("message", listen);
	}

	let send = port instanceof ChildProcess? (data: any)=>port.send(data) : port.postMessage;

	return {
		postMessage: (msg: any, transferables?: Transferable[])=>{
			try{
				console.log(port, msg);
				send(msg, transferables ?? []);
			}catch(e){
				console.error(e);
				throw e;
			}
		},
		send: (msg: any, transferables?: Transferable[])=>{
			//console.log(port, msg);
			send(msg, transferables ?? []);
		},
		async: (msg: any, transferables?: Transferable[])=>{
			return new Promise(resolve=>{
				let asyncId = ASYNC_ID++;
				// push our resolution object onto promises
				promises.set(asyncId, resolve);
				if(promises.size > 100){
					console.log("Very long asyncWorker queue...", promises.size);
				}
				// send the request
				send({async: asyncId, packet: msg}, transferables ?? []);
			});
		}
	};
}

export function HandleAsync(messagehandler: any, port: MessagePort|typeof Process){

	let reply: (data: any)=>void;
	if('send' in port){
		reply = (data: any)=>port.send?.(data);
	}else if('postMessage' in port){
		reply = port.postMessage;
	}else{
		throw new Error(`Failed to bind message port - ${port} (${port?.constructor?.name})`);
	}

	return async (message: any)=>{
		let asyncID = message.async;
		if(asyncID){
			let data = await messagehandler(message.packet);
			reply({
				async: asyncID,
				packet: data
			});
		}else{
			messagehandler(message);
		}
	};
}