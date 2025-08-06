import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Duplicates: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Duplicate Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Find and manage duplicate contacts - Coming soon!
        </Typography>
      </Paper>
    </Box>
  );
};

export default Duplicates; 