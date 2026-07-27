export type CreateCollectionRequest = {
  name: string;
  description?: string;
};

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
}
