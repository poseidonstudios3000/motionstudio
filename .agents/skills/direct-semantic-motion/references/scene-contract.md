# Scene contract

Use this logical shape; adapt field names to the repository''s canonical types.

```ts
type SemanticCue = {
  entityId: string;
  startSeconds: number;
  endSeconds: number;
  emphasis: "enter" | "focus" | "exit";
};

type DirectedScene = {
  startSeconds: number;
  endSeconds: number;
  evidence: string;
  intent: string;
  visualKind: string;
  metaphor?: string;
  entities: Array<{
    id: string;
    type: "country" | "brand" | "person" | "place" | "metric" | "platform" | "generic";
    label: string;
    evidence: string;
    assetId?: string;
  }>;
  cues: SemanticCue[];
  uncertainties: string[];
  rationale: string;
};
```

## Worked example

Transcript: “Who will win the AI race? The US, China, or another country?”

Direction:

- “AI race” supports an editorial robot-race metaphor.
- “US” supports a US flag badge and a US-labeled robot.
- “China” supports a China flag badge and a China-labeled robot.
- “another country” supports one neutral unlabeled robot with a globe or question mark.
- Each competitor enters or receives focus only when its phrase is spoken.
- Do not assign a third country, winner, speed, ranking, or probability.
- Keep a small editorial label such as “visual metaphor” if the treatment could be mistaken for a factual simulation.

Negative example: adding EU, India, or Russia because they are plausible AI competitors. They were not spoken.
