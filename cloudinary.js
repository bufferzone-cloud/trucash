// cloudinary.js - Cloudinary Image Upload Service
const CLOUDINARY_CLOUD_NAME = 'dd3lcymrk';
const CLOUDINARY_UPLOAD_PRESET = 'h3eyhc2o';

class CloudinaryService {
    static async uploadImage(file, folder = 'trucash') {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', folder);
            formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
            
            fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.secure_url) {
                    resolve({
                        success: true,
                        url: data.secure_url,
                        publicId: data.public_id,
                        format: data.format,
                        bytes: data.bytes
                    });
                } else {
                    reject({
                        success: false,
                        error: data.error?.message || 'Upload failed'
                    });
                }
            })
            .catch(error => {
                reject({
                    success: false,
                    error: error.message
                });
            });
        });
    }
    
    static async uploadMultipleImages(files, folder = 'trucash') {
        const uploadPromises = files.map(file => this.uploadImage(file, folder));
        return Promise.all(uploadPromises);
    }
    
    static async deleteImage(publicId) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('public_id', publicId);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
            
            fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/destroy`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.result === 'ok') {
                    resolve({ success: true });
                } else {
                    reject({
                        success: false,
                        error: data.result
                    });
                }
            })
            .catch(error => {
                reject({
                    success: false,
                    error: error.message
                });
            });
        });
    }
}

// Image Upload Handler
class ImageUploadHandler {
    constructor() {
        this.initializeUploadAreas();
    }
    
    initializeUploadAreas() {
        // Initialize all upload areas in the application
        document.querySelectorAll('.upload-area').forEach(area => {
            area.addEventListener('click', (e) => {
                this.handleUploadAreaClick(e.target.closest('.upload-area'));
            });
            
            // Drag and drop functionality
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.style.borderColor = '#007aff';
                area.style.background = 'rgba(0, 122, 255, 0.05)';
            });
            
            area.addEventListener('dragleave', () => {
                area.style.borderColor = '#d1d1d6';
                area.style.background = '#f8f8fa';
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.style.borderColor = '#d1d1d6';
                area.style.background = '#f8f8fa';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileUpload(files[0], area);
                }
            });
        });
    }
    
    handleUploadAreaClick(uploadArea) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file, uploadArea);
            }
        };
        
        input.click();
    }
    
    async handleFileUpload(file, uploadArea) {
        // Validate file
        if (!this.validateFile(file)) {
            window.app?.showToast('Invalid file. Please upload an image under 5MB.', 'warning');
            return;
        }
        
        // Show loading state
        const originalContent = uploadArea.innerHTML;
        uploadArea.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <p>Uploading...</p>
        `;
        uploadArea.style.pointerEvents = 'none';
        
        try {
            // Upload to Cloudinary
            const result = await CloudinaryService.uploadImage(file);
            
            if (result.success) {
                // Update UI with uploaded image
                uploadArea.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #34c759;"></i>
                    <p>Upload Successful</p>
                    <img src="${result.url}" style="max-width: 100px; margin-top: 10px; border-radius: 4px;">
                `;
                
                // Store the URL in a data attribute for form submission
                uploadArea.dataset.uploadedUrl = result.url;
                uploadArea.dataset.publicId = result.publicId;
                
                window.app?.showToast('Image uploaded successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            // Reset on error
            uploadArea.innerHTML = originalContent;
            uploadArea.style.pointerEvents = 'auto';
            
            window.app?.showToast(`Upload failed: ${error.message}`, 'danger');
        }
    }
    
    validateFile(file) {
        // Check file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return false;
        }
        
        // Check file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            return false;
        }
        
        return true;
    }
    
    getUploadedImages() {
        const images = {};
        document.querySelectorAll('[data-uploaded-url]').forEach(area => {
            const fieldName = area.id.replace('Upload', '');
            images[fieldName] = {
                url: area.dataset.uploadedUrl,
                publicId: area.dataset.publicId
            };
        });
        return images;
    }
    
    clearUploads() {
        document.querySelectorAll('.upload-area').forEach(area => {
            area.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Drag & drop or click to upload</p>
                <small>JPG, PNG max 5MB</small>
            `;
            area.style.pointerEvents = 'auto';
            delete area.dataset.uploadedUrl;
            delete area.dataset.publicId;
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.imageUploader = new ImageUploadHandler();
});
