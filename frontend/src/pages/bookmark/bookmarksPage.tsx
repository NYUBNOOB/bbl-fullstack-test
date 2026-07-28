import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Link,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, OpenInNew as OpenIcon } from "@mui/icons-material";
import type { BookmarkDetail } from "@/types/bookmark/bookmarkDetail";
import { FormType } from "@/consts/enum/formType";
import type { CreateUpdateBookmarkRequest } from "@/services/bookmark/types/request";
import { bookmarkService } from "@/services/bookmark";
import { useLoadInitialData } from "./hooks/useLoadInitialData";
import DialogFormBookmark from "./components/dialogFormBookmark";
import DialogDeleteBookmark from "./components/dialogDeleteBookmark";

export default function BookmarksPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormType>(FormType.CREATE);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkDetail | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { bookmarks, collections, reloadBookmarks, loading } = useLoadInitialData();

  const handleOpenCreate = useCallback(() => {
    setModalMode(FormType.CREATE);
    setEditingBookmark(null);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((bookmark: BookmarkDetail) => {
    setModalMode(FormType.EDIT);
    setEditingBookmark(bookmark);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingBookmark(null);
  }, []);

  const handleModalSubmit = useCallback(async (value: CreateUpdateBookmarkRequest) => {
    try {
      if (modalMode === FormType.CREATE) {
        await bookmarkService.createBookmark(value);
      } else if (modalMode === FormType.EDIT && editingBookmark) {
        await bookmarkService.updateBookmark(editingBookmark.id, value);
      }
      await reloadBookmarks();
      handleModalClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save bookmark");
    }
  }, [
    modalMode,
    editingBookmark,
    reloadBookmarks,
    handleModalClose,
  ]);

  const handleOpenDelete = useCallback((bookmark: BookmarkDetail) => {
    setDeletingBookmark(bookmark);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingBookmark) return;

    setDeleting(true);
    try {
      await bookmarkService.deleteBookmark(deletingBookmark.id);
      setDeleteDialogOpen(false);
      setDeletingBookmark(null);
      await reloadBookmarks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete bookmark");
    } finally {
      setDeleting(false);
    }
  }, [deletingBookmark, reloadBookmarks]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Bookmarks</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          New Bookmark
        </Button>
      </Box>

      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Collection</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookmarks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No bookmarks yet. Create your first one!</Typography>
                </TableCell>
              </TableRow>
            ) : (
              bookmarks.map((bookmark) => (
                <TableRow key={bookmark.id}>
                  <TableCell sx={{ fontWeight: 500 }}>{bookmark.title}</TableCell>
                  <TableCell>
                    <Link href={bookmark.url} target="_blank" rel="noopener noreferrer" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                      {bookmark.url.length > 40 ? `${bookmark.url.slice(0, 40)}...` : bookmark.url}
                      <OpenIcon sx={{ fontSize: 14 }} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    {bookmark.collection ? (
                      <Chip label={bookmark.collection.name} size="small" color="primary" variant="outlined" />
                    ) : (
                      <Typography color="text.secondary" variant="body2">Unfiled</Typography>
                    )}
                  </TableCell>
                  <TableCell>{bookmark.notes ? (bookmark.notes.length > 50 ? `${bookmark.notes.slice(0, 50)}...` : bookmark.notes) : "—"}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEdit(bookmark)} color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleOpenDelete(bookmark)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogFormBookmark
        open={modalOpen}
        modalMode={modalMode}
        editingBookmark={editingBookmark}
        collections={collections}
        onClose={handleModalClose}
        handleModalSubmit={handleModalSubmit}
      />

      <DialogDeleteBookmark
        deleteDialogOpen={deleteDialogOpen}
        deletingBookmark={deletingBookmark}
        deleting={deleting}
        setDeleteDialogOpen={setDeleteDialogOpen}
        handleDeleteConfirm={handleDeleteConfirm}
      />

    </Box>
  );
}
