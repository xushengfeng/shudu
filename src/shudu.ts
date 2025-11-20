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

export function mySolver(values: Array<number | null>) {
	const boardItems = creatBoardItemFromValue(values);

	const fullLog: string[] = [];
	let brunchCount = 0;

	let runCount = 0;
	const maxDeep = 5000;

	function setValue(board: BoardItem[], index: number, v: number) {
		board[index].value = v;
		const ni = getNeiIndex(index);
		for (const x of Object.values(ni))
			for (const i of x) {
				const c = board[i];
				if (c.type === "note") c.notes = c.notes.filter((i) => i !== v);
			}
	}

	function count(o: number[]) {
		const r: Record<number, number> = {};
		for (const i of o) {
			r[i] = (r[i] || 0) + 1;
		}
		return r;
	}

	function x(
		board: BoardItem[],
	):
		| { type: "error" }
		| { type: "success"; board: BoardItem[] }
		| { type: "step"; board: BoardItem[] }
		| { type: "continue"; board: BoardItem[] } {
		// logBoard(board);

		const check = fastCheckData(board);
		if (check.type === "error") {
			fullLog.push("Error detected during fast check");
			return { type: "error" };
		}
		if (check.type === "success") return { type: "success", board };

		// 单个候选数
		for (const [i, v] of board.entries()) {
			if (v.type === "note" && v.value === null && v.notes.length === 1) {
				fullLog.push(
					`Set value at index ${i} to ${v.notes[0]} based on single candidate`,
				);
				setValue(board, i, v.notes[0]);
				return { type: "step", board };
			}
		}

		// 行、列、区块唯一候选数
		for (const indexType of ["x", "y", "b"] as const) {
			for (const mainIndex of zeroToNine) {
				let indices: number[] = [];
				if (indexType === "x") {
					indices = zeroToNine.map((i) => mainIndex * 9 + i);
				}
				if (indexType === "y") {
					indices = zeroToNine.map((i) => mainIndex + i * 9);
				}
				if (indexType === "b") {
					indices = blockIndex(mainIndex);
				}
				const xv = indices
					.map((i) => board[i])
					.flatMap((i) =>
						i.type === "note" && i.value === null ? i.notes : [],
					);
				const xx = count(xv);
				for (const [k, v] of Object.entries(xx)) {
					if (v === 1) {
						// biome-ignore lint/style/noNonNullAssertion: ===1
						const index = indices.find(
							(i) =>
								board[i].type === "note" &&
								board[i].value === null &&
								board[i].notes.includes(Number(k)),
						)!;
						fullLog.push(
							`Set value at index ${index} to ${k} based on unique candidate in ${indexType} ${mainIndex}`,
						);
						setValue(board, index, Number(k));
						return { type: "step", board };
					}
				}
			}
		}

		// 指向 pointing 某数字在宫格仅同一行或同一列，延伸过去的其他行列就不能存在这个数字，否个这个宫格会没有数字选择
		for (const bindex of zeroToNine) {
			const bIndices = blockIndex(bindex);
			const bv = bIndices.map((i) => board[i]);
			const noteV = bv.flatMap((i) =>
				i.type === "note" && i.value === null ? i.notes : [],
			);
			const c = count(noteV);
			const x = Object.entries(c).filter(([_, v]) => v <= 3);
			if (x.length === 0) continue;

			for (const [n] of x) {
				const xyOfCell = bIndices
					.filter(
						(i) =>
							board[i].type === "note" &&
							board[i].value === null &&
							board[i].notes.includes(Number(n)),
					)
					.map((i) => ({
						x: i % 9,
						y: Math.floor(i / 9),
					}));
				const allX = new Set(xyOfCell.map((i) => i.x));
				const allY = new Set(xyOfCell.map((i) => i.y));
				if (allX.size === 1) {
					// x相同，即找竖行
					const xIndex = Array.from(allX)[0];
					for (const y of zeroToNine) {
						const ci = y * 9 + xIndex;
						if (
							!bIndices.includes(ci) &&
							board[ci].type === "note" &&
							board[ci].value === null &&
							board[ci].notes.includes(Number(n))
						) {
							fullLog.push(
								`Remove note ${n} at index ${ci} based on pointing in block ${bindex} along x ${xIndex}`,
							);
							board[ci].notes = board[ci].notes.filter((i) => i !== Number(n));
							return { type: "step", board };
						}
					}
				}
				if (allY.size === 1) {
					// y相同，即找横行
					const yIndex = Array.from(allY)[0];
					for (const x of zeroToNine) {
						const ci = yIndex * 9 + x;
						if (
							!bIndices.includes(ci) &&
							board[ci].type === "note" &&
							board[ci].value === null &&
							board[ci].notes.includes(Number(n))
						) {
							fullLog.push(
								`Remove note ${n} at index ${ci} based on pointing in block ${bindex} along y ${yIndex}`,
							);
							board[ci].notes = board[ci].notes.filter((i) => i !== Number(n));
							return { type: "step", board };
						}
					}
				}
			}
		}

		return { type: "continue", board };
	}

	function xx(board: BoardItem[]) {
		const stack: Array<{ board: BoardItem[] }> = [
			{ board: structuredClone(board) },
		];
		const results: Array<{ type: "success"; board: BoardItem[] }> = [];

		while (stack.length > 0) {
			runCount++;
			if (runCount > maxDeep) {
				console.log("超出最大深度，停止计算");
				break;
			}
			// biome-ignore lint/style/noNonNullAssertion: >0
			const { board } = stack.pop()!;
			const res = x(board);
			if (res.type === "step") {
				stack.push({ board: structuredClone(res.board) });
				continue;
			}
			if (res.type === "continue") {
				// 暴力求解
				b: for (let noteCount = 2; noteCount <= 9; noteCount++) {
					for (const [index, v] of res.board.entries()) {
						if (v.type === "note" && v.value === null) {
							if (v.notes.length === noteCount) {
								for (let i = 0; i < noteCount; i++) {
									const b = structuredClone(res.board);
									fullLog.push(
										`Set value at index ${index} to ${v.notes[i]} based on brute force`,
									);
									brunchCount++;
									setValue(b, index, v.notes[i]);
									stack.push({ board: b });
								}
								break b;
							}
						}
					}
				}
			}
			if (res.type === "success") {
				results.push(res);
			}
		}

		return results;
	}

	const bo = xx(boardItems).map((i) => i.board.map((v) => v.value as number));

	return {
		board: bo,
		fullLog,
		brunchCount,
	};
}
