document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const API_URL = '/api';
    
    // DOM elements
    const userInfoEl = document.getElementById('user-info');
    const childNameEl = document.getElementById('child-name');
    const childInfoEl = document.getElementById('child-info');
    const accountsListEl = document.getElementById('accounts-list');
    const transactionsTableEl = document.getElementById('transactions-table');
    const subscriptionsContainerEl = document.getElementById('subscriptions-container');
    
    // Modal elements
    const addAccountModal = new bootstrap.Modal(document.getElementById('addAccountModal'));
    const addTransactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    const addAllowanceModal = new bootstrap.Modal(document.getElementById('addAllowanceModal'));
    
    // Form elements
    const addAccountFormEl = document.getElementById('add-account-form');
    const accountNameEl = document.getElementById('account-name');
    const accountTypeEl = document.getElementById('account-type');
    const initialBalanceEl = document.getElementById('initial-balance');
    const interestRateEl = document.getElementById('interest-rate');
    
    const transactionFormEl = document.getElementById('transaction-form');
    const transactionDescriptionEl = document.getElementById('transaction-description');
    const transactionAmountEl = document.getElementById('transaction-amount');
    const transactionTypeEl = document.getElementById('transaction-type');
    const transactionAccountEl = document.getElementById('transaction-account');
    
    const allowanceFormEl = document.getElementById('allowance-form');
    const allowanceAmountEl = document.getElementById('allowance-amount');
    const spendingPercentEl = document.getElementById('spending-percent');
    const savingPercentEl = document.getElementById('saving-percent');
    const donationPercentEl = document.getElementById('donation-percent');
    const distributionTotalEl = document.getElementById('distribution-total');
    const recurringAllowanceEl = document.getElementById('recurring-allowance');
    
    // Button elements
    const addAccountBtn = document.getElementById('add-account-btn');
    const saveAccountBtn = document.getElementById('save-account-btn');
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const saveTransactionBtn = document.getElementById('save-transaction-btn');
    const addAllowanceBtn = document.getElementById('add-allowance-btn');
    const saveAllowanceBtn = document.getElementById('save-allowance-btn');
    const showAllBtn = document.getElementById('show-all-btn');
    const togglePermissionsBtn = document.getElementById('toggle-permissions-btn');
    
    // Current user and child data
    let currentUser = null;
    let childId = null;
    let childData = null;
    let childAccounts = [];
    
    // Initialize the application
    init();
    
    // Initialize the application
    async function init() {
      try {
        // 1. Get child ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        childId = urlParams.get('id');
        
        if (!childId) {
          alert('No child ID provided. Redirecting to profile page.');
          window.location.href = '/profile.html';
          return;
        }
        
        // 2. Check authentication
        const authResponse = await fetch('/auth/check');
        const authData = await authResponse.json();
        
        if (!authData.isAuthenticated) {
          // Redirect to login if not authenticated
          window.location.href = '/login.html';
          return;
        }
        
        // Check if user is a parent
        if (authData.user.role !== 'parent') {
          alert('You do not have permission to view this page.');
          window.location.href = '/dashboard.html';
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
        
        // 3. Load child data
        await loadChildData(childId);
        
        // 4. Load child accounts
        await loadChildAccounts(childId);
        
        // 5. Load transactions
        await loadTransactions();
        
        // 6. Load subscriptions
        await loadSubscriptions();
        
        // 7. Set up event listeners
        setupEventListeners();
        
        // 8. Set up distribution total update
        setupDistributionUpdate();
        
      } catch (error) {
        console.error('Initialization error:', error);
        alert('Error loading data. See console for details.');
      }
    }
    
    // Set up event listeners
    function setupEventListeners() {
      // Add account button
      addAccountBtn.addEventListener('click', () => {
        addAccountFormEl.reset();
        addAccountModal.show();
      });
      
      // Save account button
      saveAccountBtn.addEventListener('click', saveAccount);
      
      // Add transaction button
      addTransactionBtn.addEventListener('click', () => {
        transactionFormEl.reset();
        populateAccountDropdown();
        addTransactionModal.show();
      });
      
      // Save transaction button
      saveTransactionBtn.addEventListener('click', saveTransaction);
      
      // Add allowance button
      addAllowanceBtn.addEventListener('click', () => {
        allowanceFormEl.reset();
        updateDistributionTotal();
        addAllowanceModal.show();
      });
      
      // Save allowance button
      saveAllowanceBtn.addEventListener('click', processAllowance);
      
      // Show all transactions button
      showAllBtn.addEventListener('click', () => {
        // To be implemented - could redirect to a transactions listing page
        alert('Full transaction history feature coming soon!');
      });
      
      // Toggle permissions button
      togglePermissionsBtn.addEventListener('click', () => {
        // To be implemented - could show a modal for permission management
        alert('Permission management feature coming soon!');
      });
      
      // Account type change
      accountTypeEl.addEventListener('change', () => {
        const isSaving = accountTypeEl.value === 'saving';
        interestRateEl.disabled = !isSaving;
        if (!isSaving) {
          interestRateEl.value = 0;
        }
      });
    }
    
    // Set up distribution total update
    function setupDistributionUpdate() {
      spendingPercentEl.addEventListener('input', updateDistributionTotal);
      savingPercentEl.addEventListener('input', updateDistributionTotal);
      donationPercentEl.addEventListener('input', updateDistributionTotal);
    }
    
    // Update distribution total
    function updateDistributionTotal() {
      const spendingPercent = parseInt(spendingPercentEl.value) || 0;
      const savingPercent = parseInt(savingPercentEl.value) || 0;
      const donationPercent = parseInt(donationPercentEl.value) || 0;
      
      const total = spendingPercent + savingPercent + donationPercent;
      
      distributionTotalEl.textContent = `Total: ${total}%`;
      
      if (total !== 100) {
        distributionTotalEl.classList.add('text-danger');
      } else {
        distributionTotalEl.classList.remove('text-danger');
      }
    }
    
    // Load child data
    async function loadChildData(childId) {
      try {
        const response = await fetch(`${API_URL}/users/${childId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load child data');
        }
        
        childData = data.data;
        
        // Update child name in the header
        childNameEl.textContent = childData.name;
        
        // Populate child info
        childInfoEl.innerHTML = `
          <div class="mb-3">
            <strong>Name:</strong> ${childData.name}
          </div>
          <div class="mb-3">
            <strong>Email:</strong> ${childData.email}
          </div>
          ${childData.dob ? `
          <div class="mb-3">
            <strong>Date of Birth:</strong> ${new Date(childData.dob).toLocaleDateString()}
          </div>
          ` : ''}
          ${childData.phone ? `
          <div class="mb-3">
            <strong>Phone:</strong> ${childData.phone}
          </div>
          ` : ''}
          <div class="mb-3">
            <strong>Joined:</strong> ${new Date(childData.createdAt).toLocaleDateString()}
          </div>
        `;
        
      } catch (error) {
        console.error('Error loading child data:', error);
        childInfoEl.innerHTML = `
          <div class="alert alert-danger">
            Error loading child data. Please try again later.
          </div>
        `;
      }
    }
    
    // Load child accounts
    async function loadChildAccounts(childId) {
      try {
        const response = await fetch(`${API_URL}/accounts?userId=${childId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load accounts');
        }
        
        childAccounts = data.data;
        
        if (childAccounts.length === 0) {
          accountsListEl.innerHTML = `
            <div class="text-center">
              <p class="mb-0">No accounts found</p>
              <p class="small text-muted">Click "Add Account" to create one</p>
            </div>
          `;
          return;
        }
        
        // Calculate total balance across all accounts
        const totalBalance = childAccounts.reduce((sum, account) => sum + account.balance, 0);
        
        // Create accounts list HTML
        accountsListEl.innerHTML = `
          <div class="mb-3">
            <h6>Total Balance</h6>
            <span class="badge bg-primary balance-pill">${formatCurrency(totalBalance)}</span>
          </div>
          <hr>
          ${childAccounts.map(account => `
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <h6 class="mb-0">${account.name}</h6>
                <span class="badge ${getAccountBadgeClass(account.type)}">${capitalizeFirstLetter(account.type)}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  ${account.interestRate > 0 ? `<small class="text-muted">${account.interestRate}% interest</small>` : ''}
                </div>
                <div>${formatCurrency(account.balance)}</div>
              </div>
            </div>
            ${childAccounts.indexOf(account) < childAccounts.length - 1 ? '<hr>' : ''}
          `).join('')}
        `;
        
      } catch (error) {
        console.error('Error loading accounts:', error);
        accountsListEl.innerHTML = `
          <div class="alert alert-danger">
            Error loading accounts. Please try again later.
          </div>
        `;
      }
    }
    
    // Load transactions
    async function loadTransactions() {
      try {
        // Get account IDs for filtering
        const accountIds = childAccounts.map(account => account._id);
        
        if (accountIds.length === 0) {
          transactionsTableEl.innerHTML = `
            <tr>
              <td colspan="5" class="text-center">No accounts found</td>
            </tr>
          `;
          return;
        }
        
        // In a real implementation, you'd pass these IDs to filter server-side
        const response = await fetch(`${API_URL}/transactions`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load transactions');
        }
        
        // Client-side filtering
        const childTransactions = data.data.filter(transaction => {
          const accountId = transaction.account._id || transaction.account;
          return accountIds.includes(accountId);
        });
        
        if (childTransactions.length === 0) {
          transactionsTableEl.innerHTML = `
            <tr>
              <td colspan="5" class="text-center">No transactions found</td>
            </tr>
          `;
          return;
        }
        
        // Sort by date, newest first
        childTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Take only the 10 most recent
        const recentTransactions = childTransactions.slice(0, 10);
        
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
        
      } catch (error) {
        console.error('Error loading transactions:', error);
        transactionsTableEl.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-danger">Error loading transactions</td>
          </tr>
        `;
      }
    }
    
    // Load subscriptions
    async function loadSubscriptions() {
      try {
        // Get account IDs for filtering
        const accountIds = childAccounts.map(account => account._id);
        
        if (accountIds.length === 0) {
          subscriptionsContainerEl.innerHTML = `
            <div class="text-center">
              <p class="mb-0">No accounts found</p>
            </div>
          `;
          return;
        }
        
        const response = await fetch(`${API_URL}/subscriptions`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load subscriptions');
        }
        
        // Client-side filtering
        const childSubscriptions = data.data.filter(subscription => {
          const accountId = subscription.account._id || subscription.account;
          return accountIds.includes(accountId);
        });
        
        if (childSubscriptions.length === 0) {
          subscriptionsContainerEl.innerHTML = `
            <div class="text-center">
              <p class="mb-0">No subscriptions found</p>
              <button class="btn btn-sm btn-outline-primary mt-2" id="add-subscription-btn">Add Subscription</button>
            </div>
          `;
          
          // Add event listener for add subscription button
          document.getElementById('add-subscription-btn')?.addEventListener('click', () => {
            alert('Subscription management feature coming soon!');
          });
          
          return;
        }
        
        // Sort by next date
        childSubscriptions.sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
        
        subscriptionsContainerEl.innerHTML = `
          <ul class="list-group">
            ${childSubscriptions.map(subscription => {
              const nextDate = new Date(subscription.nextDate).toLocaleDateString();
              const amount = formatCurrency(subscription.amount);
              const accountName = subscription.account.name || 'Unknown';
              const frequencyText = getFrequencyText(subscription.frequency);
              
              return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>${subscription.name}</strong>
                    <div class="text-muted small">${frequencyText} • Next: ${nextDate}</div>
                    <div class="text-muted small">${accountName}</div>
                  </div>
                  <span class="badge bg-primary rounded-pill">${amount}</span>
                </li>
              `;
            }).join('')}
          </ul>
          <div class="text-center mt-3">
            <button class="btn btn-sm btn-outline-primary" id="add-subscription-btn">Add Subscription</button>
          </div>
        `;
        
        // Add event listener for add subscription button
        document.getElementById('add-subscription-btn')?.addEventListener('click', () => {
          alert('Subscription management feature coming soon!');
        });
        
      } catch (error) {
        console.error('Error loading subscriptions:', error);
        subscriptionsContainerEl.innerHTML = `
          <div class="alert alert-danger">
            Error loading subscriptions. Please try again later.
          </div>
        `;
      }
    }
    
    // Populate account dropdown in transaction modal
    function populateAccountDropdown() {
      transactionAccountEl.innerHTML = childAccounts.map(account => 
        `<option value="${account._id}">${account.name} (${account.type})</option>`
      ).join('');
    }
    
    // Save account
    async function saveAccount() {
      try {
        const name = accountNameEl.value;
        const type = accountTypeEl.value;
        const balance = parseFloat(initialBalanceEl.value) || 0;
        const interestRate = type === 'saving' ? (parseFloat(interestRateEl.value) || 0) : 0;
        
        if (!name) {
          alert('Please enter an account name');
          return;
        }
        
        // Create account data
        const accountData = {
          name,
          type,
          balance,
          interestRate,
          owner: childId
        };
        
        // Send to API
        const response = await fetch(`${API_URL}/accounts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(accountData)
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to create account');
        }
        
        // Close modal
        addAccountModal.hide();
        
        // Refresh accounts
        await loadChildAccounts(childId);
        
        // Success message
        alert('Account created successfully!');
        
      } catch (error) {
        console.error('Error creating account:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Save transaction
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
          // For parent user, transaction is auto-approved
          approved: true,
          approvedBy: currentUser.id
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
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create transaction');
        }
        
        // Close modal
        addTransactionModal.hide();
        
        // Refresh data
        await loadChildAccounts(childId);
        await loadTransactions();
        
        // Success message
        alert('Transaction created successfully!');
        
      } catch (error) {
        console.error('Error saving transaction:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Process allowance
    async function processAllowance() {
      try {
        const amount = parseFloat(allowanceAmountEl.value);
        const spendingPercent = parseInt(spendingPercentEl.value) || 0;
        const savingPercent = parseInt(savingPercentEl.value) || 0;
        const donationPercent = parseInt(donationPercentEl.value) || 0;
        const recurring = recurringAllowanceEl.checked;
        
        if (isNaN(amount) || amount <= 0) {
          alert('Please enter a valid amount');
          return;
        }
        
        const total = spendingPercent + savingPercent + donationPercent;
        
        if (total !== 100) {
          alert('Distribution percentages must add up to 100%');
          return;
        }
        
        // Process allowance for each account type
        for (const accountType of ['spending', 'saving', 'donation']) {
          // Find account of this type
          const account = childAccounts.find(acc => acc.type === accountType);
          
          if (!account) {
            continue; // Skip if account type doesn't exist
          }
          
          let percentValue = 0;
          
          if (accountType === 'spending') {
            percentValue = spendingPercent;
          } else if (accountType === 'saving') {
            percentValue = savingPercent;
          } else if (accountType === 'donation') {
            percentValue = donationPercent;
          }
          
          if (percentValue <= 0) {
            continue; // Skip if no amount allocated
          }
          
          const accountAmount = (amount * percentValue / 100);
          
          // Create transaction for this account
          const transactionData = {
            description: 'Allowance',
            amount: accountAmount,
            type: 'deposit',
            account: account._id,
            date: new Date(),
            approved: true,
            approvedBy: currentUser.id
          };
          
          // Send to API
          const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(transactionData)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to process allowance for ${accountType} account`);
          }
        }
        
        // Close modal
        addAllowanceModal.hide();
        
        // Refresh data
        await loadChildAccounts(childId);
        await loadTransactions();
        
        // Success message
        alert(`Allowance processed successfully!${recurring ? ' Recurring allowance has been scheduled.' : ''}`);
        
      } catch (error) {
        console.error('Error processing allowance:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Get account badge class
    function getAccountBadgeClass(accountType) {
      switch (accountType) {
        case 'spending':
          return 'bg-success';
        case 'saving':
          return 'bg-info';
        case 'donation':
          return 'bg-warning text-dark';
        default:
          return 'bg-secondary';
      }
    }
    
    // Get frequency text
    function getFrequencyText(frequency) {
      switch (frequency) {
        case 'weekly':
          return 'Weekly payment';
        case 'monthly':
          return 'Monthly payment';
        case 'yearly':
          return 'Yearly payment';
        default:
          return 'Recurring payment';
      }
    }
    
    // Format currency
    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }
    
    // Capitalize first letter
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  });