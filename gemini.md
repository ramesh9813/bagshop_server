# Project Summary: BagShop Backend

A robust RESTful API built for a handmade bag e-commerce platform using the **MERN** stack (Node.js, Express, MongoDB). This backend handles product management, user authentication, review systems, and order processing with integration readiness for eSewa.

## Technical Details

### 1. Core Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas (via Mongoose ODM)
- **Authentication:** JWT (JSON Web Tokens) with HttpOnly Cookies
- **Security:** BcryptJS for password hashing, Validator for data integrity
- **Middleware:** CORS, Cookie-Parser, Custom Auth Middleware, Request Logger

### 2. Database Models (Schemas)
- **User:** Manages identities with roles (`user`, `admin`). Includes password encryption and JWT generation.
- **Product:** Detailed product storage including categories (Men, Women, Children), sizing, and stock management.
- **Reviews (Embedded):** Nested within the Product model to ensure high-performance data retrieval and atomic rating updates.
- **Cart:** Persists user shopping sessions. Items store `product` references and `quantity`.
- **Order:** 
  - **Snapshot:** Captures product `name`, `price`, and `image` at the time of purchase (does not rely on live product data).
    - **Lifecycle:** Tracks shipping info, payment status (eSewa Transaction IDs), and fulfillment status. Supports `eSewa` and `COD` methods.
- **Payment (eSewa & COD):** 
  - **eSewa:** Handles secure payment initiation, signature generation (HMAC-SHA256), and server-to-server verification.
  - **COD:** Orders are created with 'Pending' status and processed directly.

### 3. Key Business Logic & Features
- **Authentication:** 
  - Secure Registration/Login/Logout.
  - Profile Management: Update/Delete own profile (`/me`).
  - Role-Based Access Control (RBAC) for Admin routes.
- **Cart Management:** 
  - **Auto-Population:** All cart responses return full product details (Name, Image, Price).
  - **Logic:** Prevents duplicate items (returns 409 Conflict). Updates strictly via PUT requests.
- **Order Processing (Secure Flow):** 
  - **Source of Truth:** Creates orders *strictly* from the user's active Cart (ignores client-side price/item payloads).
  - **Stock Management:** Atomic stock deduction upon order creation.
  - **Financial Integrity:** Recalculates all totals server-side using database prices.
  - **Cleanup:** 
    - **eSewa:** Cart is cleared upon successful payment verification.
    - **COD:** Cart is cleared immediately upon order creation.
- **eSewa Integration:** 
  - HMAC-SHA256 Signature Generation.
  - Double Verification (Signature check + Upstream Status API check).

### 4. API Endpoints (Base: `/api/v1`)

#### User & Auth
- `POST /register` - Signup
- `POST /login` - Signin
- `GET /logout` - Signout
- `GET /me` - Get current user details
- `PUT /me/update` - Update profile
- `DELETE /me/delete` - Delete account
- `GET /admin/users` - [Admin] Get all users

#### Products
- `GET /products` - Fetch all
- `GET /products/search?keyword=...` - Search
- `POST /product/new` - [Admin] Create
- `PUT /product/:id` - [Admin] Update
- `DELETE /product/:id` - [Admin] Delete
- `PUT /review` - Add/Update review

#### Cart
- `GET /cart` - View Cart (Populated)
- `POST /cart/add` - Add Item (Prevents duplicates)
- `PUT /cart/update` - Set exact quantity (Removes if 0)
- `DELETE /cart/:productId` - Remove item

#### Orders
- `POST /order/new` - Create Order (from Cart)
- `GET /orders/me` - User's history
- `GET /order/:id` - Order details

#### Payment
- `POST /payment/initiate` - Get signed eSewa payload
- `GET /payment/verify` - Handle callback & verify transaction

### 5. Production Readiness (Roadmap)
*Current Status: Functional Prototype*
- **Missing:**
  - Global Error Handling Middleware (Centralized try/catch).
  - Security Headers (Helmet).
  - Rate Limiting (express-rate-limit).
  - Data Sanitization (xss-clean, mongo-sanitize).
  - Production Logging (Winston/Morgan).