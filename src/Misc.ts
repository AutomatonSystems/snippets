export function arr<T>(arrOrObject: T[]|T): Exclude<T, undefined>[]{
	if(arrOrObject===null || arrOrObject === undefined) {
		return [];
	}
	if(Array.isArray(arrOrObject)) {
		return <Exclude<T, undefined>[]>arrOrObject;
	}
	return [<Exclude<T, undefined>>arrOrObject];
}