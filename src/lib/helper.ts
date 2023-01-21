import { parse } from 'csv-parse/sync';
import * as gen from 'crossword-layout-generator';

import { Crossword, CrosswordLayout } from './types';
import { CrosswordLayoutWrapper } from './crosswordLayoutWrapper';

export function csvToWordlist(rawCsvString: string): Crossword[] {
  const records: [string, string][] = parse(rawCsvString, {
    columns: false,
    skip_empty_lines: true
  });

  records.sort((a: [string, string], b: [string, string]) => {
    return a[1].length - b[1].length; // sort length of solution in ASC order
  });

  return records.map((cols: [string, string]) => ({
    clue: cols[0],
    answer: cols[1],
  })) as Crossword[];
}

export function jsonToWordlist(rawJsonString: string): Crossword[] {
  return JSON.parse(rawJsonString) as Crossword[];
}

export function wordlistToCrossword(wordlist: Crossword[]): CrosswordLayoutWrapper {
  if (!wordlist.length) {
    throw new Error(
      `Expected a wordlist with at least one entry, instead ${JSON.stringify(wordlist)} was given`
    );
  }
  return new CrosswordLayoutWrapper(gen.generateLayout(wordlist) as CrosswordLayout);
}
