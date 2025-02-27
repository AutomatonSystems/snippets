
/**
* Performs a deep merge of objects and returns new object. Does not modify
* objects (immutable) and merges arrays via concatenation.
*
* @param {...object} objects - Objects to merge
* @returns {object} New object with merged key/values
*/
export function deepMerge<V>(...objects: any[]):V{
	const isObject = (obj:any) => obj && typeof obj === 'object';
	
	return <V>objects.reduce((prev, obj) => {
		Object.keys(obj).forEach(key => {
			const pVal = prev[key];
			const oVal = obj[key];
			
			if (Array.isArray(pVal) && Array.isArray(oVal)) {
				prev[key] = pVal.concat(...oVal);
			} else if (isObject(pVal) && isObject(oVal)) {
				prev[key] = deepMerge(pVal, oVal);
			} else {
				prev[key] = oVal;
			}
		});
		
		return prev;
	}, {});
}