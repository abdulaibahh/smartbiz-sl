# Fix AI Network Error & Missing Customers Page - TODO

## Steps:
- [x] 1. Update frontend/services/api.js - Add timeout and better error handling
- [x] 2. Update frontend/app/ai/page.js - Switch from GET to POST for ask requests
- [x] 3. Update backend/src/routes/ai.routes.js - Add POST endpoint for /ask
- [x] 4. Create missing customers page at frontend/app/customers/page.js
- [x] 5. Create missing formatDate.js utility
- [x] 6. Fix import errors in customers page (useToast -> notifySuccess/notifyError)
- [x] 7. Add better error handling to customer.routes.js
- [x] 8. Create database setup script (backend/setup-database.js)
- [ ] 9. Run database setup and test

## Progress:
- Started: AI Network Error fix + Missing Customers Page
- Current step: 8/9 - All code changes complete

## Summary of Changes:

### 1. frontend/services/api.js
- Added 30-second timeout to axios instance
- Added network error detection with specific error messages
- Changed `aiAPI.ask` from GET to POST to avoid URL length issues

### 2. backend/src/routes/ai.routes.js
- Added POST endpoint `/api/ai/ask` to handle long questions
- Refactored to use shared `processAIQuestion` function
- Added `handleAIError` for consistent error handling
- Maintained backward compatibility with GET endpoint

### 3. frontend/app/customers/page.js (NEW)
- Created complete customers management page
- Features: list, search, add, edit, delete customers
- View customer purchase history
- Responsive grid layout with modals

### 4. frontend/lib/formatDate.js (NEW)
- Created date formatting utility with formatDate and formatDateOnly functions

### 5. backend/src/routes/customer.routes.js (UPDATED)
- Added better error handling with specific error messages
- Added check for missing customers table

### 6. backend/setup-database.js (NEW)
- Script to create customers table if it doesn't exist

### Root Cause - AI Network Error
The Network Error was likely caused by:
1. Long questions in GET request URL causing URL length issues
2. No timeout configuration leading to hanging requests
3. Poor network error handling

### Root Cause - Customers 500 Error
The customers table likely doesn't exist in the database yet.

## Next Steps - REQUIRED:

1. **Run the database setup script:**
   ```bash
   cd backend
   node setup-database.js
   ```

2. **Restart the backend server:**
   ```bash
   npm start
   # or
   node server.js
   ```

3. **Test the application:**
   - AI chat should work without Network Errors
   - Customers page should work without 500 errors

## Files Modified/Created:
- frontend/services/api.js
- backend/src/routes/ai.routes.js
- frontend/app/customers/page.js (NEW)
- frontend/lib/formatDate.js (NEW)
- backend/src/routes/customer.routes.js
- backend/setup-database.js (NEW)
