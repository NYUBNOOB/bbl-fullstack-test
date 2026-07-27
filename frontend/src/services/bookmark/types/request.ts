export type CreateBookmarkRequest = {
  title: string;
  url: string;
  notes?: string;
  collectionId?: string;
};

export type UpdateBookmarkRequest = {
  title?: string;
  url?: string;
  notes?: string;
  collectionId?: string | null;
};
