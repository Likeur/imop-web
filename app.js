const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const imagePreview = document.getElementById('image-preview');
const optimizeButton = document.getElementById('optimize-button');
const downloadArea = document.getElementById('download-area');
const zipDownloadButton = document.getElementById('zip-download');
const statusMessage = document.getElementById('status-message');
const progressBar = document.querySelector('.progress-bar');
const progressContainer = document.getElementById('progress-container');

let originalFiles = [];
let optimizedBlobs = [];
let fileNames = [];

// ------------------- files -------------------
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

dropArea.addEventListener('dragenter', () => dropArea.classList.add('border-blue-500', 'bg-blue-50'), false);
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('border-blue-500', 'bg-blue-50'), false);
dropArea.addEventListener('drop', (e) => {
    dropArea.classList.remove('border-blue-500', 'bg-blue-50');
    handleFiles(e.dataTransfer.files);
}, false);

fileInput.addEventListener('change', (e) => handleFiles(e.target.files), false);
optimizeButton.addEventListener('click', optimizeImages, false);
zipDownloadButton.addEventListener('click', downloadAllAsZip, false);

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function handleFiles(files) {
    originalFiles = [...files];
    imagePreview.innerHTML = '';
    downloadArea.innerHTML = '';
    optimizedBlobs = [];
    fileNames = [];
    zipDownloadButton.style.display = 'none';
    statusMessage.textContent = '';
    progressContainer.classList.add('hidden');

    if (originalFiles.length > 0) {
        optimizeButton.disabled = false;
        originalFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.classList.add('preview-item', 'flex', 'flex-col', 'items-center', 'border', 'border-zinc-300/10', 'p-2', 'rounded-lg');
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('w-24', 'h-24', 'object-contain', 'rounded-md', 'mb-2');
                
                const name = document.createElement('span');
                name.textContent = file.name;
                name.classList.add('text-sm', 'text-gray-700', 'truncate', 'w-full', 'text-center');

                const sizeBefore = document.createElement('span');
                sizeBefore.textContent = `size : ${formatBytes(file.size)}`;
                sizeBefore.classList.add('text-xs', 'text-gray-500');

                previewItem.appendChild(img);
                previewItem.appendChild(name);
                previewItem.appendChild(sizeBefore);
                imagePreview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    } else {
        optimizeButton.disabled = true;
    }
}

// ------------------- OPTIMIZATION -------------------
async function optimizeImages() {
    optimizeButton.textContent = 'Optimization progressing...';
    optimizeButton.disabled = true;
    downloadArea.innerHTML = '';
    optimizedBlobs = [];
    fileNames = [];
    progressContainer.classList.remove('hidden');

    const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
        onProgress: (progress) => {
            const percentage = Math.round(progress);
            progressBar.style.width = `${percentage}%`;
            statusMessage.textContent = `Total progress: ${percentage}%`;
        }
    };

    let totalProgress = 0;
    const step = 100 / originalFiles.length;

    for (const file of originalFiles) {
        try {
            statusMessage.textContent = `Optimizing "${file.name}"...`;
            const compressedFile = await imageCompression(file, compressionOptions);
            
            const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
            const newFileName = `${originalNameWithoutExt}.webp`;
            
            optimizedBlobs.push(compressedFile);
            fileNames.push(newFileName);
            
            totalProgress += step;
            progressBar.style.width = `${totalProgress}%`;
            statusMessage.textContent = `Optimization complete for "${file.name}".`;

        } catch (error) {
            console.error(`Error optimizing "${file.name}":`, error);
            statusMessage.textContent = `Error optimizing "${file.name}".`;
            break;
        }
    }

    statusMessage.textContent = 'Optimization complete!';
    displayDownloadButtons();

    optimizeButton.textContent = 'Optimize images';
    optimizeButton.disabled = false;
    progressBar.style.width = `100%`;
}

// ------------------- DOWNLOAD -------------------
function displayDownloadButtons() {
    downloadArea.innerHTML = '';

    const previewItems = imagePreview.querySelectorAll('.preview-item');

    if (optimizedBlobs.length > 0) {
        optimizedBlobs.forEach((blob, index) => {
            const fileUrl = URL.createObjectURL(blob);
            const downloadLink = createDownloadLink(fileUrl, fileNames[index]);
            downloadArea.appendChild(downloadLink);

            // size update after optimization
            const sizeAfter = document.createElement('span');
            sizeAfter.textContent = `optimized size : ${formatBytes(blob.size)}`;
            sizeAfter.classList.add('text-xs', 'text-green-600', 'font-bold', 'mt-1');
            
            previewItems[index].appendChild(sizeAfter);
        });

        if (optimizedBlobs.length > 1) {
            zipDownloadButton.style.display = 'block';
        } else {
            zipDownloadButton.style.display = 'none';
        }
    }
}

function createDownloadLink(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.textContent = `Télécharger ${name}`;
    a.classList.add('download-link', 'px-4', 'py-2', 'bg-blue-600', 'text-white', 'rounded-lg', 'text-sm', 'hover:bg-blue-700', 'inline-block', 'm-2');
    return a;
}

async function downloadAllAsZip() {
    if (optimizedBlobs.length === 0) return;

    const zip = new JSZip();
    optimizedBlobs.forEach((blob, index) => {
        zip.file(fileNames[index], blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = 'optimized-images.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}