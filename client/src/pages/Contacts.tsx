import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Contacts: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Contacts
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Contact management page - Coming soon!
        </Typography>
      </Paper>
    </Box>
  );
};

export default Contacts; 