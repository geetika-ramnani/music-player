import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection with retry logic
const connectWithRetry = async () => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  let currentRetry = 0;

  while (currentRetry < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        retryWrites: true,
        w: 'majority',
        maxPoolSize: 10,
      });
      console.log('Connected to MongoDB Atlas successfully');
      break;
    } catch (err) {
      currentRetry++;
      console.error(`MongoDB connection attempt ${currentRetry} failed:`, err.message);
      if (currentRetry === maxRetries) {
        console.error('Failed to connect to MongoDB after maximum retries');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

connectWithRetry();

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectWithRetry();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? 'connected' : 'disconnected',
    message: isConnected ? 'Connected to MongoDB Atlas' : 'Database connection failed'
  });
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }]
});

const User = mongoose.model('User', userSchema);

// Song Schema
const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  audioUrl: { type: String, required: true },
  imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bXVzaWN8ZW58MHx8MHx8fDA%3D' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  cloudinaryId: { type: String } // Store Cloudinary public ID for asset management
});

songSchema.index({ title: 'text', artist: 'text' });

const Song = mongoose.model('Song', songSchema);

// Multer configuration for temporary file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

// Admin Middleware
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      throw new Error();
    }
    next();
  } catch (error) {
    res.status(403).send({ error: 'Admin access required.' });
  }
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  console.log("Register API hit");
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 2);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(201).send({ user, token });
  // } catch (error) {
  //   res.status(400).send({ error: 'Registration failed. Username might be taken.' });
  // }
  } catch (error) {
  if (error.code === 11000) {
    res.status(400).send({ error: 'Username already exists. Choose a different one.' });
  } else {
    res.status(500).send({ error: 'Internal server error during registration.' });
  }
}
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid login credentials');
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.send({ user, token });
  // } catch (error) {
  //   res.status(400).send({ error: error.message });
  // }
  } catch (error) {
  console.error('Login error:', error.message);
  res.status(401).send({ error: 'Invalid username or password' });
}
});

// Song Routes
const uploadFields = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

app.post('/api/songs', auth, adminAuth, uploadFields, async (req, res) => {
  try {
    if (!req.files?.audio) {
      return res.status(400).send({ error: 'No audio file provided' });
    }

    const { title, artist } = req.body;
    
    if (!title || !artist) {
      return res.status(400).send({ error: 'Title and artist are required' });
    }

    // Upload audio to Cloudinary
    const audioBuffer = req.files.audio[0].buffer;
    const audioResult = await cloudinary.uploader.upload(`data:${req.files.audio[0].mimetype};base64,${audioBuffer.toString('base64')}`, {
      resource_type: 'auto',
      folder: 'music-player/audio'
    });

    let imageResult = null;
    if (req.files.image) {
      const imageBuffer = req.files.image[0].buffer;
      imageResult = await cloudinary.uploader.upload(`data:${req.files.image[0].mimetype};base64,${imageBuffer.toString('base64')}`, {
        folder: 'music-player/images'
      });
    }

    const song = new Song({
      title,
      artist,
      audioUrl: audioResult.secure_url,
      imageUrl: imageResult ? imageResult.secure_url : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bXVzaWN8ZW58MHx8MHx8fDA%3D',
      uploadedBy: req.user._id,
      cloudinaryId: audioResult.public_id
    });

    await song.save();
    res.status(201).send(song);
  } catch (error) {
    res.status(500).send({ error: error.message || 'Error uploading song' });
  }
});

app.get('/api/songs', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { artist: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const songs = await Song.find(query).populate('uploadedBy', 'username');
    const user = await User.findById(req.user._id);
    
    const songsWithLikeStatus = songs.map(song => ({
      ...song.toObject(),
      isLiked: user.likedSongs.includes(song._id)
    }));

    res.send(songsWithLikeStatus);
  } catch (err) {
    res.status(500).send({ error: err.message || 'Error fetching songs' });
  }
});

// Like/Unlike Routes
app.post('/api/songs/:id/like', auth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).send({ error: 'Song not found' });
    }

    const user = await User.findById(req.user._id);
    const isLiked = user.likedSongs.includes(song._id);

    if (isLiked) {
      // Unlike
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { likedSongs: song._id }
      });
      song.likes = Math.max(0, song.likes - 1);
    } else {
      // Like
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { likedSongs: song._id }
      });
      song.likes += 1;
    }

    await song.save();
    res.send({ likes: song.likes, isLiked: !isLiked });
  } catch (error) {
    res.status(500).send({ error: error.message || 'Error updating like status' });
  }
});

// Delete song endpoint
app.delete('/api/songs/:id', auth, adminAuth, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).send({ error: 'Song not found' });
    }

    // Delete from Cloudinary
    if (song.cloudinaryId) {
      await cloudinary.uploader.destroy(song.cloudinaryId);
    }

    await Song.deleteOne({ _id: req.params.id });
    res.send({ message: 'Song deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message || 'Error deleting song' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send({ error: 'File is too large. Maximum size is 10MB.' });
    }
    return res.status(400).send({ error: error.message });
  }
  
  console.error('Server error:', error);
  res.status(500).send({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});