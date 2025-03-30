// Global state
let currentTags = [];
let currentNodeName = '';
let currentNodeId = '';
let preferences = {
  layout: 'portrait',
  theme: 'light',
  autosave: true
};
let autosaveTimer = null;
let allTags = []; // For tag suggestions
let allElements = []; // For explore tab
let activeTab = 'metadata';
let activeFilterTags = []; // For filtering elements in explore tab

document.addEventListener('DOMContentLoaded', function() {
  // Initialize
  parent.postMessage({ pluginMessage: { type: 'get-metadata' } }, '*');
  parent.postMessage({ pluginMessage: { type: 'get-all-tags' } }, '*');
  parent.postMessage({ pluginMessage: { type: 'get-all-elements' } }, '*');
  
  // Tab switching
  setupTabSwitching();
  
  // Settings panel toggle
  setupSettingsPanel();
  
  // Tag input handling
  setupTagInputs();
  
  // URL field handling
  setupUrlFields();
  
  // Save buttons
  setupSaveButtons();
  
  // Resize functionality
  setupResizeHandles();
  
  // Listen for messages from the plugin
  setupPluginMessageListener();
  
  // Handle clicks outside the settings panel
  setupOutsideClickHandling();
});

// Tab switching functionality
function setupTabSwitching() {
  // Portrait tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Landscape tabs
  document.querySelectorAll('.landscape-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName, true);
    });
  });
}

