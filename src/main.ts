import { getSudoku } from "sudoku-gen";
import {
	addClass,
	button,
	ele,
	initDKH,
	input,
	view,
	type ElType,
} from "dkh-ui";
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
			const boardIndex = blockIndex(mainIndex)[boxIndex];
			const item = board[boardIndex];
			const cellEl = view()
				.addInto(boxEl)
				.class(mainClassCell)
				.on("mouseenter", () => {
					setFocus(boardIndex);
				})
				.data({ index: boardIndex.toString() });
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
				cellEl.on("click", () => {
					if (item.notes.length === 1) {
						setCellValue(boardIndex, item.notes[0]);
					} else if (holdNum !== null) {
						if (inputType === "normal") {
							setCellValue(boardIndex, holdNum);
						}
						if (inputType === "note") {
							setCellValueNote(boardIndex, holdNum);
						}
					}

					if (holdNum !== null) highLightCell(holdNum);
				});
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
}

function setCellValue(index: number, value: number) {
	const data = structuredClone(nowData);
	const currentItem = data[index];
	if (!currentItem) return;
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
	if (!currentItem) return;
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

function highLightCell(index: number) {
	// 高亮显示所有n的单元格
	for (const cellEl of boardEl.queryAll("[data-n]")) {
		if (cellEl.el.getAttribute("data-n") === String(index)) {
			cellEl.el.classList.add(celNumHighlightClass);
		} else {
			cellEl.el.classList.remove(celNumHighlightClass);
		}
	}
}

function dataEq(data1: BoardItem[], data2: BoardItem[]) {
	return data1.every((v, i) => {
		const n = data2[i];
		if (n.type === "note" && v.type === "note") {
			if (n.value === v.value) {
				if (n.value === null) {
					return n.notes.sort().join() === v.notes.sort().join();
				} else return true;
			}
			return false;
		} else if (n.type === "number" && v.type === "number") {
			return n.value === v.value;
		} else return false;
	});
}

function setData(data: BoardItem[]) {
	nowData = structuredClone(data);
	const x = structuredClone(timeLine.data[timeLine.pointer]);
	if (dataEq(x.dataList, data)) {
		reRenderTimeLine();
		return;
	}

	for (const next of timeLine.link[timeLine.pointer] ?? []) {
		if (dataEq(data, timeLine.data[next].dataList)) {
			timeLine.pointer = next;
			reRenderTimeLine();
			return;
		}
	}

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

	reRenderTimeLine();
}

function reRenderTimeLine() {
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
		if (timeLine.data[id].state === "success") {
			nodeEl.class(timeLineClass.success);
		} else if (timeLine.data[id].state === "error") {
			nodeEl.class(timeLineClass.error);
		} else if (timeLine.data[id].state === "checked") {
			nodeEl.class(timeLineClass.checked);
		}
		if (timeLine.pointer === id) nodeEl.class(timeLineClass.focus);
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

			timeLineEl
				.query(`.${timeLineClass.focus}`)
				?.el.classList.remove(timeLineClass.focus);
			nodeEl.class(timeLineClass.focus);
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

let holdNum: (typeof canNumber)[number] | null = null;

function checkDataEl(values: Array<BoardItem>) {
	const c = fastCheckData(values);
	boardEl.el.classList.remove(boardSuccessClass, boardErrorClass);
	textEl.clear();
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
			.addInto(textEl);
		if (c.errorType === "empty") {
			textEl.add("空的候选");
		} else if (c.errorType === "less") {
			textEl.add(`缺少数字: ${c.n.join(", ")}`);
		} else if (c.errorType === "more") {
			textEl.add(`多余数字: ${c.n.join(", ")}`);
		}
	}

	if (c.type === "error") {
		timeLine.data[timeLine.pointer].state = "error";
		reRenderTimeLine();
	}
	if (c.type === "success") {
		timeLine.data[timeLine.pointer].state = "success";
		reRenderTimeLine();
	}

	updateInput(values);
}

function updateInput(values: Array<BoardItem>) {
	const needUseNum = canNumber.flatMap((n) =>
		values.filter((v) => v.value === n).length === 9 ? [] : [n],
	);

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
			btnEl.style({ borderRadius: "50%" });
		}
		if (!needUseNum.includes(i)) {
			btnEl.style({ opacity: "0.3", pointerEvents: "none" });
		}
		btnEl.on("click", () => {
			holdNum = i;
			highLightCell(i);
		});
	}
}

function initGame(d: "easy" | "medium" | "hard" | "expert") {
	const ss = getSudoku(d)
		.puzzle.split("")
		.map((i) => ("1" <= i && i <= "9" ? Number(i) : null));
	console.log(ss);

	const a = mySolver(creatBoardItemFromValue(ss));
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

	const s = mySolver(nowData);
	solverData = [];
	const tip: string[] = [];
	if (s.board.length === 0) {
		tip.push("无解数独");
	} else if (s.board.length > 1) {
		tip.push("多解数独");
	} else {
		solverData = structuredClone(s.board);
	}
	if (s.branchCount > 0) {
		tip.push("需要猜测");
	}
	if (tip.length > 0) {
		textEl.add(tip.join("，"));
	}
}

async function showDialog<T>(
	cb: (
		el: ElType<HTMLDialogElement>,
		close: () => void,
		data: (d: T) => void,
	) => void,
): Promise<T> {
	const p = Promise.withResolvers<T>();
	const el = ele("dialog").addInto();
	el.el.showModal();
	cb(
		el,
		() => {
			el.remove();
		},
		(data) => {
			p.resolve(data);
		},
	);
	return p.promise;
}

