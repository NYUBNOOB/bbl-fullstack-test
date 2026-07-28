import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { FormType } from "@/consts/enum/formType";
import type { CollectionDetail } from "@/types/collection/collectionDetail";
import { useLoadInitialData } from "./hooks/useLoadInitialData";
import { collectionService } from "@/services/collection";
import DialogFormCollections from "./components/dialogFormCollections";
import DialogDeleteCollections from "./components/dialogDeleteCollections";
import type { CreateUpdateCollectionRequest } from "@/services/collection/types/request";

export default function CollectionsPage() {

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormType>(FormType.CREATE);
  const [editingCollection, setEditingCollection] = useState<CollectionDetail | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCollection, setDeletingCollection] = useState<CollectionDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { collections, reloadCollections, loading } = useLoadInitialData();

  const handleOpenCreate = useCallback(() => {
    setModalMode(FormType.CREATE);
    setEditingCollection(null);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((collection: CollectionDetail) => {
    setModalMode(FormType.EDIT);
    setEditingCollection(collection);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingCollection(null);
  }, []);

  const handleModalSubmit = useCallback(async (
    value: CreateUpdateCollectionRequest,
  ) => {
    try {
      if (modalMode === FormType.CREATE) {
        await collectionService.createCollection(value);
      } else if (modalMode === FormType.EDIT && editingCollection) {
        await collectionService.updateCollection(editingCollection.id, value);
      }
      await reloadCollections();
      handleModalClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit collection");
    }
  }, [
    modalMode,
    editingCollection,
    reloadCollections,
    handleModalClose,
  ]);

  const handleOpenDelete = useCallback((collection: CollectionDetail) => {
    setDeletingCollection(collection);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingCollection) return;

    setDeleting(true);
    try {
      await collectionService.deleteCollection(deletingCollection.id);
      setDeleteDialogOpen(false);
      setDeletingCollection(null);
      await reloadCollections();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setDeleting(false);
    }
  }, [deletingCollection, reloadCollections]);

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
                    <IconButton
                      onClick={() => handleOpenEdit(collection)}
                      color="primary"
                      size="small"
                      aria-label={`Edit ${collection.name}`}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpenDelete(collection)}
                      color="error"
                      size="small"
                      aria-label={`Delete ${collection.name}`}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogFormCollections
        open={modalOpen}
        modalMode={modalMode}
        editingCollection={editingCollection}
        onClose={handleModalClose}
        handleModalSubmit={handleModalSubmit}
      />

      <DialogDeleteCollections
        open={deleteDialogOpen}
        deletingCollection={deletingCollection}
        deleting={deleting}
        onClose={() => setDeleteDialogOpen(false)}
        handleDeleteConfirm={handleDeleteConfirm}
      />

    </Box>
  );
}
