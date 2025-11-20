export function mySolver(values: Array<number | null>) {
	console.log(values);
}
export type BoardItem =
	| { type: "number"; value: number }
	| { type: "note"; value: number | null; notes: number[] };
export type PosiT = {
	type: "x" | "y" | "b" | "c";
	p: number;
};
export const zeroToNine = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export const canNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export function index2BlockIndex(index: number) {
	const xIndex = index % 9;
	const yIndex = Math.floor(index / 9);
	const xx = Math.floor(xIndex / 3);
	const yy = Math.floor(yIndex / 3);
	return (yy * 3 + xx) as (typeof zeroToNine)[number];
}
export function blockIndex(mainIndex: (typeof zeroToNine)[number]) {
	const bIndex = {
		0: 0,
		1: 3,
		2: 6,
		3: 27,
		4: 30,
		5: 33,
		6: 54,
		7: 57,
		8: 60,
	}[mainIndex];
	const i = zeroToNine.map(
		(boxIndex) =>
			bIndex +
			{ 0: 0, 1: 1, 2: 2, 3: 9, 4: 10, 5: 11, 6: 18, 7: 19, 8: 20 }[boxIndex],
	);
	return i;
}
export function getNeiIndex(index: number) {
	// 获取x y 区块 index和值
	const x: number[] = [];
	const y: number[] = [];
	const b: number[] = [];

	const xIndex = index % 9;
	const yIndex = Math.floor(index / 9);

	for (const i of zeroToNine) {
		x.push(yIndex * 9 + i);
	}

	for (const i of zeroToNine) {
		y.push(i * 9 + xIndex);
	}

	const bindex = index2BlockIndex(index);
	const bIndices = blockIndex(bindex);

	for (const bi of bIndices) {
		b.push(bi);
	}

	return { x, y, b };
}
export function getNei(v: Array<number | null>, index: number) {
	const indexes = getNeiIndex(index);
	// 获取x y 区块 index和值
	const x: number[] = indexes.x.flatMap((i) => (v[i] === null ? [] : v[i]));
	const y: number[] = indexes.y.flatMap((i) => (v[i] === null ? [] : v[i]));
	const b: number[] = indexes.b.flatMap((i) => (v[i] === null ? [] : v[i]));

	return { x, y, b };
}
export function creatBoardItemFromValue(
	values: Array<number | null>,
): BoardItem[] {
	const boardItems: BoardItem[] = [];
	for (const [index, x] of values.entries()) {
		if (typeof x === "number") {
			boardItems.push({ type: "number", value: x });
		} else {
			const usedNumber = new Set<number>();
			const n = getNei(values, index);

			for (const i of n.x) usedNumber.add(i);
			for (const i of n.y) usedNumber.add(i);
			for (const i of n.b) usedNumber.add(i);
			boardItems.push({
				type: "note",
				value: null,
				notes: canNumber.filter((i) => !usedNumber.has(i)),
			});
		}
	}
	return boardItems;
}
export function fastCheckData(values: Array<BoardItem>):
	| {
			type: "normal" | "success";
	  }
	| {
			type: "error";
			errorType: "less" | "empty";
			posi: PosiT;
			n: number[];
	  } {
	const every = values.every((v) => typeof v.value === "number");
	for (const [i, v] of values.entries()) {
		if (v.value === null) continue;
		const n = getNei(
			values.map((vv) => vv.value),
			i,
		);
		if (new Set(n.x).size !== n.x.length)
			return {
				type: "error",
				errorType: "less",
				n: [],
				posi: { type: "x", p: Math.floor(i / 9) },
			};
		if (new Set(n.y).size !== n.y.length)
			return {
				type: "error",
				errorType: "less",
				n: [],
				posi: { type: "y", p: i % 9 },
			};
		if (new Set(n.b).size !== n.b.length)
			return {
				type: "error",
				errorType: "less",
				n: [],
				posi: { type: "b", p: index2BlockIndex(i) },
			};
	}
	if (every) {
		return { type: "success" };
	} else {
		for (const [i, v] of values.entries()) {
			if (v.type === "note" && v.value === null && v.notes.length === 0) {
				return {
					type: "error",
					errorType: "empty",
					n: [],
					posi: { type: "c", p: i },
				};
			}
		}
		for (const bindex of zeroToNine) {
			const bIndices = blockIndex(bindex);
			const ns = new Set(
				bIndices
					.flatMap((i) =>
						values[i].value === null && values[i].type === "note"
							? values[i].notes
							: values[i].value,
					)
					.filter((v): v is number => typeof v === "number"),
			);
			if (ns.size < 9) {
				return {
					type: "error",
					errorType: "less",
					n: canNumber.filter((n) => !ns.has(n)),
					posi: { type: "b", p: bindex },
				};
			}
		}
		for (const x of zeroToNine) {
			const xIndexes = zeroToNine.map((i) => x * 9 + i);
			const ns = new Set(
				xIndexes
					.flatMap((i) =>
						values[i].value === null && values[i].type === "note"
							? values[i].notes
							: values[i].value,
					)
					.filter((v): v is number => typeof v === "number"),
			);
			if (ns.size < 9) {
				return {
					type: "error",
					errorType: "less",
					n: canNumber.filter((n) => !ns.has(n)),
					posi: { type: "x", p: x },
				};
			}
		}
		for (const y of zeroToNine) {
			const yIndexes = zeroToNine.map((i) => y + i * 9);
			const ns = new Set(
				yIndexes
					.flatMap((i) =>
						values[i].value === null && values[i].type === "note"
							? values[i].notes
							: values[i].value,
					)
					.filter((v): v is number => typeof v === "number"),
			);
			if (ns.size < 9) {
				return {
					type: "error",
					errorType: "less",
					n: canNumber.filter((n) => !ns.has(n)),
					posi: { type: "y", p: y },
				};
			}
		}
		return { type: "normal" };
	}
}
