import { analyze, generate, hint, solve, type Difficulty } from "sudoku-core";
import { addClass, button, initDKH, select, view, type ElType } from "dkh-ui";
import {
	blockIndex,
	type BoardItem,
	canNumber,
	creatBoardItemFromValue,
	fastCheckData,
	getNeiIndex,
	mySolver,
	zeroToNine,
} from "./shudu";

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
					if (item.notes.length === 1) {
						noteGrid.on("dblclick", () => {
							setCellValue(boardIndex, item.notes[0]);
						});
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
	// const x = timeLine.data[timeLine.pointer];
	// todo eq
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
		// biome-ignore lint/style/noNonNullAssertion: >0
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
				if (elObj.childrenWarp.el.children.length > 1) {
					elObj.childrenWarp.style({ borderLeft: "1px solid" });
				}
			}
		}
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
							: `${(c.posi.p % 9) + 1},${Math.floor(c.posi.p / 9) + 1}格`,
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

	const x = analyze(ss);
	console.log(x);

	const xx = hint(ss);
	console.log(xx);

	const a = mySolver(ss);
	console.log(a);

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
		prompt(
			undefined,
			nowData.map((i) => (i.value === null ? 0 : i.value)).join(""),
		);
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
		const r = mySolver(l);
		console.log(r);
		const s = r.board.some((a) =>
			a.every((v, i) => {
				if (v === null) return true;
				if (nowData[i].value === null && nowData[i].type === "note") {
					return nowData[i].notes.includes(v);
				}
				return v === nowData[i].value;
			}),
		);
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

// @ts-expect-error
window.__setBoard = (b: BoardItem[]) => {
	setBoard(b);
};
