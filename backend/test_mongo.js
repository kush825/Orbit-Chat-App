const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI;

console.log('Testing MongoDB connection...');
console.log('URI:', uri.replace(/:([^:@]{8,})@/, ':****@')); // mask password

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Successfully connected to MongoDB!');
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:');
  console.error(err);
  process.exit(1);
});
