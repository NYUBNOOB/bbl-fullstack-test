import type { BookmarkDetail } from '@/types/bookmark/bookmarkDetail';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

interface DialogDeleteBookmarkProps {
  deleteDialogOpen: boolean;
  deletingBookmark: BookmarkDetail | null;
  deleting: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  handleDeleteConfirm: () => void;
}

export default function DialogDeleteBookmark({ deleteDialogOpen, deletingBookmark, deleting, setDeleteDialogOpen, handleDeleteConfirm }: DialogDeleteBookmarkProps) {
  return (
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
  )
}
