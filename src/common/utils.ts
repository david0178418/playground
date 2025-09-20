// hasProps.ts
export function hasProps<
	T,
	K extends readonly (keyof T)[]
>(obj: T | null | undefined, ...keys: K): obj is T & { [P in K[number]]: Exclude<T[P], undefined> } {
	if (obj == null) return false;
	return keys.every((k) => (obj as any)[k] !== undefined);
}
