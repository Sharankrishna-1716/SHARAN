// backend/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const port = 5000;
const multer = require('multer');
const path = require('path');


// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/users', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log('Error connecting to MongoDB: ', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());  // Parse incoming JSON requests
app.use(express.json())
app.use(express.urlencoded())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure the 'uploads' folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });


// Post Schema (Mongoose Model)
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  comments: {
    type: Array,
    default: [],
  },
});

const Post = mongoose.model('posts', postSchema);

// User Schema (Mongoose Model)
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const User = mongoose.model('users', userSchema);

// Routes

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// Get a single post by ID
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching post' });
  }
});

// Create a new post
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    console.log('Request Body:', req.body); // Check if title and content are received
    console.log('Uploaded File:', req.file); // Check if file is uploaded

    const { title, content } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''; // Save image URL if file uploaded

    const newPost = new Post({
      title,
      content,
      image: imageUrl,
      comments: [],
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ message: 'Error creating post' });
  }
});
// Add a comment to a post
app.post('/api/posts/:id/comments', async (req, res) => {
  const { comment } = req.body;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push(comment);
    await post.save();

    res.status(201).json({ message: 'Comment added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// User registration
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const newUser = new User({
    username,
    email,
    password
  });

  try {
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error signing up user' });
  }
});

// User login (simple in-memory)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error during login' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
