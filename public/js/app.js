document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const dropArea = document.getElementById('drop-area');
  const uploadButton = document.getElementById('upload-button');
  const viewerContainer = document.getElementById('viewer-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  const schematicInfo = document.getElementById('schematic-info');
  
  let viewer;
  
  // Initialize the viewer
  viewer = new SchematicViewer('renderer-container');
  
  // Set up file selection
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      dropArea.classList.add('has-file');
      dropArea.querySelector('p').textContent = fileInput.files[0].name;
      uploadButton.disabled = false;
    } else {
      dropArea.classList.remove('has-file');
      dropArea.querySelector('p').textContent = 'Drag & drop your schematic file here';
      uploadButton.disabled = true;
    }
  });
  
  // Set up drag and drop
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
  });
  
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
  });
  
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      dropArea.classList.add('has-file');
      dropArea.querySelector('p').textContent = e.dataTransfer.files[0].name;
      uploadButton.disabled = false;
    }
  });
  
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
  
  // Handle form submission
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!fileInput.files.length) {
      return;
    }
    
    // Clear any previous errors
    clearError();
    
    // Show loading indicator
    viewerContainer.classList.remove('hidden');
    loadingIndicator.style.display = 'block';
    loadingIndicator.textContent = 'Uploading schematic...';
    
    // Validate file type
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop().toLowerCase();
    const supportedFormats = ['schematic', 'schem', 'nbt', 'litematic'];
    
    if (!supportedFormats.includes(fileExt)) {
      showError(`Unsupported file format: .${fileExt}. Supported formats are: .schematic, .schem, .nbt, and .litematic`);
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('schematic', file);
    
    try {
      console.log('Uploading file...');
      const startTime = performance.now();
      
      // Upload the file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      console.log('Server response:', data);
      
      const uploadTime = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`Upload and processing took ${uploadTime} seconds`);
      
      if (data.success) {
        // Clear any previous errors
        clearError();
        
        // Display schematic info
        schematicInfo.innerHTML = `
          <p>Dimensions: ${data.dimensions.width}x${data.dimensions.height}x${data.dimensions.length}</p>
          <p>Format: ${data.format}</p>
        `;
        
        // Update loading indicator
        loadingIndicator.textContent = 'Rendering schematic...';
        
        try {
          // Wait a brief moment to ensure the UI updates
          setTimeout(async () => {
            // Load the schematic
            const loadSuccess = await viewer.loadSchematic(data.schematicId);
            
            if (!loadSuccess) {
              showError('Failed to render schematic. The file may be corrupted or in an unsupported format.');
            } else {
              // Hide loading indicator
              loadingIndicator.style.display = 'none';
              
              // Display total time
              const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
              console.log(`Total processing time: ${totalTime} seconds`);
              const timeInfo = document.createElement('p');
              timeInfo.textContent = `Processing time: ${totalTime}s`;
              timeInfo.style.fontSize = '0.8em';
              timeInfo.style.opacity = '0.7';
              schematicInfo.appendChild(timeInfo);
            }
          }, 100);
        } catch (renderError) {
          console.error('Rendering error:', renderError);
          showError(`Error rendering schematic: ${renderError.message}`);
        }
      } else {
        showError(data.message || 'Failed to process schematic. The file may be corrupted or in an unsupported format.');
      }
    } catch (error) {
      console.error('Error uploading schematic:', error);
      showError(`Upload failed: ${error.message}. Please check your connection and try again.`);
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
});