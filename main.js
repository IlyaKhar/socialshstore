// main.js — здесь будет логика магазина

// --- КОРЗИНА ---
const CART_KEY = 'shop_cart';
const USER_KEY = 'shop_user';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]').map(item => ({ ...item, id: String(item.id) }));
}
function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function addToCart(product) {
  const cart = getCart();
  const idx = cart.findIndex(item => String(item.id) === String(product.id));
  if (idx !== -1) {
    cart[idx].count += 1;
  } else {
    cart.push({ ...product, id: String(product.id), count: 1 });
  }
  setCart(cart);
}
function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(item => String(item.id) !== String(id));
  setCart(cart);
}
function updateCartCount(id, count) {
  const cart = getCart();
  const idx = cart.findIndex(item => String(item.id) === String(id));
  if (idx !== -1) {
    cart[idx].count = count;
    if (cart[idx].count < 1) cart.splice(idx, 1);
    setCart(cart);
  }
}
function clearCart() {
  localStorage.removeItem(CART_KEY);
}

// --- USER ---
function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function getUser() {
  return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
}
function clearUser() {
  localStorage.removeItem(USER_KEY);
}
function isAdminUser(user) {
  return user && user.telegram === '@Ilyushechka_vey' && user.password === 'Arkana2019';
}

// --- ИЗБРАННОЕ ---
// Удалён функционал избранного

// --- ОТЗЫВЫ ---
const REVIEWS_KEY = 'shop_reviews';
function getReviews(productId) {
  const all = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}');
  return all[productId] || [];
}
function addReview(productId, review) {
  const all = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}');
  if (!all[productId]) all[productId] = [];
  all[productId].push(review);
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
}

