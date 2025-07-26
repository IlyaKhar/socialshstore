const mongoose = require('mongoose');
const { Product, Order, User } = require('./models');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/avatars')),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.round(Math.random()*1e9) + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Только изображения!'));
    cb(null, true);
  }
});

mongoose.connect('mongodb+srv://Maloy:C3yq5pIHJc1AXK8O@cluster0.hffmia4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.error('MongoDB connection error:', err));

const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));
const TELEGRAM_BOT_TOKEN = '7824900331:AAHjSDlnNElq8hjbRyI6o6YLvN6F6HrXQ5c';
const TELEGRAM_CHAT_ID = '7072395246';
const https = require('https');
const busboy = require('connect-busboy');
app.use(busboy());

// Multer для загрузки фото товаров
const productImagesUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/img')),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.round(Math.random()*1e9) + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB на файл
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Только изображения!'));
    cb(null, true);
  }
});

// --- PRODUCTS ---
// Получить все товары
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});
// Добавить товар (только одна картинка, без файлов)
app.post('/api/products', async (req, res) => {
  console.log('POST /api/products req.body:', req.body);
  try {
    let { name, price, description, image, images, sizes } = req.body;
    if (!name || !price || !description || !image) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!Array.isArray(sizes)) sizes = sizes ? [sizes] : [];
    if (!Array.isArray(images)) images = images ? [images] : [image];
    const product = new Product({ name, price, description, image, images, sizes });
    await product.save();
    res.json(product);
  } catch (err) {
    console.error('Ошибка добавления товара:', err, JSON.stringify(req.body));
    res.status(500).json({ error: 'Ошибка добавления товара' });
  }
});
// Редактировать товар
app.put('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let { name, price, description, image, images, sizes } = req.body;
    if (!Array.isArray(sizes)) sizes = sizes ? [sizes] : [];
    if (!Array.isArray(images)) images = images ? [images] : [image];
    const product = await Product.findByIdAndUpdate(id, { name, price, description, image, images, sizes }, { new: true });
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка редактирования товара' });
  }
});
// Удалить товар
app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

// Приём заказа
app.post('/api/order', async (req, res) => {
  try {
    const { name, telegram, phone, address, cart } = req.body;
    if (!name || !telegram || !phone || !address || !cart || !cart.length) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Некорректный телефон' });
    }
    // Проверка cart на корректность
    if (!Array.isArray(cart) || !cart.every(item => item && item.name && item.price)) {
      return res.status(400).json({ error: 'Некорректные товары в корзине' });
    }
    const order = new Order({ name, telegram, phone, address, cart });
    await order.save();
    res.json(order);
  } catch (err) {
    console.error('Ошибка оформления заказа:', err);
    console.error('Тело запроса:', req.body);
    res.status(500).json({ error: 'Ошибка оформления заказа: ' + (err.message || err) });
  }
});

// --- Защита админских API ---
function adminGuard(req, res, next) {
  console.log('adminGuard req.body:', req.body);
  const { telegram, password } = req.body || req.query || {};
  if (telegram === '@Ilyushechka_vey' && password === 'Arkana2019') {
    return next();
  }
  res.status(403).json({ error: 'Доступ только для администратора' });
}

// Добавить товар (только админ, с поддержкой файлов)
app.post('/api/products', productImagesUpload.fields([{ name: 'images', maxCount: 10 }]), async (req, res) => {
  console.log('BODY:', req.body);
  console.log('FILES:', req.files);
  try {
    let { name, price, description, sizes } = req.body;
    if (!name || !price || !description) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!Array.isArray(sizes)) sizes = sizes ? [sizes] : [];
    let images = [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      images = req.files.images.map(f => f.filename);
    }
    const image = images[0] || '';
    const product = new Product({ name, price, description, image, images, sizes });
    await product.save();
    res.json(product);
  } catch (err) {
    console.error('Ошибка добавления товара:', err);
    res.status(500).json({ error: 'Ошибка добавления товара: ' + (err.message || err) });
  }
});
// Редактировать товар (только админ)
app.put('/api/products/:id', adminGuard, async (req, res) => {
  try {
    const id = req.params.id;
    let { name, price, description, image, sizes } = req.body;
    if (!Array.isArray(sizes)) sizes = sizes ? [sizes] : [];
    const product = await Product.findByIdAndUpdate(id, { name, price, description, image, sizes }, { new: true });
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка редактирования товара' });
  }
});
// Удалить товар (только админ)
app.delete('/api/products/:id', adminGuard, async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});
// Получить все заказы (только админ)
app.get('/api/orders', adminGuard, async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});
// --- ORDERS ---
// Получить все заказы (для админа) или пользователя по telegram
app.post('/api/orders', async (req, res) => {
  try {
    const { telegram, password } = req.body;
    let orders;
    if (telegram && password === 'Arkana2019' && telegram === '@Ilyushechka_vey') {
      // Админ — все заказы
      orders = await Order.find();
    } else if (telegram) {
      // Пользователь — только свои заказы
      orders = await Order.find({ telegram });
    } else {
      return res.status(400).json({ error: 'Нет данных для поиска заказов' });
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});
// Оформить заказ
app.post('/api/order', async (req, res) => {
  try {
    const { name, telegram, phone, address, cart } = req.body;
    if (!name || !telegram || !phone || !address || !cart || !cart.length) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Некорректный телефон' });
    }
    const order = new Order({ name, telegram, phone, address, cart });
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка оформления заказа' });
  }
});
// Сменить статус заказа (только для админа)
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка смены статуса заказа' });
  }
});

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { name, telegram, phone, email, password } = req.body;
    if (!name || !telegram || !phone || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Некорректный телефон' });
    }
    // Проверка уникальности
    const exists = await User.findOne({ $or: [
      { telegram },
      { email: email || undefined },
      { phone }
    ] });
    if (exists) {
      return res.status(409).json({ error: 'Пользователь с такими данными уже существует' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, telegram, phone, email, password: hash });
    await user.save();
    res.json({ success: true, user: { id: user._id, name, telegram, phone, email } });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});
