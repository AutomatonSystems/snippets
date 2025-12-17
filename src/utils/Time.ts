export function niceDateString(date: Date = new Date()){
	return date.toISOString().substring(0, 19).replace("T", " ");
}

export function niceDatetimeString(date: Date = new Date()){
	return date.toISOString().substring(0, 19).replace("T", " ");
}

export async function sleep(duration: number, rep?: any):Promise<any>{
	await new Promise(res=>setTimeout(rep!==undefined?()=>res(rep):res, duration));
}

export async function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T | null> {
  return Promise.race([promise,sleep(timeout)]);
}

export function stoppableInterval(interval: number, func: ()=>void):{stop:()=>void}{
	let i = setInterval(func, interval);
	return {
		stop: ()=>clearInterval(i)
	}
}

export type TIME_UNIT = "year"|"week"|"day"|"hour"|"minute"|"second"|"millisecond";
export type TIME_UNITS = "years"|"weeks"|"days"|"hours"|"minutes"|"seconds"|"milliseconds";
const TIME_CHUNKS: [number, TIME_UNIT][] = [[31_536_000_000, "year"], [604_800_000, "week"], [86_400_000, "day"], [3_600_000, "hour"], [60_000, "minute"], [1_000, "second"], [1, "millisecond"]];

export function toMS(value: number, unit: TIME_UNIT|TIME_UNITS){
	if(unit.endsWith("s"))
		unit = <any>unit.substring(0,unit.length-1);
	return value * (TIME_CHUNKS.find(v=>v[1] == unit)?.[0] ?? 1);
}

/**
 * 
 * Converts MS to human readable time.
 * 
 * @param value ms time value
 * @param max max units to display
 * @param expanded display long names for units (eg years milliseconds -> y ms)
 * @param till stop at this precision
 * @returns 
 */
export function ms(time: number, max = 2, expanded = false, till: TIME_UNIT = "millisecond") {
	let output = '';
	if (time < 0){
		output = '-';
		time = Math.abs(time);
	}
	for(let chunk of TIME_CHUNKS){
		if(time >= chunk[0]){
			let value = Math.floor(time / chunk[0]);
			time -= chunk[0] * value;
			output += `${value}${chunk[1]}${value!=1?'s':''} `;
			max--;
		}
		if (time < 1 || max <= 0 || till === chunk[1])
			break;
	}
	return expanded?output:output
		.replace(/millisecond+s?/, 'ms')
		.replace(/(year|day|hour|minute|second|week)s?/g, (x) => x[0]);
}