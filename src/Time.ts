export function niceDateString(date: Date = new Date()){
	return date.toISOString().substring(0, 19).replace("T", " ");
}

export function niceDatetimeString(date: Date = new Date()){
	return date.toISOString().substring(0, 19).replace("T", " ");
}

export async function sleep(duration: number, rep?: any){
	await new Promise(res=>setTimeout(rep!==undefined?()=>res(rep):res, duration));
}

export function stoppableInterval(interval: number, func: ()=>void):{stop:()=>void}{
	let i = setInterval(func, interval);
	return {
		stop: ()=>clearInterval(i)
	}
}

export type TIME_UNIT = "year"|"week"|"day"|"hour"|"minute"|"second"|"millisecond";
const TIME_CHUNKS: [number, TIME_UNIT][] = [[31_536_000_000, "year"], [604_800_000, "week"], [86_4000_000, "day"], [3_600_000, "hour"], [60_000, "minute"], [1_000, "second"], [1, "millisecond"]];

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
export function ms(time, max = 2, expanded = false, till: TIME_UNIT = "millisecond") {
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