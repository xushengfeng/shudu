import { analyze, generate, hint, solve, type Difficulty } from "sudoku-core";
import { addClass, button, initDKH, select, view, type ElType } from "dkh-ui";

type BoardItem =
	| { type: "number"; value: number }
	| { type: "note"; value: number | null; notes: number[] };

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
	boardEl
		.clear()
		.style({
			display: "grid",
			gridTemplateColumns: "repeat(3, min-content)",
			gridTemplateRows: "repeat(3, auto)",
			gap: "0px",
		})
		.class(mainClassBoard);

	for (const mainIndex of zeroToNine) {
		const boxEl = view()
			.addInto(boardEl)
			.style({
				display: "grid",
				gridTemplateColumns: "repeat(3, 40px)",
				gridTemplateRows: "repeat(3, 40px)",
			})
			.class(mainClassBlock);
		for (const boxIndex of zeroToNine) {
			const cellEl = view()
				.addInto(boxEl)
				.style({
					width: "40px",
					height: "40px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "20px",
				})
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
							gridTemplateColumns: "repeat(3, 33.333%)",
							gridTemplateRows: "repeat(3, 33.333%)",
							width: "100%",
							height: "100%",
							fontSize: "10px",
							lineHeight: "10px",
							textAlign: "center",
							color: "#666",
						})
						.addInto(cellEl);
					for (const i of canNumber) {
						const nel = view().add(
							item.notes.includes(i) ? String(i) : undefined,
						);
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

	inputEl.clear().style({
		display: "grid",
		gridTemplateColumns: "repeat(3, 40px)",
		gridTemplateRows: "repeat(3, 40px)",
		gap: "5px",
	});

	for (const i of canNumber) {
		const btnEl = view()
			.addInto(inputEl)
			.style({
				width: "40px",
				height: "40px",
				border: "1px solid gray",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "20px",
				cursor: "pointer",
			})
			.add(String(i));

		if (inputType === "note") {
			const d = nowData[focusIndex];
			if (d.type === "note") {
				if (d.notes.includes(i)) {
					btnEl.style({ backgroundColor: "lightblue" });
				}
			}
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

	checkDataEl(data.map((i) => i.value));
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
		const nodeP = view("x");
		const nodeEl = view().style({
			width: "16px",
			height: "16px",
			border: "1px solid gray",
		});
		const c = view("y");
		els.set(id, { main: nodeP, childrenWarp: c });
		nodeP.add([nodeEl, c]);
		nodeEl.on("click", () => {
			timeLine.pointer = id;
			const d = timeLine.data[id];
			nowData = structuredClone(d.dataList);
			focusIndex = d.focusIndex;
			setBoard(nowData);
			setFocus(focusIndex);
			checkDataEl(nowData.map((i) => i.value));
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

function checkData(values: Array<number | null>) {
	const every = values.every((v) => typeof v === "number");
	const s = solve(values);
	if (!s.solved) {
		return "error";
	} else {
		if (every) {
			return "success";
		} else {
			return "normal";
		}
	}
}

function checkDataEl(values: Array<number | null>) {
	const c = checkData(values);
	boardEl.el.classList.remove(boardSuccessClass, boardErrorClass);
	if (c === "success") {
		boardEl.el.classList.add(boardSuccessClass);
	} else if (c === "error") {
		boardEl.el.classList.add(boardErrorClass);
	}

	highLightB.clear();
	const unusedNum = canNumber.flatMap((n) =>
		values.filter((v) => v === n).length === 9 ? [] : [n],
	);
	highLightB.add(
		view()
			.add("x")
			.on("click", () => {
				// 取消所有高亮
				for (const cellEl of boardEl.queryAll("[data-n]")) {
					cellEl.el.classList.remove(celNumHighlightClass);
				}
			}),
	);
	for (const n of unusedNum) {
		highLightB.add(
			view()
				.style({
					width: "20px",
					height: "20px",
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
	nowData = [];
	focusIndex = -1;

	const ss = generate(d);
	console.log(ss);

	const a = solve(ss);
	console.log(a);

	const x = analyze(ss);
	console.log(x);

	const xx = hint(ss);
	console.log(xx);

	nowData = creatBoardItemFromValue(ss);

	timeLine.data = { 0: { dataList: nowData, focusIndex: focusIndex } };
	timeLine.link = { 0: [] };
	timeLine.pointer = "0";

	setBoard(nowData);
	setFocus(focusIndex);
	boardEl.el.classList.remove(boardSuccessClass, boardErrorClass);
	checkDataEl(ss);
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
	width: "100vw",
	height: "100vh",
	alignItems: "center",
	justifyContent: "center",
	gap: "16px",
});

const boardEl = view().addInto(appEl);

const mainClassBoard = addClass({}, {});
const mainClassBlock = addClass({ border: "1px solid gray" }, {});
const mainClassCell = addClass({ border: "1px solid lightgray" }, {});

const celNumHighlightClass = addClass({ backgroundColor: "yellow" }, {});

const boardSuccessClass = addClass({ boxShadow: "0 0 10px green" }, {});
const boardErrorClass = addClass({ boxShadow: "0 0 10px red" }, {});

const toolsEl = view().addInto(appEl);

const toolsEl2 = view().addInto(toolsEl);
const timeLineEl = view()
	.addInto(toolsEl)
	.style({ maxWidth: "120px", maxHeight: "60px", overflow: "scroll" });

const toolsEl3 = view().addInto(toolsEl);

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

button("检查")
	.on("click", () => {
		const b = nowData.map((i) => i.value);
		const r = solve(b);
		console.log(r);
		const a = r.board ?? [];
		console.log(b.every((v, i) => a[i] === v));
	})
	.addInto(toolsEl2);

const highLightB = view("x")
	.style({ width: "120px", overflow: "scroll" })
	.addInto(toolsEl2);

initDKH({ pureStyle: true });

initGame("easy");

document.body.onkeyup = (e) => {
	if (e.key >= "1" && e.key <= "9") {
		const v = parseInt(e.key, 10);
		setCellValue(focusIndex, v);
	}
};
