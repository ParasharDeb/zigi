import express from "express"
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import "dotenv/config"
import { ACCESS_KEY_ID, SECRET_ACCESS_KEY } from "./config";

const app=express()

// Allow the local frontend (port 3000) to post uploads here during development.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const s3Client = new S3Client({
  forcePathStyle: true, // Required for Supabase S3 routing
  region: 'ap-northeast-1',  // Can be any string, but required by SDK
  endpoint: 'https://pxdofmtfdxywlairkzck.storage.supabase.co/storage/v1/s3', 
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/video-upload", upload.single('file'),async(req,res)=>{
    try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }

    const bucketName = 'reels'; // Must exist in Supabase Dashboard
    const fileKey = `uploads/${Date.now()}_${req.file.originalname}`;

    // Prepare the S3 Command payload
    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: req.file.buffer,         // File content buffer
      ContentType: req.file.mimetype, // Preserves the file format
    };

    // Execute the S3 upload command to Supabase
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Formulate your public asset URL 
    const publicUrl = `https://supabase.co{bucketName}/${fileKey}`;

    return res.status(200).json({
      message: 'File successfully uploaded to Supabase via S3!',
      key: fileKey,
      url: publicUrl
    });

  } catch (error:any) {
    console.error('S3 Upload Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
})

app.listen(8080)