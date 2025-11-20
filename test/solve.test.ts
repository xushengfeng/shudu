import { test } from "vitest";
import { mySolver } from "../src/shudu.ts";

const l: { q: string; a: string[] }[] = [
	{
		q: "071068239002490060905030800104856920000000100750020006208600371000017008500000002",
		a: [
			"471568239382491765965732814134856927826974153759123486298645371643217598517389642",
		],
	},
	{
		q: "150000003004000502060070009500706300702004100006010000000320000320008700005000031",
		a: [
			"158249673974863512263175849519786324782934165436512987697321458321458796845697231",
		],
	},
	{
		q: "001500200200001070407060001004700900009600080000894015070000040920000006105000800",
		a: [
			"391547268256381479487962531864715923519623784732894615678159342923478156145236897",
		],
	},
];

test("solve", () => {
	for (const x of l) {
		const l = x.q
			.split("")
			.map((i) => ("1" <= i && i <= "9" ? Number(i) : null));
		const xx = mySolver(l);
		if (xx.board.length !== x.a.length) {
			throw new Error("length not eq");
		}

		console.log(xx.fullLog);

		for (const i of xx.board) {
			if (!x.a.includes(i.join(""))) {
				console.log("fail");
				throw new Error("fail");
			} else {
				console.log("pass", i.join(""));
			}
		}
	}
});