// --- UI ---
document.addEventListener('DOMContentLoaded', () => {
  renderHeaderUser();

  // --- Поиск и фильтры на главной ---
  if (document.getElementById('search-form')) {
    const form = document.getElementById('search-form');
    form.onsubmit = e => {
      e.preventDefault();
      renderCatalog();
    };
    // Сброс фильтров при очистке
    document.getElementById('search-input').oninput = renderCatalog;
    document.getElementById('min-price').oninput = renderCatalog;
    document.getElementById('max-price').oninput = renderCatalog;
    document.getElementById('sort-select').onchange = renderCatalog;
    // size-filter чекбоксы — динамически, поэтому делаем делегирование
    document.getElementById('size-filter').addEventListener('change', renderCatalog);
  }
  // Кнопка 'только избранное'
  // Удалён функционал избранного

  // Главная страница — каталог
  if (document.querySelector('.catalog')) {
    fetch('/api/products')
      .then(res => res.json())
      .then(products => {
        products = products.map(p => ({ ...p, id: p._id || p.id }));
        const catalog = document.querySelector('.catalog');
        catalog.innerHTML = '';
        products.forEach(product => {
          const card = document.createElement('div');
          card.className = 'product-card';
          const imgSrc = product.image ? `img/${product.image}` : 'https://via.placeholder.com/200x200?text=' + encodeURIComponent(product.name);
          let badgeHtml = '';
          if (product.badge === 'new') badgeHtml = `<span class='badge badge-new'>Новинка</span>`;
          if (product.badge === 'sale') badgeHtml = `<span class='badge badge-sale'>Скидка</span>`;
          if (product.badge === 'hit') badgeHtml = `<span class='badge badge-hit'>Хит</span>`;
          card.innerHTML = `
            ${badgeHtml}
            <img src="${imgSrc}" alt="${product.name}" />
            <h2>${product.name}</h2>
            <p>${product.description}</p>
            <span class="price">${product.price.toLocaleString()} ₽</span>
            <button data-id="${product.id}">В корзину</button>
          `;
          card.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'button') return;
            window.location.href = `product.html?id=${product.id}`;
          });
          card.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart({ id: product.id, name: product.name, price: product.price, image: product.image });
            showToast('Товар добавлен в корзину!');
          });
          catalog.appendChild(card);
        });
      });
  }

  // --- Страница товара с выбором размера ---
  if (document.querySelector('.product-detail')) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
      document.querySelector('.product-detail').innerHTML = '<h2>Товар не найден</h2>';
      return;
    }
    fetch('/api/products')
      .then(res => res.json())
      .then(products => {
        products = products.map(p => ({ ...p, id: p._id || p.id }));
        const product = products.find(p => String(p.id) === String(id));
        if (!product) {
          document.querySelector('.product-detail').innerHTML = '<h2>Товар не найден</h2>';
          return;
        }
        const sizes = product.sizes || [];
        document.querySelector('.product-detail').innerHTML = `
          <img src="img/${product.image}" alt="${product.name}" style="max-width:300px;display:block;margin:0 auto 2rem;" />
          <h2>${product.name}</h2>
          <span class="price" style="font-size:1.5rem;">${product.price.toLocaleString()} ₽</span>
          <div style="margin:1.2rem 0 2rem 0;">
            <b>Размер:</b>
            <select id="size-select" style="padding:0.5rem 1.2rem;border-radius:0.5rem;border:1px solid #bbb;font-size:1.1rem;">
              ${sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div style="margin-bottom:2.2rem;color:#444;font-size:1.08rem;line-height:1.6;max-width:500px;">${product.description}</div>
          <div style="margin:2rem 0;">
            <button id="add-to-cart">В корзину</button>
          </div>
          <section class="reviews" style="margin-top:2.5rem;">
            <h3>Отзывы</h3>
            <form id="review-form" style="margin-bottom:1.5rem;display:flex;flex-direction:column;gap:1rem;max-width:400px;">
              <input type="text" name="author" placeholder="Ваше имя" required style="padding:0.6rem 1rem;border-radius:0.5rem;border:none;" />
              <textarea name="text" placeholder="Ваш отзыв" required style="padding:0.6rem 1rem;border-radius:0.5rem;border:none;min-height:70px;"></textarea>
              <button type="submit" style="align-self:flex-end;padding:0.6rem 1.5rem;border-radius:0.5rem;border:none;background:#00bfae;color:#fff;font-weight:600;">Оставить отзыв</button>
            </form>
            <div id="reviews-list"></div>
          </section>
        `;
        document.getElementById('add-to-cart').addEventListener('click', () => {
          const size = document.getElementById('size-select')?.value || (sizes[0] || '');
          addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, size });
          showToast('Товар добавлен в корзину!');
        });
        renderReviews(id);
        document.getElementById('review-form').addEventListener('submit', e => {
          e.preventDefault();
          const form = e.target;
          const author = form.author.value.trim();
          const text = form.text.value.trim();
          if (!author || !text) return;
          addReview(id, { author, text, date: new Date().toLocaleString('ru-RU') });
          form.reset();
          renderReviews(id);
        });
      });
  }

  // Страница корзины
  if (document.querySelector('.cart')) {
    renderCart();
  }

  // Страница оформления заказа
  if (document.getElementById('order-form')) {
    const form = document.getElementById('order-form');
    const result = document.getElementById('order-result');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const name = formData.get('name');
      const telegram = formData.get('telegram');
      const phone = formData.get('phone');
      let address = '';
      if (formData.get('address-select')) {
        if (formData.get('address-select') === '__new__') {
          address = formData.get('address');
        } else {
          try {
            // Попробуем распарсить как объект (если вдруг value — JSON)
            const parsed = JSON.parse(formData.get('address-select'));
            address = parsed.address || parsed.value || formData.get('address-select');
          } catch {
            address = formData.get('address-select');
          }
        }
      } else {
        address = formData.get('address');
      }
      if (!validateTelegram(telegram)) {
        result.textContent = 'Некорректный Telegram. Пример: @username';
        return;
      }
      if (!validatePhone(phone)) {
        result.textContent = 'Некорректный телефон. Только цифры, 10-15 символов.';
        return;
      }
      if (name.length < 2) {
        result.textContent = 'Имя слишком короткое.';
        return;
      }
      if (!address || address.length < 4) {
        result.textContent = 'Адрес слишком короткий.';
        return;
      }
      const order = {
        name, telegram, phone, address, cart: getCart(),
      };
      if (!order.cart.length) {
        result.textContent = 'Корзина пуста!';
        return;
      }
      form.querySelector('button[type="submit"]').disabled = true;
      result.textContent = 'Отправка заказа...';
      try {
        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
        });
        const data = await res.json();
        console.log('Ответ сервера на заказ:', data);
        if (res.ok) {
          clearCart();
          form.reset();
          result.textContent = 'Спасибо за заказ! Мы свяжемся с вами.';
        } else {
          result.textContent = 'Ошибка при оформлении заказа :('; 
        }
      } catch {
        result.textContent = 'Ошибка сети :('; 
      }
      form.querySelector('button[type="submit"]').disabled = false;
    });
  }

  // Регистрация
  if (document.getElementById('register-form')) {
    const form = document.getElementById('register-form');
    const result = document.getElementById('register-result');
    addSimpleCaptcha(form, '#register-result');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const name = formData.get('name');
      const telegram = formData.get('telegram');
      const phone = formData.get('phone');
      const password = formData.get('password');
      if (!validateTelegram(telegram)) {
        result.textContent = 'Некорректный Telegram. Пример: @username';
        return;
      }
      if (!validatePhone(phone)) {
        result.textContent = 'Некорректный телефон. Только цифры, 10-15 символов.';
        return;
      }
      if (name.length < 2) {
        result.textContent = 'Имя слишком короткое.';
        return;
      }
      if (password.length < 4) {
        result.textContent = 'Пароль слишком короткий.';
        return;
      }
      if (!checkSimpleCaptcha(form)) {
        e.preventDefault();
        return false;
      }
      const user = { name, telegram, phone, password };
      if (isAdminUser(user)) user.isAdmin = true;
      form.querySelector('button[type="submit"]').disabled = true;
      result.textContent = 'Регистрация...';
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const data = await res.json();
        if (res.ok) {
          if (user.isAdmin) data.user.isAdmin = true;
          if (user.isAdmin) data.user.password = user.password;
          setUser(data.user);
          form.reset();
          result.textContent = 'Регистрация успешна!';
          setTimeout(() => window.location.href = 'profile.html', 1000);
        } else {
          result.textContent = data.error || 'Ошибка регистрации';
        }
      } catch {
        result.textContent = 'Ошибка сети :('; 
      }
      form.querySelector('button[type="submit"]').disabled = false;
    });
  }

  // Вход
  if (document.getElementById('login-form')) {
    const form = document.getElementById('login-form');
    const result = document.getElementById('login-result');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const telegram = formData.get('telegram');
      const password = formData.get('password');
      if (!validateTelegram(telegram)) {
        result.textContent = 'Некорректный Telegram. Пример: @username';
        return;
      }
      if (password.length < 4) {
        result.textContent = 'Пароль слишком короткий.';
        return;
      }
      const user = { telegram, password };
      if (isAdminUser(user)) user.isAdmin = true;
      form.querySelector('button[type="submit"]').disabled = true;
      result.textContent = 'Вход...';
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const data = await res.json();
        if (res.ok) {
          if (user.isAdmin) data.user.isAdmin = true;
          if (user.isAdmin) data.user.password = user.password;
          // Исправление: сохраняем id = _id (ObjectId) для совместимости с MongoDB
          if (data.user._id) data.user.id = data.user._id;
          setUser(data.user);
          form.reset();
          result.textContent = 'Вход выполнен!';
          setTimeout(() => window.location.href = 'profile.html', 1000);
        } else {
          result.textContent = data.error || 'Ошибка входа';
        }
      } catch {
        result.textContent = 'Ошибка сети :('; 
      }
      form.querySelector('button[type="submit"]').disabled = false;
    });
  }

  // Личный кабинет
  if (document.getElementById('profile-info')) {
    const user = getUser();
    const info = document.getElementById('profile-info');
    const adminBtn = document.getElementById('open-admin');
    if (!user) {
      info.innerHTML = '<p>Вы не авторизованы. <a href="login.html">Войти</a></p>';
      document.getElementById('logout-btn').style.display = 'none';
      if (adminBtn) adminBtn.style.display = 'none';
      return;
    }
    info.innerHTML = `
      <b>Имя:</b> ${user.name}<br>
      <b>Telegram:</b> ${user.telegram}<br>
      <b>Телефон:</b> ${user.phone}<br>
    `;
    document.getElementById('logout-btn').addEventListener('click', () => {
      clearUser();
      window.location.href = 'login.html';
    });
    if (adminBtn) {
      if (user.isAdmin) {
        adminBtn.style.display = 'block';
        adminBtn.onclick = () => {
          window.location.href = 'admin.html';
        };
      } else {
        adminBtn.style.display = 'none';
      }
    }
  }

  // Вход в админку
  if (document.getElementById('admin-login-form')) {
    const form = document.getElementById('admin-login-form');
    const result = document.getElementById('admin-login-result');
    const panel = document.querySelector('.admin-panel');
    const loginSection = document.querySelector('.admin-login');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const telegram = formData.get('telegram');
      const password = formData.get('password');
      form.querySelector('button[type="submit"]').disabled = true;
      result.textContent = 'Проверка...';
      try {
        const res = await fetch('/api/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram, password }),
        });
        const data = await res.json();
        if (res.ok) {
          result.textContent = '';
          loginSection.style.display = 'none';
          panel.style.display = '';
          // Здесь будет логика управления товарами и заказами
        } else {
          result.textContent = data.error || 'Ошибка входа';
        }
      } catch {
        result.textContent = 'Ошибка сети :('; 
      }
      form.querySelector('button[type="submit"]').disabled = false;
    });
    document.getElementById('admin-logout').addEventListener('click', () => {
      panel.style.display = 'none';
      loginSection.style.display = '';
      form.reset();
      result.textContent = '';
    });
  }
});

