import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { FormType } from "@/consts/enum/formType";
import type { CollectionDetail } from "@/types/collection/collectionDetail";
import type { CreateUpdateCollectionRequest } from "@/services/collection/types/request";

type CollectionFormValues = Pick<CollectionDetail, "name" | "description">;

const EMPTY_FORM: CollectionFormValues = { name: "", description: "" };

interface DialogFormCollectionsProps {
  open: boolean;
  modalMode: FormType;
  editingCollection: CollectionDetail | null;
  onClose: () => void;
  handleModalSubmit: (value: CreateUpdateCollectionRequest) => Promise<void>;
}

export default function DialogFormCollections({
  open,
  modalMode,
  editingCollection,
  onClose,
  handleModalSubmit,
}: DialogFormCollectionsProps) {

  const [formData, setFormData] = useState<CollectionFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData(editingCollection ?? EMPTY_FORM);
  }, [open, editingCollection]);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        // description ในฟอร์มเป็น string เสมอ แต่ API รับ optional —
        // แปลงค่าว่าง/null เป็น undefined ให้ตรงกับ payload ที่ backend คาดหวัง
        await handleModalSubmit({
          name: formData.name,
          description: formData.description || undefined,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [formData, handleModalSubmit],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit}>
        <DialogTitle>
          {modalMode === FormType.CREATE ? "Create Collection" : "Edit Collection"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
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
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? (
              <CircularProgress size={20} />
            ) : modalMode === FormType.CREATE ? (
              "Create"
            ) : (
              "Save"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
