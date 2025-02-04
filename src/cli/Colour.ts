// originally yoctocolors copy+paste!
// thank you sindresorhus

import tty from 'node:tty';

// eslint-disable-next-line no-warning-comments
// TODO: Use a better method when it's added to Node.js (https://github.com/nodejs/node/pull/40240)
// Lots of optionals here to support Deno.
const hasColors = tty?.WriteStream?.prototype?.hasColors?.() ?? false;


type ColorFunc = (input: any) => string;

const format = (open, close): ColorFunc => {
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

export enum TermColor{
	BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE, GREY
}

export const TermText = {
	render: (text: string, foreground?: TermColor, background?: TermColor): string=> {
		if(foreground == TermColor.BLACK && background){
			text = TermText.inverse(FOREGROUND[background](text));
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
	bgWhiteBright: format(107, 49)
};

const FOREGROUND: Record<TermColor, ColorFunc> = {
	[TermColor.BLACK]: TermText.black,
	[TermColor.RED]: TermText.red,
	[TermColor.GREEN]: TermText.green,
	[TermColor.YELLOW]: TermText.yellow,
	[TermColor.BLUE]: TermText.blue,
	[TermColor.MAGENTA]: TermText.magenta,
	[TermColor.CYAN]: TermText.cyan,
	[TermColor.WHITE]: TermText.white,
	[TermColor.GREY]: TermText.grey
}

const BACKGROUND: Record<TermColor, ColorFunc> = {
	[TermColor.BLACK]: TermText.bgBlack,
	[TermColor.RED]: TermText.bgRed,
	[TermColor.GREEN]: TermText.bgGreen,
	[TermColor.YELLOW]: TermText.bgYellow,
	[TermColor.BLUE]: TermText.bgBlue,
	[TermColor.MAGENTA]: TermText.bgMagenta,
	[TermColor.CYAN]: TermText.bgCyan,
	[TermColor.WHITE]: TermText.bgWhite,
	[TermColor.GREY]: TermText.bgGrey
}