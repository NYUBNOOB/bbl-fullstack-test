import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  IconButton,
  MenuItem,
  Link,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, OpenInNew as OpenIcon } from "@mui/icons-material";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useCollections } from "@/hooks/useCollections";
import type { BookmarkDetail } from "@/types/bookmark/bookmarkDetail";
import { apiClient } from "@/libs/axiosConfig";
import { FormType } from "@/consts/enum/formType";

export default function BookmarksPage() {
  const { bookmarks, loading, error, refetch } = useBookmarks();
  const { collections } = useCollections();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormType>(FormType.CREATE);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkDetail | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    notes: "",
    collectionId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenCreate = useCallback(() => {
    setModalMode(FormType.CREATE);
    setEditingBookmark(null);
    setFormData({ title: "", url: "", notes: "", collectionId: "" });
    setSubmitError(null);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((bookmark: BookmarkDetail) => {
    setModalMode(FormType.EDIT);
    setEditingBookmark(bookmark);
    setFormData({
      title: bookmark.title,
      url: bookmark.url,
      notes: bookmark.notes || "",
      collectionId: bookmark.collectionId || "",
    });
    setSubmitError(null);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingBookmark(null);
    setSubmitError(null);
  }, []);

  const handleModalSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      title: formData.title,
      url: formData.url,
      notes: formData.notes || undefined,
      collectionId: formData.collectionId || undefined,
    };

    try {
      if (modalMode === FormType.CREATE) {
        await apiClient.post("/bookmarks", payload);
      } else if (modalMode === "edit" && editingBookmark) {
        await apiClient.put(`/bookmarks/${editingBookmark.id}`, payload);
      }
      handleModalClose();
      refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save bookmark");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleOpenDelete = useCallback((bookmark: BookmarkDetail) => {
    setDeletingBookmark(bookmark);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingBookmark) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/bookmarks/${deletingBookmark.id}`);
      setDeleteDialogOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete bookmark");
    } finally {
      setDeleting(false);
    }
  }, []);

  const getCollectionName = (id: string | null | undefined): string => {
    if (!id) return "";
    return collections.find((c) => c.id === id)?.name || "Unknown";
  };

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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                    {bookmark.collectionId ? (
                      <Chip label={getCollectionName(bookmark.collectionId)} size="small" color="primary" variant="outlined" />
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

      <Dialog open={modalOpen} onClose={handleModalClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleModalSubmit}>
          <DialogTitle>{modalMode === "create" ? "Create Bookmark" : "Edit Bookmark"}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
                fullWidth
                type="url"
                placeholder="https://example.com"
              />
              <TextField
                label="Collection"
                value={formData.collectionId}
                onChange={(e) => setFormData({ ...formData, collectionId: e.target.value })}
                select
                fullWidth
                helperText="Leave empty to leave this bookmark unfiled"
              >
                <MenuItem value="">
                  <em>No collection (unfiled)</em>
                </MenuItem>
                {collections.map((col) => (
                  <MenuItem key={col.id} value={col.id}>
                    {col.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleModalClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : modalMode === "create" ? "Create" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Bookmark?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deletingBookmark?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
