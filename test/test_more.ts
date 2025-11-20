import { mySolver } from "../src/shudu.ts";

const hardPuzzle = [
	"puzzles3_magictour_top1465",
	"puzzles4_forum_hardest_1905",
	"puzzles6_forum_hardest_1106",
	"01_file1.txt",
];

// https://huggingface.co/datasets/sapientinc/sudoku-extreme
const file = "test/test.csv";

const f = Deno.readTextFileSync(file);
const lines = f
	.split("\n")
	.slice(1)
	.filter((i) => i.trim())
	.filter((line) => hardPuzzle.some((p) => line.includes(p)))
	.slice(0, 1000);
let bc = 0;
const startTime = performance.now();
let caseCount = 0;
let okCount = 0;
for (const line of lines) {
	const [_, q, aStr] = line.split(",");
	const l = q.split("").map((i) => ("1" <= i && i <= "9" ? Number(i) : null));
	const xx = mySolver(l);
	bc += xx.brunchCount;
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
	console.log(caseCount / lines.length);
}
const endTime = performance.now();
console.log(
	bc / lines.length,
	(endTime - startTime) / lines.length,
	okCount / lines.length,
);
