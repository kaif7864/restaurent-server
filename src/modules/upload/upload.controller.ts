import { Request, Response } from 'express';
import cloudinary from '../../utils/cloudinary';
import { Readable } from 'stream';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Use a Promise to wrap the upload_stream callback
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'savory_menu' },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        // Pipe the buffer into the stream
        const readableStream = new Readable();
        readableStream.push(req.file!.buffer);
        readableStream.push(null); // Indicates end of data
        readableStream.pipe(stream);
      });
    };

    const result: any = await uploadStream();
    
    res.status(200).json({ 
      success: true, 
      data: { url: result.secure_url } 
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};
