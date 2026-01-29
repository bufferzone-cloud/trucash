const cloudinaryCloudName = 'dd3lcymrk';
const cloudinaryUploadPreset = 'h3eyhc2o';
const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/upload`;

async function uploadToCloudinary(file, folder = 'trucash') {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryUploadPreset);
        formData.append('folder', folder);
        formData.append('cloud_name', cloudinaryCloudName);

        fetch(cloudinaryUploadUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.secure_url) {
                resolve(data.secure_url);
            } else {
                reject(new Error('Upload failed'));
            }
        })
        .catch(error => reject(error));
    });
}

export { uploadToCloudinary };
