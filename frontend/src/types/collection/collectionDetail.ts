export type CollectionDetail = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type CollectionFormValues = Pick<
  CollectionDetail,
  "name" | "description"
>;
