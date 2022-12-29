
export enum CROSSWORD_ORIENTATION {
  DOWN = 'down',
  ACROSS = 'across',
  NONE = 'none',
}

export interface Crossword {
  answer: string;
  clue: string;
  orientation: CROSSWORD_ORIENTATION,
  position: number;
  startx: number;
  starty: number;
}

export interface CrosswordLayout {
  table: string[][],
  result: Crossword[],
  rows: number,
  cols: number,
  table_string: string,
}
