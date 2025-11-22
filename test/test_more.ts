import { mySolver2 } from "../src/shudu.ts";

const hardPuzzle = [
	"puzzles3_magictour_top1465",
	"puzzles4_forum_hardest_1905",
	"puzzles6_forum_hardest_1106",
	"01_file1.txt",
];

// https://huggingface.co/datasets/sapientinc/sudoku-extreme
const file = "test/test.csv";

const results: { step: number; try: number; line: number }[] = [];

const f = Deno.readTextFileSync(file);
const lines = f
	.split("\n")
	.map((l, i) => [i + 1, l] as [number, string])
	.slice(1)
	.filter((i) => i[1].trim())
	.filter((line) => hardPuzzle.some((p) => line[1].includes(p)))
	.slice(0, 1000);
let bc = 0;
const startTime = performance.now();
let caseCount = 0;
let okCount = 0;
for (const line of lines) {
	const [_, q, aStr] = line[1].split(",");
	const l = q.split("").map((i) => ("1" <= i && i <= "9" ? Number(i) : null));
	const xx = mySolver2(l);
	bc += xx.branchCount;
	if (xx.board.length === 0) {
		console.log("no solution:", q);
		continue;
	}
	if (xx.board[0].join("") !== aStr) {
		console.log(
			"wrong solution:",
			q,
			"expect:",
			aStr,
			"got:",
			xx.board[0].join(""),
		);
	} else okCount++;
	caseCount++;
	console.log(caseCount / lines.length, xx.fullLog.length, line[0]);
	results.push({ step: xx.fullLog.length, try: xx.branchCount, line: line[0] });
}
const endTime = performance.now();
console.log(
	bc / lines.length,
	(endTime - startTime) / lines.length,
	okCount / lines.length,
);

Deno.writeTextFileSync(
	`test/test_more_result${Date.now()}.csv`,
	"step,try,line\n" +
		results.map((i) => `${i.step},${i.try},${i.line}`).join("\n"),
);
