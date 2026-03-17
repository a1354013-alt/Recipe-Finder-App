# Recipe Finder - AI-Powered Recipe Discovery Web App

A production-ready Recipe Finder web application with AI-powered ingredient recognition, personalized recommendations, and comprehensive recipe management.

## Features

### 🔍 Recipe Discovery
- **Search & Browse**: Search recipes by name, cuisine, or dietary preferences
- **Recipe Details**: View complete recipe information including ingredients, instructions, cooking time, and nutrition
- **Random Recommendations**: Get personalized recipe suggestions

### ❤️ Favorites Management
- **Save Favorites**: Bookmark recipes for quick access
- **Organized Collection**: View all saved recipes in one place
- **Quick Actions**: Add/remove favorites with one click

### 🛒 Shopping List
- **Create Lists**: Organize multiple shopping lists
- **Smart Items**: Add ingredients with quantities and units
- **Track Progress**: Mark items as purchased
- **Ownership Verification**: Each list is private and user-specific

### 🤖 AI Ingredient Recognition
- **Image Upload**: Upload food photos for ingredient analysis
- **AI Recognition**: Automatically identify ingredients using advanced LLM
- **Recipe Recommendations**: Get recipe suggestions based on recognized ingredients
- **History Tracking**: Keep a record of all recognition sessions

### 🔐 Security & Privacy
- **OAuth Authentication**: Secure login via Manus OAuth
- **User Ownership**: All data is user-specific and protected
- **Request Tracing**: Every request has a unique ID for debugging
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Tech Stack

### Frontend
- **React 19**: Modern UI framework
- **React Query**: Data fetching and caching
- **tRPC**: End-to-end type-safe API
- **Tailwind CSS 4**: Utility-first styling
- **shadcn/ui**: High-quality UI components

### Backend
- **Express 4**: Web server framework
- **tRPC 11**: Type-safe RPC framework
- **Drizzle ORM**: Type-safe database toolkit
- **MySQL/TiDB**: Relational database

### Infrastructure
- **OAuth 2.0**: Manus authentication
- **Request ID Tracing**: Unique ID per request for debugging
- **Structured Logging**: Comprehensive logging system
- **Error Handling**: Global error handling with recovery

## Project Structure

```
recipe-finder-pro/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utilities and services
│   │   ├── hooks/            # Custom React hooks
│   │   └── App.tsx           # Main app component
│   └── index.html            # HTML entry point
├── server/                    # Backend Express server
│   ├── routers/              # tRPC route definitions
│   ├── services/             # Business logic layer
│   ├── db.ts                 # Database helpers
│   ├── _core/                # Core infrastructure
│   └── index.ts              # Server entry point
├── drizzle/                  # Database schema and migrations
├── shared/                   # Shared types and constants
└── package.json              # Dependencies
```

## Service Layer Architecture

The application follows a three-layer architecture:

### 1. Router Layer (`server/routers/`)
- Input validation with Zod
- Authentication checks
- Delegates to service layer
- Returns standardized responses

### 2. Service Layer (`server/services/`)
- Business logic implementation
- Data transformation
- Ownership verification
- Error handling and logging

### 3. Database Layer (`server/db.ts`)
- Direct database queries
- Query helpers and utilities
- Connection management

## Services

### Favorite Service
Manages user recipe favorites with add, remove, check, and list operations.

**Key Functions:**
- `addRecipeToFavorites(userId, recipeId, recipeName, recipeImage)`
- `removeRecipeFromFavorites(userId, recipeId)`
- `checkRecipeFavorite(userId, recipeId)`
- `getUserFavoritesList(userId)`

### Shopping List Service
Manages shopping lists with full CRUD operations and ownership verification.

**Key Functions:**
- `createNewShoppingList(userId, name)`
- `getUserShoppingLists(userId)`
- `getListItems(userId, listId)`
- `addItemToList(userId, listId, name, quantity, unit)`
- `updateItemStatus(userId, itemId, completed)`
- `deleteList(userId, listId)`

### AI History Service
Manages AI ingredient recognition history with ownership verification.

**Key Functions:**
- `getUserHistory(userId)`
- `deleteHistory(userId, historyId)`

