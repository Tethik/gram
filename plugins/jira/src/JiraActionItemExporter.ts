import { ActionItemExporter } from "@gram/core/dist/action-items/ActionItemExporter.js";
import { DataAccessLayer } from "@gram/core/dist/data/dal.js";
import { LinkObjectType } from "@gram/core/dist/data/links/Link.js";
import Threat from "@gram/core/dist/data/threats/Threat.js";
import log4js from "log4js";
import fetch from "node-fetch";
import { JiraConfig } from "./JiraConfig.js";
import { createHttpsProxyAgent } from "@gram/core/dist/util/proxyAgent.js";
import { Agent } from "https";

const log = log4js.getLogger("JiraActionItemExporter");

export interface JiraActionItemExporterConfig extends JiraConfig {
  /**
   * If "reviewer-as-reporter", the reporter will be set to the user that created the review.' Ensure that the token user has the global permission:
   * `Browse users and groups`.
   * If "jira-token-user", the reporter will always be set to the user that the Jira API token belongs to.
   */
  reporterMode: "reviewer-as-reporter" | "jira-token-user";

  /**
   * If true, action items will be exported when the review is approved.
   */
  exportOnReviewApproved: boolean;

  /**
   * (Required) Translates the action item in Gram to the correct fields in your Jira project.
   *
   * @param dal
   * @param actionItem
   * @returns
   */
  modelToIssueFields: (
    dal: DataAccessLayer,
    actionItem: Threat
  ) => Promise<JiraIssueFields>;
}

export interface JiraIssueFields {
  /**
   * The project the issue should be created in.
   */
  project: {
    id: string;
  };
  /**
   * The issue type.
   */
  issuetype: {
    id: string;
  };
  /**
   * Who the issue is reported by
   */
  reporter?: {
    // Jira account id
    id: string;
  };
  /**
   * Who the issue is assigned to
   */
  assignee?: {
    // Jira account id
    id: string;
  };

  /**
   * The summary/title of the issue.
   */
  summary?: string;

  /**
   * The description of the issue.
   */
  description?: { type: string; version: number; content: any[] };

  // Any other fields
  [name: string]: any;
}

export class JiraActionItemExporter implements ActionItemExporter {
  key: string = "jira";
  exportOnReviewApproved: boolean;
  agent?: Agent;

  constructor(
    private config: JiraActionItemExporterConfig,
    private dal: DataAccessLayer
  ) {
    this.exportOnReviewApproved = config.exportOnReviewApproved;
    this.agent = createHttpsProxyAgent();
  }

  async export(dal: DataAccessLayer, actionItems: Threat[]): Promise<void> {
    await Promise.all(
      actionItems.map(async (actionItem) => {
        // Will be slow if there are many action items as each one will do a select query
        const links = await dal.linkService.listLinks(
          LinkObjectType.Threat,
          actionItem.id!
        );

        if (links.find((e) => e.createdBy === this.key)) {
          // Already exported
          log.info(`Action item ${actionItem.id} is already exported`);
          return;
        }

        // Create the issue in Jira
        const issue = await this.createIssue(actionItem);

        // Insert as a link
        await dal.linkService.insertLink(
          LinkObjectType.Threat,
          actionItem.id!,
          issue.key,
          this.config.host + "/browse/" + issue.key,
          this.key,
          this.key
        );
      })
    );
  }

  host() {
    return this.config.host.startsWith("http")
      ? this.config.host
      : "https://" + this.config.host;
  }

  // async getFields() {
  //   const user = await this.config.auth.user.getValue();
  //   const token = await this.config.auth.apiToken.getValue();
  //   const response = await fetch(`${this.config.host}/rest/api/3/field`, {
  //     method: "GET",
  //     headers: {
  //       Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString(
  //         "base64"
  //       )}`,
  //       Accept: "application/json",
  //       "Content-Type": "application/json",
  //     },
  //      agent: this.agent,
  //   });

  //   if (!response.ok) {
  //     throw new Error(
  //       `Failed to fetch Jira fields: ${response.status} ${response.statusText}`
  //     );
  //   }

  //   const fields = await response.json();
  //   return fields;
  // }

  async getReporter(actionItem: Threat) {
    const user = await this.config.auth.user.getValue();

    if (!user) {
      throw new Error("No user configured");
    }

    if (this.config.reporterMode === "jira-token-user") {
      return { id: await this.getAccountIdCurrentUser() };
    }

    const review = await this.dal.reviewService.getByModelId(
      actionItem.modelId
    );

    if (!review) {
      // Fall back to token user if no reviewer is assigned
      log.info(
        `Could not find review for model ${actionItem.modelId}, using token user as reporter`
      );
      return { id: await this.getAccountIdCurrentUser() };
    }

    const reporter = { id: await this.getAccountIdForEmail(review.reviewedBy) };

    if (!reporter) {
      // Fall back to token user if no reviewer is assigned
      log.info(
        `Could not find account id for reviewer ${review.reviewedBy}, using token user as reporter`
      );
      return { id: await this.getAccountIdCurrentUser() };
    }

    return { id: reporter };
  }

  async createIssue(actionItem: Threat) {
    // console.log(JSON.stringify(await this.getFields()));
    // writeFileSync(
    //   "fields.json",
    //   JSON.stringify(await this.getFields(), null, 4)
    // );

    const fields = await this.config.modelToIssueFields(this.dal, actionItem);

    if (!fields.reporter) {
      fields.reporter = await this.getReporter(actionItem);
    }

    if (!fields.description) {
      fields.description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: actionItem.description || "(no description)",
              },
            ],
          },
        ],
      };
    }

    const user = await this.config.auth.user.getValue();
    const token = await this.config.auth.apiToken.getValue();
    const resp = await fetch(`${this.host()}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString(
          "base64"
        )}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields,
      }),
      agent: this.agent,
    });

    const data = (await resp.json()) as any;

    if (resp.status !== 201) {
      throw new Error(
        `Failed to create issue for action item ${
          actionItem.id
        }: ${JSON.stringify(data)}`
      );
    }

    return data;
  }

  async getAccountIdCurrentUser() {
    const user = await this.config.auth.user.getValue();
    const token = await this.config.auth.apiToken.getValue();

    const resp = await fetch(`${this.host()}/rest/api/3/myself`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString(
          "base64"
        )}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      agent: this.agent,
    });

    const data = (await resp.json()) as any;

    if (resp.status !== 200) {
      throw new Error(`Failed to get current user: ${JSON.stringify(data)}`);
    }

    return data.accountId;
  }

  async getAccountIdForEmail(email: string) {
    const user = await this.config.auth.user.getValue();
    const token = await this.config.auth.apiToken.getValue();

    const resp = await fetch(
      `${this.host()}/rest/api/3/user/search?query=${encodeURIComponent(
        email
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString(
            "base64"
          )}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        agent: this.agent,
      }
    );

    const data = (await resp.json()) as any;

    if (resp.status !== 200 || data.length === 0) {
      log.warn(
        `Failed to get account id for email ${email}: ${JSON.stringify(data)}`
      );
      return null;
    }

    if (data.length > 1) {
      throw new Error(`Multiple accounts found for email ${email}`);
    }

    return data[0].accountId;
  }
}
