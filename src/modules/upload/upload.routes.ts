import { Router } from 'express';
import multer from 'multer';
import * as uploadController from './upload.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Store file in memory buffer so we can stream it directly to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/upload:
 *   post:
 *     tags:
 *       - Upload
 *     summary: Upload an image to Cloudinary
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
router.post('/', upload.single('file'), uploadController.uploadImage);

export default router;
