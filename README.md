# Smart Expense Tracker

A MERN stack web application for tracking income, expenses, financial goals, analytics, and smart savings suggestions in INR and CAD.

## Features

- Add, edit, delete, and categorize expenses and income
- Record payment method and notes for expenses
- Track income by source, including salary, part-time job, freelance, family support, and other
- Store original INR/CAD amounts and show separate totals for each currency
- Dashboard cards for total income, total expense, remaining balance, future planned expenses, monthly spending, top category, and savings progress
- Pie, bar, line, and comparison charts for category spending, monthly expenses, spending trends, income vs expense, and INR vs CAD expense split
- Rule-based smart suggestions for high food spending, entertainment increases, future goal risk, and frequent small expenses
- Backend suggestion engine with `generateSuggestions(expenses, income, futurePlans)`
- Public pages for Home, Login / Register, and About
- Advanced public Home, combined Login / Register, and About pages with product-style sections, feature previews, and project architecture details
- Register form includes confirm password and common client-side validations
- Private pages for Dashboard, Add Expense, Expense History, Add Income, Future Planning, Reports, and Profile
- Expense history filters for date range, currency, category, and search
- Edit and delete expense records from history
- CSV export and print/save-as-PDF report support
- Dark mode toggle
- Monthly category budgets with alerts when spending crosses 80%
- Recurring expense marking for weekly, monthly, and yearly expenses
- Dashboard layout with top summary cards, middle charts, recent expenses, smart suggestions, upcoming plans, currency badges, and savings progress bars
- Standout profile page with picture upload, editable details, default currency, monthly savings goal, account summary cards, future progress, security settings, and preferences
- Profile picture persists across pages, refresh, logout, and login until the user changes and saves a new photo
- Demo data button for quick project presentations
- Monthly report summary, category icons, toast notifications, better empty states, and budget progress bars
- Functional forgot password flow with local reset token for demo use
- Stronger form validation for auth, expenses, income, and future planning
- Track transactions in Indian Rupees and Canadian Dollars
- View dashboard totals, pie charts, and monthly bar charts
- Plan future expenses with priority, status, and monthly savings needed
- Get spending suggestions based on your habits
- Express + MongoDB API with React frontend

## Project Structure

```text
client/   React + Vite frontend
server/   Node.js + Express + MongoDB backend
```

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create the backend environment file:

```bash
copy server\.env.example server\.env
```

3. Update `server/.env` if needed:

```env
MONGO_URI=mongodb://127.0.0.1:27017/smart-expense-tracker
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=change-this-secret-before-deployment
```

4. Start MongoDB locally, then run the app:

```bash
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000/api/health

## API Routes

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `GET /api/goals`
- `POST /api/goals`
- `PUT /api/goals/:id`
- `DELETE /api/goals/:id`
- `GET /api/analytics`
- `GET /api/suggestions`

## Important Calculations

The backend calculates all dashboard values from the logged-in user's own records.

1. Total expense

```text
totalExpense = sum of all expense amounts by user
```

2. Total income

```text
totalIncome = sum of all income amounts by user
```

3. Balance

```text
balance = totalIncome - totalExpense
```

4. Monthly saving needed

```text
monthlySaving = (targetAmount - savedAmount) / monthsLeft
```

The app rounds this up so users get a practical monthly saving target.

5. Top category

```text
topCategory = category with the highest grouped expense total
```

6. Smart suggestions

The app uses condition-based rules, such as:

- Food spending above 30% of monthly expenses
- Entertainment spending higher than last month
- Future goal monthly saving is higher than available savings
- Frequent small expenses in the current month
- Low savings rate compared with income

## Notes

The app uses simple fixed conversion rates for analytics:

- `1 CAD = 60 INR`
- `1 INR = 0.0167 CAD`

For a production project, replace this with a live exchange-rate API and keep `JWT_SECRET` private.

## Deployment Readiness

Frontend deployment:

- Deploy `client/` to Vercel or Netlify.
- Set `VITE_API_URL` to your deployed backend URL plus `/api`.

Backend deployment:

- Deploy `server/` to Render, Railway, or a similar Node.js host.
- Add these environment variables:
  - `MONGO_URI`
  - `PORT`
  - `CLIENT_URL`
  - `JWT_SECRET`

Database:

- Use MongoDB Atlas for a hosted production database.
- Add the deployed backend IP/network access rule in Atlas.
