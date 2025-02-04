import { readFile, open } from "fs/promises";
import { createFile, hasFile } from "../DiskIO.ts";

export class BitArray{

	data: Uint8Array;


	// number of bits we store
	length: number;

	minIndex = Infinity;
	maxIndex = -Infinity;

	constructor(buffer: ArrayBuffer, size: number){
		// let buffer = new ArrayBuffer(4 + Math.ceil(size / 8));
		this.data = new Uint8Array(buffer);
		this.length = size;
	}

	static create(size: number){
		let buffer = new ArrayBuffer(4 + Math.ceil(size / 8));
		(new DataView(buffer)).setUint32(0, size, true);
		return new BitArray(buffer, size);
	}

	get(bit: number): boolean{
		let v = this.data[4 + Math.floor(bit / 8)];
		let b = bit % 8;
		return (v & (1 << b)) > 0;
	}

	set(bit: number, value: boolean): void{
		let index = 4 + Math.floor(bit / 8);
		let v = this.data[index];
		let b = bit % 8;
		let change = ((v & (1 << b)) > 0) != value;
		if(change){
			this.minIndex = Math.min(index, this.minIndex);
			this.maxIndex = Math.max(index, this.maxIndex);
			if(value){
				this.data[index] = (v | (1 << b));
			}else{
				this.data[index] = (v & ~(1 << b));
			}
		}
	}

	async save(path: string){
		if(await hasFile(path)){
			let length = this.maxIndex - this.minIndex + 1;
			if(length > 0){
				let b = this.data.slice(this.minIndex, this.maxIndex + 1);
				let fd = await open(path, 'r+');
				await fd.write(b, 0, b.length, this.minIndex);
				this.minIndex = Infinity;
				this.maxIndex = -Infinity;
				await fd.close();
			}
		}else{
			await createFile(path, this.data);
		}
	}

	static async load(path: string){
		let buffer = await readFile(path);
		let size = (new DataView(buffer.buffer)).getUint32(0, true);
		return new BitArray(buffer, size);
	}
}