// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: 'dd3lcymrk',
    uploadPreset: 'h3eyhc2o',
    uploadUrl: 'https://api.cloudinary.com/v1_1/dd3lcymrk/upload'
};

class CloudinaryUploader {
    constructor() {
        this.cloudName = cloudinaryConfig.cloudName;
        this.uploadPreset = cloudinaryConfig.uploadPreset;
        this.uploadUrl = cloudinaryConfig.uploadUrl;
    }

    // Upload single image
    async uploadImage(file, folder = 'trucash') {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('folder', folder);
            formData.append('timestamp', Date.now());

            fetch(this.uploadUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.secure_url) {
                    resolve({
                        url: data.secure_url,
                        public_id: data.public_id,
                        format: data.format,
                        bytes: data.bytes
                    });
                } else {
                    reject(new Error('Upload failed: ' + data.error.message));
                }
            })
            .catch(error => reject(error));
        });
    }

    // Upload multiple images
    async uploadMultipleImages(files, folder = 'trucash') {
        const uploadPromises = Array.from(files).map(file => 
            this.uploadImage(file, folder)
        );
        return Promise.all(uploadPromises);
    }

    // Generate image thumbnail URL
    generateThumbnailUrl(originalUrl, width = 200, height = 200) {
        if (!originalUrl) return '';
        const urlParts = originalUrl.split('/upload/');
        if (urlParts.length < 2) return originalUrl;
        
        const transformations = `c_fill,w_${width},h_${height},q_auto,f_auto`;
        return `${urlParts[0]}/upload/${transformations}/${urlParts[1]}`;
    }

    // Validate file type
    validateImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
        }
        
        if (file.size > maxSize) {
            throw new Error('File size too large. Maximum size is 5MB.');
        }
        
        return true;
    }
}

// Create global instance
const cloudinary = new CloudinaryUploader();

export { cloudinary, CloudinaryUploader };
