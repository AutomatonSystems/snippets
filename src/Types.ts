
export type IFunc = ()=>any

export type IStoppable = {
	stop: IFunc
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;