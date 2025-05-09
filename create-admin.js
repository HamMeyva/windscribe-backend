const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define a simplified User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  active: Boolean,
  verified: Boolean,
  subscription: {
    tier: {
      type: String,
      default: 'free'
    },
    status: {
      type: String,
      default: 'none'
    }
  },
  preferences: {
    notifications: {
      email: Boolean,
      push: Boolean
    }
  },
  lastLogin: Date
});

// Create User model
const User = mongoose.model('User', userSchema);

// Create admin user
async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Updating existing admin user...');
      
      // Use a simple password for testing
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      
      console.log('Admin user updated with new password: password123');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        active: true,
        verified: true,
        subscription: {
          tier: 'premium',
          status: 'active'
        },
        preferences: {
          notifications: {
            email: true,
            push: true
          }
        },
        lastLogin: new Date()
      });
      
      await admin.save();
      console.log('New admin user created with password: password123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin(); 