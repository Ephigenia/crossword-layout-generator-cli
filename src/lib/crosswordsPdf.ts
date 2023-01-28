import PDFDocument from 'pdfkit';
import * as fs from 'node:fs';

import { Crossword, CROSSWORD_ORIENTATION } from './types';
import { CrosswordLayoutWrapper } from './crosswordLayoutWrapper';

interface CrosswordsPdfOptions {
  document?: PDFKit.PDFDocumentOptions,
  visibleLetters?: string[],
  solution?: string,
}

type ColorValue = string | [number, number, number] | [number, number, number, number];

class CrosswordsPdf {

  private doc: PDFKit.PDFDocument;

  private solution: { position: number, char: string }[] = [];

  constructor(
    private layout: CrosswordLayoutWrapper,
    private options: CrosswordsPdfOptions = {},
  ) {
    this.doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 15, left: 15, right: 15, bottom: 15 },
    });
    this.doc.font('Helvetica');
    if (options.solution) {
      this.solution = Array.from(options.solution.toUpperCase()).map((char, i) => ({
        position: i + 1,
        char: char,
      }));
    }
  }

  private renderClues(
    x: number,
    y: number,
    width: number,
  ) {
    const accross = this.layout.getWords(CROSSWORD_ORIENTATION.ACROSS).sort((a, b) => a.position - b.position);
    const down = this.layout.getWords(CROSSWORD_ORIENTATION.DOWN).sort((a, b) => a.position - b.position);
    const text = [
      'horizontal:',
      ...accross.map(word => `${word.position}. ${word.clue}`),
      '',
      'vertical:',
      ...down.map(word => `${word.position}. ${word.clue}`),
    ].join('\n');

    this.doc
      .fontSize(5.9)
      .fill([0, 0, 0])
      .text(text, x, y, { width });
  }

  private renderLetterBox(
    x: number,
    y: number,
    width: number,
    char = ''
  ): CrosswordsPdf {
    // box
    this.doc
      .rect(x, y, width, width)
      .lineWidth(0.25)
      .stroke([0, 0, 0]);

    // draw the letter
    if (char) {
      this.doc
        .fontSize(width * 0.85)
        .fill([0, 0, 0])
        .text(char, x, y + (width * 0.20), { width, align: 'center' });
    }
    return this;
  }

  private renderPosition(
    x: number,
    y: number,
    width: number,
    position: number | string,
    color: ColorValue = [0, 0, 0],
  ): CrosswordsPdf {
    const fontSize = width * 0.45;
    this.doc
      .fontSize(fontSize)
      .fillColor(color)
      .text(String(position), x, y, { width });
    return this;
  }

  private renderSolutionPosition(
    x: number,
    y: number,
    width: number,
    position: number | string,
    color: ColorValue = [255, 0, 0],
  ) {
    this.doc
      .circle(x + width / 2, y + width / 2, width / 2.1)
      .stroke(color);
    const fontSize = width * 0.45;
    this.doc
      .fontSize(fontSize)
      .fillColor(color)
      .text(String(position), x, y + width - fontSize, { width: width - 1, align: 'right' });
    return this;
  }

  private renderWordPosition(
    word: Crossword,
    size = 12,
    x = 0,
    y = 0,
  ): CrosswordsPdf {
    x += (word.startx - 1) * size;
    y += (word.starty - 1) * size;
    this.renderPosition(x + 0.5, y + 0.5, size, word.position);
    return this;
  }

  private renderWord(
    word: Crossword,
    boxSize = 12,
    x = 0,
    y = 0,
  ): CrosswordsPdf {
    x += (word.startx - 1) * boxSize;
    y += (word.starty - 1) * boxSize;

    let solutionShown = false;

    const chars = Array.from(word.answer.toUpperCase());
    chars.forEach((char, i) => {
      const offset = i * boxSize;
      const letterX = x + (word.orientation == CROSSWORD_ORIENTATION.ACROSS ? offset : 0);
      const letterY = y + (word.orientation == CROSSWORD_ORIENTATION.DOWN ? offset : 0);
      let displayedChar = char;
      // only show certain letters
      if (!(this.options.visibleLetters || []).includes(char)) {
        displayedChar = '';
      }

      const solutionCharIndex = this.solution.findIndex(s => s.char === char);
      if (solutionCharIndex === -1 || solutionShown && i > 0) {
        this.renderLetterBox(letterX, letterY, boxSize, displayedChar);
      } else {
        const solutionChar = this.solution[solutionCharIndex];
        this.solution.splice(solutionCharIndex, 1);
        this.renderLetterBox(letterX, letterY, boxSize, displayedChar);
        this.renderSolutionPosition(letterX, letterY, boxSize, solutionChar.position, [255, 0, 0]);
        solutionShown = true;
      }
    });

    return this;
  }

  /** calculates the best box size for the given crossword box canvas area */
  private calculateBoxSize(
    width: number,
    height: number,
  ): number {
    return Math.min(width / this.layout.getCols(), height / this.layout.getRows());
  }

  private renderWords(
    x = 0,
    y = 0,
    width: number,
    height: number,
  ): CrosswordsPdf {
    const solution = [ ...this.solution ];

    // calculate the size of a single box for a word and use it to render
    // all the words in boxed
    const size = this.calculateBoxSize(width, height);
    this.layout.getWords().forEach(word => this.renderWord(word, size, x, y));
    this.layout.getWords().forEach(word => this.renderWordPosition(word, size, x, y));

    this.renderSolution(solution, x, this.doc.page.height - 40, size);
    return this;
  }

  private renderSolution(solution, x: number, y: number, size: number) {
    // render the solution
    solution.forEach(w => {
      const xx = x + (w.position - 1) * size;
      this.renderLetterBox(xx, y, size, '');
      this.renderPosition(xx + 1, y + 0.5, size, w.position, [255, 0, 0]);
      this.doc
        .lineWidth(1)
        .moveTo(xx, y + size)
        .lineTo(xx + size, y + size)
        .stroke([0, 0, 0]);
    });
    this.doc
      .fill([0, 0, 0])
      .text('Lösungswort', x, y - 8);
  }

  private render() {
    const wordlistWidth = 170;
    this.renderWords(wordlistWidth, 10, this.doc.page.width - wordlistWidth - 10, this.doc.page.height - 20);
    this.renderClues(10, 10, wordlistWidth - 20);
    // check if solution is empty, if not show an error that not all letters
    // from the solution could be used
    if (this.solution.length > 0) {
      throw new Error(`The letters from the solution where not able to be marked in all the crosswords answers.`);
    }
    return this;
  }

  async write(filename: string): Promise<CrosswordsPdf> {
    this.doc.pipe(fs.createWriteStream(filename));
    this.render();
    await this.doc.end();
    return this;
  }

  async getContent(): Promise<Buffer> {
    return new Promise((resolve) => {
      const buffers = [];
      this.doc.on('data', buffers.push.bind(buffers));
      this.doc.on('end', () => resolve(Buffer.concat(buffers)));
      this.render();
      this.doc.end();
    });
  }
}


export { CrosswordsPdf };
