figma.showUI(__html__, { width: 320, height: 480, themeColors: true });

// Get user preferences or set defaults
async function getUserPreferences() {
  let preferences = await figma.clientStorage.getAsync('designtrail-preferences');
  if (!preferences) {
    preferences = {
      layout: 'portrait', // 'portrait' or 'landscape'
      theme: 'light',     // 'light' or 'dark'
      autosave: true      // Whether to autosave drafts
    };
    await figma.clientStorage.setAsync('designtrail-preferences', preferences);
  }
  return preferences;
}

// Called when UI is first loaded
async function initializePlugin() {
  const preferences = await getUserPreferences();
  figma.ui.postMessage({
    type: 'init-preferences',
    preferences
  });
  
  // If user had previously selected landscape mode, resize the UI
  if (preferences.layout === 'landscape') {
    figma.ui.resize(640, 320);
  }
}

initializePlugin();

// Called when a message is received from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'save-metadata') {
    if (figma.currentPage.selection.length === 0) {
      figma.notify('Please select an element first');
      return;
    }
    
    const node = figma.currentPage.selection[0];
    
    // Save the metadata to the node
    await figma.clientStorage.setAsync(
      `metadata-${node.id}`, 
      {
        sourceUrl: msg.sourceUrl,
        tags: msg.tags,
        notes: msg.notes,
        lastModified: Date.now()
      }
    );
    
    // Delete draft after successful save
    await figma.clientStorage.deleteAsync(`draft-${node.id}`);
    
    figma.notify('✅ Metadata saved successfully!');
  }
  
  if (msg.type === 'save-draft') {
    if (figma.currentPage.selection.length === 0) {
      return;
    }
    
    const node = figma.currentPage.selection[0];
    
    // Save draft metadata
    await figma.clientStorage.setAsync(
      `draft-${node.id}`, 
      {
        sourceUrl: msg.sourceUrl,
        tags: msg.tags,
        notes: msg.notes,
        lastModified: Date.now()
      }
    );
  }
  
  if (msg.type === 'get-metadata') {
    if (figma.currentPage.selection.length === 0) {
      figma.ui.postMessage({ 
        type: 'no-selection',
        message: 'Select an element to view or edit its metadata'
      });
      return;
    }
    
    const node = figma.currentPage.selection[0];
    
    // Check for draft first
    const draft = await figma.clientStorage.getAsync(`draft-${node.id}`);
    if (draft) {
      figma.ui.postMessage({ 
        type: 'draft-loaded',
        data: draft,
        nodeName: node.name || 'Unnamed Layer',
        message: 'Continuing from your unsaved draft'
      });
      return;
    }
    
    // Then check for saved metadata
    const metadata = await figma.clientStorage.getAsync(`metadata-${node.id}`);
    
    if (metadata) {
      figma.ui.postMessage({ 
        type: 'metadata-loaded',
        data: metadata,
        nodeName: node.name || 'Unnamed Layer'
      });
    } else {
      figma.ui.postMessage({ 
        type: 'new-element',
        message: 'Add metadata to this element',
        nodeName: node.name || 'Unnamed Layer'
      });
    }
  }
  
  if (msg.type === 'get-all-tags') {
    // Get all unique tags across all elements for autocomplete
    const allKeys = await figma.clientStorage.keysAsync();
    const metadataKeys = allKeys.filter(key => key.startsWith('metadata-'));
    
    const allTags = new Set();
    
    for (const key of metadataKeys) {
      const metadata = await figma.clientStorage.getAsync(key);
      if (metadata && metadata.tags) {
        metadata.tags.forEach(tag => allTags.add(tag));
      }
    }
    
    figma.ui.postMessage({
      type: 'all-tags',
      tags: Array.from(allTags)
    });
  }
  
  if (msg.type === 'update-preferences') {
    await figma.clientStorage.setAsync('designtrail-preferences', msg.preferences);
    
    // Update UI size if layout changed
    if (msg.preferences.layout === 'landscape') {
      figma.ui.resize(640, 320);
    } else {
      figma.ui.resize(320, 480);
    }
  }
  
  // Handle resize requests from the UI
  if (msg.type === 'resize') {
    figma.ui.resize(
      Math.max(280, Math.min(800, msg.width)), 
      Math.max(300, Math.min(600, msg.height))
    );
  }
};

// Listen for selection changes
figma.on('selectionchange', () => {
  figma.ui.postMessage({ type: 'selection-changed' });
});