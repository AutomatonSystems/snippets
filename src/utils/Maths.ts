
export const Maths = {
	clamp: (v: number, min: number = 0, max: number = 1)=>{
		if(v>max)
			return max;
		if(v<min)
			return min;
		return v;
	},
	fract: (v: number)=> v==0 ? 0 : v>0 ? v - Math.floor(v) : -Math.abs(v - Math.ceil(v))
};