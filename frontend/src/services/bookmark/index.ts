import { apiClient } from "@/libs/axiosConfig";
import type { GetBookmarkResponse } from "./types/response";
import type { BookmarkDetail } from "@/types/bookmark/bookmarkDetail";
import type { CreateUpdateBookmarkRequest } from "./types/request";

export const bookmarkService = {
  async getBookmarks(): Promise<GetBookmarkResponse> {
    const response = await apiClient.get<GetBookmarkResponse>("/bookmarks");
    return response.data;
  },

  async getBookmark(id: string): Promise<BookmarkDetail> {
    const response = await apiClient.get<BookmarkDetail>(`/bookmarks/${id}`);
    return response.data;
  },

  async createBookmark(
    data: CreateUpdateBookmarkRequest,
  ): Promise<BookmarkDetail> {
    const response = await apiClient.post<BookmarkDetail>("/bookmarks", data);
    return response.data;
  },

  async updateBookmark(
    id: string,
    data: CreateUpdateBookmarkRequest,
  ): Promise<BookmarkDetail> {
    const response = await apiClient.put<BookmarkDetail>(
      `/bookmarks/${id}`,
      data,
    );
    return response.data;
  },

  async deleteBookmark(id: string): Promise<void> {
    await apiClient.delete(`/bookmarks/${id}`);
  },
};
