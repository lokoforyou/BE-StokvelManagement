# Stokvel Management Backend

A professional, scalable Node.js backend for managing Stokvel groups, contributions, and member interactions. Featuring "Stokvel Buddy" — an AI-powered financial assistant.

## 🚀 Features
- **Group Management**: Create, join, and manage Stokvel groups.
- **Payment Tracking**: Record EFT, Cash, or Direct Pay contributions with proof-of-payment uploads.
- **Admin Controls**: Verify payments and monitor group health.
- **AI Assistant**: "Stokvel Buddy" integrated via OpenRouter (GPT-4) to answer queries about balances, targets, and group stats.
- **Managed Cloud Architecture**: Optimized for Google Cloud Run and Cloud SQL (PostgreSQL).

## 🛠 Tech Stack
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL (Cloud SQL)
- **AI SDK**: OpenAI / OpenRouter
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer (for payment receipts)

## ⚙️ Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lokoforyou/BE-StokvelManagement.git
   cd BE-StokvelManagement
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=8080
   DATABASE_URL=postgres://user:password@localhost:5432/stokvel_db
   OPENROUTER_API_KEY=your_openrouter_key
   JWT_SECRET=your_super_secret_key
   ```

4. **Run the server**:
   ```bash
   npm start
   ```

## ☁️ Google Cloud Deployment

This project is designed to be deployed using **Cloud Build** and **Cloud Run**.

### Infrastructure Setup
1. **Create Cloud SQL Instance**:
   ```bash
   gcloud sql instances create stokvel-db --database-version=POSTGRES_15 --tier=db-f1-micro --region=us-central1
   ```
2. **Create Database**:
   ```bash
   gcloud sql databases create stokvel_management --instance=stokvel-db
   ```
3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy stokvel-backend \
     --source . \
     --set-env-vars="DATABASE_URL=postgres://postgres:PASSWORD@/stokvel_management?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME" \
     --add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME \
     --allow-unauthenticated
   ```

## 🧪 Database Seeding
To populate the database with test users and 18 months of historical payment data:
1. Open Google Cloud Shell.
2. Run the proxy: `./cloud-sql-proxy PROJECT_ID:REGION:stokvel-db`.
3. In a new tab, run: `node seed-postgres.js`.

## 🔒 Security
- All sensitive keys are managed via environment variables.
- CORS is configured to allow secure communication with the Firebase frontend.
- Individual payment data is strictly protected; AI only shares specific member data with group Admins.

## 📄 License
ISC License