function switchTab(tabName, isLandscape = false) {
  activeTab = tabName;
  
  // Update tab buttons
  const tabSelector = isLandscape ? '.landscape-tabs .tab-btn' : '.tabs-navigation:not(.landscape-tabs) .tab-btn';
  document.querySelectorAll(tabSelector).forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });
  
  // Update tab content visibility
  if (isLandscape) {
    // Handle landscape tabs
    document.querySelectorAll('.landscape-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.getElementById(`landscape-${tabName}-tab`).classList.add('active');
    
    // Update main content in landscape mode
    document.querySelectorAll('.landscape-main-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`landscape-main-${tabName}`).classList.add('active');
  } else {
    // Handle portrait tabs
    document.querySelectorAll('.tab-content:not(.landscape-tab)').forEach(tab => {
      tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }
  
  // If switching to explore tab and we haven't loaded elements yet
  if (tabName === 'explore' && allElements.length === 0) {
    parent.postMessage({ pluginMessage: { type: 'get-all-elements' } }, '*');
  }
  
  // Also switch the other layout's tabs to maintain consistency
  if (!isLandscape) {
    const landscapeTabBtn = document.querySelector(`.landscape-tabs .tab-btn[data-tab="${tabName}"]`);
    if (landscapeTabBtn) {
      landscapeTabBtn.click();
    }
  } else {
    const portraitTabBtn = document.querySelector(`.tabs-navigation:not(.landscape-tabs) .tab-btn[data-tab="${tabName}"]`);
    if (portraitTabBtn) {
      portraitTabBtn.click();
    }
  }
}

// Settings panel functionality
function setupSettingsPanel() {
  document.getElementById('settings-trigger').addEventListener('click', function() {
    const panel = document.getElementById('settings-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });
  
  document.getElementById('landscape-settings-trigger').addEventListener('click', function() {
    const panel = document.getElementById('settings-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });
  
  document.getElementById('close-settings').addEventListener('click', function() {
    document.getElementById('settings-panel').style.display = 'none';
  });
  
  // Settings options
  document.querySelectorAll('.toggle-option').forEach(option => {
    option.addEventListener('click', function() {
      // Update UI
      const parent = this.parentElement;
      parent.querySelectorAll('.toggle-option').forEach(opt => {
        opt.classList.remove('active');
      });
      this.classList.add('active');
      
      // Get setting type and value
      const settingType = parent.parentElement.querySelector('label').textContent.toLowerCase().trim();
      const value = this.getAttribute('data-value');
      
      // Update preferences
      if (settingType === 'layout') {
        preferences.layout = value;
        updateLayout(value);
      } else if (settingType === 'theme') {
        preferences.theme = value;
        updateTheme(value);
      }
      
      // Save preferences
      parent.postMessage({ 
        pluginMessage: { 
          type: 'update-preferences', 
          preferences 
        } 
      }, '*');
    });
  });
  
  // Autosave toggle
  document.getElementById('autosave-toggle').addEventListener('change', function() {
    preferences.autosave = this.checked;
    updateAutosave();
    
    // Save preferences
    parent.postMessage({ 
      pluginMessage: { 
        type: 'update-preferences', 
        preferences 
      } 
    }, '*');
  });
}

// Tag input handling
function setupTagInputs() {
  // Portrait tag input
  const tagInput = document.getElementById('tagInput');
  tagInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && this.value.trim() !== '') {
      addTag(this.value.trim());
      this.value = '';
      e.preventDefault();
      autosaveDraft();
    }
  });
  
  tagInput.addEventListener('input', function() {
    showTagSuggestions(this.value.trim(), 'tagSuggestions');
  });
  
  tagInput.addEventListener('blur', function() {
    setTimeout(() => {
      document.getElementById('tagSuggestions').style.display = 'none';
    }, 200);
  });
  
  // Landscape tag input
  const landscapeTagInput = document.getElementById('landscapeTagInput');
  landscapeTagInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && this.value.trim() !== '') {
      addTag(this.value.trim());
      this.value = '';
      e.preventDefault();
      autosaveDraft();
    }
  });
  
  landscapeTagInput.addEventListener('input', function() {
    showTagSuggestions(this.value.trim(), 'landscapeTagSuggestions');
  });
  
  landscapeTagInput.addEventListener('blur', function() {
    setTimeout(() => {
      document.getElementById('landscapeTagSuggestions').style.display = 'none';
    }, 200);
  });
}

// URL field handling
function setupUrlFields() {
  // Source URL input for portrait
  document.getElementById('sourceUrl').addEventListener('input', function() {
    const url = this.value.trim();
    const openLinkBtn = document.getElementById('openLink');
    const copyLinkBtn = document.getElementById('copyLink');
    
    if (url) {
      openLinkBtn.style.display = 'inline-flex';
      copyLinkBtn.style.display = 'inline-flex';
    } else {
      openLinkBtn.style.display = 'none';
      copyLinkBtn.style.display = 'none';
    }
    
    // Sync with landscape view
    document.getElementById('landscapeSourceUrl').value = url;
    syncUrlButtons();
    
    autosaveDraft();
  });
  
  // Source URL input for landscape
  document.getElementById('landscapeSourceUrl').addEventListener('input', function() {
    const url = this.value.trim();
    
    // Sync with portrait view
    document.getElementById('sourceUrl').value = url;
    syncUrlButtons();
    
    autosaveDraft();
  });
  
  // Notes input for portrait
  document.getElementById('notes').addEventListener('input', function() {
    // Sync with landscape view
    document.getElementById('landscapeNotes').value = this.value;
    autosaveDraft();
  });
  
  // Notes input for landscape
  document.getElementById('landscapeNotes').addEventListener('input', function() {
    // Sync with portrait view
    document.getElementById('notes').value = this.value;
    autosaveDraft();
  });
  
  // Open link for portrait
  document.getElementById('openLink').addEventListener('click', function() {
    const url = document.getElementById('sourceUrl').value.trim();
    if (url) {
      window.open(url, '_blank');
    }
  });
  
  // Open link for landscape
  document.getElementById('landscapeOpenLink').addEventListener('click', function() {
    const url = document.getElementById('landscapeSourceUrl').value.trim();
    if (url) {
      window.open(url, '_blank');
    }
  });
  
  // Copy link for portrait
  document.getElementById('copyLink').addEventListener('click', function() {
    const url = document.getElementById('sourceUrl').value.trim();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('URL copied to clipboard');
      });
    }
  });
  
  // Copy link for landscape
  document.getElementById('landscapeCopyLink').addEventListener('click', function() {
    const url = document.getElementById('landscapeSourceUrl').value.trim();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('URL copied to clipboard');
      });
    }
  });
}

// Save button functionality
function setupSaveButtons() {
  // Save button for portrait
  document.getElementById('saveBtn').addEventListener('click', function() {
    saveMetadata();
  });
  
  // Save button for landscape
  document.getElementById('landscapeSaveBtn').addEventListener('click', function() {
    saveMetadata();
  });
}

