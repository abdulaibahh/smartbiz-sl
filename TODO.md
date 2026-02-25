# Task: Role-based Access Control Implementation

## Summary:
Implemented role-based access control to restrict business settings access to owners only, and hide cost prices from cashiers and managers.

## Completed Changes:

### Backend Changes:
- [x] **backend/src/routes/business.routes.js**
  - Added `roleAuth("owner")` middleware to GET, POST (logo), PUT, and DELETE (account) routes
  - Only owners can view/update business settings, upload logos, or delete accounts

- [x] **backend/src/routes/inventory.routes.js**
  - GET /all now filters out cost_price for non-owners
  - POST /supplier-order ignores cost_price when non-owners add/update products
  - PUT /:id already restricted to owners only
  - DELETE /:id already restricted to owners only

- [x] **backend/src/routes/auth.routes.js**
  - Added `roleAuth("owner")` to DELETE /account endpoint

### Frontend Changes:
- [x] **frontend/components/layout/Sidebar.js**
  - Added Database Query nav item for owners only
  - Settings and User Management already restricted to owners

- [x] **frontend/app/settings/page.js**
  - Already has owner-only access check with redirect for non-owners

- [x] **frontend/app/inventory/page.js**
  - Already shows/hides cost_price based on user role
  - Already shows/hides delete buttons based on user role
  - All users can add/update products but only owners can modify cost prices

- [x] **frontend/app/admin/users/page.js**
  - Already has owner-only access check with access denied message

## Permissions Matrix:
| Feature | Owner | Manager | Cashier |
|---------|-------|---------|---------|
| View Business Settings | ✅ | ❌ | ❌ |
| Edit Business Settings | ✅ | ❌ | ❌ |
| Delete Account | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| View Cost Prices | ✅ | ❌ | ❌ |
| Edit Cost Prices | ✅ | ❌ | ❌ |
| Add Products | ✅ | ✅ | ✅ |
| Update Products | ✅ | ✅ | ✅ |
| View Selling Prices | ✅ | ✅ | ✅ |
| Edit Selling Prices | ✅ | ✅ | ✅ |
| Delete Products | ✅ | ❌ | ❌ |
