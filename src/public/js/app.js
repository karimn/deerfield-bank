document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const API_URL = '/api';
    
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
    const logoutBtn = document.getElementById('logout-btn');
    
    // Current user
    let currentUser = null;
    let userAccounts = [];
    
    // Initialize the application
    init();
    
    // Initialize the application
    async function init() {
      try {
        // 1. Check authentication
        const authResponse = await fetch('/auth/check');
        const authData = await authResponse.json();
        
        if (!authData.isAuthenticated) {
          // Redirect to login if not authenticated
          window.location.href = '/login.html';
          return;
        }
        
        // Set current user
        currentUser = authData.user;
        
// This is the code to update the dropdown menu in all JavaScript files
// Use this in profile.js, child-detail.js and any other place where the dropdown is generated

        // Update user info display with correct dashboard link
        userInfoEl.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-outline-primary dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
            ${currentUser.name}
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="${currentUser.role === 'parent' ? '/parent-dashboard.html' : '/dashboard.html'}">Dashboard</a></li>
            <li><a class="dropdown-item" href="/profile.html">Profile</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="/auth/logout" id="logout-link">Logout</a></li>
            </ul>
        </div>
        `;
        
        // 2. Get accounts for the user
        userAccounts = await fetchAccounts(currentUser.id);
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
        
        // Set up event listeners
        setupEventListeners();
        
      } catch (error) {
        console.error('Initialization error:', error);
        alert('Error loading data. See console for details.');
      }
    }
    
    // Set up event listeners
    function setupEventListeners() {
      // New transaction button
      newTransactionBtn.addEventListener('click', () => {
        // Reset form
        transactionForm.reset();
        transactionModal.show();
      });
      
      // Save transaction button
      saveTransactionBtn.addEventListener('click', saveTransaction);
      
      // New subscription button
      newSubscriptionBtn.addEventListener('click', () => {
        // To be implemented
        alert('Subscription creation coming soon!');
      });
    }
    
    // Fetch accounts for a user
    async function fetchAccounts(userId) {
      const response = await fetch(`${API_URL}/accounts?userId=${userId}`);
      const data = await response.json();
      return data.data;
    }
    
    // Fetch transactions
    async function fetchTransactions() {
      // Filter by user's accounts
      const accountIds = userAccounts.map(account => account._id);
      // In a real implementation, you'd pass these to the API
      const response = await fetch(`${API_URL}/transactions`);
      const data = await response.json();
      
      // Client-side filtering (ideally this would be done on the server)
      return data.data.filter(transaction => 
        accountIds.includes(transaction.account._id || transaction.account)
      );
    }
    
    // Fetch subscriptions
    async function fetchSubscriptions() {
      // Filter by user's accounts
      const accountIds = userAccounts.map(account => account._id);
      const response = await fetch(`${API_URL}/subscriptions`);
      const data = await response.json();
      
      // Client-side filtering
      return data.data.filter(subscription => 
        accountIds.includes(subscription.account._id || subscription.account)
      );
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
    
    // Populate account dropdown in transaction modal
    function populateAccountDropdown(accounts) {
      transactionAccountEl.innerHTML = accounts.map(account => 
        `<option value="${account._id}">${account.name} (${account.type})</option>`
      ).join('');
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
        const amountPrefix = transaction.type === 'deposit' || transaction.type === 'interest' ? '+' : '-';
        const accountName = transaction.account.name || 'Unknown';
        const statusBadge = transaction.approved 
          ? '<span class="badge bg-success">Approved</span>' 
          : '<span class="badge bg-warning text-dark">Pending</span>';
        
        return `
          <tr class="transaction-row">
            <td>${date}</td>
            <td>${transaction.description}</td>
            <td>${accountName}</td>
            <td class="${amountClass}">${amountPrefix}${amount}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join('');
    }
    
    // Display subscriptions
    function displaySubscriptions(subscriptions) {
      if (subscriptions.length === 0) {
        subscriptionsListEl.innerHTML = `
          <li class="list-group-item text-center">No subscriptions found</li>
        `;
        return;
      }
      
      // Sort by next date
      subscriptions.sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
      
      subscriptionsListEl.innerHTML = subscriptions.map(subscription => {
        const nextDate = new Date(subscription.nextDate).toLocaleDateString();
        const amount = formatCurrency(subscription.amount);
        const accountName = subscription.account.name || 'Unknown';
        
        return `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${subscription.name}</strong>
              <div class="text-muted small">Next: ${nextDate}</div>
              <div class="text-muted small">${accountName}</div>
            </div>
            <span class="badge bg-primary rounded-pill">${amount}</span>
          </li>
        `;
      }).join('');
    }
    
    // Calculate and display next allowance date
    function calculateNextAllowance() {
      // Get current date
      const now = new Date();
      
      // Find next Sunday
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextSunday.setHours(0, 0, 0, 0);
      
      // Calculate days until next allowance
      const daysUntil = Math.ceil((nextSunday - now) / (1000 * 60 * 60 * 24));
      
      // Calculate progress through the week (Sunday to Sunday)
      const progress = Math.round((7 - daysUntil) / 7 * 100);
      
      // Update UI
      nextAllowanceDateEl.textContent = `${daysUntil} days until next allowance (${nextSunday.toLocaleDateString()})`;
      allowanceProgressEl.style.width = `${progress}%`;
      allowanceProgressEl.setAttribute('aria-valuenow', progress);
    }
    
    // Save new transaction
    async function saveTransaction() {
      try {
        const description = transactionDescriptionEl.value;
        const amount = parseFloat(transactionAmountEl.value);
        const type = transactionTypeEl.value;
        const accountId = transactionAccountEl.value;
        
        if (!description || isNaN(amount) || amount <= 0 || !accountId) {
          alert('Please fill out all fields correctly');
          return;
        }
        
        // Create transaction object
        const transactionData = {
          description,
          amount,
          type,
          account: accountId,
          date: new Date(),
          // For child user, transaction starts unapproved
          approved: currentUser.role === 'parent'
        };
        
        // Send to API
        const response = await fetch(`${API_URL}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Close modal
          transactionModal.hide();
          
          // Refresh data
          init();
          
          // Success message
          alert('Transaction created successfully!');
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('Save transaction error:', error);
        alert('Error saving transaction');
      }
    }
    
    // Format currency
    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }
  });