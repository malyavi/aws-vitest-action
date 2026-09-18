# aws-vitest-action

Runs a [Vitest](https://vitest.dev/) suite and reports it — as the job's
verdict, as a section of a shared pull request comment, and as the job summary.

Written for TypeScript services on Node, but there is nothing AWS-specific in
it: any repository whose tests run under Vitest can use it.

```yaml
- uses: actions/checkout@v7

- uses: actions/setup-node@v7
  with:
    node-version: 'lts/*'
    cache: npm

- uses: malyavi/aws-vitest-action@v1
```

## Why an action rather than one `run:` step

The numbers come from Vitest's own JSON report rather than from scraping its
console output, which buys three things:

- **The job log stays readable.** Both reporters are asked for — `default` *and*
  `json` — because `--reporter=json` alone silences the console, and the log is
  what a reader actually opens.
- **A file that never ran is still reported.** A failed import fails a run with
  *zero* failed assertions. Reading the aggregate's `success` flag rather than
  counting failures is what stops that being reported as a pass, and lifting the
  file's own `message` is what puts the cause in the summary.
- **A failing suite is reported before it fails the job.** Vitest's exit code is
  caught, the report is written, and the failure is re-raised afterwards.
  Reversing that order is how a red run ends up with an empty comment.

## Files, not suites

`numTotalTestSuites` counts every `describe` as well as every file, so a run of
35 files reports as 140 suites — a number nobody recognises from their own
repository. This action counts test **files**, and the `files` output says so.

## Reporting a run this action did not launch

A matrix shard, a workspace loop, a coverage pass with flags this action does not
predict: run it yourself and hand over the results file.

```yaml
- name: Run the suite
  id: suite
  continue-on-error: true
  run: npx vitest run --shard=1/2 --reporter=default --reporter=json --outputFile=vitest-results.json

- uses: malyavi/aws-vitest-action@v1
  with:
    run: 'false'
    results-file: vitest-results.json
    test-outcome: ${{ steps.suite.outcome }}
```

`test-outcome` is only used to explain a *missing* results file: "produced no
results file (test step outcome: `failure`)" is actionable, and "produced no
results file" alone is not.

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `run` | `true` | Whether to run the suite. Off reports an existing results file. |
| `test-command` | `npx vitest run` | The command that runs the suite, without its reporting flags. |
| `args` | — | Extra arguments for it, for example `--project unit`. |
| `coverage` | `false` | Whether to collect coverage. |
| `results-file` | `vitest-results.json` | Where the runner writes its JSON report. |
| `test-outcome` | `unknown` | With `run: false`, the outcome of your own test step. |
| `install` | `true` | Whether to install dependencies first. |
| `install-command` | `npm ci` | How to install them. |
| `fail-on-error` | `true` | Whether a failing suite fails the run. |
| `max-failures-listed` | `10` | Failed tests named in the comment before collapsing into a count. |
| `label` | `Tests` | How the check names itself. Set it to the job's name. |
| `working-directory` | `.` | For a package that is not at the repository root. |
| `comment` | `true` | Whether to write the pull request comment at all. |
| `comment-section` | `tests` | The section of the shared comment this action owns. |
| `comment-tag` | `<!-- pr-status-comment -->` | Identifies the shared comment; give every action reporting into one the same tag. |
| `comment-section-order` | — | Fixed rendering order for the sections, comma-separated. |
| `pr-number` | from the event | The pull request to comment on. |
| `github-token` | `github.token` | Used to read and write the comment. |

## Outputs

| Output | What it holds |
| --- | --- |
| `outcome` | `passed` or `failed`. |
| `tests-passed`, `tests-failed`, `tests-total`, `tests-skipped` | Counts from the run. |
| `files` | Test files the run covered. |
| `results-path` | The JSON report, for a later step to upload as an artifact. |

## Alongside lint and types

This action runs the tests and nothing else; lint and type checks stay the
caller's own steps, where their output belongs to the job that owns them:

```yaml
- run: npm ci
- run: npm run lint
- run: npm run typecheck
- uses: malyavi/aws-vitest-action@v1
  with:
    install: 'false'
```

## Development

```bash
npm test                           # unit suite, no dependencies
python3 test/check-action-yaml.py  # action.yml parses and maps every input
```

The suite runs against real Vitest report fixtures, including a crashed-file one
and one whose `numTotalTestSuites` deliberately disagrees with its file count.
The smoke job runs the action against an actual two-test Vitest project, because
nothing else proves the reporters reach the runner.
