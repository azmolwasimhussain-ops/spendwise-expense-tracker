# SpendWise — Personal Expense Tracker

SpendWise is a polished, client-side personal finance dashboard built with HTML5, CSS3, vanilla JavaScript, and Chart.js. It requires no backend or build tooling.

## Run locally

1. Clone or download this repository.
2. Open `index.html` in a modern browser, or serve the folder with a static server:
   ```bash
   python3 -m http.server 8000
   ```
3. Visit `http://localhost:8000`.

Chart.js is loaded from jsDelivr. The core tracker remains usable if the chart CDN is unavailable, with a graceful chart fallback message.

## Features

- Dashboard metrics for total balance, monthly income, monthly expenses, and savings.
- Add, edit, and delete income or expense transactions.
- Validation for required fields, dates, and positive amounts.
- Category spending doughnut chart and six-month spending bar chart.
- Search, type/category filtering, and newest/oldest/highest/lowest sorting.
- Monthly category budgets with progress bars and over-budget states.
- CSV export with correct escaping and a date-based filename.
- Responsive desktop, tablet, and mobile layout.
- Dark/light theme toggle with persisted preference.
- Realistic demo data on first launch.
- Accessible labels, focus states, modal dialogs, keyboard escape handling, and reduced dependency on hover interactions.

## Data and privacy

Transactions, budgets, and theme preference are stored in the browser's `localStorage` under versioned SpendWise keys. No data is sent to a server. Clearing browser site data removes the saved information. If storage is unavailable or malformed, SpendWise uses a temporary in-memory session and displays a helpful notification.

## Browser compatibility

Use a current version of Chrome, Edge, Firefox, or Safari with JavaScript and localStorage enabled. Chart rendering requires the Chart.js CDN to be reachable; all transaction and budget functionality works without it.
