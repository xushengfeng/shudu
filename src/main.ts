import { analyze, generate, hint, solve, type Difficulty } from "sudoku-core";
import { addClass, button, initDKH, select, view, type ElType } from "dkh-ui";

type BoardItem =
	| { type: "number"; value: number }
	| { type: "note"; value: number | null; notes: number[] };

type PosiT = {
	type: "x" | "y" | "b" | "c";
	p: number;
};

const zeroToNine = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
const canNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function index2BlockIndex(index: number) {
	const xIndex = index % 9;
	const yIndex = Math.floor(index / 9);
	const xx = Math.floor(xIndex / 3);
	const yy = Math.floor(yIndex / 3);
	return (yy * 3 + xx) as (typeof zeroToNine)[number];
}

function blockIndex(mainIndex: (typeof zeroToNine)[number]) {
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

function getNeiIndex(index: number) {
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

function getNei(v: Array<number | null>, index: number) {
	const indexes = getNeiIndex(index);
	// 获取x y 区块 index和值
	const x: number[] = indexes.x.flatMap((i) => (v[i] === null ? [] : v[i]));
	const y: number[] = indexes.y.flatMap((i) => (v[i] === null ? [] : v[i]));
	const b: number[] = indexes.b.flatMap((i) => (v[i] === null ? [] : v[i]));

	return { x, y, b };
}

function creatBoardItemFromValue(values: Array<number | null>): BoardItem[] {
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

function setBoard(board: BoardItem[]) {
	boardEl.clear().class(mainClassBoard);

	for (const mainIndex of zeroToNine) {
		const boxEl = view().addInto(boardEl).class(mainClassBlock);
		for (const boxIndex of zeroToNine) {
			const cellEl = view()
				.addInto(boxEl)
				.class(mainClassCell)
				.on("click", () => {
					setFocus(blockIndex(mainIndex)[boxIndex]);
				})
				.data({ index: blockIndex(mainIndex)[boxIndex].toString() });
			const boardIndex = blockIndex(mainIndex)[boxIndex];
			const item = board[boardIndex];
			if (item.type === "number") {
				cellEl.add(String(item.value)).data({ n: item.value.toString() });
			} else if (item.type === "note") {
				if (item.value !== null) {
					cellEl.add(String(item.value)).data({ n: item.value.toString() });
				} else {
					const noteGrid = view()
						.style({
							display: "grid",
							gridTemplateColumns: "repeat(3, 1fr)",
							gridTemplateRows: "repeat(3, 1fr)",
							width: "100%",
							height: "100%",
							fontSize: "10px",
							lineHeight: "10px",
							color: "#666",
						})
						.addInto(cellEl);
					for (const i of canNumber) {
						const nel = view()
							.add(item.notes.includes(i) ? String(i) : undefined)
							.style({
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							});
						if (item.notes.includes(i)) {
							nel.data({ n: String(i) });
						}
						noteGrid.add(nel);
					}
				}
			} else {
				cellEl.add("");
			}
		}
	}
}

function setFocus(index: number) {
	focusIndex = index;

	console.log("f", index);

	for (const el of boardEl.queryAll(`.${celFocusClass}`))
		el.el.classList.remove(celFocusClass);
	boardEl.query(`[data-index="${index}"]`)?.class(celFocusClass);

	inputEl.clear().style({
		display: "grid",
		gridTemplateColumns: "repeat(3, 40px)",
		gridTemplateRows: "repeat(3, 40px)",
		gap: "5px",
	});

	for (const i of canNumber) {
		const btnEl = button()
			.addInto(inputEl)
			.style({
				width: "40px",
				height: "40px",
				border: "1px solid gray",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "20px",
			})
			.add(String(i));

		if (inputType === "note") {
			const d = nowData[focusIndex];
			if (d.type === "note") {
				if (d.notes.includes(i)) {
					btnEl.style({ backgroundColor: "lightblue" });
				}
			}
			btnEl.style({ borderRadius: "50%" });
			btnEl.on("click", () => {
				setCellValueNote(focusIndex, i);
				setFocus(focusIndex);
			});
		} else {
			btnEl.on("click", () => {
				setCellValue(focusIndex, i);
			});
		}
	}
}

function setCellValue(index: number, value: number) {
	const data = structuredClone(nowData);
	const currentItem = data[index];
	if (currentItem.type === "number") {
		return;
	}
	currentItem.value = value;
	data[index] = currentItem;

	const ni = getNeiIndex(index);
	for (const x of Object.values(ni))
		for (const i of x) {
			const c = data[i];
			if (c.type === "note") c.notes = c.notes.filter((i) => i !== value);
		}

	setBoard(data);
	setData(data);

	checkDataEl(data);
}

function setCellValueNote(index: number, value: number) {
	const data = structuredClone(nowData);
	const currentItem = data[index];
	if (currentItem.type === "number") {
		return;
	}
	if (currentItem.notes.includes(value)) {
		currentItem.notes = currentItem.notes.filter((i) => i !== value);
	} else {
		currentItem.notes.push(value);
		currentItem.notes.sort((a, b) => a - b);
	}
	data[index] = currentItem;

	setBoard(data);
	setData(data);

	checkDataEl(data);
}

function setData(data: BoardItem[]) {
	nowData = structuredClone(data);
	const x = timeLine.data[timeLine.pointer];
	// eq
	const nid = crypto.randomUUID().slice(0, 8);
	timeLine.data[nid] = {
		dataList: structuredClone(data),
		focusIndex: focusIndex,
	};
	const l = timeLine.link[timeLine.pointer] ?? [];
	l.push(nid);
	timeLine.link[timeLine.pointer] = l;
	timeLine.pointer = nid;
	console.log(timeLine);

	timeLineEl.clear();
	const els = new Map<
		string,
		{ main: ElType<HTMLElement>; childrenWarp: ElType<HTMLElement> }
	>();
	function renderNode(id: string) {
		const nodeP = view("x").style({ gap: "4px" });
		const nodeEl = view().style({
			width: "16px",
			height: "16px",
			border: "1px solid gray",
			borderRadius: "50%",
		});
		const c = view("y").style({ gap: "4px" });
		els.set(id, { main: nodeP, childrenWarp: c });
		nodeP.add([nodeEl, c]);
		nodeEl.on("click", () => {
			timeLine.pointer = id;
			const d = timeLine.data[id];
			nowData = structuredClone(d.dataList);
			focusIndex = d.focusIndex;
			setBoard(nowData);
			setFocus(focusIndex);
			checkDataEl(nowData);
		});
		return nodeP;
	}
	const todo: string[] = [];
	todo.push("0");
	while (todo.length > 0) {
		const cid = todo.shift()!;
		renderNode(cid);
		const children = timeLine.link[cid] ?? [];
		for (const ch of children) {
			todo.push(ch);
		}
	}
	for (const [id, elObj] of els) {
		if (id === "0") timeLineEl.add(elObj.main);
		for (const childId of timeLine.link[id] ?? []) {
			const childElObj = els.get(childId);
			if (childElObj) {
				elObj.childrenWarp.add(childElObj.main);
			}
		}
	}
}

function fastCheckData(values: Array<BoardItem>):
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

function checkDataEl(values: Array<BoardItem>) {
	const c = fastCheckData(values);
	boardEl.el.classList.remove(boardSuccessClass, boardErrorClass);
	errorTextEl.clear();
	if (c.type === "success") {
		boardEl.el.classList.add(boardSuccessClass);
	} else if (c.type === "error") {
		boardEl.el.classList.add(boardErrorClass);
		view()
			.add(
				c.posi.type === "x"
					? `${c.posi.p + 1}行`
					: c.posi.type === "y"
						? `${c.posi.p + 1}列`
						: c.posi.type === "b"
							? `${c.posi.p + 1}宫`
							: `${c.posi.p % 9},${Math.floor(c.posi.p / 9)}格`,
			)
			.addInto(errorTextEl);
		if (c.errorType === "empty") {
			errorTextEl.add("空的候选");
		} else if (c.errorType === "less") {
			errorTextEl.add(`缺少数字: ${c.n.join(", ")}`);
		}
	}

	highLightB.clear();
	const unusedNum = canNumber.flatMap((n) =>
		values.filter((v) => v.value === n).length === 9 ? [] : [n],
	);
	highLightB.add(
		button("x")
			.style({
				minWidth: "20px",
				border: "1px solid gray",
				borderRadius: "4px",
			})
			.on("click", () => {
				// 取消所有高亮
				for (const cellEl of boardEl.queryAll("[data-n]")) {
					cellEl.el.classList.remove(celNumHighlightClass);
				}
			}),
	);
	for (const n of unusedNum) {
		highLightB.add(
			button()
				.style({
					minWidth: "20px",
					border: "1px solid gray",
					borderRadius: "4px",
				})
				.add(String(n))
				.on("click", () => {
					// 高亮显示所有n的单元格
					for (const cellEl of boardEl.queryAll("[data-n]")) {
						if (cellEl.el.getAttribute("data-n") === String(n)) {
							cellEl.el.classList.add(celNumHighlightClass);
						} else {
							cellEl.el.classList.remove(celNumHighlightClass);
						}
					}
				}),
		);
	}
}

function initGame(d: Difficulty) {
	const ss = generate(d);
	console.log(ss);

	const a = solve(ss);
	console.log(a);

	const x = analyze(ss);
	console.log(x);

	const xx = hint(ss);
	console.log(xx);

	initBoard(ss);
}

function initBoard(ss: Array<null | number>) {
	nowData = [];
	focusIndex = -1;

	nowData = creatBoardItemFromValue(ss);

	timeLine.data = { 0: { dataList: nowData, focusIndex: focusIndex } };
	timeLine.link = { 0: [] };
	timeLine.pointer = "0";

	setBoard(nowData);
	setData(nowData);
	setFocus(focusIndex);
	boardEl.el.classList.remove(boardSuccessClass, boardErrorClass);
	checkDataEl(nowData);
}

let nowData: BoardItem[] = [];
let focusIndex: number = -1;
let inputType: "normal" | "note" = "normal";
const timeLine: {
	data: Record<string, { dataList: BoardItem[]; focusIndex: number }>;
	link: Record<string, string[]>;
	pointer: string;
} = { data: {}, pointer: "0", link: {} };

const appEl = view("x", "wrap").addInto().style({
	width: "100svw",
	height: "100svh",
	alignItems: "center",
	justifyContent: "center",
	alignContent: "center",
	gap: "16px",
});

const boardEl = view().addInto(appEl);

const mainClassBoard = addClass(
	{
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gridTemplateRows: "repeat(3, 1fr)",
		gap: "0px",
		width: "min(calc(100vw - 16px), 360px)",
		height: "min(calc(100vw - 16px), 360px)",
		userSelect: "none",
	},
	{},
);
const mainClassBlock = addClass(
	{
		border: "1px solid gray",
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gridTemplateRows: "repeat(3, 1fr)",
	},
	{},
);
const mainClassCell = addClass(
	{
		border: "1px solid lightgray",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontSize: "20px",
	},
	{},
);

const celNumHighlightClass = addClass({ backgroundColor: "yellow" }, {});
const celFocusClass = addClass({ boxShadow: "inset 0 0 4px yellow" }, {});

const boardSuccessClass = addClass({ boxShadow: "0 0 10px green" }, {});
const boardErrorClass = addClass({ boxShadow: "0 0 10px red" }, {});

const toolsEl = view("y")
	.style({ gap: "16px", width: "min(360px, 100vw)", alignItems: "center" })
	.addInto(appEl);

const toolsEl2 = view("x", "wrap").style({ gap: "16px" }).addInto(toolsEl);
const timeLineEl = view()
	.addInto(toolsEl)
	.style({ width: "100%", maxHeight: "60px", overflow: "scroll" });
const errorTextEl = view().addInto(toolsEl);

const toolsEl3 = view("x").style({ gap: "4px" }).addInto(toolsEl);

button("普通输入")
	.addInto(toolsEl3)
	.on("click", () => {
		inputType = "normal";
		setFocus(focusIndex);
	});
button("草稿编辑")
	.addInto(toolsEl3)
	.on("click", () => {
		inputType = "note";
		setFocus(focusIndex);
	});

const inputEl = view().addInto(toolsEl);

button("新建")
	.on("click", () => {
		initGame(selectX.gv);
	})
	.addInto(toolsEl2);
const selectX = select<Difficulty>([
	{ value: "easy", name: "简单" },
	{ value: "medium", name: "中等" },
	{ value: "hard", name: "困难" },
	{ value: "expert", name: "专家" },
	{ value: "master", name: "大师" },
]);

selectX.addInto(toolsEl2);

button("导入")
	.on("click", () => {
		const p = prompt();
		if (p?.length !== 81) return;
		const ss = p
			.split("")
			.map((c) => ("1" <= c && c <= "9" ? Number(c) : null));
		initBoard(ss);
	})
	.addInto(toolsEl2);
button("导出")
	.on("click", () => {
		prompt(nowData.map((i) => (i.value === null ? 0 : i.value)).join(""));
	})
	.addInto(toolsEl2);

button("空")
	.on("click", () => {
		initBoard(new Array(81).fill(null));
	})
	.addInto(toolsEl2);

button("当前作为初始")
	.on("click", () => {
		const data = nowData.map((i) => i.value);
		initBoard(data);
	})
	.addInto(toolsEl2);

button("检查")
	.on("click", () => {
		const init = timeLine.data[0]?.dataList;
		if (!init) return;
		const l = init.map((i) => i.value);
		const r = solve(l);
		console.log(r);
		const a = r.board ?? [];
		const s = a.every((v, i) => {
			if (v === null) return true;
			if (nowData[i].value === null && nowData[i].type === "note") {
				return nowData[i].notes.includes(v);
			}
			return v === nowData[i].value;
		});
		if (!s) {
			alert("当前解法与初始题目不符");
		}
	})
	.addInto(toolsEl2);

const highLightB = view("x")
	.style({ overflow: "scroll", gap: "4px" })
	.addInto(toolsEl2);

initDKH({ pureStyle: true });

initGame("easy");

document.body.onkeyup = (e) => {
	if (e.key >= "1" && e.key <= "9") {
		const v = parseInt(e.key, 10);
		setCellValue(focusIndex, v);
	}
};
