import { fastCheckData, setValue2, type BoardItem } from "./shudu";

export interface OperationNode {
	id: number; // 节点唯一ID
	parentId: number; // 父节点ID（根节点为-1）
	index?: number; // 操作位置索引（0-80），根节点无此字段
	value?: number; // 填入的数字，根节点无此字段
	board: (number | null)[]; // 操作后的盘面快照（number[]形式，null表示空格）
	depth: number; // 节点深度
	emptyCount: number; // 空格数量
	isSolution: boolean; // 是否为解（盘面完全填满且合法）
	isConflict: boolean; // 是否冲突（fastCheckData返回error）
	children: number[]; // 子节点列表
	createdAt: number; // 节点创建序号（用于记录顺序）
}

export interface SolveResult {
	rootId: number; // 操作树的根节点（初始盘面）
	nodes: Map<number, OperationNode>; // 所有节点映射，便于快速查找
	solutionIds: number[];
	conflictIds: number[];
	stopBy: "finish" | "maxSteps";
}

class maxStepsError extends Error {}

async function waitASecond() {
	const p = Promise.withResolvers();
	p.resolve(0);
	return p.promise;
}

export async function v(board: Array<BoardItem>): Promise<SolveResult> {
	function cloneBoard(b: Array<BoardItem>): Array<BoardItem> {
		return structuredClone(b);
	}

	function toNumberArray(b: Array<BoardItem>): (number | null)[] {
		return b.map((cell) => (cell.type === "number" ? cell.value : null));
	}

	// ----- 回溯控制参数 -----
	const MAX_STEPS = 1_000_000;
	let stepCount = 0;
	let nextNodeId = 0;

	// ----- 操作树存储 -----
	const nodes = new Map<number, OperationNode>();
	let rootNode: OperationNode | null = null;

	// ----- 统计用 -----
	const solutionIds: number[] = [];
	const conflictIds: number[] = [];

	// ----- 创建节点 -----
	function createNode(
		parentId: number,
		boardState: Array<BoardItem>,
		operation?: { index: number; value: number },
		isConflict: boolean = false,
		isSolution: boolean = false,
	): OperationNode {
		const id = nextNodeId++;
		const parent = nodes.get(parentId);
		const depth = parent ? parent.depth + 1 : 0;

		const node: OperationNode = {
			id,
			parentId,
			index: operation?.index,
			value: operation?.value,
			board: toNumberArray(boardState),
			depth,
			emptyCount: boardState.filter((c) => c.type === "note").length,
			isSolution,
			isConflict,
			children: [],
			createdAt: stepCount,
		};

		nodes.set(id, node);

		// 添加到父节点的children列表
		if (parent) {
			parent.children.push(id);
		} else {
			rootNode = node;
		}

		return node;
	}

	// ----- 回溯核心 -----
	async function search(
		currentBoard: Array<BoardItem>,
		parentId: number = -1,
		operation?: { index: number; value: number }, // 新增：来自父节点的操作信息
	) {
		stepCount++;

		// ----- 步数保护 -----
		if (stepCount > MAX_STEPS) {
			throw new maxStepsError(`已达到最大尝试次数 ${MAX_STEPS}，强制终止`);
		}
		if (stepCount % 1000 === 0) {
			await waitASecond();
		}

		// ----- 1. 冲突检查 -----
		const checkResult = fastCheckData(currentBoard);
		if (checkResult.type === "error") {
			// 创建冲突节点，传入operation信息
			const node = createNode(parentId, currentBoard, operation, true, false);
			conflictIds.push(node.id);
			return;
		}

		// ----- 2. 完成检查 -----
		const emptyCount = currentBoard.filter((c) => c.type === "note").length;
		if (emptyCount === 0 && checkResult.type === "success") {
			// 创建解节点，传入operation信息
			const node = createNode(parentId, currentBoard, operation, false, true);
			solutionIds.push(node.id);
			return;
		}

		// ----- 3. 创建当前节点（非叶节点），传入operation信息 -----
		const currentNode = createNode(
			parentId,
			currentBoard,
			operation,
			false,
			false,
		);

		// ----- 4. 选择候选最少的空格 -----
		let bestIdx = -1;
		let bestCandidates: number[] = [];
		let minCandidates = 10;

		for (let i = 0; i < currentBoard.length; i++) {
			const cell = currentBoard[i];
			if (cell.type === "note") {
				const candidates = cell.notes;
				if (candidates.length < minCandidates) {
					minCandidates = candidates.length;
					bestIdx = i;
					bestCandidates = candidates;
					if (minCandidates === 1) break;
				}
			}
		}

		if (bestIdx === -1 || bestCandidates.length === 0) {
			return;
		}

		// ----- 5. 尝试每一个候选值 -----

		for (const num of bestCandidates) {
			const newBoard = cloneBoard(currentBoard);

			// 执行赋值
			setValue2(newBoard, bestIdx, num);

			// 递归搜索，传入当前节点ID和本次操作信息
			search(newBoard, currentNode.id, { index: bestIdx, value: num });
		}
	}

	const initialBoard = cloneBoard(board);

	try {
		search(initialBoard);
	} catch (e) {
		console.error(e);
		if (e instanceof maxStepsError) {
			return {
				// biome-ignore lint/style/noNonNullAssertion: 至少创建了一个node，即根节点
				rootId: rootNode!.id,
				nodes,
				solutionIds,
				conflictIds,
				stopBy: "maxSteps",
			};
		}
	}

	const result: SolveResult = {
		// biome-ignore lint/style/noNonNullAssertion: 至少创建了一个node，即根节点
		rootId: rootNode!.id,
		nodes,
		solutionIds,
		conflictIds,
		stopBy: "finish",
	};

	return result;
}

export function findTreePath(
	nodes: Map<number, OperationNode>,
	startId: number,
	endId: number,
) {
	const path: number[] = [];
	let currentId = endId;
	while (currentId !== startId) {
		path.push(currentId);
		const currentNode = nodes.get(currentId);
		if (!currentNode) {
			throw new Error(`节点 ${currentId} 不存在`);
		}
		currentId = currentNode.parentId;
	}
	path.push(startId);
	return path.reverse();
}
