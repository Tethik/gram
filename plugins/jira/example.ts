import { GramConfiguration } from "@gram/core/dist/config/GramConfiguration.js";
import { DataAccessLayer } from "@gram/core/dist/data/dal.js";
import Threat, { ThreatSeverity } from "@gram/core/dist/data/threats/Threat.js";
import { EnvSecret } from "@gram/core/dist/config/EnvSecret.js";
import {
  JiraActionItemExporterConfig,
  JiraActionItemExporter,
  JiraIssueFields,
} from "@gram/jira";

export function createJiraActionItemExporter(
  config: GramConfiguration,
  dal: DataAccessLayer
) {
  const jiraActionItemExporterConfig: JiraActionItemExporterConfig = {
    /**
     * Automatically trigger an export of all action items to Jira when a review is approved.
     */
    exportOnReviewApproved: true,
    auth: {
      user: new EnvSecret("JIRA_USER"),
      apiToken: new EnvSecret("JIRA_API_TOKEN"),
    },
    reporterMode: "jira-token-user",
    host: "https://<your org>.atlassian.net",

    /**
     * (Required) Translates the action item in Gram to the correct fields in your Jira project.
     */
    issueFieldsTranslator: async (
      dal: DataAccessLayer,
      actionItem: Threat,
      existingIssue?: string
    ): Promise<JiraIssueFields> => {
      const controls = await dal.controlService.listByThreatId(actionItem.id!);
      const model = await dal.modelService.getById(actionItem.modelId);
      const componentName =
        model?.data.components.find((c) => c.id === actionItem.componentId)
          ?.name || "unknown component";

      const controlsList = controls.map((control) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text:
                  control.title +
                  (control.description ? " - " + control.description : "") +
                  (control.inPlace ? " (in place)" : ""),
                marks: control.inPlace
                  ? [
                      {
                        type: "strike",
                      },
                    ]
                  : undefined,
              },
            ],
          },
        ],
      }));

      return {
        project: {
          id: "11717",
        },

        issuetype: {
          id: "10001",
        },

        summary: actionItem.title,

        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `Threat of "${actionItem.title}" on ${componentName}`,
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: actionItem.description || "(no description)",
                },
              ],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The following controls were suggested as ways to mitigate the threat:",
                },
              ],
            },
            {
              type: "bulletList",
              content: controlsList,
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Once you have implemented enough of the suggested controls enough that it mitigates or fixes this threat, you can move this threat to the mitigated status.",
                },
              ],
            },
          ],
        },

        /**
         * Example of setting a custom field, in this case a reference URL back to Gram.
         */
        customfield_11749: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: config.origin + "/model/" + actionItem.modelId,
                },
              ],
            },
          ],
        },

        // Example Severity field
        customfield_10063: severityToJiraSeverity(actionItem.severity),
      };
    },
  };
  const jiraActionItemExporter = new JiraActionItemExporter(
    jiraActionItemExporterConfig,
    dal
  );
  return jiraActionItemExporter;
}

function severityToJiraSeverity(severity?: ThreatSeverity) {
  switch (severity) {
    // Example only, these IDs will differ on your own setup.
    case ThreatSeverity.Low:
      return { id: "12354", value: "Low" };
    case ThreatSeverity.Medium:
      return { id: "12355", value: "Medium" };
    case ThreatSeverity.High:
      return { id: "12356", value: "High" };
    case ThreatSeverity.Critical:
      return { id: "12357", value: "Critical" };
    case ThreatSeverity.Informative:
      return { id: "12353", value: "Informative" };
    default:
      return { id: "12354", value: "Low" };
  }
}