// --- Корзина: показываю размер ---
function renderCart() {
  const cartSection = document.querySelector('.cart');
  const cart = getCart();
  if (!cart.length) {
    cartSection.innerHTML = '<div class="cart-empty"><img src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png" alt="Пусто" style="width:80px;opacity:0.5;margin-bottom:1.2rem;"><br>Ваша корзина пуста</div>';
    return;
  }
  let total = 0;
  cartSection.innerHTML = `
    <h2>Корзина</h2>
    <div class="cart-list"></div>
    <div class="cart-total" style="margin:2rem 0;font-size:1.2rem;"></div>
    <button id="checkout-btn">Оформить заказ</button>
  `;
  const list = cartSection.querySelector('.cart-list');
  cart.forEach(item => {
    total += item.price * item.count;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.style = 'display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;background:#fafafa;padding:1.5rem 1rem;border-radius:1rem;box-shadow:0 2px 12px #0001;max-width:600px;margin-left:auto;margin-right:auto;';
    div.innerHTML = `
      <img src="img/${item.image}" alt="${item.name}" style="width:70px;height:70px;object-fit:cover;border-radius:0.5rem;" />
      <div style="flex:1;">
        <b>${item.name}</b><br>
        <span class="price">${item.price.toLocaleString()} ₽</span><br>
        <span style="color:#888;font-size:0.98em;">Размер: <b>${item.size || '-'}</b></span>
      </div>
      <input type="number" min="1" value="${item.count}" style="width:60px;padding:0.3rem 0.5rem;border-radius:0.3rem;border:1px solid #ccc;" data-id="${item.id}" />
      <button class="remove-btn" data-id="${item.id}" style="background:#ff3b3b;">Удалить</button>
    `;
    list.appendChild(div);
  });
  cartSection.querySelector('.cart-total').textContent = `Итого: ${total.toLocaleString()} ₽`;
  // Изменение количества
  list.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = String(e.target.getAttribute('data-id'));
      let val = Number(e.target.value);
      if (!Number.isFinite(val) || val < 1) val = 1;
      updateCartCount(id, val);
      renderCart();
    });
  });
  // Удаление товара
  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = String(e.target.getAttribute('data-id'));
      removeFromCart(id);
      renderCart();
    });
  });
  // Оформить заказ
  cartSection.querySelector('#checkout-btn').addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });
} 

function renderHeaderUser() {
  const user = getUser();
  const nav = document.querySelector('header nav');
  if (!nav) return;
  // Удаляем старые кнопки/иконку
  nav.querySelectorAll('.profile-icon, .header-auth-btn').forEach(el => el.remove());
  if (user) {
    // Показываем иконку профиля
    const icon = document.createElement('a');
    icon.href = 'profile.html';
    icon.className = 'profile-icon';
    icon.title = 'Личный кабинет';
    icon.textContent = (user.name || user.telegram || 'U')[0].toUpperCase();
    nav.appendChild(icon);
  } else {
    // Показываем кнопки Вход и Регистрация
    const login = document.createElement('a');
    login.href = 'login.html';
    login.className = 'header-auth-btn';
    login.style.marginLeft = '1.5rem';
    login.textContent = 'Вход';
    const reg = document.createElement('a');
    reg.href = 'register.html';
    reg.className = 'header-auth-btn';
    reg.style.marginLeft = '1rem';
    reg.textContent = 'Регистрация';
    nav.appendChild(login);
    nav.appendChild(reg);
  }
} 

// На admin.html: если isAdmin, сразу показываем админку
if (window.location.pathname.endsWith('admin.html')) {
  const user = getUser();
  if (user && user.isAdmin) {
    const panel = document.querySelector('.admin-panel');
    const loginSection = document.querySelector('.admin-login');
    if (panel && loginSection) {
      loginSection.style.display = 'none';
      panel.style.display = '';
    }
  }
} 

