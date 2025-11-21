export type BoardItem =
	| { type: "number"; value: number }
	| { type: "note"; value: number | null; notes: number[] };
export type PosiT = {
	type: "x" | "y" | "b" | "c";
	p: number;
};

export type SolverInfo = {
	type: "set" | "rmNote";
	value: number[];
	cellPosi: number;
	m: string;
};

export const zeroToNine = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export const canNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const strategies = {
	singleCandidate: {
		name: "单个候选数",
	},
	uniqueCandidate: {
		name: "行、列、区块唯一候选数",
	},
	hiddenPair: {
		name: "隐藏对",
	},
	hiddenTriple: {
		name: "隐藏三连",
	},
	hiddenQuad: {
		name: "隐藏四连",
	},
	pointing: {
		name: "指向 pointing",
	},
	claiming: {
		name: "Claiming",
	},
	xwing: {
		name: "x-wing",
	},
};

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
			errorType: "more" | "less" | "empty";
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
				errorType: "more",
				n: n.x.filter((v, i, arr) => arr.indexOf(v) !== i),
				posi: { type: "x", p: Math.floor(i / 9) },
			};
		if (new Set(n.y).size !== n.y.length)
			return {
				type: "error",
				errorType: "more",
				n: n.y.filter((v, i, arr) => arr.indexOf(v) !== i),
				posi: { type: "y", p: i % 9 },
			};
		if (new Set(n.b).size !== n.b.length)
			return {
				type: "error",
				errorType: "more",
				n: n.b.filter((v, i, arr) => arr.indexOf(v) !== i),
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

export function mySolver2(
	values: Array<number | null>,
	_strategies?: (keyof typeof strategies)[],
) {
	return mySolver(creatBoardItemFromValue(values), _strategies);
}

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

function hiddenSubset(
	board: BoardItem[],
	size: number,
):
	| {
			type: "step";
			board: BoardItem[];
			log?: SolverInfo;
	  }
	| undefined {
	// 隐式子集
	// 以 隐式对为例子
	// 某对数字只出现在某行某列两个格子里，那格子里的其他数字候选就没有必要了
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
				.flatMap((i) => (i.type === "note" && i.value === null ? i.notes : []));
			const xx = count(xv);
			const pairNumbers = Object.entries(xx)
				.filter(([_, v]) => v === size)
				.map(([k, _]) => Number(k));
			if (pairNumbers.length !== size) continue;

			const pairIndices = pairNumbers.map((n) =>
				indices.filter(
					(i) =>
						board[i].type === "note" &&
						board[i].value === null &&
						board[i].notes.includes(n),
				),
			);
			if (
				pairIndices.every((i) => i.length === size) &&
				pairIndices[0].every((a, i) =>
					pairIndices.slice(1).every((b) => b[i] === a),
				)
			) {
				// 找到隐藏对
				for (const pi of pairIndices[0]) {
					const cell = board[pi];
					if (cell.type !== "note") continue;
					const otherNotes = cell.notes.filter((i) => !pairNumbers.includes(i));
					if (otherNotes.length === 0) continue;
					const log: SolverInfo = {
						type: "rmNote",
						value: otherNotes,
						cellPosi: pi,
						m: `${indexType} ${mainIndex + 1} hidden pair ${pairNumbers
							.map((i) => i.toString())
							.join(",")}`,
					};
					cell.notes = pairNumbers;
					return { type: "step", board, log };
				}
			}
		}
	}
}

const s: Record<
	keyof typeof strategies,
	(board: BoardItem[]) =>
		| {
				type: "step";
				board: BoardItem[];
				log?: SolverInfo;
		  }
		| undefined
