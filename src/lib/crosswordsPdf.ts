import PDFDocument from 'pdfkit';
import * as fs from 'node:fs';

import { Crossword, CROSSWORD_ORIENTATION } from './types';
import { CrosswordLayoutWrapper } from './crosswordLayoutWrapper';

interface CrosswordsPdfOptions {
  document?: PDFKit.PDFDocumentOptions,
  visibleLetters?: string[],
}

type ColorValue = string | [number, number, number] | [number, number, number, number];

class CrosswordsPdf {

  private doc: PDFKit.PDFDocument;

  constructor(
    private layout: CrosswordLayoutWrapper,
    private options: CrosswordsPdfOptions = {},
  ) {
    this.doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });
    this.doc.font('Helvetica');
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
      .fontSize(6)
      .fill([0,0,0])
      .text(text, x, y, { width });
  }

  private renderLetterBox(
    x: number,
    y: number,
    width: number,
    char: string,
    backgroundColor: ColorValue = [255, 255, 255],
  ): CrosswordsPdf {
    // box background and stroke
    this.doc
      .rect(x, y, width, width)
      .fillAndStroke(backgroundColor, [0, 0, 0])
      .lineWidth(0.25)
      .stroke();

    this.doc
      .fontSize(width * 0.85)
      .fill([0, 0, 0])
      .text(char, x, y + (width * 0.20), { width, align: 'center' });

    return this;
  }

  private renderPosition(
    x: number,
    y: number,
    width: number,
    position: number
  ): CrosswordsPdf {
    this.doc
      .fontSize(Math.round(width * 0.40))
      .fillColor([0,0,0])
      .text(String(position), x, y, { width });
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
    size = 12,
    x = 0,
    y = 0,
  ): CrosswordsPdf {
    x += (word.startx - 1) * size;
    y += (word.starty - 1) * size;

    const chars = Array.from(word.answer.toUpperCase());
    chars.forEach((char, i) => {
      const offset = i * size;
      const letterX = x + (word.orientation == CROSSWORD_ORIENTATION.ACROSS ? offset : 0);
      const letterY = y + (word.orientation == CROSSWORD_ORIENTATION.DOWN ? offset : 0);
      // only show certain letters
      if (!(this.options.visibleLetters || []).includes(char)) {
          char = '';
      }
      // render the first box with a different background color?
      this.renderLetterBox(letterX, letterY, size, char);
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
    padding = 10,
  ): CrosswordsPdf {
    // draw background of boxes canvas size
    this.doc
      .rect(x, y, width, height)
      .fill([250, 250, 250])

    // calculate the size of a single box for a word and use it to render
    // all the words in boxed
    const size = this.calculateBoxSize(width - padding * 2, height - padding * 2);
    this.layout.getWords().forEach(word => this.renderWord(word, size, x + padding, y + padding));
    this.layout.getWords().forEach(word => this.renderWordPosition(word, size, x + padding, y + padding));
    return this;
  }

  private render() {
    const wordlistWidth = 250;
    this.renderWords(wordlistWidth, 10, this.doc.page.width - wordlistWidth - 10, this.doc.page.height - 20, 10);
    this.renderClues(10, 10, wordlistWidth - 20);
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