// --- ADMIN PANEL ---
async function renderAdminProducts() {
  const container = document.getElementById('admin-products');
  if (!container) return;
  container.innerHTML = '<b>Загрузка...</b>';
  const res = await fetch('/api/products');
  let products = await res.json();
  // Гарантируем, что у каждого товара есть _id
  products = products.filter(p => {
    if (!p._id) {
      console.error('Товар без _id:', p);
      return false;
    }
    return true;
  });
  console.log('products:', products);
  // Форма добавления/редактирования
  let formHtml = `
    <form id="admin-product-form" style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;align-items:center;justify-content:center;">
      <input type="text" name="name" placeholder="Название" required style="flex:1;min-width:120px;" />
      <input type="number" name="price" placeholder="Цена" required style="width:100px;" />
      <input type="text" name="description" placeholder="Описание" required style="flex:2;min-width:180px;" />
      <input type="text" name="image" placeholder="Имя файла картинки (img/...)" required style="width:180px;" />
      <div style="display:flex;gap:0.7rem;align-items:center;">
        <span style="font-size:0.98rem;color:#888;">Размеры:</span>
        ${['S','M','L','XL'].map(size => `<label style='font-size:1.05rem;'><input type='checkbox' name='sizes' value='${size}' style='margin-right:0.3rem;'>${size}</label>`).join('')}
      </div>
      <button type="submit">Сохранить</button>
      <button type="button" id="admin-product-cancel" style="display:none;">Отмена</button>
    </form>
  `;
  // Таблица товаров
  let tableHtml = `<table style="width:100%;border-collapse:separate;border-spacing:0;background:#fafafa;text-align:center;">
    <tr style="background:#f7f7f7;">
      <th>ID</th><th>Название</th><th>Цена</th><th>Описание</th><th>Картинка</th><th>Размеры</th><th></th><th></th>
    </tr>`;
  for (const p of products) {
    console.log('Товар:', p);
    if (!p._id) {
      console.error('Пропуск товара без _id:', p);
      continue;
    }
    const realId = p._id;
    tableHtml += `<tr>
      <td>${realId}</td>
      <td>${p.name}</td>
      <td>${p.price}</td>
      <td>${p.description}</td>
      <td><img src="img/${p.image}" alt="${p.name}" style="width:50px;height:50px;object-fit:cover;border-radius:0.3rem;" /></td>
      <td>${(p.sizes||[]).map(s=>`<span style='display:inline-block;padding:0.2em 0.7em;background:#181818;color:#fff;border-radius:0.5em;font-size:0.98em;margin:0 0.2em;'>${s}</span>`).join('')}</td>
      <td><button class="admin-edit" data-id="${realId}">✏️</button></td>
      <td><button class="admin-del" data-id="${realId}" style="color:#ff3b3b;">🗑️</button></td>
    </tr>`;
  }
  tableHtml += '</table>';
  container.innerHTML = formHtml + tableHtml;
  const form = document.getElementById('admin-product-form');
  const cancelBtn = document.getElementById('admin-product-cancel');
  let editId = null;
  form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      name: fd.get('name'),
      price: Number(fd.get('price')),
      description: fd.get('description'),
      image: fd.get('image'),
      sizes: form.querySelectorAll('input[name="sizes"]:checked') ? Array.from(form.querySelectorAll('input[name="sizes"]:checked')).map(cb=>cb.value) : []
    };
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    editId = null;
    form.reset();
    cancelBtn.style.display = 'none';
    await renderAdminProducts();
  };
  cancelBtn.onclick = () => {
    editId = null;
    form.reset();
    cancelBtn.style.display = 'none';
  };
  // При редактировании товара — подставлять значения sizes
  container.querySelectorAll('.admin-edit').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const prod = products.find(p => String(p._id) === String(id));
      if (!prod) return;
      form.name.value = prod.name;
      form.price.value = prod.price;
      form.description.value = prod.description;
      form.image.value = prod.image;
      // sizes
      form.querySelectorAll('input[name="sizes"]').forEach(cb => {
        cb.checked = (prod.sizes||[]).includes(cb.value);
      });
      editId = prod._id;
      cancelBtn.style.display = '';
    };
  });
  container.querySelectorAll('.admin-del').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      alert('Удаление товара, id: ' + id);
      console.log('Удаление товара, id:', id);
      if (!id) {
        alert('Ошибка: id товара не найден');
        return;
      }
      if (!confirm('Удалить товар?')) return;
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      await renderAdminProducts();
    };
  });
  // Динамический статус наличия для каждого размера
  ['S','M','L','XL'].forEach(size => {
    const sel = form.querySelector(`select[name='size-status-${size}']`);
    const label = sel.parentElement;
    let statusSpan = label.querySelector('.size-status');
    if (!statusSpan) {
      statusSpan = document.createElement('span');
      statusSpan.className = 'size-status';
      statusSpan.style.fontSize = '0.9em';
      statusSpan.style.marginTop = '0.2em';
      label.appendChild(statusSpan);
    }
    const updateStatus = () => {
      statusSpan.textContent = sel.value;
      statusSpan.style.color = sel.value === 'available' ? '#00bfae' : sel.value === 'pending' ? '#ffb300' : '#ff3b3b';
    };
    sel.onchange = updateStatus;
    updateStatus();
  });
  // Гарантировать добавление кнопки "Нет в наличии"
  const adminMenu = document.querySelector('.admin-menu');
  if (adminMenu && !document.getElementById('tab-outofstock')) {
    const outBtn = document.createElement('button');
    outBtn.className = 'admin-tab-btn';
    outBtn.id = 'tab-outofstock';
    outBtn.textContent = 'Нет в наличии';
    outBtn.style.fontSize = '1.1rem';
    outBtn.style.padding = '0.7rem 2.2rem';
    outBtn.style.borderRadius = '0.7rem';
    outBtn.style.border = 'none';
    outBtn.style.background = '#f7f7f7';
    outBtn.style.color = '#181818';
    outBtn.style.fontWeight = '700';
    outBtn.style.cursor = 'pointer';
    adminMenu.appendChild(outBtn);
    outBtn.onclick = () => {
      document.getElementById('admin-products').style.display = 'none';
      document.getElementById('admin-orders').style.display = 'none';
      renderAdminOutOfStock();
    };
    // Вернуть остальные вкладки
    document.getElementById('tab-products').onclick = () => {
      document.getElementById('admin-products').style.display = '';
      document.getElementById('admin-orders').style.display = 'none';
      const outDiv = document.getElementById('admin-outofstock');
      if (outDiv) outDiv.style.display = 'none';
    };
    document.getElementById('tab-orders').onclick = () => {
      document.getElementById('admin-products').style.display = 'none';
      document.getElementById('admin-orders').style.display = '';
      const outDiv = document.getElementById('admin-outofstock');
      if (outDiv) outDiv.style.display = 'none';
    };
  }
}

// На admin.html — рендерим товары при открытии админки
if (window.location.pathname.endsWith('admin.html')) {
  const panel = document.querySelector('.admin-panel');
  if (panel) renderAdminProducts();
} 

// --- ADMIN ORDERS ---
async function renderAdminOrders() {
  const container = document.getElementById('admin-orders');
  if (!container) return;
  showAdminOrdersSkeletons();
  // Получаем данные админа из localStorage
  const user = getUser();
  const telegram = user?.telegram;
  const password = user?.password;
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram, password })
  });
  let orders = await res.json();
  orders = orders.map(o => ({ ...o, id: o._id || o.id }));
  // Фильтры
  const name = (document.getElementById('order-search-name')?.value || '').toLowerCase();
  const tg = (document.getElementById('order-search-tg')?.value || '').toLowerCase();
  const phone = (document.getElementById('order-search-phone')?.value || '').toLowerCase();
  orders = orders.filter(o =>
    (!name || o.name.toLowerCase().includes(name)) &&
    (!tg || o.telegram.toLowerCase().includes(tg)) &&
    (!phone || o.phone.toLowerCase().includes(phone))
  );
  if (!orders.length) {
    container.innerHTML = '<i>Заказов пока нет</i>';
    return;
  }
  let html = `<div style='display:flex;justify-content:center;width:100%;'><table class="admin-orders-table" style="border-collapse:separate;border-spacing:0;background:#fff;border-radius:10px;box-shadow:0 4px 32px #00d47e22;min-width:1200px;">
    <tr style="background:#f7f7f7;font-size:1.08em;">
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">ID</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Дата</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Имя</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Telegram</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Телефон</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Адрес</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Состав заказа</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Сумма</th>
      <th style="padding:1.7em 2em;font-weight:700;color:#181818;">Статус</th>
    </tr>`;
  const statusOptions = ['В обработке', 'Выполнен', 'Отклонён'];
  for (const o of orders) {
    const total = (o.cart||[]).reduce((sum, item) => sum + (item.price||0) * (item.count||1), 0);
    let status = o.status || 'В обработке';
    let statusColor = '#ffb300';
    if (status === 'Выполнен' || status === 'Завершён') statusColor = '#00d47e';
    if (status === 'Отклонён' || status === 'Отменён') statusColor = '#e53935';
    html += `<tr style="border-bottom:1px solid #eee;">
      <td style="padding:0.8em 0.7em;text-align:center;">${String(o._id || o.id)}</td>
      <td style="padding:0.8em 0.7em;text-align:center;">${o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU') : ''}</td>
      <td style="padding:0.8em 0.7em;">${o.name}</td>
      <td style="padding:0.8em 0.7em;">${o.telegram}</td>
      <td style="padding:0.8em 0.7em;">${o.phone}</td>
      <td style="padding:0.8em 0.7em;">${o.address}</td>
      <td style="padding:0.8em 0.7em;font-size:0.98em;">
        <ul style="margin:0;padding-left:1.2em;">
          ${(o.cart||[]).map(item => `<li>${item.name} (${item.count} шт.)</li>`).join('')}
        </ul>
      </td>
      <td style="padding:0.8em 0.7em;font-weight:700;color:#181818;">${total ? total.toLocaleString() + ' ₽' : ''}</td>
      <td style="padding:0.8em 0.7em;text-align:center;">
        <select class="order-status-select" data-id="${String(o._id || o.id)}" style="display:inline-block;padding:0.4em 1.2em;border-radius:1em;font-weight:600;background:${statusColor}22;color:${statusColor};min-width:90px;border:none;outline:none;font-size:1em;">
          ${statusOptions.map(opt => `<option value="${opt}" ${opt===status?'selected':''}>${opt}</option>`).join('')}
        </select>
      </td>
    </tr>`;
  }
  html += '</table></div>';
  container.innerHTML = html;
  // Обработчик смены статуса
  container.querySelectorAll('.order-status-select').forEach(sel => {
    sel.onchange = async function() {
      const id = this.getAttribute('data-id');
      const newStatus = this.value;
      await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, telegram, password })
      });
      renderAdminOrders();
    };
  });
}

