import {v4 as UUID} from "uuid"; 
import { IFunc } from "./Types.ts";

const CALLBACKS = new Map<string, ()=>void>();
const registry = new FinalizationRegistry((heldValue: string) => {
	let cb = CALLBACKS.get(heldValue);
	console.debug("FinalizationRegistry had to cleanup token: " + heldValue);
	cb?.();
});

/**
 * 
 * This code ensures the returned function is called exactly ONCE before it is garbage collected.
 * 
 * Typically useful to ensure a setInterval it cleared.
 * 
 * @param stop 
 * @returns 
 */
export function ensureCalled(stop: IFunc): IFunc{
	let uuid = UUID();
	let called = false;
	let safeStopable: IFunc = ()=>{
		if(!called){
			called = true;
			// unregister for GC callback
			CALLBACKS.delete(uuid);
			registry.unregister(stop);
			// actually run the callback
			stop();
		}
	}
	CALLBACKS.set(uuid, stop);
	registry.register(safeStopable, uuid, stop);
	return safeStopable;
}
