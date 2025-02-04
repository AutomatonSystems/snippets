/**
 * Wrapper that can only execute once concurrently, future executions are queued to execute afterwards
 **/ 
export class SynchronousBlock {
	private mutex = Promise.resolve();

	async execute<T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> {
		// wait to be unlocked
		const unlock = await this.lock();
		try {
			// execute the code block
			return await Promise.resolve(fn());
		} finally {
			// unlock for next call
			unlock();
		}
	}

	private lock(): PromiseLike<() => void> {
		// create placeholder for the unlock function promise
		let begin: (f: () => void) => void = (_unlock) => {};

		// wire the execution function to the mutex chain - this makes sure we run fifo
		this.mutex = this.mutex.then(() => {
			return new Promise(begin);
		});

		// return a promise which will resolve when it is our turn
		// the promise returns the unlock function
		return new Promise((res) => {
			begin = res;
		});
	}
}

function Synchronous(){

	let mutex = Promise.resolve();

	const lock = (): PromiseLike<() => void> => {
		// create placeholder for the unlock function promise
		let begin: (f: () => void) => void = (_unlock) => {};

		// wire the execution function to the mutex chain - this makes sure we run fifo
		mutex = mutex.then(() => {
			return new Promise(begin);
		});

		// return a promise which will resolve when it is our turn
		// the promise returns the unlock function
		return new Promise((res) => {
			begin = res;
		});
	}

	return async <T>(fn: (() => T) | (() => PromiseLike<T>)): Promise<T> => {
		// wait to be unlocked
		const unlock = await lock();
		try {
			// execute the code block
			return await Promise.resolve(fn());
		} finally {
			// unlock for next call
			unlock();
		}
	}
}