// На admin.html — фильтры заказов
if (window.location.pathname.endsWith('admin.html')) {
  const panel = document.querySelector('.admin-panel');
  if (panel) {
    renderAdminProducts();
    renderAdminOrders();
    // Форма поиска заказов
    const orderForm = document.getElementById('order-search-form');
    if (orderForm) {
      orderForm.onsubmit = e => {
        e.preventDefault();
        renderAdminOrders();
      };
      document.getElementById('order-search-name').oninput = renderAdminOrders;
      document.getElementById('order-search-tg').oninput = renderAdminOrders;
      document.getElementById('order-search-phone').oninput = renderAdminOrders;
    }
  }
} 

// --- Скелетоны для каталога ---
function showCatalogSkeletons() {
  const catalog = document.querySelector('.catalog');
  if (!catalog) return;
  catalog.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    catalog.innerHTML += `
      <div class="skeleton-card">
        <div class="skeleton" style="width:180px;height:180px;"></div>
        <div class="skeleton" style="width:120px;height:1.2em;"></div>
        <div class="skeleton" style="width:80px;height:1.1em;"></div>
        <div class="skeleton" style="width:100px;height:1.1em;"></div>
        <div class="skeleton" style="width:90px;height:2.2em;margin-top:1em;"></div>
      </div>
    `;
  }
}
// --- Каталог: показываем скелетоны при загрузке ---
async function renderCatalog() {
  const catalog = document.querySelector('.catalog');
  if (!catalog) return;
  showCatalogSkeletons();
  const res = await fetch('/api/products');
  let products = await res.json();
  products = products.map(p => ({ ...p, id: p._id || p.id }));

  // Собираем все размеры для фильтра
  const allSizes = Array.from(new Set(products.flatMap(p => p.sizes || [])));
  const sizeFilter = document.getElementById('size-filter');
  if (sizeFilter && !sizeFilter.hasChildNodes()) {
    allSizes.forEach(size => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${size}"> ${size}`;
      sizeFilter.appendChild(label);
    });
  }
  // Обновляем стили выделения чекбоксов
  if (sizeFilter) {
    sizeFilter.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.onchange = function() {
        cb.parentElement.classList.toggle('checked', cb.checked);
      };
      cb.onchange();
    });
  }

  // Фильтры
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const minPrice = Number(document.getElementById('min-price')?.value) || 0;
  const maxPrice = Number(document.getElementById('max-price')?.value) || Infinity;
  const checkedSizes = Array.from(sizeFilter ? sizeFilter.querySelectorAll('input[type="checkbox"]:checked') : []).map(cb => cb.value);
  const sort = document.getElementById('sort-select')?.value || 'default';

  products = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search)) &&
    (!minPrice || p.price >= minPrice) &&
    (!maxPrice || p.price <= maxPrice) &&
    (!checkedSizes.length || (p.sizes || []).some(s => checkedSizes.includes(s)))
  );

  // Сортировка
  if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  if (sort === 'new') products = products.slice().sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0));

  catalog.innerHTML = '';
  if (!products.length) {
    catalog.innerHTML = '<h3 style="text-align:center;width:100%;">Товары не найдены</h3>';
    return;
  }
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const imgSrc = product.image ? `img/${product.image}` : 'https://via.placeholder.com/200x200?text=' + encodeURIComponent(product.name);
    let badgeHtml = '';
    if (product.badge === 'new') badgeHtml = `<span class='badge badge-new'>Новинка</span>`;
    if (product.badge === 'sale') badgeHtml = `<span class='badge badge-sale'>Скидка</span>`;
    if (product.badge === 'hit') badgeHtml = `<span class='badge badge-hit'>Хит</span>`;
    card.innerHTML = `
      ${badgeHtml}
      <img src="${imgSrc}" alt="${product.name}" />
      <h2>${product.name}</h2>
      <p>${product.description}</p>
      <span class="price">${product.price.toLocaleString()} ₽</span>
      <button data-id="${product.id}">В корзину</button>
    `;
    card.style.position = 'relative';
    card.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      window.location.href = `product.html?id=${product.id}`;
    });
    card.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart({ id: product.id, name: product.name, price: product.price, image: product.image });
      showToast('Товар добавлен в корзину!');
    });
    catalog.appendChild(card);
  });
}
// --- Обработчики фильтров и сортировки ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('search-form')) {
    const form = document.getElementById('search-form');
    form.onsubmit = e => {
      e.preventDefault();
      renderCatalog();
    };
    document.getElementById('search-input').oninput = renderCatalog;
    document.getElementById('min-price').oninput = renderCatalog;
    document.getElementById('max-price').oninput = renderCatalog;
    document.getElementById('sort-select').onchange = renderCatalog;
    // size-filter чекбоксы — динамически, поэтому делаем делегирование
    document.getElementById('size-filter').addEventListener('change', renderCatalog);
  }
  if (window.location.pathname.endsWith('catalog.html')) {
    renderCatalog();
  }
});

// На profile.html — история заказов
if (window.location.pathname.endsWith('profile.html')) {
  renderUserOrders();
} 

// Удалён функционал избранного

// На profile.html — история заказов
if (window.location.pathname.endsWith('profile.html')) {
  renderUserOrders();
} 

