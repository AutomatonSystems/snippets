// originally yoctocolors copy+paste!
// thank you sindresorhus

import tty from 'node:tty';

// eslint-disable-next-line no-warning-comments
// TODO: Use a better method when it's added to Node.js (https://github.com/nodejs/node/pull/40240)
// Lots of optionals here to support Deno.
const hasColors = tty?.WriteStream?.prototype?.hasColors?.() ?? false;


type StyleFunc = (input: any) => string;

const format = (open: string|number, close: string|number): StyleFunc => {
	if (!hasColors) {
		return input => input;
	}

	const openCode = `\u001B[${open}m`;
	const closeCode = `\u001B[${close}m`;

	return input => {
		const string = input + ''; // This is faster.
		let index = string.indexOf(closeCode);

		if (index === -1) {
			// Note: Intentionally not using string interpolation for performance reasons.
			return openCode + string + closeCode;
		}

		// Handle nested colors.

		// We could have done this, but it's too slow (as of Node.js 22).
		// return openCode + string.replaceAll(closeCode, openCode) + closeCode;

		let result = openCode;
		let lastIndex = 0;

		while (index !== -1) {
			result += string.slice(lastIndex, index) + openCode;
			lastIndex = index + closeCode.length;
			index = string.indexOf(closeCode, lastIndex);
		}

		result += string.slice(lastIndex) + closeCode;

		return result;
	};
};

type TermTextType = StyleChain & ((input: any)=>string);

class StyleChain {
	transforms: StyleFunc[] = [];

	constructor(transforms: StyleFunc[] = []) {
		this.transforms = transforms;

		// Make the instance callable
		const callable = (text: string): string => {
			return this.transforms.reduceRight(
				(result, transform) => transform(result),
				text
			);
		};
		
		// Copy all properties to the callable function
		let obj = Object.setPrototypeOf(callable, StyleChain.prototype);
		obj.transforms = transforms;
		return obj;
	}

	// Method to apply a new transform and return a new chain
	private addTransform(fn: StyleFunc): TermTextType {
		return <TermTextType> new StyleChain([...(this.transforms ?? []), fn]);
	}
	get reset() {
		return this.addTransform(TextTransforms.reset);
	}
	get bold() {
		return this.addTransform(TextTransforms.bold);
	}
	get dim() {
		return this.addTransform(TextTransforms.dim);
	}
	get italic() {
		return this.addTransform(TextTransforms.italic);
	}
	get underline() {
		return this.addTransform(TextTransforms.underline);
	}
	get overline() {
		return this.addTransform(TextTransforms.overline);
	}
	get inverse() {
		return this.addTransform(TextTransforms.inverse);
	}
	get hidden() {
		return this.addTransform(TextTransforms.hidden);
	}
	get strikethrough() {
		return this.addTransform(TextTransforms.strikethrough);
	}
	get black() {
		return this.addTransform(TextTransforms.black);
	}
	get red() {
		return this.addTransform(TextTransforms.red);
	}
	get green() {
		return this.addTransform(TextTransforms.green);
	}
	get yellow() {
		return this.addTransform(TextTransforms.yellow);
	}
	get blue() {
		return this.addTransform(TextTransforms.blue);
	}
	get magenta() {
		return this.addTransform(TextTransforms.magenta);
	}
	get cyan() {
		return this.addTransform(TextTransforms.cyan);
	}
	get white() {
		return this.addTransform(TextTransforms.white);
	}
	get gray() {
		return this.addTransform(TextTransforms.gray);
	}
	get grey() {
		return this.addTransform(TextTransforms.grey);
	}
	get redBright() {
		return this.addTransform(TextTransforms.redBright);
	}
	get greenBright() {
		return this.addTransform(TextTransforms.greenBright);
	}
	get yellowBright() {
		return this.addTransform(TextTransforms.yellowBright);
	}
	get blueBright() {
		return this.addTransform(TextTransforms.blueBright);
	}
	get magentaBright() {
		return this.addTransform(TextTransforms.magentaBright);
	}
	get cyanBright() {
		return this.addTransform(TextTransforms.cyanBright);
	}
	get whiteBright() {
		return this.addTransform(TextTransforms.whiteBright);
	}
	get bgBlack() {
		return this.addTransform(TextTransforms.bgBlack);
	}
	get bgRed() {
		return this.addTransform(TextTransforms.bgRed);
	}
	get bgGreen() {
		return this.addTransform(TextTransforms.bgGreen);
	}
	get bgYellow() {
		return this.addTransform(TextTransforms.bgYellow);
	}
	get bgBlue() {
		return this.addTransform(TextTransforms.bgBlue);
	}
	get bgMagenta() {
		return this.addTransform(TextTransforms.bgMagenta);
	}
	get bgCyan() {
		return this.addTransform(TextTransforms.bgCyan);
	}
	get bgWhite() {
		return this.addTransform(TextTransforms.bgWhite);
	}
	get bgGray() {
		return this.addTransform(TextTransforms.bgGray);
	}
	get bgGrey() {
		return this.addTransform(TextTransforms.bgGrey);
	}
	get bgRedBright() {
		return this.addTransform(TextTransforms.bgRedBright);
	}
	get bgGreenBright() {
		return this.addTransform(TextTransforms.bgGreenBright);
	}
	get bgYellowBright() {
		return this.addTransform(TextTransforms.bgYellowBright);
	}
	get bgBlueBright() {
		return this.addTransform(TextTransforms.bgBlueBright);
	}
	get bgMagentaBright() {
		return this.addTransform(TextTransforms.bgMagentaBright);
	}
	get bgCyanBright() {
		return this.addTransform(TextTransforms.bgCyanBright);
	}
	get bgWhiteBright() {
		return this.addTransform(TextTransforms.bgWhiteBright);
	}

