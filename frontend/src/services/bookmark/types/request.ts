export type CreateUpdateBookmarkRequest = {
  title: string;
  url: string;
  notes?: string;
  /** null = เอา bookmark ออกจาก collection (backend รับ null เป็นสัญญาณ unfile) */
  collectionId?: string | null;
};
