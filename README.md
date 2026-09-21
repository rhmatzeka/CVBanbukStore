# CV Banbuk Store

An online store for **CV Banbuk Mandiri Jaya**. Customers browse the product catalog, save favorites, ask questions before buying, and pay with **Midtrans** (bank transfer, e-wallet, QRIS, cards), **Ethereum** (MetaMask), or a manual payment. Behind the scenes, admins manage products and sales staff follow up on customer questions.

**Live site:** https://cvbanbukstore.vercel.app

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=flat&logo=ethereum&logoColor=white)
![Midtrans](https://img.shields.io/badge/Midtrans-Payment-blue?style=flat)

## At a glance

The app has four main parts:

1. **Product catalog**: browse, search, filter, compare, and view product details.
2. **Shopping**: wishlist, cart, checkout, product questions ("inquiries"), and order history.
3. **Staff dashboard**: admins and sales staff track inquiries, products, stock, and reports.
4. **Payments**: Midtrans, Ethereum, or manual.

Each role has a clear job:

- **Customers** buy products and send inquiries.
- **Sales staff** only follow up on the inquiries assigned to them.
- **Admins** manage products, sales staff, inquiry assignments, reports, and transactions.

Sales staff and admins **can't check out**. This is on purpose, so staff accounts can't buy from their work dashboard.

## Features

### Product catalog

- Responsive product grid (four per row on large screens)
- Search by name, description, material, or size
- Filter by material
- Sort by catalog order, lowest price, highest price, or most stock
- Each card shows the image, stock status, price, material, size, and buttons that depend on your role
- Admins get an **Edit** link right on each card

### Product details

- Large product images, thumbnails, and a specs section
- Full summary: name, description, material, size, stock, and price
- Low stock is flagged automatically
- Customers can add to cart, save to wishlist, or check out
- Admins and sales staff are sent to the dashboard or inquiries instead of checkout

### Compare products

- Pick up to **two products** and compare price, stock, material, size, and description side by side
- Your picks are saved in the browser (`localStorage` key `compare-products`)

### Cart

- Stored in the browser (`localStorage` key `banbuk-cart`)
- Guests can add items too, but must log in as a customer to check out
- Admins and sales staff don't get cart buttons

### Wishlist

- Customers only
- Saved in the database and tied to your account

### Inquiries

An inquiry is a question about a product before buying, such as colors, sizes, stock, shipping, or custom orders.

How an inquiry moves:

1. A customer sends an inquiry from a product page. It starts as `PENDING`.
2. An admin sees all inquiries and assigns one to a sales person.
3. The sales person only sees inquiries assigned to them.
4. They follow up, for example by opening the customer's WhatsApp from the inquiry page.
5. They change the status to `DIPROSES` (in progress) or `SELESAI` (done).
6. The customer can track the progress of their own inquiries.

### Dashboards (different for each role)

| Admin | Sales | Customer |
| --- | --- | --- |
| Total products, inquiries, and pending inquiries | Assigned, pending, and finished inquiries | Profile summary |
| Low-stock products | Latest assignments | Number of inquiries, wishlist items, and orders |
| Total transactions and completed revenue | Follow-up priorities | Latest wishlist items, transactions, and inquiries |
| Most-asked-about products | Shortcuts to inquiries and catalog | Shortcuts to catalog and wishlist |
| Revenue and stock-movement charts | | |
| Export products or inquiries to CSV, dashboard to PDF | | |

### Product management (admin)

- Add, edit, and delete products
- Fields: name, price, stock, description, material, size, and image
- Images can be a real URL, or fall back to sample images in `public/products`

### Payments

Customers choose one of three methods at checkout:

**Midtrans**

- Uses Midtrans Snap, so it supports whatever your Midtrans account enables: bank transfer, e-wallets, QRIS, cards, and retail stores.
- A `PENDING` transaction is saved first. The Midtrans webhook then updates it to `COMPLETED` or `FAILED`.
- Stock goes down once the payment is completed.

**Ethereum**

- Uses MetaMask and ethers.js. The network (for example Sepolia or Ethereum mainnet) comes from the environment settings.
- The `ProductPayment` smart contract receives ETH through `payProduct`.
- After the on-chain payment succeeds, the app saves a `CRYPTO` transaction with the transaction hash and the customer's wallet address.
- For the demo, the ETH amount is fixed at **0.001 ETH**, while the page still shows the product price in rupiah.

**Manual**

- For testing or internal records. Clicking **Pay** marks the transaction `COMPLETED` right away and reduces stock by one.

## Roles and permissions

| Role | Job | Can | Can't |
| --- | --- | --- | --- |
| Guest | Browse | View products, compare, add to a local cart | Check out, save a wishlist, send inquiries |
| Customer | Buy | Wishlist, cart, checkout, inquiries, order history | Manage products, assign or update inquiries |
| Sales | Follow up | View the catalog and assigned inquiries, update their status, open WhatsApp | Check out, wishlist, cart, assign inquiries, manage products |
| Admin | Run the store | Manage products, see all inquiries, assign sales, view reports and stats | Check out or use a wishlist |

- Public sign-up always creates a `CUSTOMER`.
- `ADMIN` and `SALES` accounts are created through the seed script or the database.
- Every API route checks the role on the server, so the rules don't rely on the UI alone.

## Demo accounts

The seed script creates these accounts, plus sample products, two sample inquiries, and a customer wishlist. **Don't use them in production.**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@test.com` | `admin123` |
| Sales | `sales@test.com` | `sales123` |
| Customer | `customer@test.com` | `customer123` |

## Tech stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, GSAP (animations), Recharts (charts), jsPDF (PDF export)
- **Backend**: Next.js route handlers, NextAuth (email and password), Prisma, PostgreSQL, bcryptjs
- **Payments and Web3**: Midtrans Snap and Core API, ethers.js v6, MetaMask, Solidity 0.8.19, Hardhat

## Getting started

You need Node.js 18+ and a PostgreSQL database. For payments, you also need a Midtrans sandbox account and/or MetaMask with an Ethereum RPC URL.

1. Install and copy the environment file:

   ```bash
   npm install
   cp .env.example .env
   ```

2. Fill in at least these values in `.env`:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
   DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
   NEXTAUTH_SECRET="at-least-32-characters"
   NEXTAUTH_URL="http://localhost:3000"
   ```

   Generate a good secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. Set up the database and add demo data:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

4. Start the app and open http://localhost:3000:

   ```bash
   npm run dev
   ```

### All environment variables

| Variable | What it's for |
| --- | --- |
| `DATABASE_URL` | Main PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Direct connection for Prisma migrations. If your database has no separate pooled URL, use the same value as `DATABASE_URL`. |
| `NEXTAUTH_SECRET` | Login session secret (32+ characters) |
| `NEXTAUTH_URL` | App URL, for example `http://localhost:3000` |
| `MIDTRANS_IS_PRODUCTION` / `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | `false` for sandbox, `true` for live. Keep both the same. |
| `MIDTRANS_SERVER_KEY` / `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Keys from your Midtrans dashboard |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Address of the deployed `ProductPayment` contract |
| `NEXT_PUBLIC_CHAIN_ID` | Network ID, for example `11155111` for Sepolia |
| `NEXT_PUBLIC_CHAIN_NAME` / `NEXT_PUBLIC_CHAIN_CURRENCY_SYMBOL` | For example `Sepolia Testnet` and `ETH` |
| `NEXT_PUBLIC_RPC_URL` | RPC URL the website uses |
| `SEPOLIA_RPC_URL` / `MAINNET_RPC_URL` | RPC URLs for deploying the contract |
| `PRIVATE_KEY` | Wallet that deploys the contract. **Never commit this.** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Business WhatsApp number, for example `628123456789` |

### npm scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Check code style |

## Project structure

```text
app/
  api/          API routes: auth, products, inquiries, payments, stats, transactions, users, wishlist
  dashboard/    Role-based dashboard
  inquiry/      Inquiry pages for customers, sales, and admins
  products/     Catalog, add, edit, details, compare, and payment
  login/        Login
  register/     Customer sign-up
components/     UI parts: navbar, payment, product image, cart drawer
contracts/      Solidity smart contract
lib/            Auth config, Prisma client, Midtrans helper
prisma/         Schema, migrations, and seed data
public/products/  Sample product images
scripts/        Contract deploy and check scripts
types/          Type definitions for NextAuth and Midtrans
```

## Database

The schema is in `prisma/schema.prisma`.

| Model | What it stores |
| --- | --- |
| `User` | Admin, sales, and customer accounts |
| `Product` | Catalog products |
| `Inquiry` | Customer questions about a product, with an optional assigned sales person (`assignedTo`) |
| `Wishlist` | Customers' saved products |
| `Transaction` | Midtrans, crypto, and manual payments |

A customer has many inquiries, wishlist items, and transactions. A sales person can be assigned many inquiries. Each product links to its inquiries, wishlist entries, and transactions.

## Smart contract

`contracts/ProductPayment.sol`:

| Function | What it does |
| --- | --- |
| `payProduct(productId)` | Pay for a product in ETH |
| `getBalance()` | See how much ETH the contract holds |
| `getPayment(paymentId)` | See the details of a payment |
| `withdraw()` | The owner withdraws all ETH |
| `transferOwnership(newOwner)` | Hand the contract to a new owner |

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia   # or --network mainnet
```

After deploying, put the address in `NEXT_PUBLIC_CONTRACT_ADDRESS` and restart the app.

Stay safe: never commit `PRIVATE_KEY`, use a separate deploy wallet with little money in it, test on Sepolia before mainnet, and make sure MetaMask is on the same network as `NEXT_PUBLIC_CHAIN_ID`.

## API

| Method | Endpoint | Who | What it does |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Anyone | Sign up as a customer |
| `GET/POST` | `/api/auth/[...nextauth]` | Anyone | Log in, log out, session |
| `GET` | `/api/products` | Anyone | List products |
| `POST` | `/api/products` | Admin | Add a product |
| `GET` | `/api/products/[id]` | Anyone | Product details |
| `PUT` / `DELETE` | `/api/products/[id]` | Admin | Update or delete a product |
| `GET` | `/api/inquiry` | Logged in | Inquiries you're allowed to see |
| `POST` | `/api/inquiry` | Customer | Send an inquiry |
| `PUT` | `/api/inquiry/[id]` | Admin / Sales | Admin assigns sales; sales updates the status |
| `GET` / `POST` | `/api/wishlist` | Customer | See or add wishlist items |
| `DELETE` | `/api/wishlist?productId=...` | Customer | Remove from wishlist |
| `GET` | `/api/transaction` | Admin / Customer | Admin sees all; customers see their own |
| `POST` | `/api/transaction` | Customer | Record a manual or crypto payment |
| `GET` | `/api/stats` | Logged in | Dashboard stats for your role |
| `GET` | `/api/users?role=SALES` | Admin | List users, for example sales staff to assign |
| `POST` | `/api/payment/midtrans/create` | Customer | Start a Midtrans payment |
| `POST` | `/api/payment/midtrans/notification` | Midtrans | Payment status webhook |
| `GET` | `/api/payment/midtrans/status/[orderId]` | Customer / Admin | Check a Midtrans payment |

## Deploying to Vercel

1. Import the repository into Vercel.
2. Add the environment variables listed above, pointing to your **production** database, and set `NEXTAUTH_URL` to your production domain.
3. Run migrations against the production database before going live:

   ```bash
   npx prisma migrate deploy
   ```

4. If you use Midtrans, set its notification URL to `https://YOUR-DOMAIN/api/payment/midtrans/notification`.
5. If you use crypto payments, deploy the contract and set `NEXT_PUBLIC_CONTRACT_ADDRESS`.
6. Redeploy whenever you change environment variables.

## Manual testing checklist

**Basics**: open the homepage and `/products`, try search and the material filter, open a product, compare two products at `/products/compare`, log in as a customer, save to wishlist, send an inquiry, and check out manually. The order should appear on the customer dashboard.

**Admin** (`admin@test.com`): check the dashboard stats, add and edit a product, assign an inquiry to sales, and export CSV/PDF.

**Sales** (`sales@test.com`): the dashboard should have no wishlist, cart, or checkout; only assigned inquiries should appear; change an inquiry's status; the catalog should be view-only.

**Customer** (`customer@test.com`): add to wishlist and cart, send an inquiry, check out manually, and if configured, test a Midtrans sandbox payment and an ETH payment on Sepolia.

**Mobile**: the catalog, product cards, detail and compare pages, inquiry page, payment page, and navbar should all look right on desktop, tablet, and phone.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Prisma fails to generate | Make sure `.env` has both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (they can be the same). |
| Can't log in after seeding | Run `npx prisma db seed` again. Note that it **deletes** the old data and recreates the demo data. |
| Midtrans doesn't appear | Fill in `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, and both `*_IS_PRODUCTION` values (use sandbox keys for testing), then restart. |
| MetaMask checkout fails | Check that the contract address is set, MetaMask is on the right network, the wallet has enough ETH for the payment and gas, and the contract is deployed on that network. |
| Sales can't check out | That's correct: only customers can check out. |

## Notes for developers

- Enforce role rules in **both** the UI and the API.
- Don't give admins or sales staff checkout access.
- A new payment method should save to the `Transaction` model with a clear `paymentType`.
- A new inquiry status needs updates to the badges, dashboard counts, and this README.
- If you change the Prisma schema, add a migration and update the database section above.