> = {
	singleCandidate: (board) => {
		// 单个候选数
		for (const [i, v] of board.entries()) {
			if (v.type === "note" && v.value === null && v.notes.length === 1) {
				const log: SolverInfo = {
					type: "set",
					value: [v.notes[0]],
					cellPosi: i,
					m: "",
				};
				setValue(board, i, v.notes[0]);
				return { type: "step", board, log };
			}
		}
	},
	uniqueCandidate: (board) => {
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
						const log: SolverInfo = {
							type: "set",
							value: [Number(k)],
							cellPosi: index,
							m: `${indexType} ${mainIndex + 1}`,
						};
						setValue(board, index, Number(k));
						return { type: "step", board, log };
					}
				}
			}
		}
	},
	hiddenPair: (board) => {
		return hiddenSubset(board, 2);
	},
	hiddenTriple: (board) => {
		return hiddenSubset(board, 3);
	},
	hiddenQuad: (board) => {
		return hiddenSubset(board, 4);
	},
	pointing: (board) => {
		// 指向 pointing
		// 某数字在宫格仅同一行或同一列，延伸过去的其他行列就不能存在这个数字，否个这个宫格会没有数字选择
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
							const log: SolverInfo = {
								type: "rmNote",
								value: [Number(n)],
								cellPosi: ci,
								m: `block ${bindex + 1} along x ${xIndex + 1}`,
							};
							board[ci].notes = board[ci].notes.filter((i) => i !== Number(n));
							return { type: "step", board, log };
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
							const log: SolverInfo = {
								type: "rmNote",
								value: [Number(n)],
								cellPosi: ci,
								m: `block ${bindex + 1} along y ${yIndex + 1}`,
							};
							board[ci].notes = board[ci].notes.filter((i) => i !== Number(n));
							return { type: "step", board, log };
						}
					}
				}
			}
		}
	},
	claiming: (board) => {
		// Claiming
		// 某数字在行或列，且他们仅同一宫格内，宫格内原来可以在其他地方有这个数字的候选，如果其他地方选了候选，宫格排除这个数字，进而导致行列无法填写这个数字
		for (const indexType of ["x", "y"] as const) {
			for (const mainIndex of zeroToNine) {
				let indices: number[] = [];
				if (indexType === "x") {
					indices = zeroToNine.map((i) => mainIndex * 9 + i);
				}
				if (indexType === "y") {
					indices = zeroToNine.map((i) => mainIndex + i * 9);
				}
				const v = indices.map((i) => board[i]);
				const noteV = v.flatMap((i) =>
					i.type === "note" && i.value === null ? i.notes : [],
				);
				const c = count(noteV);
				const x = Object.entries(c).filter(([_, v]) => v <= 3);
				if (x.length === 0) continue;
				for (const [n] of x) {
					const indx = indices
						.filter(
							(i) =>
								board[i].type === "note" &&
								board[i].value === null &&
								board[i].notes.includes(Number(n)),
						)
						.map((i) => index2BlockIndex(i));
					const allB = new Set(indx);
					if (allB.size === 1) {
						// 都在同一宫格内
						const bindex = Array.from(allB)[0];
						const bIndices = blockIndex(bindex);
						for (const bi of bIndices) {
							if (
								!indices.includes(bi) &&
								board[bi].type === "note" &&
								board[bi].value === null &&
								board[bi].notes.includes(Number(n))
							) {
								const log: SolverInfo = {
									type: "rmNote",
									value: [Number(n)],
									cellPosi: bi,
									m: `${indexType} ${mainIndex + 1} within block ${bindex + 1}`,
								};
								board[bi].notes = board[bi].notes.filter(
									(i) => i !== Number(n),
								);
								return { type: "step", board, log };
							}
						}
					}
				}
			}
		}
	},
	xwing: (board) => {
		// x-wing
		// 以x为例子，某个数字，在xa行仅有两个候选，在xb行也仅有两个候选，且这两个候选的y列位置相同，那么这两个列位置在其他的同数字候选可以删除
		// 因为其他位置掩盖了其中一个，另一个位置就必须选择那个数字，导致同一列数字相同
		// 可以证明，只有xa xb，不再有xc等
		for (const num of canNumber) {
			for (const indexType of ["x", "y"] as const) {
				const s = new Map<string, number>();

				for (const n of zeroToNine) {
					let indexes: readonly [number, BoardItem][] = [];
					if (indexType === "x") {
						indexes = zeroToNine.map((x) => [x, board[n * 9 + x]] as const);
					} else {
						indexes = zeroToNine.map((y) => [y, board[y * 9 + n]] as const);
					}
					const l = indexes.filter(
						([_, v]) =>
							v.type === "note" && v.value === null && v.notes.includes(num),
					);
					if (l.length !== 2) continue;
					const lineKey = l.map((i) => i[0]).join(",");
					if (s.has(lineKey)) {
						for (const nn of l) {
							for (const z of zeroToNine) {
								if (z === n) continue;
								if (z === s.get(lineKey)) continue;
								const index = indexType === "x" ? z * 9 + nn[0] : nn[0] * 9 + z;
								if (
									board[index].type === "note" &&
									board[index].value === null &&
									board[index].notes.includes(num)
								) {
									const log: SolverInfo = {
										type: "rmNote",
										value: [num],
										cellPosi: index,
										m: `${indexType} axis ${n + 1} and ${Number(s.get(lineKey)) + 1} along positions ${lineKey
											.split(",")
											.map((i) => Number(i) + 1)
											.join(",")}`,
									};
									board[index].notes = board[index].notes.filter(
										(i) => i !== num,
									);
									return { type: "step", board, log };
								}
							}
						}
					} else {
						s.set(lineKey, n);
					}
				}
			}
		}
	},
};

