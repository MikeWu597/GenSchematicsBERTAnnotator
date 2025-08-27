document.addEventListener('DOMContentLoaded', () => {
  const viewerContainer = document.getElementById('viewer-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  const schematicInfo = document.getElementById('schematic-info');
  const annotationSection = document.getElementById('annotation-section');
  const currentSchematicName = document.getElementById('current-schematic-name');
  const annotationText = document.getElementById('annotation-text');
  const saveAnnotationButton = document.getElementById('save-annotation');
  
  let viewer;
  let queue = [];
  let currentSchematic = null;
  
  // Initialize the viewer
  viewer = new SchematicViewer('renderer-container');
  
  // Function to display error message
  function showError(message) {
    // Create or update error element
    let errorElement = document.getElementById('error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'error-message';
      errorElement.className = 'error-message';
      viewerContainer.insertBefore(errorElement, viewerContainer.firstChild);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide loading indicator
    loadingIndicator.style.display = 'none';
  }
  
  // Function to clear error message
  function clearError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }
  
  
  // Load schematic queue
  async function loadSchematicQueue() {
    try {
      const response = await fetch('/api/queue');
      const data = await response.json();
      
      if (data.success) {
        queue = data.files;
        if (queue.length > 0) {
          loadNextSchematic();
        } else {
          // If no schematics in queue, show upload form
          document.querySelector('.upload-section').classList.remove('hidden');
        }
      } else {
        console.error('Failed to load queue:', data.message);
      }
    } catch (error) {
      console.error('Error loading schematic queue:', error);
    }
  }
  
  // Load next schematic in queue
  async function loadNextSchematic() {
    if (queue.length > 0) {
      currentSchematic = queue.shift();
      currentSchematicName.textContent = currentSchematic.name;
      
      // Show annotation section and make sure viewer is visible
      annotationSection.classList.remove('hidden');
      viewerContainer.classList.remove('hidden');
      annotationText.value = '';
      
      // Load and visualize the schematic from server
      try {
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'Loading schematic...';
        
        // Process the schematic file on the server
        const processResponse = await fetch(`/api/process-queue-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filename: currentSchematic.name })
        });
        
        const processData = await processResponse.json();
        
        if (processData.success) {
          // Display schematic info
          schematicInfo.innerHTML = `
            <p>Dimensions: ${processData.dimensions.width}x${processData.dimensions.height}x${processData.dimensions.length}</p>
            <p>Format: ${processData.format}</p>
          `;
          
          // Update loading indicator
          loadingIndicator.textContent = 'Rendering schematic...';
          
          // Load the schematic
          const loadSuccess = await viewer.loadSchematic(processData.schematicId);
          
          if (!loadSuccess) {
            showError('Failed to render schematic.');
          } else {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
          }
        } else {
          showError(processData.message || 'Failed to process schematic.');
        }
      } catch (error) {
        console.error('Error loading schematic:', error);
        showError('Error loading schematic: ' + error.message);
      }
    } else {
      // No more schematics in queue
      annotationSection.innerHTML = '<p>All schematics have been annotated!</p>';
      viewerContainer.classList.add('hidden');
    }
  }
  
  // Save annotation
  saveAnnotationButton.addEventListener('click', async () => {
    if (!currentSchematic) return;
    
    const annotation = annotationText.value.trim();
    if (!annotation) {
      alert('Please enter an annotation before saving.');
      return;
    }
    
    try {
      const response = await fetch(`/api/annotate/${currentSchematic.nameWithoutExt}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ annotation })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Load next schematic
        loadNextSchematic();
      } else {
        console.error('Failed to save annotation:', data.message);
        alert('Failed to save annotation. Please try again.');
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Error saving annotation. Please try again.');
    }
  });
  
  // Set up control buttons
  document.getElementById('reset-view').addEventListener('click', () => {
    viewer.resetCamera();
  });
  
  document.getElementById('toggle-wireframe').addEventListener('click', () => {
    viewer.toggleWireframe();
  });
  
  document.getElementById('toggle-textures').addEventListener('click', () => {
    viewer.toggleTextures();
  });
  
  // Function to toggle fullscreen
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      viewerContainer.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  }
  
  // Add fullscreen button if browser supports it
  if (document.fullscreenEnabled) {
    const controlGroup = document.querySelector('.control-group');
    const fullscreenButton = document.createElement('button');
    fullscreenButton.id = 'toggle-fullscreen';
    fullscreenButton.textContent = 'Fullscreen';
    fullscreenButton.addEventListener('click', toggleFullscreen);
    controlGroup.appendChild(fullscreenButton);
  }
  
  // Load schematic queue when page loads
  loadSchematicQueue();
});