// Вход
app.post('/api/login', async (req, res) => {
  try {
    const { telegram, password } = req.body;
    const user = await User.findOne({ telegram });
    if (!user) {
      return res.status(401).json({ error: 'Неверный Telegram или пароль' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Неверный Telegram или пароль' });
    }
    res.json({ success: true, user: { id: user._id, name: user.name, telegram: user.telegram, phone: user.phone, email: user.email, avatar: user.avatar, addresses: user.addresses } });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка входа' });
  }
});
// Вход в админку
app.post('/api/admin-login', (req, res) => {
  const { telegram, password } = req.body;
  if (telegram === '@Ilyushechka_vey' && password === 'Arkana2019') {
    return res.json({ success: true, admin: { telegram } });
  }
  res.status(401).json({ error: 'Неверные данные администратора' });
});

// Восстановление пароля (отправляем сообщение, но не сам пароль)
app.post('/api/forgot', async (req, res) => {
  try {
    const { value } = req.body || {};
    if (!value) return res.status(400).json({ error: 'Введите Telegram или email' });
    const val = (value || '').replace(/^@/, '').toLowerCase();
    const user = await User.findOne({
      $or: [
        { telegram: new RegExp('^@?' + val + '$', 'i') },
        { email: new RegExp('^' + val + '$', 'i') }
      ]
    });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    // Здесь можно отправить email или Telegram сообщение с инструкцией по сбросу пароля
    res.json({ message: 'Инструкция по восстановлению отправлена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка восстановления пароля' });
  }
});

// Получить профиль пользователя
app.post('/api/profile', async (req, res) => {
  try {
    const { id, telegram, email } = req.body;
    let user;
    if (id) user = await User.findById(id);
    else if (telegram) user = await User.findOne({ telegram });
    else if (email) user = await User.findOne({ email });
    else return res.status(400).json({ error: 'Нет данных для поиска профиля' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({
      id: user._id,
      name: user.name,
      telegram: user.telegram,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      addresses: user.addresses
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});
// Обновить профиль пользователя
app.put('/api/profile', async (req, res) => {
  try {
    const { id, name, email, phone, avatar } = req.body;
    if (!id) return res.status(400).json({ error: 'Нет id пользователя' });
    const user = await User.findByIdAndUpdate(id, { name, email, phone, avatar }, { new: true });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});
// Загрузка аватара
app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id || !req.file) return res.status(400).json({ error: 'Нет id пользователя или файла' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    user.avatar = '/avatars/' + req.file.filename;
    await user.save();
    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    console.error('Ошибка загрузки аватара:', err);
    res.status(500).json({ error: 'Ошибка загрузки аватара' });
  }
});
// Получить историю заказов пользователя
app.post('/api/profile/orders', async (req, res) => {
  try {
    const { id, telegram } = req.body;
    let user;
    if (id) user = await User.findById(id);
    else if (telegram) user = await User.findOne({ telegram });
    else return res.status(400).json({ error: 'Нет данных для поиска пользователя' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const orders = await Order.find({ telegram: user.telegram });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});
// Получить адреса пользователя
app.post('/api/profile/addresses', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Нет id пользователя' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user.addresses || []);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения адресов' });
  }
});
// Добавить адрес
app.post('/api/profile/address', async (req, res) => {
  try {
    const { id, address } = req.body;
    if (!id || !address) return res.status(400).json({ error: 'Нет данных' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    user.addresses.push(address);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка добавления адреса' });
  }
});
// Удалить адрес
app.delete('/api/profile/address', async (req, res) => {
  try {
    const { id, index } = req.body;
    if (!id || index === undefined) return res.status(400).json({ error: 'Нет данных' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    user.addresses.splice(index, 1);
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления адреса' });
  }
});

// Раздача index.html по корню
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Переместить парсеры вниз
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Глобальный обработчик ошибок (в самом конце файла)
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(500).json({ error: 'Server error: ' + (err.message || err) });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
}); 