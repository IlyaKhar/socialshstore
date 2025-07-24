# Интернет-магазин (HTML/CSS/JS + Node.js/Express)

## Структура

- `public/` — фронтенд (HTML, CSS, JS)
- `server/` — backend (Node.js, Express)

## Запуск

1. Установить зависимости backend:
   ```
   cd server
   npm install
   ```
2. Для автоматического перезапуска сервера при изменениях установить nodemon:
   ```
   npm install --save-dev nodemon
   ```
   или глобально:
   ```
   npm install -g nodemon
   ```
3. Запустить сервер с автообновлением:
   ```
   npx nodemon app.js
   ```
   или
   ```
   nodemon app.js
   ```
4. Открыть [http://localhost:3000](http://localhost:3000) в браузере

---

- Главная страница: каталог товаров (index.html)
- Корзина: cart.html
- Страница товара: product.html
- Оформление заказа: checkout.html
- Личный кабинет: profile.html
- Админ-панель: admin.html

---

Дальнейшая разработка: подключение MongoDB, динамика на JS, API для заказов и корзины. 