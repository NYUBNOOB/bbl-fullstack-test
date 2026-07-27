import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Card,
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
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useCollections } from "@/hooks/useCollections";
import { FormType } from "@/consts/enum/formType";
import type { CollectionDetail } from "@/types/collection/collectionDetail";
import { apiClient } from "@/libs/axiosConfig";

export default function CollectionsPage() {
  const { collections, loading, error, refetch } = useCollections();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormType>(FormType.CREATE);
  const [editingCollection, setEditingCollection] = useState<CollectionDetail | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCollection, setDeletingCollection] = useState<CollectionDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenCreate = useCallback(() => {
    setModalMode(FormType.CREATE);
    setEditingCollection(null);
    setFormData({ name: "", description: "" });
    setSubmitError(null);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((collection: CollectionDetail) => {
    setModalMode(FormType.EDIT);
    setEditingCollection(collection);
    setFormData({ name: collection.name, description: collection.description || "" });
    setSubmitError(null);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingCollection(null);
    setSubmitError(null);
  }, []);

  const handleModalSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (modalMode === FormType.CREATE) {
        await apiClient.post("/collections", {
          name: formData.name,
          description: formData.description || undefined,
        });
      } else if (modalMode === FormType.EDIT && editingCollection) {
        await apiClient.put(`/collections/${editingCollection.id}`, {
          name: formData.name,
          description: formData.description || undefined,
        });
      }
      handleModalClose();
      refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save collection");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleOpenDelete = useCallback((collection: CollectionDetail) => {
    setDeletingCollection(collection);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingCollection) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/collections/${deletingCollection.id}`);
      setDeleteDialogOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setDeleting(false);
    }
  }, []);

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
        <Typography variant="h4">Collections</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          New Collection
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
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No collections yet. Create your first one!</Typography>
                </TableCell>
              </TableRow>
            ) : (
              collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell>{collection.name}</TableCell>
                  <TableCell>{collection.description || "—"}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEdit(collection)} color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleOpenDelete(collection)} color="error" size="small">
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
          <DialogTitle>{modalMode === "create" ? "Create Collection" : "Edit Collection"}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        <DialogTitle>Delete Collection?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deletingCollection?.name}"? This will also delete all bookmarks in this
            collection.
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
