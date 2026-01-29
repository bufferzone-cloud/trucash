// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dd3lcymrk';
const CLOUDINARY_UPLOAD_PRESET = 'h3eyhc2o';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

class CloudinaryUploader {
    constructor() {
        this.cloudName = CLOUDINARY_CLOUD_NAME;
        this.uploadPreset = CLOUDINARY_UPLOAD_PRESET;
    }

    async uploadFile(file, folder = 'trucash') {
        return new Promise((resolve, reject) => {
            // Validate file
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('File size exceeds 10MB limit'));
                return;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                reject(new Error('Invalid file type. Only images are allowed'));
                return;
            }

            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('cloud_name', this.cloudName);
            formData.append('folder', folder);
            formData.append('timestamp', Math.round((new Date()).getTime() / 1000));

            // Upload to Cloudinary
            fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    reject(new Error(data.error.message));
                    return;
                }
                
                // Store in Firebase
                this.storeUploadRecord(data, file.name, folder)
                    .then(() => {
                        resolve({
                            success: true,
                            url: data.secure_url,
                            publicId: data.public_id,
                            format: data.format,
                            bytes: data.bytes,
                            width: data.width,
                            height: data.height,
                            createdAt: data.created_at
                        });
                    })
                    .catch(error => reject(error));
            })
            .catch(error => {
                console.error('Upload error:', error);
                reject(new Error('Upload failed. Please try again.'));
            });
        });
    }

    async uploadMultipleFiles(files, folder = 'trucash') {
        const uploadPromises = files.map(file => this.uploadFile(file, folder));
        return Promise.all(uploadPromises);
    }

    async storeUploadRecord(cloudinaryData, originalFilename, folder) {
        try {
            const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            await database.ref('uploads/' + uploadId).set({
                uploadId: uploadId,
                originalFilename: originalFilename,
                cloudinaryUrl: cloudinaryData.secure_url,
                cloudinaryPublicId: cloudinaryData.public_id,
                format: cloudinaryData.format,
                size: cloudinaryData.bytes,
                dimensions: {
                    width: cloudinaryData.width,
                    height: cloudinaryData.height
                },
                folder: folder,
                uploadedAt: firebase.database.ServerValue.TIMESTAMP,
                tags: cloudinaryData.tags || []
            });
            
            return uploadId;
        } catch (error) {
            console.error('Error storing upload record:', error);
            throw error;
        }
    }

    async deleteImage(publicId) {
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    public_id: publicId,
                    api_key: '', // Would need actual API key for this
                    timestamp: Math.round(Date.now() / 1000),
                    signature: '' // Would need to generate signature
                })
            });
            
            const data = await response.json();
            return data.result === 'ok';
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }

    // Image transformation
    getOptimizedUrl(url, options = {}) {
        let optimizedUrl = url;
        const transformations = [];
        
        if (options.width) transformations.push(`w_${options.width}`);
        if (options.height) transformations.push(`h_${options.height}`);
        if (options.crop) transformations.push(`c_${options.crop}`);
        if (options.quality) transformations.push(`q_${options.quality}`);
        if (options.format) transformations.push(`f_${options.format}`);
        
        if (transformations.length > 0) {
            const urlParts = url.split('/upload/');
            if (urlParts.length === 2) {
                optimizedUrl = `${urlParts[0]}/upload/${transformations.join(',')}/${urlParts[1]}`;
            }
        }
        
        return optimizedUrl;
    }

    // Generate image thumbnail
    getThumbnailUrl(url, size = 200) {
        return this.getOptimizedUrl(url, {
            width: size,
            height: size,
            crop: 'fill',
            quality: 80
        });
    }

    // Validate image before upload
    validateImage(file) {
        const errors = [];
        
        // Check file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            errors.push('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            errors.push('File size must be less than 5MB.');
        }
        
        // Check dimensions (optional)
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                if (this.width < 100 || this.height < 100) {
                    errors.push('Image dimensions must be at least 100x100 pixels.');
                }
                if (this.width > 5000 || this.height > 5000) {
                    errors.push('Image dimensions cannot exceed 5000x5000 pixels.');
                }
                resolve(errors);
            };
            img.onerror = function() {
                errors.push('Unable to read image file.');
                resolve(errors);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    // Batch upload progress tracking
    createUploadProgressTracker(totalFiles) {
        return {
            total: totalFiles,
            completed: 0,
            failed: 0,
            progress: 0,
            onProgress: null,
            
            updateProgress() {
                this.completed++;
                this.progress = Math.round((this.completed / this.total) * 100);
                if (this.onProgress && typeof this.onProgress === 'function') {
                    this.onProgress(this.progress, this.completed, this.total);
                }
            },
            
            markFailed() {
                this.failed++;
                this.updateProgress();
            }
        };
    }
}

// Initialize Cloudinary Uploader
const cloudinary = new CloudinaryUploader();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = cloudinary;
}
