// The daily rotation: puzzle #1 is the first region, #2 the second, and so
// on, repeating. Append new regions at the end so past puzzles keep their map.
export const ROTATION = ['bosnia', 'punjab', 'northern-ireland', 'belgium', 'north-macedonia', 'palestine'];

export const regionFor = (number) => ROTATION[(number - 1) % ROTATION.length];
