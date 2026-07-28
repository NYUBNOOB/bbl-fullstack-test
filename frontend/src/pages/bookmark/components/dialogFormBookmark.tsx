import { FormType } from '@/consts/enum/formType';
import type { CreateUpdateBookmarkRequest } from '@/services/bookmark/types/request';
import type { BookmarkDetail, BookmarkFormValues } from '@/types/bookmark/bookmarkDetail';
import type { CollectionDetail } from '@/types/collection/collectionDetail';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const EMPTY_FORM: BookmarkFormValues = { title: "", url: "", notes: "", collectionId: null };

interface DialogFormBookmarkProps {
  open: boolean;
  modalMode: FormType;
  editingBookmark: BookmarkDetail | null;
  collections: CollectionDetail[];
  onClose: () => void;
  handleModalSubmit: (value: CreateUpdateBookmarkRequest) => Promise<void>;
}

export default function DialogFormBookmark({
  open,
  modalMode,
  editingBookmark,
  collections,
  onClose,
  handleModalSubmit
}: DialogFormBookmarkProps) {

  const [formData, setFormData] = useState<BookmarkFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData(editingBookmark ?? EMPTY_FORM);
  }, [open, editingBookmark]);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        await handleModalSubmit({
          title: formData.title,
          url: formData.url,
          notes: formData.notes || undefined,
          collectionId: formData.collectionId || null,
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
        <DialogTitle>{modalMode === FormType.CREATE ? "Create Bookmark" : "Edit Bookmark"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
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
              value={formData.collectionId ?? ""}
              onChange={(e) => setFormData({ ...formData, collectionId: e.target.value || null })}
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
              value={formData.notes ?? ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
            {submitting ? <CircularProgress size={20} /> : modalMode === FormType.CREATE ? "Create" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
