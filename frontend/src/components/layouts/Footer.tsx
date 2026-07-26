import { Box } from '@mui/material'

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        textAlign: 'center',
        color: 'text.secondary',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      BBL Bookmark Manager
    </Box>
  )
}
