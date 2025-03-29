// code.js
// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 320, height: 480 });

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
    
    figma.notify('Metadata saved successfully!');
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
};

// Listen for selection changes
figma.on('selectionchange', () => {
  figma.ui.postMessage({ type: 'selection-changed' });
});