### Recipe Service
Handles recipe search and discovery (ready for external API integration).

**Key Functions:**
- `searchRecipes(params)`
- `getRecipeDetails(recipeId)`
- `getRandomRecipes(count)`
- `getRecipesByCuisine(cuisine, count)`
- `getRecipesByDiet(diet, count)`

### Ingredient Recognition Service
Handles AI-powered ingredient recognition pipeline.

**Key Functions:**
- `recognizeIngredients(imageUrl)`
- `getRecipeRecommendations(ingredients)`
- `processIngredientRecognition(input)`
- `validateImageUrl(url)`

## API Routes

### Favorites
- `GET /api/trpc/recipe.favorites.list` - Get user favorites
- `POST /api/trpc/recipe.favorites.add` - Add favorite
- `POST /api/trpc/recipe.favorites.remove` - Remove favorite
- `GET /api/trpc/recipe.favorites.check` - Check if favorited

### Shopping Lists
- `GET /api/trpc/recipe.shoppingLists.list` - Get user lists
- `POST /api/trpc/recipe.shoppingLists.create` - Create list
- `GET /api/trpc/recipe.shoppingLists.items` - Get list items
- `POST /api/trpc/recipe.shoppingLists.addItem` - Add item
- `POST /api/trpc/recipe.shoppingLists.updateItemStatus` - Update item
- `POST /api/trpc/recipe.shoppingLists.delete` - Delete list

### AI History
- `GET /api/trpc/recipe.aiHistory.list` - Get history
- `POST /api/trpc/recipe.aiHistory.delete` - Delete history

## Error Handling

The application implements comprehensive error handling:

### Request ID Tracing
Every request has a unique `requestId` for debugging:
- Extracted from `error.data?.requestId`
- Fallback to `x-request-id` header
- Displayed in error messages to users

### Error Types
- **UNAUTHORIZED**: User not authenticated (auto-redirect to login)
- **FORBIDDEN**: User lacks permission (ownership check failed)
- **NOT_FOUND**: Resource doesn't exist
- **BAD_REQUEST**: Invalid input
- **INTERNAL_SERVER_ERROR**: Server error

### User Feedback
- Toast notifications for all errors
- Error messages include request ID
- Retry buttons for recoverable errors
- Clear error descriptions

## Development

### Prerequisites
- Node.js 22+
- pnpm package manager
- MySQL/TiDB database

### Setup
```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env

# Run migrations
pnpm db:push

# Start development server
pnpm dev
```

### Testing
```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test -- --coverage
```

### Build
```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Required environment variables:

```
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Authentication
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://oauth.manus.im

# API
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-api-key
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
```

## Logging

The application uses structured logging with the following format:

```
[TAG] Message | Details | { context data }
```

**Log Levels:**
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages with stack traces
- `debug`: Debug information (development only)

## Performance Optimization

- **React Query Caching**: Automatic caching of API responses
- **Request Deduplication**: Duplicate requests are merged
- **Optimistic Updates**: UI updates before server confirmation
- **Connection Pooling**: MySQL connection pool management
- **Error Recovery**: Automatic retry with exponential backoff

## Security Measures

- **OAuth 2.0**: Secure authentication
- **HTTPS**: All communication encrypted
- **CSRF Protection**: Token-based protection
- **XSS Prevention**: Input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: Request rate limiting (configurable)
- **CORS**: Proper CORS configuration

## Deployment

The application is ready for production deployment:

1. **Build**: `pnpm build` creates optimized bundles
2. **Environment**: Configure production environment variables
3. **Database**: Run migrations on production database
4. **Server**: Deploy to your hosting platform
5. **Monitoring**: Enable request tracing and logging

## Contributing

When contributing to this project:

1. Follow the existing code structure
2. Use the service layer pattern for business logic
3. Add comprehensive error handling
4. Include request ID in logging
5. Write unit tests for new features
6. Update documentation

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Check existing GitHub issues
- Review error messages with request ID
- Enable debug logging for troubleshooting
- Contact support team with request ID

---

**Recipe Finder** - Making recipe discovery simple, smart, and personal.