function renderReviews(productId) {
  const list = document.getElementById('reviews-list');
  if (!list) return;
  const reviews = getReviews(productId);
  if (!reviews.length) {
    list.innerHTML = '<i>Пока нет отзывов. Будьте первым!</i>';
    return;
  }
  list.innerHTML = reviews.map(r => `
    <div style="background:#23272a;padding:1rem 1.2rem;border-radius:0.7rem;margin-bottom:1.2rem;">
      <b>${r.author}</b> <span style="color:#bdbdbd;font-size:0.95em;">${r.date}</span><br>
      <span style="font-size:1.08em;">${r.text}</span>
    </div>
  `).join('');
} 

// После загрузки аватарки обновлять header
if (window.location.pathname.endsWith('profile.html')) {
  const avatarForm = document.getElementById('avatar-form');
  if (avatarForm) {
    avatarForm.addEventListener('submit', function() {
      setTimeout(renderHeaderUser, 100);
    });
  }
} 

// На admin.html — обработка выхода
if (window.location.pathname.endsWith('admin.html')) {
  const logoutBtn = document.getElementById('admin-logout');
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      clearUser();
      window.location.href = 'login.html';
    };
  }
} 

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style='font-size:1.4em;vertical-align:-0.2em;margin-right:0.7em;color:#00d47e;'>✔️</span> ${msg}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1700);
} 

// --- USER ORDERS ---
async function renderUserOrders() {
  const user = getUser();
  const container = document.getElementById('user-orders');
  if (!user || !container) return;
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: user.id || user._id, telegram: user.telegram })
  });
  const orders = await res.json();
  if (!orders.length) {
    container.innerHTML = '<i>У вас пока нет заказов</i>';
    return;
  }
  let html = `<table style="width:100%;border-collapse:collapse;background:#fafafa;">
    <tr style="background:#f7f7f7;">
      <th>ID</th><th>Дата</th><th>Адрес</th><th>Состав заказа</th><th>Сумма</th><th>Статус</th>
    </tr>`;
  for (const o of orders) {
    const total = (o.cart||[]).reduce((sum, item) => sum + (item.price||0) * (item.count||1), 0);
    html += `<tr>
      <td>${o._id || o.id}</td>
      <td>${o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU') : ''}</td>
      <td>${o.address}</td>
      <td style="font-size:0.95em;">
        <ul style="margin:0;padding-left:1.2em;">
          ${(o.cart||[]).map(item => `<li>${item.name} (${item.count} шт.)</li>`).join('')}
        </ul>
      </td>
      <td>${total ? total.toLocaleString() + ' ₽' : ''}</td>
      <td>${o.status || 'В обработке'}</td>
    </tr>`;
  }
  html += '</table>';
  container.innerHTML = html;
} 

// --- Валидация ---
function validatePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
function validateTelegram(tg) {
  // @username, только буквы, цифры, _
  return /^@?\w{4,32}$/.test(tg || '');
}
function validateEmail(email) {
  // Простейшая проверка
  return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email || '');
} 

// --- КАПЧА ---
function addSimpleCaptcha(form, resultSelector) {
  // Добавить поле капчи в форму
  const captchaWrap = document.createElement('div');
  captchaWrap.style = 'display:flex;align-items:center;gap:0.7em;margin-bottom:0.5em;';
  const a = Math.floor(Math.random()*5+2), b = Math.floor(Math.random()*5+2);
  captchaWrap.innerHTML = `<label style='font-size:1.05em;'>${a} + ${b} = <input type='number' class='captcha-input' style='width:60px;padding:0.5em 0.7em;border-radius:0.5em;border:1.5px solid #bbb;font-size:1.1em;'></label>`;
  form.insertBefore(captchaWrap, form.querySelector('button'));
  form._captchaAnswer = a + b;
  form._captchaWrap = captchaWrap;
  form._captchaResult = resultSelector ? document.querySelector(resultSelector) : null;
}
function checkSimpleCaptcha(form) {
  const input = form.querySelector('.captcha-input');
  if (!input) return true;
  if (Number(input.value) !== form._captchaAnswer) {
    if (form._captchaResult) form._captchaResult.textContent = 'Неверно решена капча!';
    else alert('Неверно решена капча!');
    input.style.borderColor = '#e53935';
    return false;
  }
  input.style.borderColor = '#00d47e';
  if (form._captchaResult) form._captchaResult.textContent = '';
  return true;
} 