let nowData: BoardItem[] = [];
let solverData: number[][] = [];
let focusIndex: number = -1;
let inputType: "normal" | "note" = "normal";
const timeLine: {
	data: Record<
		string,
		{
			dataList: BoardItem[];
			focusIndex: number;
			state?: "error" | "checked" | "success";
		}
	>;
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

const timeLineClass = {
	checked: addClass({ backgroundColor: "lightgreen" }, {}),
	success: addClass({ backgroundColor: "green" }, {}),
	error: addClass({ backgroundColor: "lightcoral" }, {}),
	focus: addClass({ backgroundColor: "lightblue" }, {}), // 覆盖
};

const toolsEl = view("y")
	.style({ gap: "16px", width: "min(360px, 100vw)", alignItems: "center" })
	.addInto(appEl);

const toolsEl2 = view("x", "wrap").style({ gap: "16px" }).addInto(toolsEl);
const timeLineEl = view()
	.addInto(toolsEl)
	.style({ width: "100%", maxHeight: "60px", overflow: "scroll" });
const textEl = view().addInto(toolsEl);

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
button("清除高亮")
	.addInto(toolsEl3)
	.on("click", () => {
		highLightCell(-1);
		holdNum = null;
	});

const inputEl = view().addInto(toolsEl);

button("新建")
	.on("click", async () => {
		showDialog((dialog, close) => {
			const el = view("y")
				.style({ padding: "16px", gap: "8px" })
				.addInto(dialog);
			el.add(
				view()
					.add("空")
					.on("click", () => {
						initBoard(new Array(81).fill(null));
						close();
					}),
			).add(
				view()
					.add("当前作为初始盘面")
					.on("click", () => {
						const data = nowData.map((i) => i.value);
						initBoard(data);
						close();
					}),
			);
			el.add("本地生成");
			el.add(
				(
					[
						{ value: "easy", name: "简单" },
						{ value: "medium", name: "中等" },
						{ value: "hard", name: "困难" },
						{ value: "expert", name: "专家" },
					] as const
				).map((i) =>
					view()
						.add(i.name)
						.on("click", () => {
							initGame(i.value);
							close();
						}),
				),
			);
			el.add(
				button("x").on("click", () => {
					close();
				}),
			);
		});
	})
	.addInto(toolsEl2);

button("导入导出")
	.on("click", () => {
		showDialog((dialog, close) => {
			const el = view("y")
				.style({ padding: "16px", gap: "8px" })
				.addInto(dialog);
			const initState = input().sv(
				timeLine.data[0].dataList
					.map((i) => (i.value === null ? 0 : i.value))
					.join(""),
			);
			const nowState = input().sv(
				nowData.map((i) => (i.value === null ? 0 : i.value)).join(""),
			);

			el.add(
				view().add([
					"初始盘面",
					initState,
					button("设置").on("click", () => {
						const p = initState.gv;
						if (p?.length !== 81) return;
						const ss = p
							.split("")
							.map((c) => ("1" <= c && c <= "9" ? Number(c) : null));
						initBoard(ss);
						close();
					}),
				]),
			)
				.add(view().add(["当前盘面", nowState]))
				.add(
					button("x").on("click", () => {
						close();
					}),
				);
		});
	})
	.addInto(toolsEl2);

button("检查")
	.on("click", () => {
		const init = timeLine.data[0]?.dataList;
		if (!init) return;
		const r = mySolver(init);
		console.log(r);
		const s = solverData.some((a) =>
			a.every((v, i) => {
				if (nowData[i].value === null && nowData[i].type === "note") {
					return nowData[i].notes.includes(v);
				}
				return v === nowData[i].value;
			}),
		);
		if (!s) {
			timeLine.data[timeLine.pointer].state = "error";
			reRenderTimeLine();
		} else {
			timeLine.data[timeLine.pointer].state = "checked";
			reRenderTimeLine();
		}
	})
	.addInto(toolsEl2);

button("答案")
	.on("click", () => {
		const init = timeLine.data[0]?.dataList;
		if (!init) return;
		const r = mySolver(init);
		console.log(r);
		if (solverData.length === 0) {
			textEl.clear().add("无解");
			return;
		}
		nowData = creatBoardItemFromValue(solverData[0]);
		setBoard(nowData);
		setData(nowData);
		setFocus(focusIndex);
		checkDataEl(nowData);
	})
	.addInto(toolsEl2);

button("提示")
	.on("click", () => {
		const r = mySolver(nowData);
		console.log(r);
		const tip = r.fullLog.at(0);
		if (tip === undefined) textEl.clear().add("没有提示");
		else {
			if ("strategyName" in tip) {
				const t = `${tip.strategyName}# ${
					tip.log
						? `${tip.log.type} ${tip.log.value.join(",")} at ${(tip.log.cellPosi % 9) + 1},${Math.floor(tip.log.cellPosi / 9) + 1} ${tip.log.m}`
						: ""
				}`;
				textEl.clear().add(t);
			}
		}
	})
	.addInto(toolsEl2);

initDKH({ pureStyle: true });

initGame("easy");

document.body.onkeyup = (e) => {
	if (e.key >= "1" && e.key <= "9") {
		const v = parseInt(e.key, 10);
		setCellValue(focusIndex, v);
	}
	if (e.key.startsWith("Arrow")) {
		const x = focusIndex % 9;
		const y = Math.floor(focusIndex / 9);
		let nx = x;
		let ny = y;
		if (e.key === "ArrowUp") {
			ny = (y + 8) % 9;
		}
		if (e.key === "ArrowDown") {
			ny = (y + 1) % 9;
		}
		if (e.key === "ArrowLeft") {
			nx = (x + 8) % 9;
		}
		if (e.key === "ArrowRight") {
			nx = (x + 1) % 9;
		}
		setFocus(ny * 9 + nx);
	}
};

// @ts-expect-error
window.__setBoard = (b: BoardItem[]) => {
	setBoard(b);
};
