import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || `mongodb+srv://raghuram:raghu123@cluster0.fssfves.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB Connected Successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:',err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB Disconnected');
    });
    
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;