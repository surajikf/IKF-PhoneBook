import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ContentPaste,
  PlayArrow,
  CheckCircle,
  Error,
  Warning,
  ExpandMore,
  Edit,
  Delete,
} from '@mui/icons-material';
import { importAPI, ContactFormData } from '../services/api';

interface ParsedContact extends ContactFormData {
  isValid: boolean;
  errors: string[];
}

const RawDataImport: React.FC = () => {
  const [rawData, setRawData] = useState('');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const handleParseData = async () => {
    if (!rawData.trim()) {
      setError('Please enter some contact data to parse.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await importAPI.importRawData(rawData);
      setImportResult(result);
      setSuccess(`Successfully parsed ${result.summary.total} contacts!`);
      
      // Convert the imported contacts to our format
      const contacts: ParsedContact[] = result.imported.map((contact: any) => ({
        first_name: contact.first_name,
        last_name: contact.last_name || '',
        phone_number: contact.phone_number,
        email: contact.email || '',
        relationship_type: contact.relationship_type || 'Other',
        data_owner: contact.data_owner || '',
        source: 'Raw Data',
        status: 'Active',
        isValid: true,
        errors: [],
      }));

      setParsedContacts(contacts);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to parse data. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportContacts = async () => {
    if (parsedContacts.length === 0) {
      setError('No valid contacts to import.');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const result = await importAPI.importRawData(rawData);
      setImportResult(result);
      setSuccess(`Successfully imported ${result.summary.imported} contacts!`);
      
      // Clear the form after successful import
      setRawData('');
      setParsedContacts([]);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to import contacts.');
    } finally {
      setImporting(false);
    }
  };

  const handleEditContact = (index: number, field: string, value: string) => {
    setParsedContacts(prev => prev.map((contact, i) => 
      i === index ? { ...contact, [field]: value } : contact
    ));
  };

  const handleDeleteContact = (index: number) => {
    setParsedContacts(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (contact: ParsedContact) => {
    if (contact.isValid) {
      return <CheckCircle color="success" />;
    } else {
      return <Error color="error" />;
    }
  };

  const getStatusChip = (contact: ParsedContact) => {
    if (contact.isValid) {
      return <Chip label="Valid" color="success" size="small" />;
    } else {
      return <Chip label="Invalid" color="error" size="small" />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Raw Data Import
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Paste your contact data here and we'll automatically parse and organize it for you.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Paste Contact Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Supported formats: CSV, tab-separated, or any text with contact information
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={12}
              variant="outlined"
              placeholder="Example:
John Doe, +1-123-456-7890, john@example.com, Client
Jane Smith, (555) 234-5678, jane@domain.com, Lead
Mike Johnson - +1-987-654-3210 - mike@company.com - Vendor"
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
              onClick={handleParseData}
              disabled={loading || !rawData.trim()}
              fullWidth
              size="large"
            >
              {loading ? 'Parsing...' : 'Parse Data'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Parsed Contacts
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {parsedContacts.length} contacts found
            </Typography>

            {parsedContacts.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={importing ? <CircularProgress size={20} /> : <ContentPaste />}
                  onClick={handleImportContacts}
                  disabled={importing}
                  fullWidth
                  size="large"
                >
                  {importing ? 'Importing...' : 'Import to Database'}
                </Button>
              </Box>
            )}

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {parsedContacts.map((contact, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(contact)}
                        <Typography variant="subtitle1" fontWeight="bold">
                          {contact.first_name} {contact.last_name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusChip(contact)}
                        <Tooltip title="Edit">
                          <IconButton size="small">
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteContact(index)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Phone: {contact.phone_number}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Email: {contact.email || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Type: {contact.relationship_type}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Owner: {contact.data_owner || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>

                    {contact.errors.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {contact.errors.join(', ')}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {importResult && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Import Results
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Import Summary</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="h6" color="primary">
                    {importResult.summary.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Processed
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="h6" color="success.main">
                    {importResult.summary.imported}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Successfully Imported
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="h6" color="warning.main">
                    {importResult.summary.duplicates}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duplicates Found
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="h6" color="error">
                    {importResult.summary.errors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Errors
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {importResult.duplicates && importResult.duplicates.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Duplicate Contacts</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Contact</TableCell>
                        <TableCell>Similarity Score</TableCell>
                        <TableCell>Match Reasons</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.duplicates.map((duplicate: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {duplicate.contact.first_name} {duplicate.contact.last_name}
                          </TableCell>
                          <TableCell>
                            {(duplicate.duplicates[0]?.similarityScore * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            {duplicate.duplicates[0]?.matchReasons.join(', ')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default RawDataImport; 