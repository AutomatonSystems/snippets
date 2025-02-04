import { IndexRecord, NEGATIVE_INFINITY, POSITIVE_INFINITY, SerializationHeader, WEAKREF_PREFIX, KNOWN_SERIALIZATION_CLASSES, NAN, Serializable} from "./Serialize.js";
import { sleep } from "../Time.js";



type RestoreFunction<T> = (des: Deserialization, json: any)=>T|Promise<T>;
type Class<T> = (new (...args: any) => T) & {name: string} & {prototype: T};

type Deserializer<T extends Serializable> = {
	clazz: Class<T>
} | RestoreFunction<T>;



class DeserializationLibraryClass{
	#classes: Map<string, Deserializer<any>> = new Map();

	constructor(){
		// noop
	}

	register<T extends Serializable>(clazz: Class<T>, restoreFunc?: RestoreFunction<T>){
		if(restoreFunc){
			return this.registerDirect(clazz.name, restoreFunc);
		}else{
			return this.registerDirect(clazz.name, {clazz});
		}
	}

	registerDirect(name: string, deserializer: Deserializer<any>){
		KNOWN_SERIALIZATION_CLASSES.add(name);
		if(this.#classes.has(name)) {
			throw new Error(`DeserializationLibrary.register "${name}" Already registered!}`);
		}
		this.#classes.set(name, deserializer);
	}

	instance(des: Deserialization, clss: string, json: any) : [boolean, any]{
		
		let deserializer = this.#classes.get(clss);
		if(deserializer){
			if(typeof deserializer === "function"){
				return [false, deserializer(des, json)];
			}else{
				return [true, Object.create(deserializer.clazz.prototype)];
			}
		}else{
			/*if(des.flags.){
				let clazz = eval(clss);
				if(clazz && clazz.prototype){
					console.warn(`No class registered to handle ${clss}: so loaded class "${clazz.name}" from global scope`);
					this.registerDirect(clss, {clazz});
					return this.instance(des, clss, json);
				}
			}*/
			if(des.flags.tolerant){
				let obj = {};
				(<any>obj).__CLASS = clss;
				return [true, obj];
			}
			console.log("UNKNOWN DeserializationLibrary CLASS: " + clss, (<any>globalThis)[clss]);
			throw new Error("### "+ clss);
		}
	}
}
const DeserializationLibrary = new DeserializationLibraryClass();
export {DeserializationLibrary};

DeserializationLibrary.registerDirect("TypedArray", (des, json)=>{
	let buffer: ArrayBuffer|SharedArrayBuffer = des.getBinary(json.values);
	if(json.view == "ArrayBuffer")
		return buffer;
	if(json.view == "SharedArrayBuffer")
		return buffer;
	// load the binary
	return new ((<any>globalThis)[json.view])(buffer);
});

DeserializationLibrary.register(Map, async (des, json)=>{
	let map = new Map();
	for(let [k, v] of json.entries){
		let key = await des.restoreItem({}, 'k', k);
		let value = await des.restoreItem({}, 'v', v);
		map.set(key, value);
	}
	return map;
});

DeserializationLibrary.register(WeakRef, async (des, json)=>{
	return new WeakRef(await des.restoreItem({}, 'v', json.value));
});

DeserializationLibrary.register(Set, async (des, json)=>{
	let set = new Set();
	for(let v of json.values){
		set.add(await des.restoreItem({}, 'v', v));
	}
	return set;
});


export async function Deserialize<T>(bin: Uint8Array, flags?: Partial<DeserializationFlags>): Promise<T>{
	return <T> await Deserialization.run(bin, flags);
}

type DeserializationFlags = {
	tolerant: boolean
}
export class Deserialization{

	root: any = null;

	weakRefs: Record<string, any> = {};

	binaryFunc: (bid: string) => (SharedArrayBuffer|ArrayBuffer);
	binary: Record<string, SharedArrayBuffer|ArrayBuffer> = {};


	promises: Promise<void>[] = [];


	// behaviour flags
	flags: DeserializationFlags = {
		tolerant: false
	};

	static async run<T>(binary: Uint8Array, flags?: Partial<DeserializationFlags>): Promise<T>{
		let d = new Deserialization(binary, flags);
		return await d.ready();
	}

