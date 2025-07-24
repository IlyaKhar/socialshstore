const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String,
  images: [String],
  sizes: [String],
});

const orderSchema = new mongoose.Schema({
  name: String,
  telegram: String,
  phone: String,
  address: String,
  cart: [
    {
      id: String,
      name: String,
      price: Number,
      image: String,
      size: String,
      count: Number,
    }
  ],
  status: { type: String, default: 'Новый' },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  telegram: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  addresses: [{
    label: String, // например "Дом", "Работа"
    address: String,
    city: String,
    zip: String,
    comment: String
  }],
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
  Product: mongoose.model('Product', productSchema),
  Order: mongoose.model('Order', orderSchema),
  User: mongoose.model('User', userSchema),
}; 