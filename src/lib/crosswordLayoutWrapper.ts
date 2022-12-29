import { Crossword, CrosswordLayout, CROSSWORD_ORIENTATION } from "./types";

export class CrosswordLayoutWrapper {
  constructor(private layout: CrosswordLayout) {}

  toString(): string {
    return this.layout.table.map(l => l.join('')).join('\n');
  }

  getWords(orientation: CROSSWORD_ORIENTATION|undefined = undefined): Crossword[] {
    if (typeof orientation !== 'undefined') return this.layout.result.filter(word => word.orientation === orientation);
    return this.layout.result;
  }

  /** returns the number of lines in the table */
  getRows(): number {
    return Math.max(...this.getWords(CROSSWORD_ORIENTATION.DOWN)
      .map(w => w.starty + w.answer.length - 1));
  }

  /** returns the number of columns in the table */
  getCols(): number {
    return Math.max(...this.getWords(CROSSWORD_ORIENTATION.ACROSS)
      .map(w => w.startx + w.answer.length - 1));
  }
}
