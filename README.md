Royal Center

Royal Center is a production-oriented commerce platform designed to support real-world retail operations across web and mobile clients. It follows an API-first architecture, separating concerns between frontend clients and a secure, transaction-safe backend.

The system is built to scale from a single storefront to a multi-location, multi-channel commerce solution.

✨ Features

Modern Web Frontend

- Built with Next.js (React + TypeScript)

- Responsive, mobile-first UI using Tailwind CSS

- Shared components for storefront, cart, checkout, and admin views

Secure Backend API

- Node.js + Express REST API

- JWT authentication with role-based access control (user / admin)

- Password hashing using bcrypt

- Protected admin endpoints and middleware-based authorization

Robust Order & Inventory System

- Transaction-safe order creation

- Row-level inventory locking to prevent overselling

- Real-time stock awareness

- Location-based inventory support

- Read-only ERP database separated from application database for safety

Commerce-Ready Data Model

- Normalized SQL schema

- Hierarchical product categories

- Orders, order items, payments, addresses, and fulfillment states

- Designed for future multi-warehouse and pickup expansion

OTP / Phone Verification

- SMS-based OTP verification

- Hashed OTP storage

- Expiration and resend cooldown enforcement

- Provider-agnostic design (easy to swap messaging services)

Cloud-Ready Architecture

- API-first design supporting web + mobile clients

- Prepared for CDN-backed media storage (e.g., Cloudflare-style delivery)

- Stateless backend suitable for horizontal scaling

🧱 Tech Stack
Frontend

- Next.js (React)

- TypeScript

- Tailwind CSS

Backend

- Node.js

- Express

- JSON Web Tokens (JWT)

- bcrypt

Database

- Microsoft SQL Server

- Transaction-based queries

- ERP read-only data separation

Tooling & DevOps

- Git & GitHub

- Environment-based configuration

-RESTful API design

- SQL transactions & locking

🔐 Authentication & Roles

- JWT-based authentication

- Tokens required for all protected routes

- Role checks enforced at the API level

- Admin-only endpoints for inventory and order management

🛒 Order Flow (Simplified)

- User adds items to cart (client-side)

- Checkout triggers server-side transaction

- Inventory rows are locked

- Stock is validated per location

- Order is created atomically

- Inventory is decremented safely

- Transaction commits or rolls back


📄 License

This project is private and under active development.
