import type { CollectionDetail } from "../collection/collectionDetail";

export type BookmarkDetail = {
  id: string;
  title: string;
  url: string;
  notes: string | null;
  collectionId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  collection?: CollectionDetail;
};

export type BookmarkFormValues = Pick<
  BookmarkDetail,
  "title" | "url" | "notes" | "collectionId"
>;