// Resize functionality
function setupResizeHandles() {
  const resizeHandle = document.getElementById('resize-handle');
  const landscapeResizeHandle = document.getElementById('landscape-resize-handle');
  
  let isResizing = false;
  let startWidth, startHeight;
  
  const startResize = (e) => {
    isResizing = true;
    startWidth = window.innerWidth;
    startHeight = window.innerHeight;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
  };
  
  const resize = (e) => {
    if (!isResizing) return;
    
    const newWidth = startWidth + (e.clientX - startWidth);
    const newHeight = startHeight + (e.clientY - startHeight);
    
    // Minimum size constraints
    const minWidth = preferences.layout === 'landscape' ? 580 : 280;
    const minHeight = preferences.layout === 'landscape' ? 300 : 400;
    
    const width = Math.max(minWidth, newWidth);
    const height = Math.max(minHeight, newHeight);
    
    // Tell the plugin to resize
    parent.postMessage({
      pluginMessage: {
        type: 'resize',
        width,
        height
      }
    }, '*');
  };
  
  const stopResize = () => {
    isResizing = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
  };
  
  resizeHandle.addEventListener('mousedown', startResize);
  landscapeResizeHandle.addEventListener('mousedown', startResize);
}

// Plugin message listener
function setupPluginMessageListener() {
  window.onmessage = (event) => {
    const msg = event.data.pluginMessage;
    
    if (msg.type === 'init-preferences') {
      preferences = msg.preferences;
      updateLayout(preferences.layout);
      updateTheme(preferences.theme);
      updateAutosave();
      
      // Update autosave toggle
      document.getElementById('autosave-toggle').checked = preferences.autosave;
      
      // Update settings panel to match preferences
      document.querySelectorAll('.toggle-group').forEach(group => {
        const label = group.parentElement.querySelector('label').textContent.toLowerCase().trim();
        let value;
        
        if (label === 'layout') value = preferences.layout;
        else if (label === 'theme') value = preferences.theme;
        
        if (value) {
          group.querySelectorAll('.toggle-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-value') === value) {
              option.classList.add('active');
            }
          });
        }
      });
    }
    else if (msg.type === 'metadata-loaded') {
      displayMetadata(msg.data);
      updateLayerInfo(msg.nodeName, msg.nodeId);
      toggleEmptyState(false);
    } 
    else if (msg.type === 'draft-loaded') {
      displayMetadata(msg.data);
      updateLayerInfo(msg.nodeName, msg.nodeId);
      displayMessage('Continuing from your unsaved draft', 'info');
      toggleEmptyState(false);
      
      // Show draft indicator
      document.getElementById('status-indicator').style.display = 'flex';
      document.getElementById('landscape-status-indicator').style.display = 'flex';
    } 
    else if (msg.type === 'new-element') {
      clearForm();
      updateLayerInfo(msg.nodeName, msg.nodeId);
      displayMessage('Add metadata to this element', 'info');
      toggleEmptyState(false);
    } 
    else if (msg.type === 'no-selection') {
      displayMessage('Select an element to view or edit its metadata', 'warning');
      clearForm();
      toggleEmptyState(true);
    }
    else if (msg.type === 'selection-changed') {
      parent.postMessage({ pluginMessage: { type: 'get-metadata' } }, '*');
    }
    else if (msg.type === 'all-tags') {
      allTags = msg.tags || [];
      updateFilterTags();
    }
    else if (msg.type === 'all-elements') {
      allElements = msg.elements || [];
      renderElementsList();
      
      // Show empty state if no elements
      const exploreEmptyState = document.getElementById('explore-empty-state');
      if (allElements.length === 0) {
        exploreEmptyState.style.display = 'flex';
      } else {
        exploreEmptyState.style.display = 'none';
      }
    }
  };
}

// Outside click handling for settings panel
function setupOutsideClickHandling() {
  document.addEventListener('click', function(event) {
    const panel = document.getElementById('settings-panel');
    const settingsTrigger = document.getElementById('settings-trigger');
    const landscapeSettingsTrigger = document.getElementById('landscape-settings-trigger');
    const closeBtn = document.getElementById('close-settings');
    
    if (panel.style.display === 'block' && 
        !panel.contains(event.target) && 
        event.target !== settingsTrigger &&
        event.target !== landscapeSettingsTrigger &&
        event.target !== closeBtn &&
        !settingsTrigger.contains(event.target) &&
        !landscapeSettingsTrigger.contains(event.target)) {
      panel.style.display = 'none';
    }
  });
}

