import {afterEach, describe, it} from 'node:test';
import assert                    from 'node:assert/strict';
import {resolveConfig, testArgs} from '../lib/config.mjs';

/**
 * The inputs, and the one piece of argument assembly that is easy to get wrong.
 */

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('INPUT_')) {
      delete process.env[key];
    }
  }
});

describe('resolveConfig', () => {
  it('defaults to Vitest in run mode, installing first', () => {
    const config = resolveConfig();
    assert.equal(config.testCommand, 'npx vitest run');
    assert.equal(config.install, true);
    assert.equal(config.installCommand, 'npm ci');
    assert.equal(config.resultsFile, 'vitest-results.json');
    assert.equal(config.failOnError, true);
    assert.equal(config.section, 'tests');
  });

  it('resolves the results path against the working directory', () => {
    // The runner writes the file relative to where it ran; this process reads
    // it relative to the action's own directory, which is somewhere else.
    process.env.INPUT_WORKING_DIRECTORY = 'packages/api';
    assert.equal(resolveConfig().resultsPath, 'packages/api/vitest-results.json');
  });

  it('leaves an absolute results path alone', () => {
    process.env.INPUT_WORKING_DIRECTORY = 'packages/api';
    process.env.INPUT_RESULTS_FILE = '/tmp/results.json';
    assert.equal(resolveConfig().resultsPath, '/tmp/results.json');
  });

  it('reads the reporting-only shape, where somebody else ran the suite', () => {
    process.env.INPUT_RUN = 'false';
    process.env.INPUT_TEST_OUTCOME = 'failure';
    const config = resolveConfig();
    assert.equal(config.run, false);
    assert.equal(config.testOutcome, 'failure');
  });
});

describe('testArgs', () => {
  const base = {args: [], coverage: false, resultsFile: 'vitest-results.json'};

  it('asks for both reporters, so the job log keeps its human output', () => {
    // `--reporter=json` alone silences the console, and the log is what a
    // reader actually opens.
    assert.deepEqual(testArgs(base), [
      '--reporter=default',
      '--reporter=json',
      '--outputFile=vitest-results.json'
    ]);
  });

  it('keeps the caller\'s own arguments first', () => {
    assert.deepEqual(testArgs({...base, args: ['--project', 'unit']}), [
      '--project',
      'unit',
      '--reporter=default',
      '--reporter=json',
      '--outputFile=vitest-results.json'
    ]);
  });

  it('asks for coverage before the reporters', () => {
    assert.equal(testArgs({...base, coverage: true})[0], '--coverage');
  });

  it('names the results file the caller chose', () => {
    assert.match(testArgs({...base, resultsFile: 'out/v.json'}).at(-1), /--outputFile=out\/v\.json$/);
  });
});
