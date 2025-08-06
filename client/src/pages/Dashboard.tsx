import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  People,
  CloudUpload,
  Compare,
  TrendingUp,
  Person,
  Email,
  Phone,
} from '@mui/icons-material';
import { contactsAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await contactsAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome to IKF PhoneBook - Your centralized contact management system
      </Typography>

      <Grid container spacing={3}>
        {/* Total Contacts */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Contacts</Typography>
              </Box>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                {stats?.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active contacts in your database
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Contacts */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Contacts</Typography>
              </Box>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                {stats?.active || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently active contacts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Imports */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudUpload color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Recent Imports</Typography>
              </Box>
              <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold' }}>
                12
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Imports this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Duplicates */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Compare color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Duplicates</Typography>
              </Box>
              <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>
                5
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Potential duplicates found
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Contact Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contact Distribution by Type
            </Typography>
            {stats?.byRelationship ? (
              <List>
                {stats.byRelationship.map((item: any) => (
                  <ListItem key={item.relationship_type}>
                    <ListItemIcon>
                      <People />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.relationship_type}
                      secondary={`${item.count} contacts`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No data available</Typography>
            )}
          </Paper>
        </Grid>

        {/* Import Sources */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Contacts by Source
            </Typography>
            {stats?.bySource ? (
              <List>
                {stats.bySource.map((item: any) => (
                  <ListItem key={item.source}>
                    <ListItemIcon>
                      <CloudUpload />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.source}
                      secondary={`${item.count} contacts`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No data available</Typography>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">Add Contact</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manually add a new contact
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <CloudUpload sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h6">Import Contacts</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Import from various sources
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Compare sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h6">Check Duplicates</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Find and merge duplicates
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6">View Reports</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Analyze contact data
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 