// Show tag suggestions
function showTagSuggestions(query, containerId) {
  const container = document.getElementById(containerId);
  
  // Clear previous suggestions
  container.innerHTML = '';
  
  if (!query || query.length < 2) {
    container.style.display = 'none';
    return;
  }
  
  // Filter tags based on query
  const filteredTags = allTags.filter(tag => 
    tag.toLowerCase().includes(query.toLowerCase()) && 
    !currentTags.includes(tag)
  );
  
  if (filteredTags.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  // Create and append suggestion items
  filteredTags.slice(0, 5).forEach(tag => {
    const item = document.createElement('div');
    item.className = 'tag-suggestion-item';
    item.textContent = tag;
    
    item.addEventListener('click', () => {
      addTag(tag);
      
      // Clear input and hide suggestions
      if (containerId === 'tagSuggestions') {
        document.getElementById('tagInput').value = '';
      } else {
        document.getElementById('landscapeTagInput').value = '';
      }
      
      container.style.display = 'none';
      autosaveDraft();
    });
    
    container.appendChild(item);
  });
  
  container.style.display = 'block';
}

// Update layout
function updateLayout(layout) {
  if (layout === 'landscape') {
    document.getElementById('portrait-container').style.display = 'none';
    document.getElementById('landscape-container').style.display = 'flex';
  } else {
    document.getElementById('portrait-container').style.display = 'flex';
    document.getElementById('landscape-container').style.display = 'none';
  }
}

// Update theme
function updateTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

// Update autosave
function updateAutosave() {
  if (preferences.autosave) {
    document.getElementById('status-indicator').style.display = 'flex';
    document.getElementById('landscape-status-indicator').style.display = 'flex';
  } else {
    document.getElementById('status-indicator').style.display = 'none';
    document.getElementById('landscape-status-indicator').style.display = 'none';
    
    // Clear any existing autosave timer
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
  }
}

// Sync URL buttons
function syncUrlButtons() {
  const url = document.getElementById('sourceUrl').value.trim();
  const openLinkBtn = document.getElementById('openLink');
  const copyLinkBtn = document.getElementById('copyLink');
  const landscapeOpenLinkBtn = document.getElementById('landscapeOpenLink');
  const landscapeCopyLinkBtn = document.getElementById('landscapeCopyLink');
  
  if (url) {
    openLinkBtn.style.display = 'inline-flex';
    copyLinkBtn.style.display = 'inline-flex';
    landscapeOpenLinkBtn.style.display = 'inline-flex';
    landscapeCopyLinkBtn.style.display = 'inline-flex';
  } else {
    openLinkBtn.style.display = 'none';
    copyLinkBtn.style.display = 'none';
    landscapeOpenLinkBtn.style.display = 'none';
    landscapeCopyLinkBtn.style.display = 'none';
  }
}

// Toggle empty state
function toggleEmptyState(show) {
  const emptyState = document.getElementById('empty-state');
  const landscapeEmptyState = document.getElementById('landscape-empty-state');
  const metadataForm = document.getElementById('metadata-form');
  const landscapeForm = document.querySelector('.landscape-main .form-group');
  const landscapeSaveBtn = document.getElementById('landscapeSaveBtn');
  
  if (show) {
    emptyState.style.display = 'flex';
    landscapeEmptyState.style.display = 'flex';
    metadataForm.style.display = 'none';
    landscapeForm.style.display = 'none';
    landscapeSaveBtn.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    landscapeEmptyState.style.display = 'none';
    metadataForm.style.display = 'block';
    landscapeForm.style.display = 'block';
    landscapeSaveBtn.style.display = 'flex';
  }
}

// Update layer info
function updateLayerInfo(nodeName, nodeId) {
  currentNodeName = nodeName;
  currentNodeId = nodeId;
  
  // Update portrait view
  document.getElementById('layerName').textContent = nodeName;
  document.getElementById('layer-info').style.display = 'flex';
  
  // Update landscape view
  document.getElementById('landscapeLayerName').textContent = nodeName;
  document.getElementById('landscape-layer-info').style.display = 'flex';
}

// Display metadata
function displayMetadata(data) {
  // Clear any messages in both views
  document.getElementById('message-container').innerHTML = '';
  document.getElementById('landscape-message-container').innerHTML = '';
  
  const sourceUrl = data.sourceUrl || '';
  const notes = data.notes || '';
  
  // Update portrait view
  document.getElementById('sourceUrl').value = sourceUrl;
  document.getElementById('notes').value = notes;
  
  // Update landscape view
  document.getElementById('landscapeSourceUrl').value = sourceUrl;
  document.getElementById('landscapeNotes').value = notes;
  
  // Update link buttons
  syncUrlButtons();
  
  // Update tags
  currentTags = data.tags || [];
  updateTagsDisplay();
  updateLandscapeTagsDisplay();
}

// Display message
function displayMessage(message, type = 'info') {
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message ${type}`;
  
  // Add icon based on message type
  let iconSvg = '';
  let title = '';
  
  if (type === 'warning') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="message-icon">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`;
    title = 'Attention';
  } else if (type === 'success') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="message-icon">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`;
    title = 'Success';
  } else {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="message-icon">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`;
    title = 'Info';
  }
  
  messageElement.innerHTML = `
    ${iconSvg}
    <div class="message-content">
      <div class="message-title">${title}</div>
      <div class="message-text">${message}</div>
    </div>
  `;
  
  // Update both portrait and landscape views
  document.getElementById('message-container').innerHTML = '';
  document.getElementById('message-container').appendChild(messageElement.cloneNode(true));
  
  document.getElementById('landscape-message-container').innerHTML = '';
  document.getElementById('landscape-message-container').appendChild(messageElement);
}

