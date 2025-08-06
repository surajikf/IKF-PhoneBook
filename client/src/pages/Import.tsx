import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Import: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Import Contacts
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Import contacts from various sources - Coming soon!
        </Typography>
      </Paper>
    </Box>
  );
};

export default Import; 