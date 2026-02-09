# VOXNTRY

Conference reception management system - Efficient attendee check-in tool

[日本語版 README はこちら](README_ja.md)

## Features

- Attendee check-in/check-out management
- Google Sheets integration
- Real-time attendee status updates

## Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd voxntry
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Conference Configuration

Configure your conference settings:

```bash
# Copy the example configuration file
cp config/conferences.example.json config/conferences.json

# Edit with your conference details
# Replace placeholder values with your actual configuration
```

**Important**: The `config/conferences.json` file contains your conference-specific settings and is ignored by Git for security.

### 4. Environment Variables Configuration

Copy `.env.example` to `.env.local` and configure required values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

#### Generate JWT Secret

**Required**: Generate a secret key for JWT authentication (minimum 32 characters):

```bash
# macOS/Linux
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Password Configuration

**Development**: Plain-text password is acceptable
**Production**: bcrypt hash is **required**

```bash
# Generate hash for production
npm run hash-password "yourSecurePassword"
```

#### .env.local Configuration Example

**Development:**
```bash
# JWT Secret (REQUIRED)
JWT_SECRET=dev-secret-key-minimum-32-characters

# Conference Password (matches passwordEnvVar in conferences.json)
CONFERENCE_YOUR_CONF_PASSWORD=devpassword123

# Development Auto-Login (Optional)
NEXT_PUBLIC_DEV_AUTO_LOGIN=true
NEXT_PUBLIC_DEV_CONFERENCE_ID=your-conference-id
NEXT_PUBLIC_DEV_PASSWORD=devpassword123
NEXT_PUBLIC_DEV_STAFF_NAME=DevUser
```

**Production:**
```bash
# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-here-minimum-32-chars

# Conference Password - bcrypt hash REQUIRED
CONFERENCE_YOUR_CONF_PASSWORD=$2b$12$...generatedHashHere...

# Development Auto-Login (Disabled in production)
NEXT_PUBLIC_DEV_AUTO_LOGIN=false
```

**Note**: The `passwordEnvVar` field in `config/conferences.json` must match the environment variable name you set here.

**Security Notes**:
- 🔴 **Always use bcrypt hash in production**
- Plain-text passwords are acceptable in development (for convenience)
- Never commit `.env.local` files to git
- Auto-login feature is automatically disabled in production

### 5. Google Authentication Setup

#### Local Development

Configure Google Cloud authentication:

```bash
# 1. Login to Google Cloud
gcloud auth login

# 2. Set up Application Default Credentials (ADC)
gcloud auth application-default login

# 3. Set project
gcloud config set project YOUR_PROJECT_ID
```

**Required permissions:**
- Google Sheets API enabled
- Access permission to Google Sheets (view/edit)

**Note:**
- Service account key files are not required (uses ADC)
- The Google account you use must have edit permissions on the target spreadsheet

#### GCP Cloud Run (Production)

- Managed Identity is automatically used (no additional configuration required)
- Grant Google Sheets API access to the Cloud Run service account

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Features

### Auto-Login

In development mode, setting `NEXT_PUBLIC_DEV_AUTO_LOGIN=true` in `.env.local` automatically logs you in on app startup, eliminating the need to manually enter login credentials.

To disable, set the following in `.env.local`:

```bash
NEXT_PUBLIC_DEV_AUTO_LOGIN=false
```

## Production Deployment

### Deploy to GCP Cloud Run

1. **Configure Environment Variables:**

```bash
gcloud run services update voxntry \
  --set-env-vars "CONFERENCE_DEMO_CONF_PASSWORD=<secure-password>" \
  --set-env-vars "NEXT_PUBLIC_DEMO_SPREADSHEET_ID=<your-spreadsheet-id>" \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "GCP_PROJECT_ID=<your-project-id>"
```

2. **(Recommended) Use GCP Secret Manager:**

```bash
# Create Secret
echo -n "secure-password" | gcloud secrets create demo-conf-password --data-file=-

# Mount Secret to Cloud Run
gcloud run services update voxntry \
  --update-secrets "CONFERENCE_DEMO_CONF_PASSWORD=demo-conf-password:latest"
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS, Lucide React
- **Backend:** Next.js API Routes
- **Validation:** Zod (Type-safe schema validation)
- **Authentication:** JWT (jose) + bcrypt
- **Google Integration:** googleapis (Google Sheets API)

## Directory Structure

```
voxntry/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes
│   │   ├── dashboard/      # Dashboard page
│   │   └── page.tsx        # Login page
│   ├── config/             # Configuration files
│   │   └── conferences.ts  # Conference settings
│   ├── lib/                # Utilities
│   │   ├── google.ts       # Google authentication
│   │   └── google-sheets.ts # Google Sheets operations
│   └── types/              # TypeScript type definitions
├── .env.example            # Environment variable template
├── .env.local              # Local environment variables (gitignore)
└── package.json
```

## Security Policy

For details, see [SECURITY.md](SECURITY.md).

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

## Code of Conduct

This project adopts the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by this code of conduct.

## License

MIT License - See [LICENSE](LICENSE) file for details.