// Clear form
function clearForm() {
  // Clear portrait view
  document.getElementById('sourceUrl').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('openLink').style.display = 'none';
  document.getElementById('copyLink').style.display = 'none';
  
  // Clear landscape view
  document.getElementById('landscapeSourceUrl').value = '';
  document.getElementById('landscapeNotes').value = '';
  document.getElementById('landscapeOpenLink').style.display = 'none';
  document.getElementById('landscapeCopyLink').style.display = 'none';
  
  // Clear status indicators
  document.getElementById('status-indicator').style.display = 'none';
  document.getElementById('landscape-status-indicator').style.display = 'none';
  
  // Hide layer info
  document.getElementById('layer-info').style.display = 'none';
  document.getElementById('landscape-layer-info').style.display = 'none';
  
  // Clear tags
  currentTags = [];
  updateTagsDisplay();
  updateLandscapeTagsDisplay();
  
  // Clear node ID
  currentNodeId = '';
}

// Add tag
function addTag(tag) {
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    updateTagsDisplay();
    updateLandscapeTagsDisplay();
  }
}

// Remove tag
function removeTag(tag) {
  currentTags = currentTags.filter(t => t !== tag);
  updateTagsDisplay();
  updateLandscapeTagsDisplay();
  autosaveDraft();
}

// Update tags display for portrait
function updateTagsDisplay() {
  const container = document.getElementById('tagsContainer');
  container.innerHTML = '';
  
  if (currentTags.length === 0) {
    return;
  }
  
  currentTags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.innerHTML = `${tag} <span class="tag-remove">×</span>`;
    
    tagElement.querySelector('.tag-remove').addEventListener('click', function() {
      removeTag(tag);
    });
    
    container.appendChild(tagElement);
  });
}

// Update tags display for landscape
function updateLandscapeTagsDisplay() {
  const container = document.getElementById('landscapeTagsContainer');
  container.innerHTML = '';
  
  if (currentTags.length === 0) {
    return;
  }
  
  currentTags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.innerHTML = `${tag} <span class="tag-remove">×</span>`;
    
    tagElement.querySelector('.tag-remove').addEventListener('click', function() {
      removeTag(tag);
    });
    
    container.appendChild(tagElement);
  });
}

// Save metadata
function saveMetadata() {
  // Get values from form
  const sourceUrl = document.getElementById('sourceUrl').value;
  const notes = document.getElementById('notes').value;
  
  parent.postMessage({
    pluginMessage: {
      type: 'save-metadata',
      sourceUrl,
      tags: currentTags,
      notes
    }
  }, '*');
  
  // Show success message
  displayMessage('Metadata saved successfully!', 'success');
  
  // Hide draft indicator
  document.getElementById('status-indicator').style.display = 'none';
  document.getElementById('landscape-status-indicator').style.display = 'none';
  
  // Refresh the elements list if we're in explore tab
  if (activeTab === 'explore') {
    parent.postMessage({ pluginMessage: { type: 'get-all-elements' } }, '*');
  }
}

