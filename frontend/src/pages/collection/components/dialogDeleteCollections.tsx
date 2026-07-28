import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

interface DialogDeleteCollectionsProps {
  open: boolean;
  deletingCollection: { name: string } | null;
  deleting: boolean;
  onClose: () => void;
  handleDeleteConfirm: () => void;
}

export default function DialogDeleteCollections({ open, deletingCollection, deleting, onClose, handleDeleteConfirm }: DialogDeleteCollectionsProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Collection?</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete "{deletingCollection?.name}"? This will also delete all bookmarks in this
          collection.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
          {deleting ? <CircularProgress size={20} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
