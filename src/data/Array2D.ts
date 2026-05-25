import { Nullable } from "../Types.js";

export class Array2D<T>{
	// cannot be changed after construction
	CHUNK_SIZE = 128;
	DENSITY: number = 1;

	// data
	chunks = new Map<number, T[]>();

	constructor(density: number, chunkSize: number){
		this.CHUNK_SIZE = chunkSize;
		this.DENSITY = density;
	}

	chunkKey(cx: number, cy: number) {
		// range ~ -32k -> 32k
		return (cx << 16) ^ (cy & 0xffff);
	}

	get(x: number, y: number) {
		x *= this.DENSITY;
		y *= this.DENSITY;
		const cx = Math.floor(x / this.CHUNK_SIZE);
		const cy = Math.floor(y / this.CHUNK_SIZE);
		const chunk = this.chunks.get(this.chunkKey(cx, cy));

		const lx = x & (this.CHUNK_SIZE - 1);
		const ly = y & (this.CHUNK_SIZE - 1);
		return chunk?.[lx + ly * this.CHUNK_SIZE];
	}

	set(x: number, y: number, t: T){
		x *= this.DENSITY;
		y *= this.DENSITY;
		const cx = Math.floor(x / this.CHUNK_SIZE);
		const cy = Math.floor(y / this.CHUNK_SIZE);
		
		let key = this.chunkKey(cx, cy);
		
		let chunk = this.chunks.get(key);
		if(!chunk){
			if(t === null || t === undefined)
				return;
			chunk = [];
			this.chunks.set(key, chunk)
		}
		const lx = x & (this.CHUNK_SIZE - 1);
		const ly = y & (this.CHUNK_SIZE - 1);
		chunk[lx + ly * this.CHUNK_SIZE] = t;
	}

	map(f: (t:T)=>T){
		// itterate over every (set) value
		for(let chunk of this.chunks.values()){
			for(let i = 0; i < this.CHUNK_SIZE * this.CHUNK_SIZE; i++)
				chunk[i] = f(chunk[i]);
		}
	}
}