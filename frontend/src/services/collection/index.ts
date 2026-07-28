import { apiClient } from "@/libs/axiosConfig";
import type { GetCollectionResponse } from "./types/response";
import type { CreateUpdateCollectionRequest } from "./types/request";
import type { CollectionDetail } from "@/types/collection/collectionDetail";

export const collectionService = {
  async getCollections(): Promise<GetCollectionResponse> {
    const response = await apiClient.get<GetCollectionResponse>("/collections");
    return response.data;
  },

  async getCollection(id: string): Promise<CollectionDetail> {
    const response = await apiClient.get<CollectionDetail>(
      `/collections/${id}`,
    );
    return response.data;
  },

  async createCollection(
    data: CreateUpdateCollectionRequest,
  ): Promise<CollectionDetail> {
    const response = await apiClient.post<CollectionDetail>(
      "/collections",
      data,
    );
    return response.data;
  },

  async updateCollection(
    id: string,
    data: CreateUpdateCollectionRequest,
  ): Promise<CollectionDetail> {
    const response = await apiClient.put<CollectionDetail>(
      `/collections/${id}`,
      data,
    );
    return response.data;
  },

  async deleteCollection(id: string): Promise<void> {
    await apiClient.delete(`/collections/${id}`);
  },
};
