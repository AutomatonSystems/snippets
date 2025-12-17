import { TextTransforms, TermColor } from "./Colour.ts";
import { ensureCalled } from "../Garbage.ts";
import { IStoppable } from "../Types.ts";
import { ms } from "../utils/Time.ts";

export function keyInput(callback: (char: string, stop: ()=>void)=>void): IStoppable{
	console.log("KEY INPUT STARTED");
	// Listen for new characters
	process.stdin.setRawMode(true);
	process.stdin.setEncoding('utf8');

	const stop =  ()=>{
		console.log("KeyInput STOPPED");
		process.stdin.removeListener("data", listener);
		process.stdin.setRawMode(false);
		process.stdin.pause();
	}

	let listener = (char: string) => {
		if (char === '\u0003') { // Handle Ctrl+C
			callback(char, stop);
			console.log('Exiting...');
			stop();
			return;
		}
		callback(char, stop);
	};
	
	process.stdin.addListener("data", listener);

	return {
		stop: ensureCalled(stop)
	}
}


const THREE_DOTS_SPIN = [
	"⠋⠉⠈    ⢀⣀⣄⡆⠇",
	" ⠁⠉⠙⠸⢰⣠⣀⡀   "];

export class TerminalSpinner{
	seq: string[];
	frame = -1;
	frames = 0;

	constructor(sequence: string[] = THREE_DOTS_SPIN){
		this.seq = sequence;
		this.frames = sequence[0].length;
	}

	render(){
		this.frame = (this.frame + 1) % this.frames;
		let str = "";
		for(let seq of this.seq){
			str += seq.charAt(this.frame)
		}
		return str;
	}
}

type ProgressBarStyle = {
	BAR: string
	BACK: string
}

export class ProgressBar{

	static SOLID: ProgressBarStyle = {
		BAR: "█▏▎▍▌▋▊▉",
		BACK: "▐━▌"
	};

	width: number = 50;

	
	style: ProgressBarStyle = ProgressBar.SOLID;
	color: TermColor = TermColor.GREEN;
	backcolor: TermColor = TermColor.GREY;

	lastTime = 0;
	lastItems = 0;
	itemsPerSecond: number[] = [0];
	
	constructor(){
		this.lastTime = Date.now();
	}

	render(value: number, total: number){
		

		// PARTIAL CHARS
		const SUB_CHAR_DIVISIONS = this.style.BAR.length;
	
		// wrapped
		let width = this.width - 2;
	
		let bar = "";
	
		let parts = total / width; // each char is this many items
		
		// complete
		let chunks = Math.floor(value / parts); // so this many solid chars
		bar += TextTransforms.render("".padStart(chunks, this.style.BAR[0]), this.color);
		
		// partially complete
		let partial = Math.floor(SUB_CHAR_DIVISIONS * (value / parts - chunks)); // and a partial
		if(partial > 0){
			bar += TextTransforms.render(this.style.BAR.charAt(partial), this.color);
			chunks += 1;
		}
		
		// incomplete
		bar += TextTransforms.render("".padEnd(width - chunks, this.style.BACK[1]), this.backcolor);
	
		// wrap
		bar = TextTransforms.render(this.style.BACK[0], this.backcolor) + bar + TextTransforms.render(this.style.BACK[2], this.backcolor);

		
		// item stats
		let interval = Date.now() - this.lastTime;
		this.lastTime = Date.now();

		let itemsThisInterval = 1000 * (value - this.lastItems) / interval;
		this.lastItems = value;
		this.itemsPerSecond.push(itemsThisInterval);
		if(this.itemsPerSecond.length > 60)
			this.itemsPerSecond.shift();

		let recentAvg = 0;
		let samples = 0;
		for(let i = 0; i < this.itemsPerSecond.length; i++){
			samples++;
			recentAvg += this.itemsPerSecond[this.itemsPerSecond.length - 1 - i];
			if(i * interval > 10_000)
				break;
		}
		recentAvg /= samples;

		let avgItemsPerSecond = this.itemsPerSecond.reduce((t,v)=>t+v, 0) / this.itemsPerSecond.length;
		let totalText = total.toLocaleString();
		let ipstext = TextTransforms.green(`@ ${(recentAvg).toLocaleString(<any>{}, {maximumFractionDigits: 1})}/s`);

		let percent = (100 * value / total).toFixed(1);
		
		let eta = avgItemsPerSecond > 0 ? ms(1000*((total - value) / avgItemsPerSecond), 2): "...";

		let text = ` ${bar} ${TextTransforms.bold(`${percent.padStart(5)}%`)} ${value.toLocaleString().padStart(totalText.length)} / ${totalText} ${ipstext}  ${eta}      `;
		return text;
	}
}
