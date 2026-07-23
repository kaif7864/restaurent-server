import { v2 as cloudinary } from 'cloudinary';

// This will automatically pick up the CLOUDINARY_URL from the environment if present
// Ensure you have CLOUDINARY_URL set in your .env
cloudinary.config({
  secure: true
});

export default cloudinary;
