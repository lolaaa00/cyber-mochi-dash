# { "Depends": "py-genlayer:test" }
from genlayer import *
import json

class MochiDashJudge(gl.Contract):
    total_judgments: u64
    second_chances: u64

    def __init__(self):
        self.total_judgments = 0
        self.second_chances = 0

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "total_judgments": int(self.total_judgments),
            "second_chances": int(self.second_chances)
        }

    @gl.public.write
    def judge_collision(self, score: str, speed: str, realm: str) -> str:
        def nondet() -> str:
            prompt = f"""You are Mochi's AI judge on the GenLayer blockchain.

A player just crashed in Cyber Mochi Dash.

Game state at crash:
- Score: {score}
- Speed level: {speed}
- Realm: {realm}

Using Optimistic Democracy consensus, decide if this crash was UNFAIR.

A crash is UNFAIR if:
- The speed was very high (above 1.4) meaning the game was extremely hard
- The score was very high (above 1500) meaning the player was skilled
- The realm was VOID SPACE or LAVA CORE meaning extreme difficulty

A crash is FAIR if:
- The speed was low or medium
- The score was low
- The realm was NEON CITY or CYBER OCEAN

Respond with ONLY valid JSON:
{{"second_chance": true, "reason": "one sentence explanation"}}
or
{{"second_chance": false, "reason": "one sentence explanation"}}"""

            result = gl.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(result)
            return json.dumps({
                "second_chance": parsed["second_chance"],
                "reason": parsed["reason"]
            }, sort_keys=True)

        raw = gl.eq_principle_strict_eq(nondet)
        parsed = json.loads(raw)

        self.total_judgments += 1
        if parsed["second_chance"]:
            self.second_chances += 1

        return json.dumps({
            "second_chance": parsed["second_chance"],
            "reason": parsed["reason"]
        })
