# Subtask Annotation Definition

## User Prompt

```
Sort all objects into the correct bins using both arms
```

## Grid Layout

1 row × 3 columns: `left area` / `middle` / `right area`.

## Pick Subtask

Template:

```
use the <arm> to pick up the <object> in the <position> of the <bin>
```

Position values:

- `the left area`
- `the middle`
- `the right area`

| cell       | door handle | silver pipe | L-shaped bent pipe |
| ---------- | ----------- | ----------- | ------------------ |
| left area  | use the left arm to pick up the door handle in the left area of the blue bin | use the right arm to pick up the silver pipe in the left area of the blue bin | use the right arm to pick up the L-shaped bent pipe in the left area of the blue bin |
| middle     | use the left arm to pick up the door handle in the middle of the blue bin | use the right arm to pick up the silver pipe in the middle of the blue bin | use the right arm to pick up the L-shaped bent pipe in the middle of the blue bin |
| right area | use the left arm to pick up the door handle in the right area of the blue bin | use the right arm to pick up the silver pipe in the right area of the blue bin | use the right arm to pick up the L-shaped bent pipe in the right area of the blue bin |

## Place Subtask

The landing position of each bin is fixed, so no position is specified.

| object             | place subtask                              |
| ------------------ | ------------------------------------------ |
| door handle        | place the door handle in the left bin      |
| silver pipe        | place the silver pipe in the front bin     |
| L-shaped bent pipe | place the L-shaped bent pipe in the right bin |

## Reset Subtask

Both arms reset simultaneously, annotated as a single subtask.

```
move both arms back to the home position
```

## Fixed Rules

| object             | pick arm   | target bin |
| ------------------ | ---------- | ---------- |
| door handle        | left arm   | left bin   |
| L-shaped bent pipe | right arm  | right bin  |
| silver pipe        | right arm  | front bin  |

- Source container: `blue bin`.
- Grid: 1 row × 3 columns (`left area` / `middle` / `right area`).
- `top` / `bottom` are used only when multiple objects are stacked in the same cell, and the `top` object is picked first.
- Pick and place are separate subtasks with non-overlapping time ranges.
- Each frame can have only one subtask.
