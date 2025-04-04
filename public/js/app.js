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
  
  // Handle form submission
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!fileInput.files.length) {
      return;
    }
    
    // Show loading indicator
    viewerContainer.classList.remove('hidden');
    loadingIndicator.style.display = 'block';
    
    // Create form data
    const formData = new FormData();
    formData.append('schematic', fileInput.files[0]);
    
    try {
      // Upload the file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Display schematic info
        schematicInfo.innerHTML = `
          <p>Dimensions: ${data.dimensions.width}x${data.dimensions.height}x${data.dimensions.length}</p>
          <p>Format: ${data.format}</p>
        `;
        
        // Load the schematic
        await viewer.loadSchematic(data.schematicId);
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
      } else {
        alert('Failed to process schematic: ' + data.message);
        loadingIndicator.style.display = 'none';
      }
    } catch (error) {
      console.error('Error uploading schematic:', error);
      alert('Failed to upload schematic. Please try again.');
      loadingIndicator.style.display = 'none';
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
});
