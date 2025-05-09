import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Grid,
  Alert,
  Snackbar,
  Tooltip,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
  FormControlLabel,
  Switch,
  Checkbox,
  LinearProgress,
  List,
  ListItem,
  ListSubheader
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  MoreVert as MoreIcon,
  AutoFixHigh as GenerateIcon,
  Recycling as RecycleIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  CheckCircle,
  Error,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  AutoFixHigh as AutoFixHighIcon
} from '@mui/icons-material';
import { contentAPI, categoryAPI } from '../services/api';
import type { Content, Category } from '../types';

interface ContentManagerProps {}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`content-tabpanel-${index}`}
      aria-labelledby={`content-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `content-tab-${index}`,
    'aria-controls': `content-tabpanel-${index}`,
  };
}

const ContentManager: React.FC<ContentManagerProps> = () => {
  // State for content
  const [content, setContent] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for tabs & filters
  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [poolFilter, setPoolFilter] = useState<string>('all');
  
  // State for AI content generation
  const [generationDialog, setGenerationDialog] = useState(false);
  const [generationCategory, setGenerationCategory] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [generationCount, setGenerationCount] = useState(10);
  const [multiCategoryMode, setMultiCategoryMode] = useState(false);
  
  // Add model selection state
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [generationInProgress, setGenerationInProgress] = useState(false);
  
  // Available models grouped by category
  const availableModels = {
    flagship: [
      { id: 'gpt-4.1', name: 'GPT-4.1 (Most Powerful)' },
      { id: 'gpt-4o', name: 'GPT-4o (Fast & Powerful)' },
    ],
    reasoning: [
      { id: 'o3', name: 'o3 (Best for Complex Content)' },
      { id: 'o3-mini', name: 'o3-mini (Efficient Reasoning)' },
    ],
    costEfficient: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini (Fast & Affordable)' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini (Balanced)' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Legacy)' },
    ],
    legacy: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo (Legacy)' },
    ]
  };
  
  // State for content dialog
  const [contentDialog, setContentDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<Partial<Content>>({
    title: '',
    body: '',
    summary: '',
    category: '',
    tags: [],
    status: 'draft',
    contentType: 'hack',
    difficulty: 'beginner',
    pool: 'regular'
  });
  
  // State for moderation dialog
  const [moderationDialog, setModerationDialog] = useState(false);
  const [moderationNotes, setModerationNotes] = useState('');
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // State for action menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Add state for tracking generation progress
  const [generationProgress, setGenerationProgress] = useState<{
    total: number;
    completed: number;
    currentCategory: string | null;
    currentItemInCategory: number;
    totalItemsInCategory: number;
    results: Array<{
      categoryId: string;
      categoryName: string;
      success: boolean;
      count: number;
      error?: string;
    }>;
  }>({
    total: 0,
    completed: 0,
    currentCategory: null,
    currentItemInCategory: 0,
    totalItemsInCategory: 0,
    results: []
  });

  // State for duplicate management
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [duplicateSets, setDuplicateSets] = useState<{ title: string; items: Content[] }[]>([]);
  const [selectedDuplicateSet, setSelectedDuplicateSet] = useState<number>(0);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);

  // Add batch content deletion
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  
  // Toggle selection of a content item
  const handleToggleContentSelection = (contentId: string) => {
    if (selectedContentIds.includes(contentId)) {
      setSelectedContentIds(prev => prev.filter(id => id !== contentId));
    } else {
      setSelectedContentIds(prev => [...prev, contentId]);
    }
  };
  
  // Delete selected content items
  const handleDeleteSelectedContent = async () => {
    if (selectedContentIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedContentIds.length} selected items?`)) {
      return;
    }
    
    try {
      setLoading(true);
      let deletedCount = 0;
      let errors = [];
      
      // Delete each selected item with individual error handling
      for (const contentId of selectedContentIds) {
        try {
          const response = await contentAPI.deleteContent(contentId);
          if (response.success || response.status === 'success') {
            deletedCount++;
          } else {
            errors.push({ id: contentId, error: response.message });
          }
        } catch (err) {
          console.error(`Error deleting content ID ${contentId}:`, err);
          errors.push({ id: contentId, error: err.message || 'Unknown error' });
        }
      }
      
      // Update local state - remove successfully deleted items
      setContent(prevContent => 
        prevContent.filter(item => !selectedContentIds.includes(item._id || '') || 
          errors.some(e => e.id === item._id))
      );
      
      // Reset selection
      setSelectedContentIds([]);
      
      if (errors.length > 0) {
        setSnackbar({
          open: true,
          message: `Deleted ${deletedCount} items. Failed to delete ${errors.length} items.`,
          severity: 'warning'
        });
        console.error('Deletion errors:', errors);
      } else {
        setSnackbar({
          open: true,
          message: `Successfully deleted ${deletedCount} items`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error in batch delete:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete selected items. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch content and categories on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch categories first
        const categoriesResponse = await categoryAPI.getAllCategories();
        
        if ((categoriesResponse.success || categoriesResponse.status === 'success') && categoriesResponse.data?.categories) {
          setCategories(categoriesResponse.data.categories);
        } else {
          console.warn('Categories response format unexpected:', categoriesResponse);
        }
        
        // Then fetch content
        try {
          const contentResponse = await contentAPI.getAllContent();
          
          if ((contentResponse.success || contentResponse.status === 'success') && contentResponse.data?.content) {
            setContent(contentResponse.data.content);
          } else {
            console.warn('Content response format unexpected:', contentResponse);
            setContent([]);
          }
        } catch (contentError) {
          console.error('Error fetching content:', contentError);
          setError('Failed to load content. Please check your API connection.');
          setContent([]);
        }
        
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load data. Please check your network connection and API availability.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle filters
  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
  };

  const handleCategoryFilterChange = (event: any) => {
    setCategoryFilter(event.target.value);
  };

  const handleDifficultyFilterChange = (event: any) => {
    setDifficultyFilter(event.target.value);
  };

  const handleContentTypeFilterChange = (event: any) => {
    setContentTypeFilter(event.target.value);
  };

  const handlePoolFilterChange = (event: any) => {
    setPoolFilter(event.target.value);
  };

  // Filter content based on tab, filters, and search
  const getFilteredContent = () => {
    return content.filter((item) => {
      // Filter by tab (status groups)
      if (tabValue === 0) { // All
        // No filtering
      } else if (tabValue === 1 && item.status !== 'published') { // Unpublished
        return false;
      } else if (tabValue === 2 && item.status !== 'pending') { // Pending
        return false;
      } else if (tabValue === 3 && item.status !== 'draft') { // Drafts
        return false;
      } else if (tabValue === 4 && item.status !== 'rejected') { // Rejected
        return false;
      }
      
      // Filter by status
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      
      // Filter by category
      if (categoryFilter !== 'all') {
        const categoryId = typeof item.category === 'string' 
          ? item.category 
          : item.category?._id;
          
        if (categoryId !== categoryFilter) {
          return false;
        }
      }
      
      // Filter by difficulty
      if (difficultyFilter !== 'all' && item.difficulty !== difficultyFilter) {
        return false;
      }
      
      // Filter by content type
      if (contentTypeFilter !== 'all' && item.contentType !== contentTypeFilter) {
        return false;
      }
      
      // Filter by pool
      if (poolFilter !== 'all' && item.pool !== poolFilter) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  };

  const filteredContent = getFilteredContent();

  // Content management functions
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await contentAPI.getAllContent();
      
      if (response.data?.content) {
        setContent(response.data.content);
      }
    } catch (err) {
      console.error('Error refreshing content:', err);
      setSnackbar({
        open: true,
        message: 'Failed to refresh content. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Dialog handlers
  const handleOpenContentDialog = (mode: 'add' | 'edit' | 'view', contentItem?: Content) => {
    setDialogMode(mode);
    
    if (mode === 'add') {
      setSelectedContent(null);
      setFormData({
        title: '',
        body: '',
        summary: '',
        category: '',
        tags: [],
        status: 'draft',
        contentType: 'hack',
        difficulty: 'beginner',
        pool: 'regular'
      });
    } else if (contentItem) {
      setSelectedContent(contentItem);
      setFormData({
        title: contentItem.title,
        body: contentItem.body,
        summary: contentItem.summary,
        category: typeof contentItem.category === 'string' 
          ? contentItem.category 
          : contentItem.category?._id || '',
        tags: contentItem.tags,
        status: contentItem.status,
        contentType: contentItem.contentType || 'hack',
        difficulty: contentItem.difficulty,
        pool: contentItem.pool || 'regular'
      });
    }
    
    setContentDialog(true);
  };

  const handleCloseContentDialog = () => {
    setContentDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    setFormData({
      ...formData,
      tags: tagsArray
    });
  };

  // Content submission
  const handleSubmitContent = async () => {
    try {
      if (dialogMode === 'add') {
        const response = await contentAPI.createContent(formData);
        
        if (response.data?.content) {
          setContent([...content, response.data.content]);
          setSnackbar({
            open: true,
            message: 'Content created successfully!',
            severity: 'success'
          });
        }
      } else if (dialogMode === 'edit' && selectedContent?._id) {
        const response = await contentAPI.updateContent(
          selectedContent._id,
          formData
        );
        
        if (response.data?.content) {
          setContent(
            content.map(item => 
              item._id === selectedContent._id ? response.data.content : item
            )
          );
          setSnackbar({
            open: true,
            message: 'Content updated successfully!',
            severity: 'success'
          });
        }
      }
      
      handleCloseContentDialog();
    } catch (err) {
      console.error('Error saving content:', err);
      setSnackbar({
        open: true,
        message: `Failed to ${dialogMode === 'add' ? 'create' : 'update'} content. Please try again.`,
        severity: 'error'
      });
    }
  };

  // Content action menu
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, contentId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveContentId(contentId);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setActiveContentId(null);
  };

  // Content actions
  const handleDeleteContent = async (contentId: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await contentAPI.deleteContent(contentId);
        
        // Remove from state
        setContent(content.filter(item => item._id !== contentId));
        
        setSnackbar({
          open: true,
          message: 'Content deleted successfully!',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error deleting content:', err);
        setSnackbar({
          open: true,
          message: 'Failed to delete content. Please try again.',
          severity: 'error'
        });
      }
    }
    handleCloseMenu();
  };

  // Open moderation dialog
  const handleOpenModerationDialog = (contentItem: Content) => {
    setSelectedContent(contentItem);
    setModerationNotes(contentItem.moderationNotes || '');
    setModerationDialog(true);
    handleCloseMenu();
  };

  const handleCloseModerationDialog = () => {
    setModerationDialog(false);
  };

  // Handle content moderation
  const handleModerateContent = async (action: 'approve' | 'reject') => {
    if (!selectedContent?._id) return;
    
    try {
      const response = await contentAPI.moderateContent(
        selectedContent._id,
        action,
        moderationNotes
      );
      
      if (response.data?.content) {
        setContent(
          content.map(item => 
            item._id === selectedContent._id ? response.data.content : item
          )
        );
        
        setSnackbar({
          open: true,
          message: `Content ${action === 'approve' ? 'approved' : 'rejected'} successfully!`,
          severity: 'success'
        });
      }
      
      handleCloseModerationDialog();
    } catch (err) {
      console.error('Error moderating content:', err);
      setSnackbar({
        open: true,
        message: `Failed to ${action} content. Please try again.`,
        severity: 'error'
      });
    }
  };
  
  // Quick moderation without dialog
  const handleQuickModeration = async (contentId: string, action: 'approve' | 'reject') => {
    try {
      const response = await contentAPI.moderateContent(
        contentId,
        action,
        `Quick ${action} via table action`
      );
      
      if (response.data?.content) {
        // Update content in the state
        setContent(
          content.map(item => 
            item._id === contentId ? response.data.content : item
          )
        );
        
        setSnackbar({
          open: true,
          message: `Content ${action === 'approve' ? 'approved' : 'rejected'}`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error with quick moderation:', err);
      setSnackbar({
        open: true,
        message: `Failed to ${action} content. Please try again.`,
        severity: 'error'
      });
    }
  };

  // Duplicate detection helper
  const isDuplicate = (contentItem: Content) => {
    if (!contentItem.title) return false;
    
    const duplicates = content.filter(item => 
      item._id !== contentItem._id && 
      item.title.toLowerCase() === contentItem.title.toLowerCase()
    );
    
    return duplicates.length > 0;
  };

  // AI content generation
  const handleOpenGenerationDialog = () => {
    if (categories.length > 0) {
      const defaultCat = categories[0];
      setGenerationCategory(defaultCat._id || '');
      if (defaultCat.promptType === 'multiple' && defaultCat.defaultNumToGenerate) {
        setGenerationCount(defaultCat.defaultNumToGenerate);
      } else {
        setGenerationCount(10);
      }
    } else {
      setGenerationCategory('');
      setGenerationCount(10);
    }
    setMultiCategoryMode(false);
    setSelectedCategories([]);
    setGenerationDialog(true);
  };

  const handleCloseGenerationDialog = () => {
    setGenerationDialog(false);
  };

  const handleGenerateContent = async () => {
    try {
      setGeneratingContent(true);
      setError(null);
      
      // Set the flag that generation is in progress (for refresh handling)
      localStorage.setItem('windspire-generation-in-progress', 'true');
      
      let categoryIdsParam: string[];
      if (multiCategoryMode) {
        if (selectedCategories.length === 0) {
          setSnackbar({
            open: true,
            message: 'Please select at least one category for multi-category generation.',
            severity: 'error'
          });
          setGeneratingContent(false);
          localStorage.removeItem('windspire-generation-in-progress');
          return;
        }
        categoryIdsParam = selectedCategories;
      } else {
        if (!generationCategory) {
          setSnackbar({
            open: true,
            message: 'Please select a category for single-category generation.',
            severity: 'error'
          });
          setGeneratingContent(false);
          localStorage.removeItem('windspire-generation-in-progress');
          return;
        }
        categoryIdsParam = [generationCategory];
      }

      // Calculate total expected items
      const totalItems = categoryIdsParam.length * generationCount;
      
      // Initialize progress tracking with better details for individual items
      setGenerationProgress({
        total: categoryIdsParam.length,
        completed: 0,
        currentCategory: null,
        currentItemInCategory: 0,
        totalItemsInCategory: generationCount,
        results: []
      });

      // Reset page to 0 to show new content at the top
      setPage(0);

      // For better UX, we'll process one category at a time
      const allGeneratedContent: Content[] = [];
      const results: Array<{
        categoryId: string;
        categoryName: string;
        success: boolean;
        count: number;
        error?: string;
      }> = [];

      for (let i = 0; i < categoryIdsParam.length; i++) {
        const categoryId = categoryIdsParam[i];
        const category = categories.find(c => c._id === categoryId);
        if (!category) continue;

        // Update progress
        setGenerationProgress(prev => ({
          ...prev,
          currentCategory: category.name,
          completed: i,
          currentItemInCategory: 0
        }));

        try {
          console.log(`Generating content for ${category.name} using model: ${selectedModel}`);
          
          // Generate content for this category with selected model
          const response = await contentAPI.generateMultipleContent(
            categoryId,
            undefined, // Let server use category's contentType
            generationCount,
            'beginner',
            selectedModel // Pass the selected model
          );

          if (response.data?.content) {
            // Show progress for individual items
            for (let j = 0; j < response.data.content.length; j++) {
              // Update item progress (slight delay to show animation)
              await new Promise(resolve => setTimeout(resolve, 100));
              setGenerationProgress(prev => ({
                ...prev,
                currentItemInCategory: j + 1
              }));
            }
            
            allGeneratedContent.push(...response.data.content);
            results.push({
              categoryId,
              categoryName: category.name,
              success: true,
              count: response.data.content.length
            });
          } else {
            results.push({
              categoryId,
              categoryName: category.name,
              success: false,
              count: 0,
              error: 'No content was returned'
            });
          }
        } catch (err: any) {
          console.error(`Error generating content for ${category.name}:`, err);
          results.push({
            categoryId,
            categoryName: category.name,
            success: false,
            count: 0,
            error: err.message || 'Unknown error'
          });
        }
      }

      // Update progress to completion
      setGenerationProgress(prev => ({
        ...prev,
        completed: prev.total,
        currentCategory: null,
        currentItemInCategory: prev.totalItemsInCategory,
        results
      }));
 
      // Process and split bullet-pointed content
      const processedContent: Content[] = [];
      allGeneratedContent.forEach(item => {
        const splitItems = splitBulletPointContent(item);
        processedContent.push(...splitItems);
      });

      // Update content state with new content
      if (processedContent.length > 0) {
        setContent(prevContent => [...processedContent, ...prevContent]);
        
        // Show a notification about where to find the content
        setSnackbar({
          open: true,
          message: `${processedContent.length} new content items have been added to the top of the list`,
          severity: 'info'
        });
      }

      // Show summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalGenerated = processedContent.length;

      setSnackbar({
        open: true,
        message: `Generated ${totalGenerated} items across ${successful} categories. ${failed > 0 ? `Failed: ${failed} categories.` : ''}`,
        severity: failed > 0 ? 'warning' : 'success'
      });

      // Clear the generation in progress flag
      localStorage.removeItem('windspire-generation-in-progress');

      // Don't close dialog on error so user can see details
      if (failed === 0) {
        handleCloseGenerationDialog();
      }
    } catch (err: any) {
      console.error('Error in batch generation:', err);
      
      let errorMessage = 'Error during batch content generation';
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });

      // Clear the generation in progress flag
      localStorage.removeItem('windspire-generation-in-progress');
    } finally {
      setGeneratingContent(false);
    }
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get category name by id
  const getCategoryName = (categoryId: string | Category | undefined): string => {
    if (!categoryId) return 'Unknown';
    
    if (typeof categoryId !== 'string') {
      return categoryId.name;
    }
    
    const category = categories.find(cat => cat._id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Render content status chip
  const renderStatusChip = (status: Content['status']) => {
    const statusConfig: Record<Content['status'], { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
      draft: { label: 'Draft', color: 'default' },
      pending: { label: 'Pending Review', color: 'warning' },
      published: { label: 'Published', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' }
    };
    
    const config = statusConfig[status];
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  // Helper to split bullet-pointed content into separate items
  const splitBulletPointContent = (content: Content): Content[] => {
    // If the content doesn't have title and body, return as is
    if (!content.body || typeof content.body !== 'string') {
      return [content];
    }
    
    // Check if content appears to be a bullet-point list
    const body = content.body;
    
    // Common bullet point patterns: "- ", "• ", "* ", "1. ", numbered items, etc.
    const bulletPointRegex = /(?:^|\n)(?:[-•*]|\d+\.)\s+(.*?)(?=(?:\n[-•*]|\n\d+\.|\n\n|$))/gs;
    const matches = [...body.matchAll(bulletPointRegex)];
    
    // If we didn't find multiple bullet points, return original content
    if (matches.length <= 1) {
      return [content];
    }
    
    // Split into multiple content items, one for each bullet point
    const contentItems: Content[] = [];
    
    // Common title pattern (if the title looks like a list title)
    const titlePattern = /^(.+?)(?:\:|\-|–|—|\.|$)/;
    const titleMatch = content.title.match(titlePattern);
    const baseTitle = titleMatch ? titleMatch[1].trim() : content.title;
    
    // Extract bullet points
    matches.forEach((match, index) => {
      if (!match[1]) return; // Skip if no content in group
      
      const bulletText = match[1].trim();
      if (bulletText.length < 10) return; // Skip very short bullet points
      
      // Create a title from the bullet point
      const bulletTitle = bulletText.length > 50 
        ? bulletText.substring(0, 47) + '...' 
        : bulletText;
      
      // Format the new title (either use "Title - Point" or just "Point")
      const newTitle = baseTitle.length > 0 && baseTitle.length < 30
        ? `${baseTitle} - ${bulletTitle.charAt(0).toUpperCase() + bulletTitle.slice(1)}`
        : bulletTitle.charAt(0).toUpperCase() + bulletTitle.slice(1);
      
      // Create new content item for this bullet point
      const newContent: Content = {
        ...content,
        _id: undefined, // Remove ID so a new one will be created
        title: newTitle,
        body: bulletText,
        summary: bulletText.substring(0, Math.min(bulletText.length, 120)) + (bulletText.length > 120 ? '...' : '')
      };
      
      contentItems.push(newContent);
    });
    
    // If we successfully extracted bullet points, return them
    // Otherwise return the original content
    return contentItems.length > 0 ? contentItems : [content];
  };

  // Find duplicates across the entire content array
  const findAllDuplicates = () => {
    const titleMap = new Map<string, Content[]>();
    
    // Group by normalized title (lowercase, no punctuation)
    content.forEach(item => {
      const normalizedTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '');
      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }
      titleMap.get(normalizedTitle)?.push(item);
    });
    
    // Filter groups with more than one item (actual duplicates)
    const duplicateGroups: { title: string; items: Content[] }[] = [];
    titleMap.forEach((items, normalizedTitle) => {
      if (items.length > 1) {
        duplicateGroups.push({
          title: items[0].title, // Use the first item's title as the group name
          items
        });
      }
    });
    
    return duplicateGroups;
  };
  
  // Open duplicate management dialog
  const handleOpenDuplicateDialog = () => {
    const duplicates = findAllDuplicates();
    setDuplicateSets(duplicates);
    setSelectedDuplicateSet(0);
    setSelectedDuplicates([]);
    setDuplicateDialog(true);
  };
  
  // Close duplicate management dialog
  const handleCloseDuplicateDialog = () => {
    setDuplicateDialog(false);
  };
  
  // Handle duplicate selection
  const handleDuplicateSelect = (contentId: string) => {
    setSelectedDuplicates(prev => {
      if (prev.includes(contentId)) {
        return prev.filter(id => id !== contentId);
      } else {
        return [...prev, contentId];
      }
    });
  };
  
  // Handle duplicate rewrite
  const handleRewriteDuplicate = async (contentId: string) => {
    try {
      const contentItem = content.find(item => item._id === contentId);
      if (!contentItem) return;
      
      setSnackbar({
        open: true,
        message: 'Rewriting duplicate content...',
        severity: 'info'
      });
      
      // Use o3 model for rewriting for best quality
      const response = await contentAPI.rewriteContent(
        contentId,
        'o3' // Specifically use o3 for rewriting to ensure high quality and uniqueness
      );
      
      if (response.data?.content) {
        // Update the content in the list
        setContent(prevContent => 
          prevContent.map(item => item._id === contentId ? response.data?.content : item)
        );
        
        setSnackbar({
          open: true,
          message: 'Content successfully rewritten',
          severity: 'success'
        });
        
        // Update duplicate sets
        const remainingDuplicates = findAllDuplicates();
        setDuplicateSets(remainingDuplicates);
      }
    } catch (err) {
      console.error('Error rewriting content:', err);
      setSnackbar({
        open: true,
        message: 'Failed to rewrite content. Please try again.',
        severity: 'error'
      });
    }
  };

  // Delete selected duplicates
  const handleDeleteSelectedDuplicates = async () => {
    if (selectedDuplicates.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedDuplicates.length} duplicate items?`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      let deletedCount = 0;
      let errors = [];
      
      // Delete each selected duplicate with individual error handling
      for (const contentId of selectedDuplicates) {
        try {
          await contentAPI.deleteContent(contentId);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting content ID ${contentId}:`, err);
          errors.push(contentId);
        }
      }
      
      // Update local state - remove successfully deleted items
      setContent(prevContent => 
        prevContent.filter(item => !selectedDuplicates.includes(item._id || '') || errors.includes(item._id || ''))
      );
      
      // Reset selection and update duplicate sets
      setSelectedDuplicates([]);
      const remainingDuplicates = findAllDuplicates();
      setDuplicateSets(remainingDuplicates);
      
      // If we've removed all duplicates in the current set, move to another set or close
      if (remainingDuplicates.length === 0) {
        handleCloseDuplicateDialog();
      } else if (!remainingDuplicates[selectedDuplicateSet]) {
        setSelectedDuplicateSet(0);
      }
      
      if (errors.length > 0) {
        setSnackbar({
          open: true,
          message: `Deleted ${deletedCount} items. Failed to delete ${errors.length} items.`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Deleted ${deletedCount} duplicate items successfully`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error in batch delete:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete duplicates. Please try again.',
        severity: 'error'
      });
    }
  };

  // Before component unmounts or on page refresh, save generation state
  useEffect(() => {
    // Save generation in progress state to localStorage
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (generatingContent) {
        // Save state
        localStorage.setItem('windspire-generation-in-progress', 'true');
        // Ask for confirmation
        e.preventDefault();
        e.returnValue = 'Content generation is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Check if there was an ongoing generation
    const checkPendingGeneration = () => {
      const pendingGeneration = localStorage.getItem('windspire-generation-in-progress');
      if (pendingGeneration === 'true') {
        setGenerationInProgress(true);
        setSnackbar({
          open: true,
          message: 'Content generation was in progress when you left. Check the content list for new items.',
          severity: 'warning'
        });
        // Clear the flag
        localStorage.removeItem('windspire-generation-in-progress');
      }
    };

    // Check on mount
    checkPendingGeneration();

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatingContent]);

  // Render loading state
  if (loading && content.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Content Management
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            startIcon={<FilterIcon />} 
            onClick={handleOpenDuplicateDialog}
            sx={{ mr: 1 }}
          >
            Manage Duplicates
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />} 
            onClick={handleDeleteSelectedContent}
            disabled={selectedContentIds.length === 0}
            sx={{ mr: 1 }}
          >
            Delete Selected ({selectedContentIds.length})
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            startIcon={<GenerateIcon />} 
            onClick={handleOpenGenerationDialog}
            sx={{ mr: 1 }}
          >
            Generate
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenContentDialog('add')}
          >
            Add Content
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Content" {...a11yProps(0)} />
          <Tab label="Published" {...a11yProps(1)} />
          <Tab label="Pending Review" {...a11yProps(2)} />
          <Tab label="Drafts" {...a11yProps(3)} />
          <Tab label="Rejected" {...a11yProps(4)} />
        </Tabs>
      </Paper>

      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              placeholder="Search by title..."
              fullWidth
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={9}>
            <Box display="flex" gap={2}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="pending">Pending Review</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={handleCategoryFilterChange}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={contentTypeFilter}
                  onChange={handleContentTypeFilterChange}
                  label="Content Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="hack">Hacks</MenuItem>
                  <MenuItem value="tip">Tips</MenuItem>
                  <MenuItem value="hack2">Hacks 2</MenuItem>
                  <MenuItem value="tip2">Tips 2</MenuItem>
                  <MenuItem value="quote">Quotes</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={difficultyFilter}
                  onChange={handleDifficultyFilterChange}
                  label="Difficulty"
                >
                  <MenuItem value="all">All Difficulties</MenuItem>
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Pool</InputLabel>
                <Select
                  value={poolFilter}
                  onChange={handlePoolFilterChange}
                  label="Pool"
                >
                  <MenuItem value="all">All Pools</MenuItem>
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="highly_liked">Highly Liked</MenuItem>
                  <MenuItem value="disliked">Disliked</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedContentIds.length === filteredContent.length}
                    indeterminate={selectedContentIds.length > 0 && selectedContentIds.length < filteredContent.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContentIds(filteredContent.map(item => item._id || ''));
                      } else {
                        setSelectedContentIds([]);
                      }
                    }}
                    color="primary"
                  />
                </TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Pool</TableCell>
                <TableCell>Difficulty</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Views</TableCell>
                <TableCell>Likes/Dislikes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContent
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((contentItem) => (
                  <TableRow key={contentItem._id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedContentIds.includes(contentItem._id || '')}
                        onChange={() => handleToggleContentSelection(contentItem._id || '')}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        fontWeight="medium"
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => handleOpenContentDialog('view', contentItem)}
                      >
                        {contentItem.title}
                        {isDuplicate(contentItem) && (
                          <Chip
                            label="Duplicate"
                            size="small"
                            color="warning"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contentItem.summary.length > 60
                          ? `${contentItem.summary.substring(0, 60)}...` 
                          : contentItem.summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        ID: {contentItem._id ? contentItem._id.substring(0, 8) + '...' : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{getCategoryName(contentItem.category)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={contentItem.contentType || 'Hack'} 
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={contentItem.pool || 'Regular'} 
                        color={
                          contentItem.pool === 'highly_liked' 
                            ? 'success' 
                            : contentItem.pool === 'accepted' 
                              ? 'primary' 
                              : contentItem.pool === 'disliked'
                                ? 'error'
                                : contentItem.pool === 'premium'
                                  ? 'secondary'
                                  : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={contentItem.difficulty.charAt(0).toUpperCase() + contentItem.difficulty.slice(1)} 
                        color={
                          contentItem.difficulty === 'beginner' 
                            ? 'success' 
                            : contentItem.difficulty === 'intermediate' 
                              ? 'warning' 
                              : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{renderStatusChip(contentItem.status)}</TableCell>
                    <TableCell>{contentItem.views}</TableCell>
                    <TableCell>
                      {contentItem.ratings ? `${contentItem.ratings.likes} / ${contentItem.ratings.dislikes}` : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {/* Quick moderation buttons for pending content */}
                      {contentItem.status === 'pending' && (
                        <>
                          <Tooltip title="Quick Approve">
                            <IconButton
                              onClick={() => handleQuickModeration(contentItem._id, 'approve')}
                              color="success"
                              size="small"
                              sx={{ mr: 0.5 }}
                            >
                              <ThumbUpIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Quick Reject">
                            <IconButton
                              onClick={() => handleQuickModeration(contentItem._id, 'reject')}
                              color="error"
                              size="small"
                              sx={{ mr: 0.5 }}
                            >
                              <ThumbDownIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="View">
                        <IconButton 
                          onClick={() => handleOpenContentDialog('view', contentItem)}
                          color="default"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton 
                          onClick={() => handleOpenContentDialog('edit', contentItem)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More Actions">
                        <IconButton
                          onClick={(e) => handleOpenMenu(e, contentItem._id)}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredContent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No content found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredContent.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem 
          onClick={() => {
            if (activeContentId) {
              const contentItem = content.find(item => item._id === activeContentId);
              if (contentItem) {
                handleOpenModerationDialog(contentItem);
              }
            }
          }}
        >
          <ListItemIcon>
            {activeContentId && content.find(item => item._id === activeContentId)?.status === 'pending' ? (
              <ApproveIcon color="success" />
            ) : (
              <ApproveIcon />
            )}
          </ListItemIcon>
          <ListItemText>Moderate</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (activeContentId) {
              handleDeleteContent(activeContentId);
            }
          }}
        >
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Content Dialog */}
      <Dialog open={contentDialog} onClose={handleCloseContentDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' 
            ? 'Add New Content' 
            : dialogMode === 'edit' 
              ? 'Edit Content' 
              : 'View Content'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                value={formData.title}
                onChange={handleInputChange}
                fullWidth
                required
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category || ''}
                  onChange={handleInputChange}
                  label="Category"
                  required
                  disabled={dialogMode === 'view'}
                >
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Content Type</InputLabel>
                <Select
                  name="contentType"
                  value={formData.contentType || 'hack'}
                  onChange={handleInputChange}
                  label="Content Type"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="hack">Hack</MenuItem>
                  <MenuItem value="tip">Tip</MenuItem>
                  <MenuItem value="hack2">Hack 2</MenuItem>
                  <MenuItem value="tip2">Tip 2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Difficulty</InputLabel>
                <Select
                  name="difficulty"
                  value={formData.difficulty || 'beginner'}
                  onChange={handleInputChange}
                  label="Difficulty"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Pool</InputLabel>
                <Select
                  name="pool"
                  value={formData.pool || 'regular'}
                  onChange={handleInputChange}
                  label="Pool"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="accepted">Accepted</MenuItem>
                  <MenuItem value="highly_liked">Highly Liked</MenuItem>
                  <MenuItem value="disliked">Disliked</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="summary"
                label="Summary"
                value={formData.summary}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="body"
                label="Content"
                value={formData.body}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={10}
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="tags"
                label="Tags (comma separated)"
                value={formData.tags?.join(', ')}
                onChange={handleTagsChange}
                fullWidth
                margin="dense"
                disabled={dialogMode === 'view'}
              />
            </Grid>
            {dialogMode !== 'add' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="Status"
                    disabled={dialogMode === 'view'}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="pending">Pending Review</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContentDialog}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button 
              onClick={handleSubmitContent} 
              variant="contained" 
              disabled={!formData.title || !formData.body || !formData.category}
            >
              {dialogMode === 'add' ? 'Create' : 'Update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Moderation Dialog */}
      <Dialog open={moderationDialog} onClose={handleCloseModerationDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Moderate Content</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {selectedContent?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedContent?.summary}
            </Typography>
          </Box>
          <TextField
            label="Moderation Notes"
            multiline
            rows={4}
            value={moderationNotes}
            onChange={(e) => setModerationNotes(e.target.value)}
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModerationDialog}>Cancel</Button>
          <Button 
            onClick={() => handleModerateContent('reject')} 
            variant="outlined" 
            color="error"
          >
            Reject
          </Button>
          <Button 
            onClick={() => handleModerateContent('approve')} 
            variant="contained" 
            color="success"
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Content Generation Dialog */}
      <Dialog open={generationDialog} onClose={handleCloseGenerationDialog} maxWidth="md" fullWidth>
        <DialogTitle>Generate AI Content</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Use AI to generate new content items. Select a category and how many items to generate.
              Each category will use its own content type.
            </Typography>
            {generationInProgress && (
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                A previous generation might still be in progress. Please check the content list for new items.
              </Alert>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={multiCategoryMode}
                    onChange={(e) => setMultiCategoryMode(e.target.checked)}
                  />
                }
                label="Generate for multiple categories"
              />
            </Grid>
            
            {multiCategoryMode ? (
              <Grid item xs={12}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Categories</InputLabel>
                  <Select
                    multiple
                    value={selectedCategories}
                    onChange={(e) => {
                      const value = e.target.value as string[];
                      setSelectedCategories(value);
                    }}
                    label="Categories"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((categoryId) => {
                          const category = categories.find(c => c._id === categoryId);
                          return (
                            <Chip 
                              key={categoryId} 
                              label={`${getCategoryName(categoryId)} (${category?.contentType || 'hack'})`} 
                              size="small" 
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        <ListItemIcon>
                          <Checkbox checked={selectedCategories.indexOf(category._id) > -1} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <span>
                              {category.name} 
                              <Chip 
                                label={category.contentType || 'hack'} 
                                size="small" 
                                sx={{ ml: 1 }}
                                color={
                                  category.contentType === 'hack' ? "primary" :
                                  category.contentType === 'hack2' ? "secondary" :
                                  category.contentType === 'tip' ? "info" :
                                  category.contentType === 'tip2' ? "success" : 
                                  "default"
                                }
                              />
                            </span>
                          } 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={generationCategory}
                    onChange={(e) => setGenerationCategory(e.target.value as string)}
                    label="Category"
                    required
                  >
                    {categories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.name}
                        <Chip 
                          label={category.contentType || 'hack'} 
                          size="small" 
                          sx={{ ml: 1 }}
                          color={
                            category.contentType === 'hack' ? "primary" :
                            category.contentType === 'hack2' ? "secondary" :
                            category.contentType === 'tip' ? "info" :
                            category.contentType === 'tip2' ? "success" : 
                            "default"
                          }
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Number of Items to Generate"
                type="number"
                value={generationCount}
                onChange={(e) => setGenerationCount(Math.max(1, Math.min(50, parseInt(e.target.value || "1"))))}
                fullWidth
                margin="dense"
                InputProps={{ inputProps: { min: 1, max: 50 } }}
                helperText={multiCategoryMode 
                  ? "Generate this number of items per selected category (max 50 per category)"
                  : "Generate between 1 and 50 items at once"
                }
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>AI Model</InputLabel>
                <Select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  label="AI Model"
                >
                  <ListSubheader>Flagship Models</ListSubheader>
                  {availableModels.flagship.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                  
                  <ListSubheader>Reasoning Models</ListSubheader>
                  {availableModels.reasoning.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                  
                  <ListSubheader>Cost-Efficient Models</ListSubheader>
                  {availableModels.costEfficient.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                  
                  <ListSubheader>Legacy Models</ListSubheader>
                  {availableModels.legacy.map(model => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Content Generation Summary:
                </Typography>
                <Typography variant="body2">
                  {multiCategoryMode 
                    ? `Generating ${generationCount} items for each of the ${selectedCategories.length} selected categories (${generationCount * selectedCategories.length} total)`
                    : `Generating ${generationCount} items for ${getCategoryName(generationCategory)}`
                  }
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Using model: <Chip color="primary" size="small" label={selectedModel} />
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Note: Each category will use its own configured content type. 
                  Please don't refresh the page during generation - it may cause issues.
                </Typography>
              </Box>
            </Grid>

            {/* Progress section - show when generating */}
            {generatingContent && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Generation Progress
                  </Typography>
                  
                  {/* Overall progress bar */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0} 
                        color="secondary"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {generationProgress.total > 0 ? `${Math.round((generationProgress.completed / generationProgress.total) * 100)}%` : '0%'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Current category progress - more detailed */}
                  {generationProgress.currentCategory && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Currently generating:
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {generationProgress.currentCategory}
                        <Chip 
                          size="small" 
                          label={`Category ${generationProgress.completed + 1} of ${generationProgress.total}`} 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      
                      {/* Item progress within category */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={generationProgress.totalItemsInCategory > 0 
                              ? (generationProgress.currentItemInCategory / generationProgress.totalItemsInCategory) * 100 
                              : 0
                            } 
                            color="info"
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 50 }}>
                          <Typography variant="body2" color="text.secondary">
                            {generationProgress.currentItemInCategory} / {generationProgress.totalItemsInCategory} items
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  
                  {/* Results list */}
                  {generationProgress.results.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Completed categories:
                      </Typography>
                      <List dense sx={{ bgcolor: 'background.default', borderRadius: 1, mb: 1 }}>
                        {generationProgress.results.map((result, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              {result.success 
                                ? <CheckCircle color="success" /> 
                                : <Error color="error" />
                              }
                            </ListItemIcon>
                            <ListItemText 
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="body2" fontWeight="medium">{result.categoryName}</Typography>
                                  <Chip 
                                    size="small" 
                                    label={`${result.count} items`} 
                                    color={result.success ? "success" : "error"}
                                    sx={{ ml: 1 }}
                                  />
                                </Box>
                              }
                              secondary={
                                result.success 
                                  ? `Generated ${result.count} items successfully` 
                                  : `Failed: ${result.error || 'Unknown error'}`
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGenerationDialog}>Cancel</Button>
          <Button 
            onClick={handleGenerateContent} 
            variant="contained" 
            color="secondary"
            disabled={generatingContent || (multiCategoryMode ? selectedCategories.length === 0 : !generationCategory)}
            startIcon={generatingContent ? <CircularProgress size={20} /> : <GenerateIcon />}
          >
            {generatingContent ? 'Generating...' : 'Generate Content'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Management Dialog */}
      <Dialog
        open={duplicateDialog}
        onClose={handleCloseDuplicateDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Manage Duplicate Content
          {duplicateSets.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Found {duplicateSets.length} sets of duplicates ({duplicateSets.reduce((total, set) => total + set.items.length, 0)} total items)
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {duplicateSets.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">No duplicate content found!</Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Tabs
                  value={selectedDuplicateSet}
                  onChange={(e, newValue) => {
                    setSelectedDuplicateSet(newValue);
                    setSelectedDuplicates([]);
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ flexGrow: 1 }}
                >
                  {duplicateSets.map((set, index) => (
                    <Tab 
                      key={index} 
                      label={`Group ${index + 1} (${set.items.length} items)`} 
                      {...a11yProps(index)} 
                    />
                  ))}
                </Tabs>
              </Box>
              
              {duplicateSets.length > selectedDuplicateSet && (
                <Box>
                  <Paper sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Duplicate Group: "{duplicateSets[selectedDuplicateSet].title}"
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You can delete duplicates, or rewrite them to make them unique. Rewriting preserves the same information but creates unique wording.
                    </Typography>
                  </Paper>
                  
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox 
                              checked={selectedDuplicates.length === duplicateSets[selectedDuplicateSet].items.length}
                              indeterminate={selectedDuplicates.length > 0 && selectedDuplicates.length < duplicateSets[selectedDuplicateSet].items.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDuplicates(duplicateSets[selectedDuplicateSet].items.map(item => item._id || '').filter(Boolean));
                                } else {
                                  setSelectedDuplicates([]);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Views</TableCell>
                          <TableCell>Likes/Dislikes</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {duplicateSets[selectedDuplicateSet].items.map((item) => (
                          <TableRow 
                            key={item._id}
                            selected={selectedDuplicates.includes(item._id || '')}
                            hover
                          >
                            <TableCell padding="checkbox">
                              <Checkbox 
                                checked={selectedDuplicates.includes(item._id || '')}
                                onChange={() => handleDuplicateSelect(item._id || '')}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                ID: {item._id ? item._id.substring(0, 8) + '...' : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>{getCategoryName(item.category)}</TableCell>
                            <TableCell>{renderStatusChip(item.status)}</TableCell>
                            <TableCell>{item.views}</TableCell>
                            <TableCell>
                              {item.ratings ? `${item.ratings.likes} / ${item.ratings.dislikes}` : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Rewrite Content">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => handleRewriteDuplicate(item._id || '')}
                                >
                                  <AutoFixHighIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    handleCloseDuplicateDialog();
                                    handleOpenContentDialog('view', item);
                                  }}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    handleCloseDuplicateDialog();
                                    handleOpenContentDialog('edit', item);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDuplicateDialog}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="warning"
            disabled={selectedDuplicates.length === 0}
            onClick={() => {
              const selectedItems = duplicateSets[selectedDuplicateSet].items
                .filter(item => selectedDuplicates.includes(item._id || ''));
              
              // Keep the first item, rewrite the rest
              if (selectedItems.length > 1) {
                const itemsToRewrite = selectedItems.slice(1);
                itemsToRewrite.forEach(item => {
                  handleRewriteDuplicate(item._id || '');
                });
              }
            }}
            startIcon={<AutoFixHighIcon />}
          >
            Rewrite Selected ({selectedDuplicates.length})
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={selectedDuplicates.length === 0}
            onClick={handleDeleteSelectedDuplicates}
            startIcon={<DeleteIcon />}
          >
            Delete Selected ({selectedDuplicates.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContentManager; 