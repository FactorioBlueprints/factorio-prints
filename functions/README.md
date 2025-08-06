# Firebase Cloud Functions for Comment System

This directory contains the Firebase Cloud Functions that power the comment system with AI-based toxicity detection.

## Setup Instructions (Updated 2025)

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Choose a Toxicity Detection Service

You have several options for toxicity detection in 2025:

#### Option A: Perspective API (Google)
1. **Request Access:**
   - Fill out the [access request form](https://docs.google.com/forms/d/e/1FAIpQLSdhBBnVVVbXSElby-jhNnEj-Zwpt5toQSCFsJerGpXEnas9fQ/viewform)
   - Wait for confirmation email (usually within 1 hour)

2. **Enable the API:**
   - Go to: `https://console.cloud.google.com/apis/api/commentanalyzer.googleapis.com/`
   - Click "Enable"
   - Or use CLI: `gcloud services enable commentanalyzer.googleapis.com`

3. **Create API Key:**
   - Go to APIs & Services → Credentials
   - Create Credentials → API Key
   - Configure: `firebase functions:config:set perspective.api_key="YOUR_KEY"`

#### Option B: OpenAI Moderation API (Easier Setup)
1. **Get OpenAI API Key:**
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Go to API Keys section
   - Create new key

2. **Configure:**
   ```bash
   firebase functions:config:set openai.api_key="YOUR_KEY"
   ```

3. **Update the cloud function to use OpenAI** (see `openai-moderation.ts`)

#### Option C: Azure Content Moderator
1. **Create Azure Account**
2. **Create Content Moderator resource**
3. **Get API key and endpoint**
4. **Configure:**
   ```bash
   firebase functions:config:set azure.content_moderator_key="YOUR_KEY"
   firebase functions:config:set azure.content_moderator_endpoint="YOUR_ENDPOINT"
   ```

### 3. Deploy the Functions

```bash
# Deploy only functions
firebase deploy --only functions

# Or deploy a specific function
firebase deploy --only functions:createComment
```

## Local Development

To run the functions locally:

```bash
# Get the config for local development
firebase functions:config:get > .runtimeconfig.json

# Start the emulator
npm run serve
```

Note: Don't commit `.runtimeconfig.json` as it contains sensitive API keys.

## Toxicity Detection

The function checks for various types of harmful content:
- **Toxicity**: General toxic content (threshold: 75%)
- **Severe Toxicity**: Extremely toxic content (threshold: 50%)
- **Threats**: Threatening language (threshold: 50%)
- **Insults**: Insulting language (threshold: 75%)
- **Profanity**: Profane language (threshold: 80%)
- **Identity Attacks**: Attacks based on identity (threshold: 50%)

### Adjusting Thresholds

You can adjust the sensitivity by modifying the `TOXICITY_THRESHOLDS` object in `src/index.ts`. Lower values = more strict, higher values = more lenient.

## Testing

Test the toxicity detection locally:

```bash
# First, create .runtimeconfig.json with your API key
echo '{"perspective": {"api_key": "YOUR_API_KEY"}}' > .runtimeconfig.json

# Then run the emulator
firebase emulators:start --only functions
```

## Monitoring

View function logs:

```bash
firebase functions:log

# Or filter for specific function
firebase functions:log --only createComment
```

## Rate Limits

Perspective API has the following limits:
- **Free tier**: 1 query per second (QPS)
- **Paid tier**: Higher limits available

The function gracefully handles rate limit errors by allowing comments through when the API is unavailable.

## Security Notes

1. The API key is stored in Firebase config, not in code
2. Comments are not stored by Perspective API (`doNotStore: true`)
3. User IDs are validated against the authenticated user
4. The database rules prevent direct writes - all comments must go through this function
