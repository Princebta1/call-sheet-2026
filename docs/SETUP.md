# 🛠️ Setup Guide - Required Information

This guide explains where to find and how to configure each piece of information required to set up the Call Sheet application.

## 📋 Configuration Fields

### 1. PostgreSQL Database URL

**Format:** `postgresql://user:password@host:port/database`

**Where to find it:**
- **For local development (default):** `postgresql://postgres:postgres@postgres:5432/app`
- **Breakdown:**
  - Username: `postgres` (configured in `docker/compose.yaml`)
  - Password: `postgres` (configured in `docker/compose.yaml`)
  - Host: `postgres` (Docker service name, or `localhost` if connecting from outside Docker)
  - Port: `5432` (standard PostgreSQL port)
  - Database: `app` (configured in `docker/compose.yaml`)

**When to change:**
- If you're using an external PostgreSQL database
- If you've modified the database credentials in `docker/compose.yaml`
- For production deployments with managed database services

**How to obtain for production:**
- Most cloud providers (AWS RDS, Google Cloud SQL, Azure Database, etc.) provide a connection string
- Copy the connection string from your database provider's dashboard
- Ensure the format matches: `postgresql://username:password@host:port/database_name`

---

### 2. MinIO Server Endpoint

**Default:** `localhost`

**Where to find it:**
- **For local development:** `localhost` (MinIO runs on your local machine)
- **Within Docker network:** `minio` (the Docker service name)
- **For production:** Your MinIO server's domain or IP address

**What it's used for:**
- Object storage for file uploads (avatars, documents, call sheets, reports)
- Configured in `src/server/minio.ts`

**When to change:**
- If using a remote MinIO server
- If using MinIO-compatible services (e.g., AWS S3, DigitalOcean Spaces)
- For production deployments

---

### 3. MinIO Server Port

**Default:** `9000`

**Where to find it:**
- Configured in `docker/compose.yaml` as port `9000`
- Standard MinIO API port

**When to change:**
- If your MinIO server runs on a different port
- If using a reverse proxy that maps to a different port

---

### 4. MinIO Access Key

**Default:** `admin`

**Where to find it:**
- **Current value:** `admin` (set in `docker/compose.yaml` as `MINIO_ROOT_USER`)
- Used in `src/server/minio.ts` to authenticate with MinIO

**When to change:**
- For production, you should use a more secure access key
- If you've customized the MinIO credentials in your Docker setup

**How to change:**
1. Update `MINIO_ROOT_USER` in `docker/compose.yaml`
2. Update the `accessKey` in `src/server/minio.ts`
3. Restart your Docker services: `pnpm run stop && pnpm run dev`

---

### 5. MinIO Secret Key

**Default:** Uses the `ADMIN_PASSWORD` environment variable

**Where to find it:**
- **Current value:** `s8zrejrAjreFuuJRfCiGHk` (from `.env` file)
- Set as `MINIO_ROOT_PASSWORD` in `docker/compose.yaml`
- Used in `src/server/minio.ts` as the `secretKey`

**When to change:**
- **IMPORTANT:** For production, you MUST change this to a secure password
- If you've customized the MinIO credentials

**How to change:**
1. Update `ADMIN_PASSWORD` in your `.env` file
2. Restart your Docker services: `pnpm run stop && pnpm run dev`

**Security note:** The current value is for development only. Generate a strong random password for production.

---

### 6. Resend API Key (Optional)

**Format:** `re_...` (starts with `re_`)

**Where to find it:**
- **Current value:** `re_BSj5XnLn_83fPGdq12hehy4nTBfg36YKf` (from `.env` file)
- Obtain from [Resend.com](https://resend.com)

**What it's used for:**
- Sending automated report emails
- Email notifications (future feature)

**How to obtain:**
1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (or use their test domain for development)
3. Navigate to "API Keys" in the Resend dashboard
4. Click "Create API Key"
5. Copy the key (it starts with `re_`)
6. Add it to your `.env` file as `RESEND_API_KEY=re_...`

**When it's optional:**
- If you don't need email functionality, you can leave this blank
- The app will work without it, but email features will be disabled

---

### 7. Sender Email Address (Optional)

**Format:** `email@yourdomain.com`

**Where to find it:**
- **Current value:** `equivob@gmail.com` (from `.env` file)
- This is the "From" address for all outgoing emails

**Requirements:**
- Must be a verified domain in your Resend account
- For development, you can use Resend's test domain: `onboarding@resend.dev`

**How to set up:**
1. If using your own domain:
   - Add and verify your domain in Resend dashboard
   - Use an email address from that domain (e.g., `reports@yourdomain.com`)
2. If using Resend's test domain:
   - Use `onboarding@resend.dev` (no verification needed)
   - Note: Test domain has limitations on recipients

**When it's optional:**
- If you don't need email functionality
- The app will work without it, but email features will be disabled

---

## 🔐 Security Best Practices

### For Development
The default values in `.env` are suitable for local development:
- ✅ PostgreSQL: Default Docker credentials are fine
- ✅ MinIO: Default credentials are acceptable
- ✅ JWT_SECRET: Current value is fine for development
- ⚠️ Resend API Key: Use a test key or leave blank

### For Production
**CRITICAL CHANGES REQUIRED:**

1. **ADMIN_PASSWORD** (MinIO Secret Key)
   - Current: `s8zrejrAjreFuuJRfCiGHk`
   - Status: ⚠️ **MUST CHANGE** - This is a development password
   - Generate a strong password (20+ characters, mix of letters, numbers, symbols)

2. **JWT_SECRET**
   - Current: `SLvQcQ7RLP9bWkWadwEWhJjf7cq89QNv`
   - Status: ⚠️ **MUST CHANGE** - This is a development secret
   - Generate a cryptographically secure random string (32+ characters)

3. **PostgreSQL Database URL**
   - Status: ⚠️ **MUST CHANGE** - Use a managed database service
   - Don't use default `postgres:postgres` credentials
   - Use your cloud provider's database service (AWS RDS, etc.)

4. **Resend API Key**
   - Status: ✅ Can keep current value if it's a production key
   - Ensure it's from your production Resend account

5. **FROM_EMAIL**
   - Status: ✅ Can keep current value if domain is verified
   - Use a professional email address from your verified domain

---

## 🚀 Quick Start

### Local Development
1. Clone the repository
2. The `.env` file is already configured with development defaults
3. Run `pnpm run dev`
4. Everything should work out of the box!

### Production Deployment
1. Copy `.env.example` to `.env` (if not already done)
2. Update all the values marked as **MUST CHANGE** above
3. Obtain production API keys (Resend, etc.)
4. Configure your production database
5. Set up your MinIO server or S3-compatible storage
6. Deploy your application

---

## 📞 Getting Help

If you need help obtaining any of these values:

- **PostgreSQL:** Check your cloud provider's documentation (AWS RDS, Google Cloud SQL, etc.)
- **MinIO:** Visit [min.io/docs](https://min.io/docs) or use AWS S3
- **Resend:** Visit [resend.com/docs](https://resend.com/docs)
- **General setup:** See `README.md` for more information

---

## 🔗 Related Files

- `.env` - Environment variables configuration
- `docker/compose.yaml` - Docker services configuration
- `src/server/env.ts` - Environment variable schema validation
- `src/server/minio.ts` - MinIO client configuration
- `src/server/utils/sendReportEmail.ts` - Email sending implementation
