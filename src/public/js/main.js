document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const API_URL = 'http://localhost:5000/api';
    
    // DOM elements
    const userInfoEl = document.getElementById('user-info');
    const spendingBalanceEl = document.getElementById('spending-balance');
    const savingBalanceEl = document.getElementById('saving-balance');
    const donationBalanceEl = document.getElementById('donation-balance');
    const transactionsTableEl = document.getElementById('transactions-table');
    const subscriptionsListEl = document.getElementById('subscriptions-list');
    const nextAllowanceDateEl = document.getElementById('next-allowance-date');
    const allowanceProgressEl = document.getElementById('allowance-progress');
    
    // Modal elements
    const transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
    const transactionForm = document.getElementById('transaction-form');
    const transactionDescriptionEl = document.getElementById('transaction-description');
    const transactionAmountEl = document.getElementById('transaction-amount');
    const transactionTypeEl = document.getElementById('transaction-type');
    const transactionAccountEl = document.getElementById('transaction-account');
    const saveTransactionBtn = document.getElementById('save-transaction-btn');
    
    // Button elements
    const newTransactionBtn = document.getElementById('new-transaction-btn');
    const newSubscriptionBtn = document.getElementById('new-subscription-btn');
    
    // Hardcoded user ID for demo (you'd get this from authentication)
    let currentUserId = ''; // We'll set this after loading users
    let userAccounts = [];
    
    // Initialize the application
    init();
    
    // Initialize the application
    async function init() {
      try {
        // 1. Get users (for demo purposes)
        const users = await fetchUsers();
        
        if (users.length === 0) {
          // Create demo users if none exist
          await createDemoData();
          location.reload(); // Reload to see the demo data
          return;
        }
        
        // Use the first child user for demo
        const childUser = users.find(user => user.role === 'child') || users[0];
        currentUserId = childUser._id;
        
        // Update user info display
        userInfoEl.innerHTML = `<span class="badge bg-primary">${childUser.name}</span>`;
        
        // 2. Get accounts for the user
        userAccounts = await fetchAccounts(currentUserId);
        updateAccountBalances(userAccounts);
        populateAccountDropdown(userAccounts);
        
        // 3. Get transactions
        const transactions = await fetchTransactions();
        displayTransactions(transactions);
        
        // 4. Get subscriptions
        const subscriptions = await fetchSubscriptions();
        displaySubscriptions(subscriptions);
        
        // 5. Calculate next allowance
        calculateNextAllowance();
        
      } catch (error) {
        console.error('Initialization error:', error);
        alert('Error loading data. See console for details.');
      }
    }
    
    // Fetch users from API
    async function fetchUsers() {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      return data.data;
    }
    
    // Fetch accounts for a user
    async function fetchAccounts(userId) {
      const response = await fetch(`${API_URL}/accounts?userId=${userId}`);
      const data = await response.json();
      return data.data;
    }
    
    // Fetch transactions
    async function fetchTransactions() {
      // We're not filtering by user, but in a real app you would
      const response = await fetch(`${API_URL}/transactions`);
      const data = await response.json();
      return data.data;
    }
    
    // Fetch subscriptions
    async function fetchSubscriptions() {
      const response = await fetch(`${API_URL}/subscriptions`);
      const data = await response.json();
      return data.data;
    }
    
    // Update account balances in the UI
    function updateAccountBalances(accounts) {
      accounts.forEach(account => {
        const balanceFormatted = formatCurrency(account.balance);
        
        if (account.type === 'spending') {
          spendingBalanceEl.textContent = balanceFormatted;
        } else if (account.type === 'saving') {
          savingBalanceEl.textContent = balanceFormatted;
        } else if (account.type === 'donation') {
          donationBalanceEl.textContent = balanceFormatted;
        }
      });
    }
    
    // Display transactions in the table
    function displayTransactions(transactions) {
      if (transactions.length === 0) {
        transactionsTableEl.innerHTML = `
          <tr>
            <td colspan="5" class="text-center">No transactions found</td>
          </tr>
        `;
        return;
      }
      
      // Sort by date, newest first
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Take only the 10 most recent
      const recentTransactions = transactions.slice(0, 10);
      
      transactionsTableEl.innerHTML = recentTransactions.map(transaction => {
        const date = new Date(transaction.date).toLocaleDateString();
        const amount = formatCurrency(transaction.amount);
        const amountClass = transaction.type === 'deposit' || transaction.type === 'interest' 
          ? 'text-success' : 'text-danger';
        const amountPrefix = transaction.type === 'deposit' || transaction.type === 'interest' ? '+' :