// Autosave draft
function autosaveDraft() {
  if (!preferences.autosave) return;
  
  // Clear any existing timer
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }
  
  // Set new timer to save after a short delay
  autosaveTimer = setTimeout(() => {
    // Get values from form
    const sourceUrl = document.getElementById('sourceUrl').value;
    const notes = document.getElementById('notes').value;
    
    parent.postMessage({
      pluginMessage: {
        type: 'save-draft',
        sourceUrl,
        tags: currentTags,
        notes
      }
    }, '*');
    
    // Show draft indicator
    document.getElementById('status-indicator').style.display = 'flex';
    document.getElementById('landscape-status-indicator').style.display = 'flex';
  }, 1000); // 1 second delay
}

// Show toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  toastMessage.textContent = message;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Update filter tags in explore tab
function updateFilterTags() {
  const filterContainer = document.getElementById('filterTagsContainer');
  const landscapeFilterContainer = document.getElementById('landscapeFilterTagsContainer');
  
  // Clear existing tags
  filterContainer.innerHTML = '';
  landscapeFilterContainer.innerHTML = '';
  
  // Create filter tags from all unique tags
  allTags.forEach(tag => {
    // Portrait filter tag
    const filterTag = document.createElement('div');
    filterTag.className = 'filter-tag';
    filterTag.textContent = tag;
    filterTag.dataset.tag = tag;
    
    if (activeFilterTags.includes(tag)) {
      filterTag.classList.add('active');
    }
    
    filterTag.addEventListener('click', () => {
      toggleFilterTag(tag);
    });
    
    filterContainer.appendChild(filterTag);
    
    // Landscape filter tag
    const landscapeFilterTag = filterTag.cloneNode(true);
    landscapeFilterTag.addEventListener('click', () => {
      toggleFilterTag(tag);
    });
    
    landscapeFilterContainer.appendChild(landscapeFilterTag);
  });
}

// Toggle filter tag
function toggleFilterTag(tag) {
  if (activeFilterTags.includes(tag)) {
    activeFilterTags = activeFilterTags.filter(t => t !== tag);
  } else {
    activeFilterTags.push(tag);
  }
  
  // Update UI
  document.querySelectorAll(`.filter-tag[data-tag="${tag}"]`).forEach(el => {
    el.classList.toggle('active');
  });
  
  // Filter elements
  filterElements();
}

// Filter elements based on active filter tags and search query
function filterElements() {
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  const landscapeSearchQuery = document.getElementById('landscapeSearchInput').value.toLowerCase();
  
  // Filter elements based on tags and search query
  let filteredElements = allElements;
  
  if (activeFilterTags.length > 0) {
    filteredElements = filteredElements.filter(element => {
      return activeFilterTags.every(tag => element.tags.includes(tag));
    });
  }
  
  if (searchQuery) {
    filteredElements = filteredElements.filter(element => {
      return (
        element.nodeName.toLowerCase().includes(searchQuery) ||
        (element.sourceUrl && element.sourceUrl.toLowerCase().includes(searchQuery)) ||
        element.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
        (element.notes && element.notes.toLowerCase().includes(searchQuery))
      );
    });
  }
  
  // Render filtered elements
  renderElementsList(filteredElements);
}

