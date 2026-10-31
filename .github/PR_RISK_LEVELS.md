# PR risk levels

Use this table to find the `Risk` level in the pull request template.
Examine each dimension. The highest level of all the dimensions is the level of the PR.
Add the label `risk: <level>` to the PR.

| Dimension        | low                                            | medium                                                     | high                                                                               | critical                                                                       |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **data**         | No schema change.                              | A migration adds a table, an index or a nullable column.   | A migration changes a column or moves data.                                        | A migration drops or renames a column or a table that has data.                |
| **API contract** | No change to a request or a response.          | A new endpoint or a new optional field.                    | A change to the shape or the status codes of an existing endpoint.                 | A client in production does not work after the deploy.                         |
| **lifecycle**    | No change to queues, workers or cron.          | A new queue, worker or cron job.                           | A change to an existing job: retries, timing, the order of steps.                  | A job can run twice or not at all, with an effect that a user can see.         |
| **security**     | No change to auth, secrets or input checks.    | A new route that uses the existing auth.                   | A change to auth, permissions, rate limits, CORS or input validation.              | A change to how the app stores or compares secrets, tokens or passwords.       |
| **integrations** | No new external call.                          | A new optional provider, a new dependency or env variable. | A change to the calls to an existing provider in production.                       | A call that deletes data, sends messages or takes money in an external system. |
| **code**         | Docs, tests, tooling or a refactor with tests. | New code with unit tests.                                  | A change to how existing shared code works: `src/lib`, `src/plugins`, `src/types`. | None.                                                                          |

## Rollback

A PR with the level `high` or `critical` must have "Rollback:" in section 5. Write:

1. The steps to undo the change: revert the PR, remove the env variable, stop the job.
2. The effects that a revert cannot undo: an applied migration, sent emails, deleted files, jobs in the queue.
3. The order of the steps, when the database and the code must change in a fixed order.
