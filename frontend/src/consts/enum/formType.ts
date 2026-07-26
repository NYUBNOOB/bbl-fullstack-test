export const FormType = {
  CREATE: "create",
  EDIT: "edit",
} as const;

export type FormType = (typeof FormType)[keyof typeof FormType];
