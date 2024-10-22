import { ValidationRule } from "@gram/core/dist/validation/models.js";

export const testValidationRules: ValidationRule[] = [
  {
    type: "component",
    name: "should have a name",
    affectedType: ["proc", "ee", "ds", "tb"],
    test: async ({ component }) => component.name.trim() !== "",
    messageTrue: "Component has a name",
    messageFalse: "Component does not have a name",
  },
  {
    type: "model",
    name: "should have at least one component",
    affectedType: [],
    test: async ({ model }) => model.data.components.length > 0,
    messageTrue: "Model has at least one component",
    messageFalse: "Model is empty",
  },
];