// --- Восстановление пароля ---
document.addEventListener('DOMContentLoaded', () => {
  const forgotLink = document.getElementById('forgot-link');
  const forgotModal = document.getElementById('forgot-modal');
  const closeForgot = document.getElementById('close-forgot');
  const forgotForm = document.getElementById('forgot-form');
  const forgotResult = document.getElementById('forgot-result');
  if (forgotLink && forgotModal) {
    forgotLink.onclick = e => {
      e.preventDefault();
      forgotModal.style.display = 'flex';
      forgotResult.textContent = '';
      forgotForm && forgotForm.reset();
    };
  }
  if (closeForgot && forgotModal) {
    closeForgot.onclick = () => {
      forgotModal.style.display = 'none';
    };
  }
  if (forgotForm) {
    forgotForm.onsubmit = async e => {
      e.preventDefault();
      const value = forgotForm.telegram.value.trim();
      if (!value) {
        forgotResult.textContent = 'Введите Telegram или email';
        return;
      }
      forgotForm.querySelector('button[type="submit"]').disabled = true;
      forgotResult.textContent = 'Поиск...';
      try {
        const res = await fetch('/api/forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        });
        const data = await res.json();
        if (res.ok && data.password) {
          forgotResult.style.color = '#00d47e';
          forgotResult.textContent = 'Ваш пароль: ' + data.password;
        } else {
          forgotResult.style.color = '#e53935';
          forgotResult.textContent = data.error || 'Пользователь не найден';
        }
      } catch {
        forgotResult.style.color = '#e53935';
        forgotResult.textContent = 'Ошибка сети';
      }
      forgotForm.querySelector('button[type="submit"]').disabled = false;
    };
  }
}); 

// --- АДРЕСА ПОЛЬЗОВАТЕЛЯ ---
const ADDRESSES_KEY = 'shop_addresses';
function getAddresses() {
  return JSON.parse(localStorage.getItem(ADDRESSES_KEY) || '[]');
}
function setAddresses(arr) {
  localStorage.setItem(ADDRESSES_KEY, JSON.stringify(arr));
}
function renderUserAddresses() {
  const container = document.getElementById('user-addresses');
  if (!container) return;
  const addresses = getAddresses();
  if (!addresses.length) {
    container.innerHTML = '<i>Нет сохранённых адресов</i>';
    return;
  }
  container.innerHTML = addresses.map((a, i) => `
    <div style="display:flex;align-items:center;gap:0.7em;margin-bottom:0.7em;">
      <span style="flex:1;">${a.label ? `<b>${a.label}:</b> ` : ''}${a.address || a.value || ''}</span>
      <button class="del-address-btn" data-idx="${i}" style="background:#ff3b3b;color:#fff;border:none;border-radius:0.5em;padding:0.3em 1em;font-size:1em;">Удалить</button>
    </div>
  `).join('');
  container.querySelectorAll('.del-address-btn').forEach(btn => {
    btn.onclick = function() {
      const idx = Number(this.getAttribute('data-idx'));
      const arr = getAddresses();
      arr.splice(idx, 1);
      setAddresses(arr);
      renderUserAddresses();
    };
  });
}
function renderCheckoutAddressSelect() {
  const wrap = document.getElementById('address-select-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const addresses = JSON.parse(localStorage.getItem('shop_addresses')||'[]');
  if (addresses.length) {
    // Есть сохранённые адреса
    const select = document.createElement('select');
    select.name = 'address-select';
    select.style = 'padding:0.7rem 1rem;border-radius:0.5rem;border:1.5px solid #bbb;font-size:1.08rem;';
    addresses.forEach((a, i) => {
      const opt = document.createElement('option');
      opt.value = a.value;
      opt.textContent = a.value + (a.default ? ' (по умолчанию)' : '');
      if (a.default) opt.selected = true;
      select.appendChild(opt);
    });
    const optNew = document.createElement('option');
    optNew.value = '__new__';
    optNew.textContent = 'Новый адрес...';
    select.appendChild(optNew);
    wrap.appendChild(select);
    // Поле для нового адреса (скрыто по умолчанию)
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'address';
    input.placeholder = 'Введите новый адрес';
    input.style = 'padding:0.7rem 1rem;border-radius:0.5rem;border:1.5px solid #bbb;font-size:1.08rem;margin-top:0.7rem;display:none;';
    wrap.appendChild(input);
    select.onchange = function() {
      if (select.value === '__new__') {
        input.style.display = '';
        input.required = true;
      } else {
        input.style.display = 'none';
        input.required = false;
      }
    };
  } else {
    // Нет адресов — обычное поле
    wrap.innerHTML = '<input type="text" name="address" placeholder="Адрес доставки" required style="padding:0.7rem 1rem;border-radius:0.5rem;border:1.5px solid #bbb;font-size:1.08rem;" />';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  renderUserAddresses();
  const addForm = document.getElementById('add-address-form');
  const addressResult = document.getElementById('address-result');
  if (addForm) {
    addForm.onsubmit = e => {
      e.preventDefault();
      const input = document.getElementById('new-address');
      const value = input.value.trim();
      if (value.length < 4) {
        addressResult.textContent = 'Адрес слишком короткий';
        return;
      }
      let arr = getAddresses();
      if (arr.find(a => a.value === value)) {
        addressResult.textContent = 'Такой адрес уже есть';
        return;
      }
      arr.push({ value, default: arr.length === 0 });
      setAddresses(arr);
      input.value = '';
      addressResult.textContent = '';
      renderUserAddresses();
    };
  }
  if (window.location.pathname.endsWith('checkout.html')) {
    renderCheckoutAddressSelect();
  }
}); 

// --- ТЁМНАЯ ТЕМА ---
function setTheme(dark) {
  document.body.classList.toggle('dark-theme', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = dark ? '☀️' : '🌙';
}
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  setTheme(!isDark);
}
document.addEventListener('DOMContentLoaded', () => {
  // Применяем тему при загрузке
  const saved = localStorage.getItem('theme');
  setTheme(saved === 'dark');
  // Кнопка переключения темы
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.onclick = toggleTheme;
}); 

// --- Заглушка для скелетонов заказов в админке ---
function showAdminOrdersSkeletons() {} 

// --- Исправленный рендер товара на product.html ---
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('product.html')) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      fetch('/api/products').then(res=>res.json()).then(products=>{
        const product = products.find(p => String(p._id || p.id) === String(id));
        if (!product) return;
        let currentImg = 0;
        const images = Array.isArray(product.images) && product.images.length ? product.images : [product.image];
        function showImg(idx) {
          document.getElementById('product-img').src = 'img/' + images[idx];
          document.getElementById('product-img').alt = product.name;
          document.getElementById('product-thumbs').innerHTML = images.map((img, i) =>
            `<img src="img/${img}" alt="thumb" style="width:60px;height:60px;object-fit:cover;border-radius:0.5rem;cursor:pointer;box-shadow:0 1px 6px #0001;border:2.5px solid ${i===idx?'#181818':'#eee'};transition:border 0.2s;" data-idx="${i}">`
          ).join('');
          document.querySelectorAll('#product-thumbs img').forEach(thumb => {
            thumb.onclick = () => { showImg(Number(thumb.dataset.idx)); };
          });
        }
        showImg(0);
        document.getElementById('product-title').textContent = product.name;
        document.getElementById('product-price').textContent = product.price.toLocaleString() + ' ₽';
        if (product.priceOld) {
          document.getElementById('product-old-price').textContent = product.priceOld.toLocaleString() + ' ₽';
        }
        document.getElementById('product-composition').textContent = product.composition ? 'Состав: ' + product.composition : '';
        document.getElementById('product-color').textContent = product.color ? 'Цвет: ' + product.color : '';
        document.getElementById('product-desc').textContent = product.description;
        const sizes = Array.isArray(product.sizes) ? product.sizes : [];
        const sizeSelect = document.getElementById('size-select');
        sizeSelect.innerHTML = sizes.length ? sizes.map(s => `<option value="${s}">${s}</option>`).join('') : '<option value="">-</option>';
        sizeSelect.disabled = !sizes.length;
        const addBtn = document.getElementById('add-to-cart');
        addBtn.disabled = !sizes.length;
        addBtn.onclick = () => {
          const size = sizeSelect.value || (sizes[0] || '');
          addToCart({ id: String(product._id || product.id), name: product.name, price: product.price, image: product.image, size });
          showToast('Товар добавлен в корзину!');
        };
      });
    }
  }
}); 

// --- Переключение вкладок в админке ---
document.addEventListener('DOMContentLoaded', () => {
  // --- Переключение вкладок в админке ---
  if (window.location.pathname.endsWith('admin.html')) {
    const tabProducts = document.getElementById('tab-products');
    const tabOrders = document.getElementById('tab-orders');
    const adminProducts = document.getElementById('admin-products');
    const adminOrders = document.getElementById('admin-orders');
    if (tabProducts && tabOrders && adminProducts && adminOrders) {
      tabProducts.onclick = () => {
        tabProducts.style.background = '#181818';
        tabProducts.style.color = '#fff';
        tabOrders.style.background = '#f7f7f7';
        tabOrders.style.color = '#181818';
        adminProducts.style.display = '';
        adminOrders.style.display = 'none';
        renderAdminProducts();
      };
      tabOrders.onclick = () => {
        tabOrders.style.background = '#181818';
        tabOrders.style.color = '#fff';
        tabProducts.style.background = '#f7f7f7';
        tabProducts.style.color = '#181818';
        adminProducts.style.display = 'none';
        adminOrders.style.display = '';
        renderAdminOrders();
      };
    }
  }
}); 