	rgb(r:number, g: number, b: number){
		return this.addTransform(TextTransforms.rgb(r,g,b));
	}

	bgRgb(red: number, green: number, blue: number) {
		return this.addTransform(TextTransforms.bgRgb(red, green, blue));
	}
}

export enum TermColor{
	BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE, GREY
}

const ANSI_BACKGROUND_OFFSET = 10;

export const TextTransforms = {
	render: (text: string, foreground?: TermColor, background?: TermColor): string=> {
		if(foreground == TermColor.BLACK && background){
			text = TextTransforms.inverse(FOREGROUND[background](text));
		} else{
			if(foreground){
				text = FOREGROUND[foreground](text)
			}
			if(background)
				text = BACKGROUND[background](text)
		}
		return text;
	},

	reset: format(0, 0),
	bold: format(1, 22),
	dim: format(2, 22),
	italic: format(3, 23),
	underline: format(4, 24),
	overline: format(53, 55),
	inverse: format(7, 27),
	hidden: format(8, 28),
	strikethrough: format(9, 29),

	black: format(30, 39),
	red: format(31, 39),
	green: format(32, 39),
	yellow: format(33, 39),
	blue: format(34, 39),
	magenta: format(35, 39),
	cyan: format(36, 39),
	white: format(37, 39),
	gray: format(90, 39),
	grey: format(90, 39),

	redBright: format(91, 39),
	greenBright: format(92, 39),
	yellowBright: format(93, 39),
	blueBright: format(94, 39),
	magentaBright: format(95, 39),
	cyanBright: format(96, 39),
	whiteBright: format(97, 39),

	bgBlack: format(40, 49),
	bgRed: format(41, 49),
	bgGreen: format(42, 49),
	bgYellow: format(43, 49),
	bgBlue: format(44, 49),
	bgMagenta: format(45, 49),
	bgCyan: format(46, 49),
	bgWhite: format(47, 49),
	bgGray: format(100, 49),
	bgGrey: format(100, 49),

	bgRedBright: format(101, 49),
	bgGreenBright: format(102, 49),
	bgYellowBright: format(103, 49),
	bgBlueBright: format(104, 49),
	bgMagentaBright: format(105, 49),
	bgCyanBright: format(106, 49),
	bgWhiteBright: format(107, 49),

	rgb: (red: number, green: number, blue: number) => format(`${38};2;${red};${green};${blue}`,39),
	bgRgb: (red: number, green: number, blue: number) => format(`${38 + ANSI_BACKGROUND_OFFSET};2;${red};${green};${blue}`,49)
};

export const TermText: TermTextType = <TermTextType> new StyleChain();

const FOREGROUND: Record<TermColor, StyleFunc> = {
	[TermColor.BLACK]: TextTransforms.black,
	[TermColor.RED]: TextTransforms.red,
	[TermColor.GREEN]: TextTransforms.green,
	[TermColor.YELLOW]: TextTransforms.yellow,
	[TermColor.BLUE]: TextTransforms.blue,
	[TermColor.MAGENTA]: TextTransforms.magenta,
	[TermColor.CYAN]: TextTransforms.cyan,
	[TermColor.WHITE]: TextTransforms.white,
	[TermColor.GREY]: TextTransforms.grey
}

const BACKGROUND: Record<TermColor, StyleFunc> = {
	[TermColor.BLACK]: TextTransforms.bgBlack,
	[TermColor.RED]: TextTransforms.bgRed,
	[TermColor.GREEN]: TextTransforms.bgGreen,
	[TermColor.YELLOW]: TextTransforms.bgYellow,
	[TermColor.BLUE]: TextTransforms.bgBlue,
	[TermColor.MAGENTA]: TextTransforms.bgMagenta,
	[TermColor.CYAN]: TextTransforms.bgCyan,
	[TermColor.WHITE]: TextTransforms.bgWhite,
	[TermColor.GREY]: TextTransforms.bgGrey
}