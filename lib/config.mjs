import {isAbsolute, join}                                       from 'node:path';
import {argsInput, booleanInput, input, intInput}                from './inputs.mjs';

/**
 * The action's inputs, resolved into one object.
 *
 * The shape worth noticing is `run`: this action both runs a suite and reports
 * one, and those are separable. A caller whose runner takes flags nothing here
 * predicts can run it themselves and hand over the results file, which is what
 * `run: false` is for.
 */

/**
 * Resolves every input.
 *
 * @return {{
 *   run: boolean,
 *   install: boolean,
 *   installCommand: string,
 *   testCommand: string,
 *   args: string[],
 *   coverage: boolean,
 *   resultsFile: string,
 *   resultsPath: string,
 *   testOutcome: string,
 *   failOnError: boolean,
 *   label: string,
 *   maxListed: number,
 *   section: string,
 *   cwd: string
 * }} Resolved configuration
 */
export function resolveConfig() {
  const cwd = input('working-directory', '.');
  const resultsFile = input('results-file', 'vitest-results.json');

  return {
    run: booleanInput('run', true),
    install: booleanInput('install', true),
    installCommand: input('install-command', 'npm ci'),
    testCommand: input('test-command', 'npx vitest run'),
    args: argsInput('args'),
    coverage: booleanInput('coverage', false),
    resultsFile,
    resultsPath: isAbsolute(resultsFile) || cwd === '.' ? resultsFile : join(cwd, resultsFile),
    testOutcome: input('test-outcome', 'unknown'),
    failOnError: booleanInput('fail-on-error', true),
    label: input('label', 'Tests'),
    maxListed: intInput('max-failures-listed', 10),
    section: input('comment-section', 'tests'),
    cwd
  };
}

/**
 * The arguments the runner is called with.
 *
 * Both reporters, not just the JSON one: `--reporter=json` alone silences the
 * console, so the job log loses the output a reader actually opens it for.
 * Asking for `default` as well leaves the human reporter on stdout while the
 * numbers land in the file.
 *
 * @param {{ args: string[], coverage: boolean, resultsFile: string }} config Resolved configuration
 * @return {string[]} Arguments after the command itself
 */
export function testArgs(config) {
  const reporting = [
    '--reporter=default',
    '--reporter=json',
    `--outputFile=${config.resultsFile}`
  ];
  if (config.coverage) {
    reporting.unshift('--coverage');
  }
  return [...config.args, ...reporting];
}
