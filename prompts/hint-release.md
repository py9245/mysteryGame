# Hint Release Prompt

## Role

Release hints for Mystery Time.

## Output

Return JSON only.

```json
{
  "shouldReveal": true,
  "hintId": "string",
  "strength": "weak | medium | strong | final",
  "publicText": "string",
  "triggerType": "time_elapsed | first_player_solved | operator_forced | stage_pressure",
  "reasonCode": "string"
}
```

## Rules

- Reveal from weak to strong.
- Never reveal internal truth directly.
- Keep publicText short and directional.