export function mySolver(
	values: Array<BoardItem>,
	_strategies: (keyof typeof strategies)[] = [
		"singleCandidate",
		"uniqueCandidate",
		"pointing",
		"claiming",
		"hiddenPair",
		"hiddenTriple",
		"hiddenQuad",
		"xwing",
	],
) {
	const boardItems = values;

	const fullLog: (
		| {
				strategyName: keyof typeof strategies | "tryNumber";
				log?: SolverInfo;
		  }
		| {
				state: "error" | "success";
		  }
	)[] = [];
	let branchCount = 0;

	let runCount = 0;
	const maxDeep = 10000;

	function x(
		board: BoardItem[],
	):
		| { type: "error" }
		| { type: "success"; board: BoardItem[] }
		| { type: "step"; board: BoardItem[] }
		| { type: "continue"; board: BoardItem[] } {
		const check = fastCheckData(board);
		if (check.type === "error") {
			fullLog.push({ state: "error" });
			return { type: "error" };
		}
		if (check.type === "success") {
			fullLog.push({ state: "success" });
			return { type: "success", board };
		}

		for (const strategyName of _strategies) {
			const res = s[strategyName](board);
			if (res) {
				fullLog.push({
					strategyName,
					log: res.log,
				});
				return res;
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
				// 对某个格分类讨论
				// 顺便考虑多解
				const notes = res.board.flatMap((i) =>
					i.type === "note" && i.value === null ? i.notes : [],
				);
				const c = count(notes);
				for (let noteCount = 2; noteCount <= 9; noteCount++) {
					let maxCell = -1;
					let maxScore = 0;
					for (const [index, v] of res.board.entries()) {
						if (
							v.type === "note" &&
							v.value === null &&
							v.notes.length === noteCount
						) {
							const score = v.notes.reduce(
								(acc, cur) => acc + (c[cur] ?? 0),
								0,
							);
							if (score > maxScore) {
								maxScore = score;
								maxCell = index;
							}
						}
					}
					if (maxCell !== -1) {
						const cell = res.board[maxCell];
						if (cell.type !== "note") continue;
						for (let i = 0; i < cell.notes.length; i++) {
							const b = structuredClone(res.board);
							fullLog.push({
								strategyName: "tryNumber",
								log: {
									type: "set",
									value: [cell.notes[i]],
									cellPosi: maxCell,
									m: "",
								},
							});
							branchCount++;
							setValue(b, maxCell, cell.notes[i]);
							stack.push({ board: b });
						}
						break;
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
		branchCount,
	};
}
