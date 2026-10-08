import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/travel_erp';
    
    // Log connection details (hide password)
    const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log('📍 MongoDB URI:', sanitizedUri);
    
    await mongoose.connect(uri);
    
    console.log('='.repeat(50));
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('🗄️  Host:', mongoose.connection.host);
    console.log('📦 Database:', mongoose.connection.name);
    console.log('🔢 Port:', mongoose.connection.port);
    console.log('='.repeat(50));
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('='.repeat(50));
      console.error('❌ MongoDB connection error:');
      console.error('='.repeat(50));
      console.error(err);
      console.error('='.repeat(50));
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (err) {
    console.error('='.repeat(50));
    console.error('❌ MONGODB CONNECTION FAILED!');
    console.error('='.repeat(50));
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Full error:', err);
    console.error('='.repeat(50));
    console.error('💡 Troubleshooting tips:');
    console.error('  1. Check if MongoDB is running');
    console.error('  2. Verify MONGO_URI in .env file');
    console.error('  3. Check network connectivity');
    console.error('  4. Verify database credentials');
    console.error('='.repeat(50));
    throw err; // Re-throw to let server.js handle it
  }
};
