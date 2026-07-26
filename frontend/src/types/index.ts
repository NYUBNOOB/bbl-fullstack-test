export interface Collection {
  id: string
  name: string
  description: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface Bookmark {
  id: string
  title: string
  url: string
  notes: string | null
  collectionId: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  collection?: Collection
}

export interface CreateCollectionDto {
  name: string
  description?: string
}

export interface UpdateCollectionDto {
  name?: string
  description?: string
}

export interface CreateBookmarkDto {
  title: string
  url: string
  notes?: string
  collectionId?: string
}

export interface UpdateBookmarkDto {
  title?: string
  url?: string
  notes?: string
  collectionId?: string | null
}
