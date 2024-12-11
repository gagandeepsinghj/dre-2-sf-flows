document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const clearBtn = document.getElementById('clear-btn');
    const fileContent = document.getElementById('file-content');
    const outputContent = document.getElementById('output-content');
    const uploadSection = document.getElementById('upload-section');
    const previewSection = document.getElementById('preview-section');
    const convertBtn = document.getElementById('convert-btn');
    const deployBtn = document.getElementById('deploy-btn');
    const progress = document.getElementById('progress');

    // Store the flow filename after conversion
    let currentFlowFilename = '';

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Handle file selection via button
    selectFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Handle clear button click
    clearBtn.addEventListener('click', clearSelection);

    // Handle convert button click
    convertBtn.addEventListener('click', handleConvert);

    // Handle deploy button click
    deployBtn.addEventListener('click', handleDeploy);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function startProgress() {
        progress.classList.add('active');
        const progressBar = progress.querySelector('.progress-bar');
        progressBar.style.width = '0%';

        // Animate to 90% quickly
        setTimeout(() => {
            progressBar.style.width = '90%';
        }, 100);
    }

    function completeProgress() {
        const progressBar = progress.querySelector('.progress-bar');

        // Complete to 100%
        progressBar.style.width = '100%';

        // Hide after completion
        setTimeout(() => {
            progress.classList.remove('active');

            // Reset progress
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 300);
        }, 500);
    }

    async function handleDeploy() {
        try {
            if (!currentFlowFilename) {
                throw new Error('No flow filename available. Please convert the file first.');
            }

            deployBtn.disabled = true;
            startProgress();

            // Get the XML content directly from the output textarea
            const xmlContent = outputContent.value;

            // Create a parser to validate XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

            // Check for parsing errors
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('Invalid XML content');
            }

            const response = await fetch('/api/deploy-flow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // will need to use currentFlowFilename to make this dynamic
                    filename: currentFlowFilename,
                    flowContent: xmlContent
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Deployment failed');
            }

            alert('Flow deployed successfully!');

        } catch (error) {
            alert('Error during deployment: ' + error.message);
        } finally {
            completeProgress();
            deployBtn.disabled = false;
        }
    }

    async function handleConvert() {
        try {
            convertBtn.disabled = true;
            startProgress();

            const response = await fetch('/api/migrate-dre-rule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonString: fileContent.value
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Conversion failed');
            }

            // Store the filename from the response
            currentFlowFilename = data.fileName;

            // Show and update the output textarea and deploy button
            outputContent.classList.remove('hidden');
            deployBtn.classList.remove('hidden');
            // Set the XML content directly without JSON.stringify
            outputContent.value = data.flowContent;

        } catch (error) {
            alert('Error during conversion: ' + error.message);
        } finally {
            completeProgress();
            convertBtn.disabled = false;
        }
    }

    async function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                // Read and display file content
                const content = await file.text();
                try {
                    // Pretty print the JSON
                    const prettyJson = JSON.stringify(JSON.parse(content), null, 2);
                    fileContent.value = prettyJson;

                    // Show preview section and hide upload section
                    uploadSection.classList.add('hidden');
                    previewSection.classList.remove('hidden');
                    // Hide output content and deploy button when new file is loaded
                    outputContent.classList.add('hidden');
                    deployBtn.classList.add('hidden');
                    // Reset the current flow filename
                    currentFlowFilename = '';
                } catch (error) {
                    alert('Invalid JSON file');
                    clearSelection();
                }
            } else {
                alert('Please select a JSON file');
                clearSelection();
            }
        }
    }

    function clearSelection() {
        fileInput.value = '';
        fileContent.value = '';
        outputContent.value = '';
        outputContent.classList.add('hidden');
        deployBtn.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        previewSection.classList.add('hidden');
        // Reset the current flow filename
        currentFlowFilename = '';
    }
});
