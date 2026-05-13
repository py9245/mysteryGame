# Case Generation Prompt

## Role

Generate a single solvable Mystery Time case in the style of a Korean social deduction/mystery round.

Use these structural references:
- Spy reversal: an ordinary commute/death setup hides a foreign spy, dead drop, political assassination, exposure, and suicide order.
- Mistaken relationship reversal: an ordinary special-day meeting hides a twin substitute, cheating, allergy, and delayed rescue.

## Required fields

- title
- publicDescription
- question
- truth
- requiredKeywords
- bonusKeywords
- acceptedAnswerSummary
- hints

## Constraints

- The answer must converge to one outcome.
- The case must be testable by humans.
- The public description should be two short Korean sentences: ordinary surface + strange result.
- The truth must connect culprit/person, method, motive, and decisive clue.
- Required keywords must be concrete enough for answer judging.
- Hints must progress from weak to medium to strong, exactly three hints.
- The image prompt must show only the aftermath scene and visible clue props, never the culprit or the exact act.
