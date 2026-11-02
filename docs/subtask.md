# Subtask Annotation Definition

## User Prompt

```
Sort all objects into the correct bins using both arms
```

## Pick Subtask

Template:

```
use the <arm> to pick up the <object> on the <cell> from the <bin>
```

| cell         | door handle | silver pipe | L-shaped bent pipe |
| ------------ | ----------- | ----------- | ------------------ |
| upper-left   | use the left arm to pick up the door handle on the upper-left from the blue bin | use the right arm to pick up the silver pipe on the upper-left from the blue bin | use the right arm to pick up the L-shaped bent pipe on the upper-left from the blue bin |
| upper-center | use the left arm to pick up the door handle on the upper-center from the blue bin | use the right arm to pick up the silver pipe on the upper-center from the blue bin | use the right arm to pick up the L-shaped bent pipe on the upper-center from the blue bin |
| upper-right  | use the left arm to pick up the door handle on the upper-right from the blue bin | use the right arm to pick up the silver pipe on the upper-right from the blue bin | use the right arm to pick up the L-shaped bent pipe on the upper-right from the blue bin |
| lower-left   | use the left arm to pick up the door handle on the lower-left from the blue bin | use the right arm to pick up the silver pipe on the lower-left from the blue bin | use the right arm to pick up the L-shaped bent pipe on the lower-left from the blue bin |
| lower-center | use the left arm to pick up the door handle on the lower-center from the blue bin | use the right arm to pick up the silver pipe on the lower-center from the blue bin | use the right arm to pick up the L-shaped bent pipe on the lower-center from the blue bin |
| lower-right  | use the left arm to pick up the door handle on the lower-right from the blue bin | use the right arm to pick up the silver pipe on the lower-right from the blue bin | use the right arm to pick up the L-shaped bent pipe on the lower-right from the blue bin |

Insert a layer word when objects are stacked:

```
use the right arm to pick up the top silver pipe on the upper-right from the blue bin
use the right arm to pick up the bottom silver pipe on the upper-right from the blue bin
```

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