// --- PROFILE: MongoDB API ---
async function renderProfile() {
  const user = getUser();
  if (!user) return;
  // Получаем свежий профиль из MongoDB
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: user.id || user._id, telegram: user.telegram })
  });
  const profile = await res.json();
  if (!profile || profile.error) return;
  // Аватар
  const avatarDiv = document.getElementById('profile-avatar');
  avatarDiv.innerHTML = '';
  if (profile.avatar) {
    const img = document.createElement('img');
    img.src = profile.avatar;
    img.alt = 'avatar';
    img.style = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    avatarDiv.appendChild(img);
  } else {
    avatarDiv.textContent = (profile.name||profile.telegram||'U')[0].toUpperCase();
  }
  // Инфо
  const info = document.getElementById('profile-info');
  info.innerHTML = `
    <div style="font-size:1.18rem;font-weight:700;margin-bottom:0.5rem;">${profile.name}</div>
    <div style="color:#888;font-size:1.05rem;margin-bottom:0.3rem;">Telegram: <b>@${profile.telegram.replace(/^@/, '')}</b></div>
    <div style="color:#888;font-size:1.05rem;">Телефон: <b>${formatPhone(profile.phone)}</b></div>
  `;
  // Кнопка админки
  const adminBtn = document.getElementById('open-admin');
  if (adminBtn) {
    if (profile.telegram === '@Ilyushechka_vey') {
      adminBtn.style.display = 'block';
      adminBtn.onclick = () => window.location.href = 'admin.html';
    } else {
      adminBtn.style.display = 'none';
    }
  }
}
// --- Загрузка аватара ---
document.addEventListener('DOMContentLoaded', () => {
  const avatarForm = document.getElementById('avatar-form');
  const avatarInput = document.getElementById('avatar-input');
  const avatarResult = document.getElementById('avatar-upload-result');
  if (avatarForm && avatarInput) {
    avatarInput.onchange = () => {
      if (avatarInput.files && avatarInput.files[0]) {
        avatarForm.querySelector('button[type="submit"]').click();
      }
    };
    avatarForm.onsubmit = async e => {
      e.preventDefault();
      const user = getUser();
      if (!user || !avatarInput.files[0]) return;
      const fd = new FormData();
      fd.append('avatar', avatarInput.files[0]);
      fd.append('id', user.id || user._id);
      avatarResult.textContent = 'Загрузка...';
      try {
        const res = await fetch('/api/profile/avatar', {
          method: 'POST',
          body: fd
        });
        const data = await res.json();
        if (res.ok && data.avatar) {
          avatarResult.textContent = 'Аватар обновлён!';
          setTimeout(() => avatarResult.textContent = '', 1200);
          // Обновить профиль
          renderProfile();
        } else {
          avatarResult.textContent = data.error || 'Ошибка загрузки';
        }
      } catch {
        avatarResult.textContent = 'Ошибка сети';
      }
    };
  }
}); 

// --- Вкладка "Нет в наличии" ---
async function renderAdminOutOfStock() {
  let outDiv = document.getElementById('admin-outofstock');
  if (!outDiv) {
    outDiv = document.createElement('div');
    outDiv.id = 'admin-outofstock';
    outDiv.style.width = '100%';
    outDiv.style.marginBottom = '2.5rem';
    document.querySelector('main').appendChild(outDiv);
  }
  outDiv.style.display = '';
  outDiv.innerHTML = '<b>Загрузка...</b>';
  const res = await fetch('/api/products');
  let products = await res.json();
  // Фильтруем товары, у которых ВСЕ размеры недоступны
  products = products.filter(p => Array.isArray(p.sizes) && p.sizes.length && p.sizes.every(s => s.available === false));
  if (!products.length) {
    outDiv.innerHTML = '<i>Нет товаров, у которых все размеры недоступны.</i>';
    return;
  }
  let tableHtml = `<table style="width:100%;border-collapse:collapse;background:#fafafa;text-align:center;">
    <tr style="background:#f7f7f7;">
      <th>ID</th><th>Название</th><th>Цена</th><th>Описание</th><th>Картинка</th><th>Размеры</th><th></th><th></th>
    </tr>`;
  for (const p of products) {
    const realId = p._id;
    tableHtml += `<tr>
      <td>${realId}</td>
      <td>${p.name}</td>
      <td>${p.price}</td>
      <td>${p.description}</td>
      <td><img src="img/${p.image}" alt="${p.name}" style="width:50px;height:50px;object-fit:cover;border-radius:0.3rem;" /></td>
      <td>${(p.sizes||[]).map(s=>`<span style='display:inline-block;padding:0.2em 0.7em;background:${s.available ? '#181818' : '#bbb'};color:#fff;border-radius:0.5em;font-size:0.98em;margin:0 0.2em;'>${s.size}</span>`).join('')}</td>
      <td><button class="admin-edit" data-id="${realId}">✏️</button></td>
      <td><button class="admin-del" data-id="${realId}" style="color:#ff3b3b;">🗑️</button></td>
    </tr>`;
  }
  tableHtml += '</table>';
  outDiv.innerHTML = tableHtml;
  // Повесить обработчики на кнопки редактирования и удаления
  outDiv.querySelectorAll('.admin-edit').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      const prod = products.find(p => String(p._id) === String(id));
      if (!prod) return;
      // Заполнить форму для редактирования
      document.getElementById('tab-products').click();
      setTimeout(() => {
        const form = document.getElementById('admin-product-form');
        if (!form) return;
        form.name.value = prod.name;
        form.price.value = prod.price;
        form.description.value = prod.description;
        form.image.value = prod.image;
        ['S','M','L','XL'].forEach(size => {
          const sel = form.querySelector(`select[name='size-status-${size}']`);
          const found = (prod.sizes||[]).find(s => s.size === size);
          sel.value = found ? (found.status || 'available') : 'available';
        });
        editId = prod._id;
        document.getElementById('admin-product-cancel').style.display = '';
      }, 100);
    };
  });
  outDiv.querySelectorAll('.admin-del').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Удалить товар?')) return;
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      await renderAdminOutOfStock();
    };
  });
} 

// --- Обработчик для кастомных ссылок в мобильном меню ---
document.querySelectorAll('#mobile-menu .burger-menu-text').forEach(el => {
  el.addEventListener('click', () => {
    window.location.href = el.getAttribute('data-href');
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      window.location.href = el.getAttribute('data-href');
    }
  });
}); 