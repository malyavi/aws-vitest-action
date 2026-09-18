import {readFileSync}                                      from 'node:fs';
import {describe, it}                                       from 'node:test';
import assert                                               from 'node:assert/strict';
import {renderComment, renderMissingResults, renderSummary} from '../lib/report.mjs';

/**
 * What a reader is told.
 */

const load = (name) => JSON.parse(readFileSync(`test/fixtures/${name}.json`, 'utf8'));
const options = {label: 'Tests', maxListed: 10, cwd: '/home/runner/work/repo/repo'};

describe('renderComment', () => {
  it('is one line for a passing run', () => {
    const comment = renderComment(load('passed'), options);
    assert.equal(comment, ':white_check_mark: **Tests passed**: 11 passed · 2 files · 1 skipped · 2.4s');
  });

  it('names the failed tests and points at the log for the detail', () => {
    const comment = renderComment(load('failed'), options);
    assert.match(comment, /^:x: \*\*Tests failed\*\*: 2 of 5 tests failed/);
    assert.match(comment, /- `test\/app\/handlers\/orders\.test\.ts` — handleOrder marks every answer it gives itself/);
    assert.match(comment, /"Tests" job log/);
  });

  it('keeps the failure messages out of the comment, where they would drown it', () => {
    assert.equal(renderComment(load('failed'), options).includes('Exceeded timeout'), false);
  });

  it('counts files in the headline rather than the suite total', () => {
    assert.match(renderComment(load('passed'), options), /2 files/);
  });

  it('caps the list and says how many it left out', () => {
    const comment = renderComment(load('failed'), {...options, maxListed: 1});
    assert.equal(comment.match(/^- `/gm).length, 1);
    assert.match(comment, /…and 1 more/);
  });

  it('takes the label from the caller, so the comment names the job a reader can open', () => {
    assert.match(renderComment(load('passed'), {...options, label: 'Checks'}), /\*\*Checks passed\*\*/);
  });
});

describe('renderSummary', () => {
  it('carries every failure message, which is what the comment left out', () => {
    const summary = renderSummary(load('failed'), options);
    assert.match(summary, /^## :x: Tests failed/);
    assert.match(summary, /### `test\/app\/handlers\/orders\.test\.ts` — handleOrder parks the body and answers 202/);
    assert.match(summary, /Exceeded timeout of 5000 ms/);
  });

  it('is a heading alone for a passing run', () => {
    assert.equal(
      renderSummary(load('passed'), options),
      '## :white_check_mark: Tests passed (11 passed · 2 files · 1 skipped · 2.4s)'
    );
  });
});

describe('renderMissingResults', () => {
  it('says where the file was expected and which log to read', () => {
    const comment = renderMissingResults({label: 'Tests', outcome: 'failure', path: 'vitest-results.json'});
    assert.match(comment, /produced no results file \(test step outcome: `failure`\)/);
    assert.match(comment, /`vitest-results\.json`/);
    assert.match(comment, /"Tests" job log/);
  });

  it('does not blame the test step when that step passed', () => {
    // A green run with no results file is a reporting configuration problem,
    // and saying "outcome: success" in the same breath reads as nonsense.
    const comment = renderMissingResults({label: 'Tests', outcome: 'success', path: 'x.json'});
    assert.match(comment, /produced no results file\./);
    assert.equal(comment.includes('outcome'), false);
  });
});
