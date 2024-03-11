import * as core from '@actions/core';

async function run(): Promise<void> {
  const url = core.getInput("url", { required: true })
  const token = core.getInput("token", { required: true })
  const projectId = core.getInput("project-id", { required: true })
  const title = core.getInput("title", { required: true })

  let headers = {
    "Content-Type": "application/json",
    "Accept-Encoding": "deflate, gzip",
    Authorization: "Bearer " + token,
  };

  // TODO: Use search API instead
  // const searchRequest = {
  //   filter: "status == \"OPEN\"",
  //   query: title,
  // };

  // const searchIssue = await fetch(`${url}/v1/projects/${projectId}/issues:search&query=${title}`, {
  //   method: "GET",
  //   headers,
  // });
  // const searchedIssueData = await searchIssue.json();
  // if (searchedIssueData.message) {
  //   throw new Error(searchedIssueData.message);
  // }

  const issueRes = await fetch(`${url}/v1/projects/${projectId}/issues`, {
    method: "GET",
    headers,
  });

  const issueData = await issueRes.json();
  if (issueData.message) {
    throw new Error(issueData.message);
  }

  let filtered = issueData.issues.filter((issue: { title: string }) => issue.title === title);
  if (filtered.length ==0) {
    core.info("No issue found for title" + title)
    return
  }

  // Sample issue
  // {
  //   "name": "projects/example/issues/129",
  //   "uid": "129",
  //   "title": "[bytebase/ci-example#6] chore: add migration files",
  //   "description": "Triggered by https://github.com/bytebase/ci-example/pull/6 chore: add migration files",
  //   "type": "DATABASE_CHANGE",
  //   "status": "OPEN",
  //   "assignee": "",
  //   "assigneeAttention": false,
  //   "approvers": [
  //     {
  //       "status": "APPROVED",
  //       "principal": "users/ci@service.bytebase.com"
  //     }
  //   ],
  //   "approvalTemplates": [
  //     {
  //       "flow": {
  //         "steps": [
  //           {
  //             "type": "ANY",
  //             "nodes": [
  //               {
  //                 "type": "ANY_IN_GROUP",
  //                 "role": "roles/ci-approver-gmul"
  //               }
  //             ]
  //           }
  //         ]
  //       },
  //       "title": "CI Approval Flow",
  //       "description": "CI call API to approve",
  //       "creator": ""
  //     }
  //   ],
  //   "approvalFindingDone": true,
  //   "approvalFindingError": "",
  //   "subscribers": [],
  //   "creator": "users/ci@service.bytebase.com",
  //   "createTime": "2024-03-10T17:24:48Z",
  //   "updateTime": "2024-03-10T17:42:34Z",
  //   "plan": "projects/example/plans/132",
  //   "rollout": "projects/example/rollouts/122",
  //   "grantRequest": null,
  //   "releasers": [
  //     "roles/projectOwner",
  //     "users/ci@service.bytebase.com"
  //   ],
  //   "riskLevel": "RISK_LEVEL_UNSPECIFIED",
  //   "taskStatusCount": {
  //     "NOT_STARTED": 2
  //   }
  // }
  let issue;
  if (filtered.length >1) {
    core.warning("Found multiple issues for title " + title + ". Use the latest one \n" + JSON.stringify(filtered, null, 2))
    issue = filtered.reduce((prev : any, current : any) => {
      return new Date(prev.createTime) > new Date(current.createTime) ? prev : current;
    });
  } else {
    core.info("Issue found for title" + title)
    issue = filtered[0]
  }

  core.info("Issue:\n" + JSON.stringify(issue, null, 2))
  core.setOutput('issue', issue);

  // Sample rollout. A rollout contains each task status
  // {
  //   "name": "projects/example/rollouts/122",
  //   "uid": "122",
  //   "plan": "",
  //   "title": "Rollout Pipeline",
  //   "stages": [
  //     {
  //       "name": "projects/example/rollouts/122/stages/123",
  //       "uid": "123",
  //       "environment": "environments/prod",
  //       "title": "Prod Stage",
  //       "tasks": [
  //         {
  //           "name": "projects/example/rollouts/122/stages/123/tasks/137",
  //           "uid": "137",
  //           "title": "DDL(schema) for database \"example\"",
  //           "specId": "b930f84c-6728-4145-818b-14d562ec0bc8",
  //           "status": "NOT_STARTED",
  //           "skippedReason": "",
  //           "type": "DATABASE_SCHEMA_UPDATE",
  //           "blockedByTasks": [],
  //           "target": "instances/prod-instance/databases/example",
  //           "databaseSchemaUpdate": {
  //             "sheet": "projects/example/sheets/251",
  //             "schemaVersion": "20240310172448"
  //           }
  //         },
  //         {
  //           "name": "projects/example/rollouts/122/stages/123/tasks/138",
  //           "uid": "138",
  //           "title": "DDL(schema) for database \"example\"",
  //           "specId": "8bec113c-1ae2-44e9-a85a-16b0844f7b9b",
  //           "status": "NOT_STARTED",
  //           "skippedReason": "",
  //           "type": "DATABASE_SCHEMA_UPDATE",
  //           "blockedByTasks": [],
  //           "target": "instances/prod-instance/databases/example",
  //           "databaseSchemaUpdate": {
  //             "sheet": "projects/example/sheets/252",
  //             "schemaVersion": "20240310172448"
  //           }
  //         }
  //       ]
  //     }
  //   ]
  // }
  if (issue.rollout) {
    const components = issue.rollout.split("/");
    const rolloutUid = components[components.length - 1];
    const rolloutRes = await fetch(`${url}/v1/projects/${projectId}/rollouts/${rolloutUid}`, {
      method: "GET",
      headers,
    });
    const rolloutData = await rolloutRes.json();
    if (rolloutData.message) {
      throw new Error(rolloutData.message);
    }
    core.info("Rollout:\n" + JSON.stringify(rolloutData, null, 2))
    core.setOutput('rollout', rolloutData);
  }
  
  const issueURL = `${url}/projects/${projectId}/issues/${issue.uid}`
  core.info("Visit " + issueURL)
}

run();