// Render elements list in explore tab
function renderElementsList(filteredElements = null) {
  const elements = filteredElements || allElements;
  const elementsList = document.getElementById('elements-list');
  const landscapeElementsList = document.getElementById('landscape-elements-list');
  
  // Clear loading indicators
  elementsList.innerHTML = '';
  landscapeElementsList.innerHTML = '';
  
  if (elements.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
          <line x1="16" y1="8" x2="2" y2="22"></line>
          <line x1="17.5" y1="15" x2="9" y2="15"></line>
        </svg>
      </div>
      <div class="empty-state-text">No elements found</div>
      <div class="empty-state-subtext">Try adjusting your search or filters</div>
    `;
    
    elementsList.appendChild(emptyState);
    landscapeElementsList.appendChild(emptyState.cloneNode(true));
    return;
  }
  
  // Create elements list items
  elements.forEach(element => {
    // Create element list item using template
    const templateElement = document.getElementById('element-list-item-template');
    const elementItem = document.importNode(templateElement.content, true);
    
    // Set element data
    elementItem.querySelector('.element-list-name').textContent = element.nodeName;
    
    // Add tags
    const tagsContainer = elementItem.querySelector('.element-list-tags');
    element.tags.slice(0, 3).forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'element-list-tag';
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });
    
    if (element.tags.length > 3) {
      const moreTag = document.createElement('span');
      moreTag.className = 'element-list-tag';
      moreTag.textContent = `+${element.tags.length - 3} more`;
      tagsContainer.appendChild(moreTag);
    }
    
    // Add click event to navigate to element
    const listItem = elementItem.querySelector('.element-list-item');
    listItem.addEventListener('click', () => {
      selectElement(element);
    });
    
    // Add click event to go-to button
    const goToBtn = elementItem.querySelector('.element-list-goto');
    goToBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the parent click
      navigateToElement(element.nodeId);
    });
    
    // Add the element to the list
    elementsList.appendChild(elementItem);
    
    // Create a clone for landscape mode
    const landscapeElementItem = listItem.cloneNode(true);
    landscapeElementItem.addEventListener('click', () => {
      selectElement(element);
    });
    
    landscapeElementItem.querySelector('.element-list-goto').addEventListener('click', (e) => {
      e.stopPropagation();
      navigateToElement(element.nodeId);
    });
    
    landscapeElementsList.appendChild(landscapeElementItem);
  });
  
  // Add search functionality for explore tab
  setupSearch();
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const landscapeSearchInput = document.getElementById('landscapeSearchInput');
  
  searchInput.addEventListener('input', filterElements);
  landscapeSearchInput.addEventListener('input', function() {
    searchInput.value = this.value;
    filterElements();
  });
}

// Select element from list
function selectElement(element) {
  // Show element details
  const detailElement = document.getElementById('element-detail');
  detailElement.innerHTML = '';
  
  // Create element detail using template
  const templateElement = document.getElementById('element-detail-template');
  const detailContent = document.importNode(templateElement.content, true);
  
  // Set element data
  detailContent.querySelector('.element-detail-title').textContent = element.nodeName;
  detailContent.querySelector('.element-detail-type').textContent = 'Element';
  
  // Source URL
  if (element.sourceUrl) {
    detailContent.querySelector('.detail-source-url').textContent = element.sourceUrl;
    detailContent.querySelector('.detail-url-actions').style.display = 'flex';
    
    // Open URL button
    detailContent.querySelector('.detail-open-url').addEventListener('click', () => {
      window.open(element.sourceUrl, '_blank');
    });
    
    // Copy URL button
    detailContent.querySelector('.detail-copy-url').addEventListener('click', () => {
      navigator.clipboard.writeText(element.sourceUrl).then(() => {
        showToast('URL copied to clipboard');
      });
    });
  } else {
    detailContent.querySelector('.detail-source-url').textContent = 'No source URL';
    detailContent.querySelector('.detail-url-actions').style.display = 'none';
  }
  
  // Tags
  const tagsContainer = detailContent.querySelector('.detail-tags');
  if (element.tags && element.tags.length > 0) {
    element.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'detail-tag';
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });
  } else {
    tagsContainer.textContent = 'No tags';
  }
  
  // Notes
  const notesElement = detailContent.querySelector('.detail-notes');
  if (element.notes) {
    notesElement.textContent = element.notes;
  } else {
    notesElement.textContent = 'No notes';
  }
  
  // Last modified
  const lastModifiedElement = detailContent.querySelector('.detail-last-modified');
  if (element.lastModified) {
    const date = new Date(element.lastModified);
    lastModifiedElement.textContent = date.toLocaleString();
  } else {
    lastModifiedElement.textContent = 'Unknown';
  }
  
  // Navigate to element button
  detailContent.querySelector('.go-to-element').addEventListener('click', () => {
    navigateToElement(element.nodeId);
  });
  
  // Add the detail to the container
  detailElement.appendChild(detailContent);
  
  // Mark the selected item in the list
  document.querySelectorAll('.element-list-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Find the items matching this element and mark them as active
  document.querySelectorAll('.element-list-item').forEach(item => {
    if (item.querySelector('.element-list-name').textContent === element.nodeName) {
      item.classList.add('active');
    }
  });
}

// Navigate to Figma element
function navigateToElement(nodeId) {
  parent.postMessage({
    pluginMessage: {
      type: 'navigate-to-node',
      nodeId
    }
  }, '*');
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}