export const WEAKREF_PREFIX = "⭜";
export const BINARY_PREFIX = "∑";

export const NAN = "___NaN___";
export const POSITIVE_INFINITY = "___Infinity___";
export const NEGATIVE_INFINITY = "___MinusInfinity___";

export type IndexRecord = {
	offset: number
	length: number
	shared: boolean
}


export const SERIALIZER = Symbol("SerializerFunction");
export type SerializationFunction = (serialisation: Serialization)=>Promise<any>;

export interface ISerializable {
	[SERIALIZER]?:SerializationFunction
}

export type Serializable = ISerializable & object;


export type SerializationHeader = Record<string, IndexRecord>


export class Serialization{
	#oid = 1;
	#objmap = new WeakMap<object, string>();
	#bid = 1;
	#binmap = new WeakMap<SharedArrayBuffer|ArrayBuffer, string>();

	root: any = null;
	objects: Record<string, any> = {};
	binary: Record<string, SharedArrayBuffer|ArrayBuffer> = {};

	static async dump(obj: any){
		let s = new Serialization();
		return await s.dumpToBin(obj);
	}

	async dumpToBin(obj: any): Promise<Uint8Array>{
		this.root = await serialize(obj, this);

		const Encoder = new TextEncoder();
		let buffers: Uint8Array[] = []; 
		let index: SerializationHeader = {};
		let tailByteLength = 0;

		const encode = (json: any)=>{
			return Encoder.encode(JSON.stringify(json, (key: string, value: any)=>{
				if(value === Number.POSITIVE_INFINITY) {
					return POSITIVE_INFINITY;
				}
				if(value === Number.NEGATIVE_INFINITY) {
					return NEGATIVE_INFINITY;
				}
				if(Number.isNaN(obj)){
					return NAN;
				}
				return value;
			})).buffer;
		};

		const append = (name: string, buffer: ArrayBuffer|SharedArrayBuffer)=>{
			index[name] = {
				offset: tailByteLength,
				length: buffer.byteLength,
				shared: buffer instanceof SharedArrayBuffer
			};
			tailByteLength += buffer.byteLength;
			buffers.push(new Uint8Array(buffer));
		};
		
		append('root', encode(this.root));
		append('weak', encode(this.objects));
		for(let bid of Object.keys(this.binary)){
			append(bid, this.binary[bid]);
		}

		let header = new Uint8Array(encode(index));

		let finalLength = 4 + header.byteLength + tailByteLength;
		let output = new Uint8Array(finalLength);
		// push on where the tail starts
		(new DataView(output.buffer,0, 4)).setUint32(0, header.byteLength);
		let offset = 4;
		// write the header
		output.set(header, offset);
		offset += header.byteLength;
		// write the tail
		for(let array of buffers){
			output.set(array, offset);
			offset += array.byteLength;
		}
		// done!
		return output;
	}

	async addObject(obj: object): Promise<string>{
		if(!this.#objmap.has(obj)){
			let weakId = WEAKREF_PREFIX + (this.#oid++);
			this.#objmap.set(obj, weakId);
			this.objects[weakId] = await serializeObject(obj, this);
		}
		return <string>this.#objmap.get(obj);
	}

	addBin(bin: ArrayBuffer|ArrayBufferView){

		if(bin instanceof SharedArrayBuffer){
			// store bin
			let bid = this.#binmap.get(bin);
			if(!bid){
				bid = BINARY_PREFIX + (this.#bid++);
				this.binary[bid] = bin;
				this.#binmap.set(bin, bid);
			}

			// return wrapper
			return {
				"__class": "TypedArray",
				"view": "SharedArrayBuffer",
				"values": bid
			};
		}else if(bin instanceof ArrayBuffer){
			// store bin
			let bid = this.#binmap.get(bin);
			if(!bid){
				bid = BINARY_PREFIX + (this.#bid++);
				this.binary[bid] = bin;
				this.#binmap.set(bin, bid);
			}

			// return wrapper
			return {
				"__class": "TypedArray",
				"view": "ArrayBuffer",
				"values": bid
			};
		}else{
			// store bin
			let bid = this.#binmap.get(bin.buffer);
			if(!bid){
				bid = BINARY_PREFIX + (this.#bid++);
				this.binary[bid] = bin.buffer;
				this.#binmap.set(bin.buffer, bid);
			}

			// return wrapper
			return {
				"__class": "TypedArray",
				"view": bin.constructor.name,
				"values": bid
			};
		}
	}
}

export let KNOWN_SERIALIZATION_CLASSES : Set<string> = new Set();

export async function serializePlainObject(obj: any, serialisation: Serialization){
	let type = obj.constructor.name;
	// just explode the object to it's keys
	let d: any = {};
	if(type != 'Object'){
		d['__class'] = obj.constructor.name;
		if(!KNOWN_SERIALIZATION_CLASSES.has(obj.constructor.name)){
			console.error(`Unregistered serialization class ${obj.constructor.name}`);
		}
	}
	for(let key of Object.keys(obj)){
		if(!key.startsWith('__')){
			let value = await serialize(obj[key], serialisation);
			if(value !== null){
				d[key] = value;
			}
		}
	}
	return d;
}




async function serializeObject(obj: any, serialisation: Serialization){
	// if array buffer
	if(obj instanceof ArrayBuffer || obj instanceof SharedArrayBuffer){
		return serialisation.addBin(obj);
	}
	
	if(Array.isArray(obj)){
		let res: any[] = [];
		for(let o of obj) {
			res.push(await serialize(o, serialisation));
		}
		return res;
	}

	// serialize a TypedArray - keep contents in binary
	if(ArrayBuffer.isView(obj)){
		return serialisation.addBin(obj);
	}

	// ISerializable method
	if(obj[SERIALIZER]){
		return await obj[SERIALIZER](serialisation);
	}

	// Logic for basic types
	if(obj instanceof Set){
		let res = {
			"__class": "Set", 
			"values": <any[]> []
		};
		for(let o of [...obj]) {
			let v = await serialize(o, serialisation);
			if(v === undefined || v == null){
				debugger;
			}
			res.values.push(v);
		}
		return res;
	}
	if(obj instanceof Map){
		let res = {
			"__class": "Map", 
			"entries": <any[]> []
		};
		for(let [key, value] of obj.entries()) {
			res.entries.push([
				await serialize(key, serialisation),
				await serialize(value, serialisation)
			]);
		}
		return res;
	}
	if(obj instanceof WeakRef){
		let value = obj.deref();
		if(value !== undefined){
			return {
				"__class": "WeakRef", 
				"value": value
			};
		}
		return null;
	}

	// fall back to a basic implimentation
	return await serializePlainObject(obj, serialisation);
}

export async function serialize(obj: any, serialisation: Serialization){
	// early out for simple types
	if(obj === null || obj === undefined) {
		return null;
	}
	switch(typeof obj){
		case 'number':
		case 'boolean':
		case 'string':
			return obj;
		case 'object':
			return await serialisation.addObject(obj);
	}

	debugger;
	console.error(`Cannot serialize ${obj}, ${obj?.constructor?.name}`);
	throw new Error("Failed to serialize");
}
