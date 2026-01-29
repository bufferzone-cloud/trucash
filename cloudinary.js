// Cloudinary Configuration and Upload Functions
const cloudinaryConfig = {
    cloudName: 'dd3lcymrk',
    uploadPreset: 'h3eyhc2o',
    uploadUrl: 'https://api.cloudinary.com/v1_1/dd3lcymrk/upload'
};

// File upload to Cloudinary
export const uploadToCloudinary = async (file, folder = 'trucash') => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', folder);
        formData.append('cloud_name', cloudinaryConfig.cloudName);
        
        fetch(cloudinaryConfig.uploadUrl, {
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
};

// Multiple file upload
export const uploadMultipleToCloudinary = async (files, folder = 'trucash') => {
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
    return Promise.all(uploadPromises);
};

// Image validation
export const validateImage = (file, maxSizeMB = 5) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = maxSizeMB * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'
        };
    }
    
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size exceeds ${maxSizeMB}MB limit.`
        };
    }
    
    return { valid: true };
};

// Document upload (for NRC, etc.)
export const uploadDocument = async (file, documentType, userId) => {
    const folder = `trucash/documents/${documentType}/${userId}`;
    return uploadToCloudinary(file, folder);
};

// Collateral photo upload
export const uploadCollateralPhotos = async (files, loanId, customerId) => {
    const folder = `trucash/collateral/${customerId}/${loanId}`;
    const results = await uploadMultipleToCloudinary(files, folder);
    return results;
};

// Profile photo upload
export const uploadProfilePhoto = async (file, userId, userType) => {
    const folder = `trucash/profiles/${userType}/${userId}`;
    return uploadToCloudinary(file, folder);
};

// Generate thumbnail URL
export const getThumbnailUrl = (url, width = 300, height = 300) => {
    if (!url) return url;
    return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill/`);
};

// Delete from Cloudinary (requires server-side implementation)
export const deleteFromCloudinary = async (publicId) => {
    // Note: This requires server-side implementation with Cloudinary API key
    console.warn('Delete functionality requires server-side implementation');
    return { success: false, error: 'Server-side implementation required' };
};

// Batch delete
export const batchDeleteFromCloudinary = async (publicIds) => {
    // Note: This requires server-side implementation
    console.warn('Batch delete requires server-side implementation');
    return { success: false, error: 'Server-side implementation required' };
};

// Get file info
export const getFileInfo = async (publicId) => {
    // Note: This requires server-side implementation
    console.warn('File info requires server-side implementation');
    return { success: false, error: 'Server-side implementation required' };
};

export default cloudinaryConfig;
