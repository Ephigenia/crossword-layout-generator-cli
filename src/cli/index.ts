import * as fs from 'node:fs';
import { Argument, Command, Option } from 'commander';
import { BIN_NAME } from './constants';
import { csvToWordlist, jsonToWordlist, wordlistToCrossword } from '../lib/helper';
import { CrosswordsPdf } from '../lib/crosswordsPdf';
import { Crossword } from '../lib/types';

const program = new Command();

interface ProgramOptions {
  letters: string[],
}

program
  .addOption((
    new Option(
      '--letters [letters...]',
      'specify the letters that should be shown',
    ).default([])
  ))
  .addArgument(new Argument('<inputFormat>', 'input file format'))
  .addArgument(new Argument('<outputFormat>', 'output file format'))
  .addHelpText(
  'after', `
Examples:

    show only certain letters
      ${BIN_NAME} json pdf --letters A E I O U

    // TODO mark general solution words

    ${BIN_NAME} json pdf

    ${BIN_NAME} csv txt

    ${BIN_NAME} csv json

    ${BIN_NAME} csv pdf
  `,
  )
  .action(run)
  .parseAsync();

async function run(
  inputFileFormat: 'csv' | 'json' = 'csv',
  outputFileFormat: 'pdf' | 'txt' | 'json' = 'txt',
) {
  const opts = program.opts<ProgramOptions>();

  // get input from stdin when available - if not throw an error
  if (process.stdin.isTTY) {
    throw new Error(`Expected program to receive wordlist in CSV format into stdin`);
  }

  const rawStdInput = fs.readFileSync(0).toString();
  let wordlist:Crossword[];
  if (inputFileFormat === 'csv') {
    wordlist = csvToWordlist(rawStdInput);
  } else {
    wordlist = jsonToWordlist(rawStdInput);
  }

  const layout = wordlistToCrossword(wordlist);

  // decide over the output method
  switch (outputFileFormat) {
    case 'txt':
      process.stdout.write(layout.toString());
      break;
    case 'json':
      process.stdout.write(JSON.stringify(layout.getWords()));
      break;
    case 'pdf':
      const pdf = new CrosswordsPdf(layout, {
        visibleLetters: opts.letters,
      });
      const binary = await pdf.getContent();
      process.stdout.write(binary);
      break;
  }
}