	constructor(binary: Uint8Array, flags?: Partial<DeserializationFlags>){
		// resolve flags
		this.flags = Object.assign(this.flags, flags ?? {});

		// read the length of the header
		let view = new DataView(binary.buffer);
		let headerLengthBytes = view.getUint32(0);
		let offset = 4;
		// read the header...
		const Decoder = new TextDecoder();
		let headerBin = new Uint8Array(binary.buffer, offset, headerLengthBytes);
		offset+= headerLengthBytes;
		let headerRaw: string = Decoder.decode(headerBin);
		let header: SerializationHeader = JSON.parse(headerRaw);

		const readTail = (index: IndexRecord, inPlace: boolean) => {
			let array = new Uint8Array(binary.buffer, offset + index.offset, index.length);
			if(inPlace)
				return array;
			let buffer = index.shared?new SharedArrayBuffer(index.length):new ArrayBuffer(index.length);
			(new Uint8Array(buffer)).set(array);
			return buffer;
		};

		let root = JSON.parse(Decoder.decode(readTail(header.root, true)));
		let weak = JSON.parse(Decoder.decode(readTail(header.weak, true)));

		this.binaryFunc = (bid: string)=>{
			return readTail(header[bid], false);
		};

		// restore the root item
		this.restoreItem(this, 'root', root);
		// restore the weakrefs
		for(let [ref,jobj] of Object.entries(weak)){
			this.restoreItem(this.weakRefs, ref, jobj);
		}
	}

	async ready<T>():Promise<T>{
		while(this.promises.length){
			let p = this.promises.pop();
			await p;
		}
		return this.root;
	}

	getBinary(bid: string): ArrayBuffer|SharedArrayBuffer{
		if(this.binary[bid]==null)
			this.binary[bid] = this.binaryFunc(bid);
		return this.binary[bid];
	}

	/**
	 *
	 * @param {*} target
	 * @param {*} prop
	 * @param {*} json
	 *
	 * @returns {*} the set value (or promise of value)
	 */
	restoreItem(target: any, prop: string|number, json: any){
		if(prop === '__class') {
			return null;
		}

		if(json == null){
			target[prop] = json;
			return json;
		}
		// catch and set reference propeties
		if(typeof json == 'string' && json.startsWith(WEAKREF_PREFIX)){
			return this.setWeakref(target, prop, json);
		}
		if(Array.isArray(json)){
			let arr: any[] = [];
			target[prop] = arr;
			for(let i = 0; i< json.length; i++){
				this.restoreItem(arr, i, json[i]);
			}
			return arr;
		}
		// we are restoring an object
		if(typeof json == 'object'){
			let obj: any;
			// complex case - a class
			if(json.__class){
				let clss = json.__class;
				let [needsProps, result] = DeserializationLibrary.instance(this, clss, json);
				if(!needsProps){
					// add a promise for when the result resolves
					let promise = new Promise<void>(async res=>{
						target[prop] = await result;
						res();
					});
					this.promises.push(promise);
					return promise;
				}else{
					if(result?.constructor?.name != json.__class){
						console.log(result?.constructor?.name, json.__class);
					}
					obj = result;
				}
			}else{
				obj = {};
			}
			
			// create the properties for the object
			for(let [key, value] of Object.entries(json)){
				if(key=='__class') {
					continue;
				}
				// recursion deeper
				try{
					this.restoreItem(obj, key, value);
				}catch(e){
					console.warn(`Deserialize failed (${json.__class}): ${obj?.constructor?.name ?? '{}'}.${key} = ${value}`);
					throw(e);
				}
			}

			// at this point all basic props will be set, but some complex types (weakrefs etc might not)
			if(obj.__deserialize){
				let promise = (async ()=>{
					await obj.__deserialize();
					target[prop] = obj;
				})();
				this.promises.push(promise);
			}

			// set the object on the target
			target[prop] = obj;
			return obj;
		}else{
			// a basic type can just be set directly
			if(json == NAN) {
				json = Number.NaN;
			}
			if(json == POSITIVE_INFINITY) {
				json = Number.POSITIVE_INFINITY;
			}
			if(json == NEGATIVE_INFINITY) {
				json = Number.NEGATIVE_INFINITY;
			}
			target[prop] = json;
			return json;
		}
	}

	async setWeakref(target: any, prop: string|number, weakref: string){
		if(this.weakRefs[weakref] !== undefined){
			target[prop] = this.weakRefs[weakref];
			return target[prop];
		}

		let priomise = new Promise<void>(async res=>{
			// TODO can get rid of this by having a weakRefPromise which resolves when completed!
			while(this.weakRefs[weakref] == null) {
				await sleep(10);
			}

			let value = this.weakRefs[weakref];

			if(target[prop]!=null) {
				debugger;
			}
			target[prop] = value;
			res(value);
		});
		// priomise.wref = weakref;
		this.promises.push(priomise);
		return priomise;
	}
}

