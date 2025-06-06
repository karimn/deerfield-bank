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
    const allowanceInfoEl = document.getElementById('allowance-info');
    const allowanceCardEl = document.getElementById('allowance-card');
    
    // Modal elements
    const addAccountModal = new bootstrap.Modal(document.getElementById('addAccountModal'));
    const addTransactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    const addAllowanceModal = new bootstrap.Modal(document.getElementById('addAllowanceModal'));
    const addSubscriptionModal = new bootstrap.Modal(document.getElementById('addSubscriptionModal'));
    
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
    const distributionContainerEl = document.getElementById('distribution-container');
    const distributionTotalEl = document.getElementById('distribution-total');
    const recurringAllowanceEl = document.getElementById('recurring-allowance');
    
    // Subscription form elements
    const subscriptionFormEl = document.getElementById('subscription-form');
    const subscriptionNameEl = document.getElementById('subscription-name');
    const subscriptionDescriptionEl = document.getElementById('subscription-description');
    const subscriptionAmountEl = document.getElementById('subscription-amount');
    const subscriptionFrequencyEl = document.getElementById('subscription-frequency');
    const subscriptionAccountEl = document.getElementById('subscription-account');
    const subscriptionNextDateEl = document.getElementById('subscription-next-date');
    
    // Will store references to distribution percent inputs dynamically
    const percentInputs = {};
    
    // Button elements
    const addAccountBtn = document.getElementById('add-account-btn');
    const saveAccountBtn = document.getElementById('save-account-btn');
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const saveTransactionBtn = document.getElementById('save-transaction-btn');
    const addAllowanceBtn = document.getElementById('add-allowance-btn');
    const saveAllowanceBtn = document.getElementById('save-allowance-btn');
    const saveSubscriptionBtn = document.getElementById('save-subscription-btn');
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
        
        // 7. Load allowance information
        await loadAllowance();
        
        // 8. Set up event listeners
        setupEventListeners();
        
        // 9. Set up distribution total update
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
        populateDistributionInputs();
        calculateAgeBasedAllowance(); // Calculate the age-based amount when modal opens
        addAllowanceModal.show();
      });
      
      // Edit allowance button
      const editAllowanceBtn = document.getElementById('edit-allowance-btn');
      if (editAllowanceBtn) {
        editAllowanceBtn.addEventListener('click', () => {
          allowanceFormEl.reset();
          populateDistributionInputs();
          calculateAgeBasedAllowance(); // Calculate the age-based amount when modal opens
          addAllowanceModal.show();
        });
      }
      
      // Age-based calculation checkbox
      const useAgeFormulaEl = document.getElementById('use-age-formula');
      useAgeFormulaEl.addEventListener('change', function() {
        const ageResultEl = document.getElementById('age-calculation-result');
        if (this.checked) {
          ageResultEl.classList.remove('d-none');
          calculateAgeBasedAllowance();
        } else {
          ageResultEl.classList.add('d-none');
          // Reset to default
          allowanceAmountEl.value = '10.00';
        }
      });
      
      // Save allowance button
      saveAllowanceBtn.addEventListener('click', processAllowance);
      
      // Save subscription button
      saveSubscriptionBtn.addEventListener('click', saveSubscription);
      
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
      
      // Edit child button
      const editChildBtn = document.getElementById('edit-child-btn');
      if (editChildBtn) {
        editChildBtn.addEventListener('click', () => {
          // Call the editChild function with the current child ID
          editChild(childId);
        });
      }
    }
    
    // Set up distribution total update - now dynamic based on existing accounts
    function setupDistributionUpdate() {
      // The event listeners are added when inputs are created in populateDistributionInputs
    }
    
    // Populate distribution inputs based on existing accounts
    function populateDistributionInputs() {
      // Clear previous inputs and reset percentInputs
      distributionContainerEl.innerHTML = '';
      Object.keys(percentInputs).forEach(key => delete percentInputs[key]);
      
      // Check if child has any accounts
      if (childAccounts.length === 0) {
        distributionContainerEl.innerHTML = `
          <div class="alert alert-warning">
            No accounts found. Please create at least one account first.
          </div>
        `;
        return;
      }
      
      // Calculate default percentage split evenly across accounts
      const defaultPercent = Math.floor(100 / childAccounts.length);
      let remainingPercent = 100 - (defaultPercent * childAccounts.length);
      
      // Create inputs for each account type
      childAccounts.forEach((account, index) => {
        // Add extra percent to first account if there's a remainder
        const accountPercent = index === 0 ? defaultPercent + remainingPercent : defaultPercent;
        
        const inputId = `${account.type}-percent`;
        const accountDisplay = capitalizeFirstLetter(account.type);
        
        const inputHtml = `
          <div class="input-group mb-2">
            <span class="input-group-text">${accountDisplay}</span>
            <input type="number" class="form-control distribution-input" 
                  id="${inputId}" value="${accountPercent}" 
                  min="0" max="100" data-account-id="${account._id}">
            <span class="input-group-text">%</span>
          </div>
        `;
        
        distributionContainerEl.insertAdjacentHTML('beforeend', inputHtml);
        
        // Store reference to the input
        percentInputs[account.type] = document.getElementById(inputId);
        
        // Add event listener
        percentInputs[account.type].addEventListener('input', updateDistributionTotal);
      });
      
      // Initial update of total
      updateDistributionTotal();
    }
    
    // Update distribution total
    function updateDistributionTotal() {
      let total = 0;
      
      // Sum up percentages from all distribution inputs
      Object.values(percentInputs).forEach(input => {
        total += parseInt(input.value) || 0;
      });
      
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
          ${childData.dateOfBirth ? `
          <div class="mb-3">
            <strong>Date of Birth:</strong> ${new Date(childData.dateOfBirth).toLocaleDateString()}
          </div>
          ` : `
          <div class="alert alert-warning mb-3">
            <strong>Date of Birth Missing</strong>
            <p class="mb-0">Please update this child's profile to add their date of birth.</p>
            <button class="btn btn-sm btn-primary mt-2" id="update-dob-btn">Update Now</button>
          </div>
          `}
          ${childData.phone ? `
          <div class="mb-3">
            <strong>Phone:</strong> ${childData.phone}
          </div>
          ` : ''}
          <div class="mb-3">
            <strong>Joined:</strong> ${new Date(childData.createdAt).toLocaleDateString()}
          </div>
        `;
        
        // Add event listener to update DOB button if it exists
        const updateDobBtn = document.getElementById('update-dob-btn');
        if (updateDobBtn) {
          updateDobBtn.addEventListener('click', () => {
            // Open edit modal or navigate to edit page
            editChild(childData._id);
          });
        }
        
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
        const response = await fetch(`${API_URL}/transactions?includeRejected=true&includeDeleted=true`);
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
          let statusBadge;
          let actionButtons = '';
          
          if (transaction.deleted) {
            statusBadge = '<span class="badge bg-secondary">Deleted</span>';
          } else if (transaction.rejected) {
            statusBadge = '<span class="badge bg-danger">Rejected</span>';
          } else if (transaction.approved) {
            statusBadge = '<span class="badge bg-success">Approved</span>';
            // Only show delete button for approved transactions that aren't deleted
            if (currentUser.role === 'parent') {
              actionButtons = `<button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteTransaction('${transaction._id}')" title="Delete Transaction"><i class="bi bi-trash"></i></button>`;
            }
          } else {
            statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
          }
          
          const rowClass = transaction.rejected || transaction.deleted ? 'transaction-row rejected-transaction' : 'transaction-row';
          const textClass = transaction.rejected || transaction.deleted ? 'text-muted' : '';
          
          return `
            <tr class="${rowClass}">
              <td class="${textClass}">${date}</td>
              <td class="${textClass}">${transaction.description}</td>
              <td class="${textClass}">${accountName}</td>
              <td class="${(transaction.rejected || transaction.deleted) ? 'text-muted' : amountClass}">${amountPrefix}${amount}</td>
              <td>${statusBadge}${actionButtons}</td>
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
        
        const response = await fetch(`${API_URL}/recurring?userId=${childId}&type=subscription`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load subscriptions');
        }
        
        // Data is already filtered by userId and type from API
        const childSubscriptions = data.data;
        
        if (childSubscriptions.length === 0) {
          subscriptionsContainerEl.innerHTML = `
            <div class="text-center">
              <p class="mb-0">No subscriptions found</p>
              <button class="btn btn-sm btn-outline-primary mt-2" id="add-subscription-btn">Add Subscription</button>
            </div>
          `;
          
          // Add event listener for add subscription button
          document.getElementById('add-subscription-btn')?.addEventListener('click', () => {
            showSubscriptionModal();
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
              const accountName = subscription.account?.name || 'Unknown';
              const frequencyText = getFrequencyText(subscription.frequency);
              const statusBadge = subscription.active ? 'bg-success' : 'bg-secondary';
              const statusText = subscription.active ? 'Active' : 'Inactive';
              
              return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>${subscription.name}</strong>
                    <div class="text-muted small">${frequencyText} • Next: ${nextDate}</div>
                    <div class="text-muted small">${accountName}</div>
                    <span class="badge ${statusBadge} text-xs">${statusText}</span>
                  </div>
                  <div class="text-end">
                    <span class="badge bg-primary rounded-pill">${amount}</span>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteSubscription('${subscription._id}')" title="Delete Subscription"><i class="bi bi-trash"></i></button>
                  </div>
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
          showSubscriptionModal();
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
    
    // Load allowance information
    async function loadAllowance() {
      try {
        const response = await fetch(`${API_URL}/recurring?userId=${childId}&type=allowance`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load allowance');
        }
        
        const allowances = data.data;
        
        if (allowances.length === 0) {
          // No allowance found, hide the card and update the button text
          allowanceCardEl.style.display = 'none';
          addAllowanceBtn.textContent = 'Add Allowance';
          return;
        }
        
        // Show allowance card and get the allowance (should only be one due to our constraint)
        const allowance = allowances[0];
        allowanceCardEl.style.display = 'block';
        
        // Calculate next payment date
        const nextDate = new Date(allowance.nextDate);
        const now = new Date();
        const isOverdue = nextDate < now;
        
        // Format distribution information
        const distribution = allowance.distribution || {};
        const distributionText = Object.keys(distribution)
          .filter(key => distribution[key] > 0)
          .map(key => `${capitalizeFirstLetter(key)}: ${distribution[key]}%`)
          .join(', ');
        
        allowanceInfoEl.innerHTML = `
          <div class="row">
            <div class="col-6">
              <h6 class="text-muted mb-1">Amount</h6>
              <div class="h4 text-success mb-3">${formatCurrency(allowance.amount)}</div>
            </div>
            <div class="col-6">
              <h6 class="text-muted mb-1">Frequency</h6>
              <div class="mb-3">${capitalizeFirstLetter(allowance.frequency)}</div>
            </div>
          </div>
          <div class="mb-3">
            <h6 class="text-muted mb-1">Distribution</h6>
            <div class="small">${distributionText || 'No distribution set'}</div>
          </div>
          <div class="mb-3">
            <h6 class="text-muted mb-1">Next Payment</h6>
            <div class="small ${isOverdue ? 'text-danger' : 'text-muted'}">
              ${nextDate.toLocaleDateString()} ${isOverdue ? '(Overdue)' : ''}
            </div>
          </div>
          <div>
            <h6 class="text-muted mb-1">Status</h6>
            <span class="badge ${allowance.active ? 'bg-success' : 'bg-secondary'}">
              ${allowance.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        `;
        
        // Update button text to indicate allowance exists
        addAllowanceBtn.textContent = 'Replace Allowance';
        
      } catch (error) {
        console.error('Error loading allowance:', error);
        allowanceInfoEl.innerHTML = `
          <div class="alert alert-danger">
            Error loading allowance information.
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
        // First, check if there's an existing allowance and delete it
        const existingResponse = await fetch(`${API_URL}/recurring?userId=${childId}&type=allowance`);
        const existingData = await existingResponse.json();
        
        if (existingData.success && existingData.data.length > 0) {
          // Delete existing allowance
          const existingAllowance = existingData.data[0];
          const deleteResponse = await fetch(`${API_URL}/recurring/${existingAllowance._id}`, {
            method: 'DELETE'
          });
          
          if (!deleteResponse.ok) {
            throw new Error('Failed to remove existing allowance');
          }
        }
        // Get the amount - either direct value or from the age formula
        let amount = parseFloat(allowanceAmountEl.value);
        const useAgeFormula = document.getElementById('use-age-formula')?.checked;
        
        // If using age formula, make sure the calculation is done
        if (useAgeFormula) {
          calculateAgeBasedAllowance();
          amount = parseFloat(allowanceAmountEl.value);
        }
        
        const recurring = recurringAllowanceEl.checked;
        
        if (isNaN(amount) || amount <= 0) {
          alert('Please enter a valid amount');
          return;
        }
        
        // Check if there are any accounts
        if (childAccounts.length === 0) {
          alert('Please create at least one account before adding allowance');
          return;
        }
        
        // Calculate total percentage
        let total = 0;
        childAccounts.forEach(account => {
          const input = percentInputs[account.type];
          if (input) {
            total += parseInt(input.value) || 0;
          }
        });
        
        if (total !== 100) {
          alert('Distribution percentages must add up to 100%');
          return;
        }
        
        // Calculate distribution percentages
        const distribution = {
          spending: 0,
          saving: 0,
          donation: 0
        };
        
        childAccounts.forEach(account => {
          const input = percentInputs[account.type];
          if (input) {
            distribution[account.type] = parseInt(input.value) || 0;
          }
        });
        
        // Process immediate allowance for each account
        for (const account of childAccounts) {
          const input = percentInputs[account.type];
          
          if (!input) {
            continue; // Skip if no input for this account
          }
          
          const percentValue = parseInt(input.value) || 0;
          
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
            throw new Error(`Failed to process allowance for ${account.name} account`);
          }
        }
        
        // If recurring is checked, create a recurring transaction
        if (recurring) {
          // Calculate next Sunday (for weekly allowance)
          const nextDate = new Date();
          const dayOfWeek = nextDate.getDay(); // 0 is Sunday
          const daysUntilNextSunday = (7 - dayOfWeek) % 7;
          nextDate.setDate(nextDate.getDate() + daysUntilNextSunday);
          nextDate.setHours(0, 0, 0, 0);
          
          // Create recurring allowance
          const mainAccount = childAccounts.find(acc => acc.type === 'spending') || childAccounts[0];
          
          const recurringData = {
            name: 'Weekly Allowance',
            description: `Weekly allowance for ${childData.name}`,
            amount: amount,
            type: 'allowance',
            frequency: 'weekly',
            account: mainAccount._id, // Use main account as reference (distribution will handle the rest)
            user: childId,
            distribution: distribution,
            nextDate: nextDate,
            active: true
          };
          
          const recurringResponse = await fetch(`${API_URL}/recurring`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(recurringData)
          });
          
          if (!recurringResponse.ok) {
            const errorData = await recurringResponse.json();
            throw new Error(`Failed to set up recurring allowance: ${errorData.error || 'Unknown error'}`);
          }
        }
        
        // Close modal
        addAllowanceModal.hide();
        
        // Refresh data
        await loadChildAccounts(childId);
        await loadTransactions();
        await loadAllowance(); // Refresh allowance display
        
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
    
    // Calculate age-based allowance
    function calculateAgeBasedAllowance() {
      // Only proceed if child data is available and includes dateOfBirth
      if (!childData || !childData.dateOfBirth) {
        console.warn('Cannot calculate age-based allowance: Missing date of birth');
        return;
      }
      
      // Get child's age
      const dob = new Date(childData.dateOfBirth);
      const today = new Date();
      
      // Basic age calculation
      let age = today.getFullYear() - dob.getFullYear();
      
      // Adjust age if birthday hasn't occurred this year yet
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      // Apply the formula: floor(age) * 1.2
      const ageFloor = Math.floor(age);
      const allowanceAmount = (ageFloor * 1.2).toFixed(2);
      
      // Update display
      const childAgeEl = document.getElementById('child-age');
      const calculatedAmountEl = document.getElementById('calculated-amount');
      
      if (childAgeEl) childAgeEl.textContent = ageFloor;
      if (calculatedAmountEl) calculatedAmountEl.textContent = allowanceAmount;
      
      // Update the input field if the checkbox is checked
      const useAgeFormulaEl = document.getElementById('use-age-formula');
      if (useAgeFormulaEl && useAgeFormulaEl.checked) {
        allowanceAmountEl.value = allowanceAmount;
      }
    }
    
    // Format currency
    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }
    
    // Format date for input (YYYY-MM-DD)
    function formatDateForInput(dateString) {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return '';
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Capitalize first letter
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Show subscription modal
    function showSubscriptionModal() {
      // Reset form
      subscriptionFormEl.reset();
      
      // Populate account dropdown
      populateSubscriptionAccountDropdown();
      
      // Set default next date to next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      subscriptionNextDateEl.value = nextMonth.toISOString().split('T')[0];
      
      // Show modal
      addSubscriptionModal.show();
    }
    
    // Populate subscription account dropdown
    function populateSubscriptionAccountDropdown() {
      subscriptionAccountEl.innerHTML = childAccounts.map(account => 
        `<option value="${account._id}">${account.name} (${account.type})</option>`
      ).join('');
    }
    
    // Save subscription
    async function saveSubscription() {
      try {
        const name = subscriptionNameEl.value.trim();
        const description = subscriptionDescriptionEl.value.trim() || name;
        const amount = parseFloat(subscriptionAmountEl.value);
        const frequency = subscriptionFrequencyEl.value;
        const accountId = subscriptionAccountEl.value;
        const nextDate = subscriptionNextDateEl.value;
        
        if (!name || isNaN(amount) || amount <= 0 || !accountId || !nextDate) {
          alert('Please fill out all required fields correctly');
          return;
        }
        
        // Create recurring transaction for subscription
        const subscriptionData = {
          name,
          description,
          amount,
          type: 'subscription',
          frequency,
          account: accountId,
          user: childId,
          nextDate: new Date(nextDate),
          active: true
        };
        
        // Send to recurring transactions API
        const response = await fetch(`${API_URL}/recurring`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(subscriptionData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create subscription');
        }
        
        // Check if first payment is due today or earlier
        const paymentDate = new Date(nextDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        if (paymentDate <= today) {
          // Process the first payment immediately
          await processFirstSubscriptionPayment(accountId, amount, name);
        }
        
        // Close modal
        addSubscriptionModal.hide();
        
        // Refresh data
        await loadSubscriptions();
        await loadChildAccounts(childId);
        await loadTransactions();
        
        // Success message
        const immediatePayment = paymentDate <= today;
        alert(`Subscription created successfully!${immediatePayment ? ' First payment has been processed.' : ''}`);
      
        
      } catch (error) {
        console.error('Error saving subscription:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Process first subscription payment
    async function processFirstSubscriptionPayment(accountId, amount, subscriptionName) {
      try {
        // Create transaction for the subscription payment
        const transactionData = {
          description: `${subscriptionName} - Subscription payment`,
          amount: amount,
          type: 'withdrawal',
          account: accountId,
          date: new Date(),
          approved: true,
          approvedBy: currentUser.id
        };
        
        // Send to transactions API
        const response = await fetch(`${API_URL}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to process subscription payment');
        }
        
      } catch (error) {
        console.error('Error processing first subscription payment:', error);
        // Don't throw here as we don't want to break the subscription creation
        // Just log the error - the subscription was created successfully
      }
    }
    
    // Delete transaction (global function so it can be called from onclick)
    window.deleteTransaction = async function(transactionId) {
      if (!confirm('Are you sure you want to delete this transaction? This will reverse its effect on the account balance.')) {
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/transactions/${transactionId}/delete`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete transaction');
        }
        
        // Refresh data
        await loadChildAccounts(childId);
        await loadTransactions();
        
        // Success message
        alert('Transaction deleted successfully!');
        
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert(`Error: ${error.message}`);
      }
    };
    
    // Delete subscription (global function so it can be called from onclick)
    window.deleteSubscription = async function(subscriptionId) {
      if (!confirm('Are you sure you want to delete this subscription?')) {
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/recurring/${subscriptionId}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete subscription');
        }
        
        // Refresh subscriptions
        await loadSubscriptions();
        
        // Success message
        alert('Subscription deleted successfully!');
        
      } catch (error) {
        console.error('Error deleting subscription:', error);
        alert(`Error: ${error.message}`);
      }
    };
    
    // Edit child function - opens modal to edit child details
    function editChild(childId) {
      console.log('Opening edit modal for child:', childId);
      
      // We already have the child data in memory, use it to populate the form
      if (!childData) {
        console.error('No child data available');
        alert('Error: Child data not available');
        return;
      }
      
      // Populate form fields
      document.getElementById('edit-child-name').value = childData.name || '';
      document.getElementById('edit-child-email').value = childData.email || '';
      
      // Format date of birth if available
      if (childData.dateOfBirth) {
        document.getElementById('edit-child-dob').value = formatDateForInput(childData.dateOfBirth);
      }
      
      // Create and show modal
      const editChildModal = new bootstrap.Modal(document.getElementById('editChildModal'));
      editChildModal.show();
      
      // Add event listener to the save button
      document.getElementById('save-child-btn').addEventListener('click', saveChildChanges);
    }
    
    // Function to save child changes
    async function saveChildChanges() {
      try {
        // Get form values
        const fullName = document.getElementById('edit-child-name').value;
        const dateOfBirth = document.getElementById('edit-child-dob').value;
        
        // Parse the name into first and last name
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        console.log('Saving child changes:', {
          fullName,
          firstName,
          lastName,
          dateOfBirth
        });
        
        // Format the date properly
        let formattedDate = null;
        if (dateOfBirth) {
          // Just use the input date format directly - HTML date inputs are already in YYYY-MM-DD format
          // This avoids any timezone conversion issues when creating a new Date object
          if (dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
            formattedDate = dateOfBirth;
            console.log('Using direct date input:', dateOfBirth);
          } else {
            // Fall back to the old method just in case
            const dobDate = new Date(dateOfBirth);
            if (!isNaN(dobDate.getTime())) {
              formattedDate = dobDate.toISOString().split('T')[0];
              console.log('Formatted DOB:', dateOfBirth, '->', formattedDate);
            } else {
              console.error('Invalid date format in input:', dateOfBirth);
              alert('Invalid date format');
              return;
            }
          }
        }
        
        // Update the child
        const response = await fetch(`${API_URL}/users/${childData._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstName,
            lastName,
            dateOfBirth: formattedDate
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to update child');
        }
        
        // Close the modal
        const editChildModal = bootstrap.Modal.getInstance(document.getElementById('editChildModal'));
        editChildModal.hide();
        
        // Reload the page to show updated information
        alert('Child information updated successfully!');
        window.location.reload();
        
      } catch (error) {
        console.error('Error saving child changes:', error);
        alert(`Error: ${error.message}`);
      }
    }
  });