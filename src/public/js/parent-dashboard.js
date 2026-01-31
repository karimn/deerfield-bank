document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const API_URL = '/api';
    
    // DOM elements
    const userInfoEl = document.getElementById('user-info');
    const approvalsTableEl = document.getElementById('approvals-table');
    const approvalsBadgeEl = document.getElementById('approvals-badge');
    const childrenContainerEl = document.getElementById('children-container');
    const recurringListEl = document.getElementById('recurring-list');
    
    // Modal elements
    const addChildModal = new bootstrap.Modal(document.getElementById('addChildModal'));
    const approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
    const recurringTransactionModal = new bootstrap.Modal(document.getElementById('recurringTransactionModal'));
    const quickTransactionModal = new bootstrap.Modal(document.getElementById('quickTransactionModal'));
    const approvalModalBodyEl = document.getElementById('approval-modal-body');
    
    // Form elements
    const addChildFormEl = document.getElementById('add-child-form');
    const childNameEl = document.getElementById('child-name');
    const childEmailEl = document.getElementById('child-email');
    const childDobEl = document.getElementById('child-dob');
    
    // Check if date element exists and log
    console.log('DOB Element found:', childDobEl ? 'Yes' : 'No');
    if (childDobEl) {
      console.log('DOB Element value accessor:', Object.getOwnPropertyDescriptor(childDobEl, 'value'));
      childDobEl.addEventListener('change', (e) => {
        console.log('DOB changed:', e.target.value);
      });
    }
    
    const createAccountsEl = document.getElementById('create-accounts');
    const initialBalanceEl = document.getElementById('initial-balance');
    
    // Recurring transaction form elements
    const recurringFormEl = document.getElementById('recurring-form');
    const recurringIdEl = document.getElementById('recurring-id');
    const recurringNameEl = document.getElementById('recurring-name');
    const recurringDescriptionEl = document.getElementById('recurring-description');
    const recurringAmountEl = document.getElementById('recurring-amount');
    const recurringTypeEl = document.getElementById('recurring-type');
    const recurringFrequencyEl = document.getElementById('recurring-frequency');
    const recurringChildEl = document.getElementById('recurring-child');
    const recurringAccountEl = document.getElementById('recurring-account');
    const recurringSpendingEl = document.getElementById('recurring-spending');
    const recurringSavingEl = document.getElementById('recurring-saving');
    const recurringDonationEl = document.getElementById('recurring-donation');
    const recurringDistributionTotalEl = document.getElementById('recurring-distribution-total');
    const recurringNextDateEl = document.getElementById('recurring-next-date');
    const recurringActiveEl = document.getElementById('recurring-active');
    const recurringModalTitleEl = document.getElementById('recurring-modal-title');
    const distributionContainerEl = document.getElementById('distribution-container');
    
    // Button elements
    const addChildBtn = document.getElementById('add-child-btn');
    const saveChildBtn = document.getElementById('save-child-btn');
    const processRecurringBtn = document.getElementById('process-recurring-btn');
    const approveTransactionBtn = document.getElementById('approve-transaction-btn');
    const rejectTransactionBtn = document.getElementById('reject-transaction-btn');
    const refreshRecurringBtn = document.getElementById('refresh-recurring-btn');
    const addRecurringBtn = document.getElementById('add-recurring-btn');
    const saveRecurringBtn = document.getElementById('save-recurring-btn');
    const deleteRecurringBtn = document.getElementById('delete-recurring-btn');
    
    // Quick transaction elements
    const quickTransactionTitleEl = document.getElementById('quick-transaction-title');
    const quickTransactionChildIdEl = document.getElementById('quick-transaction-child-id');
    const quickTransactionDescriptionEl = document.getElementById('quick-transaction-description');
    const quickTransactionAmountEl = document.getElementById('quick-transaction-amount');
    const quickTransactionTypeEl = document.getElementById('quick-transaction-type');
    const quickTransactionAccountEl = document.getElementById('quick-transaction-account');
    const saveQuickTransactionBtn = document.getElementById('save-quick-transaction-btn');
    
    // Current user and data
    let currentUser = null;
    let pendingTransactions = [];
    let currentTransactionId = null;
    let currentEditChildId = null; // For tracking when editing an existing child
    let childrenData = []; // Store children data for reference
    let accountsData = []; // Store accounts data for reference
    let currentEditRecurringId = null; // For tracking when editing recurring transactions

    
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
        
        // Check if user is a parent
        if (authData.user.role !== 'parent') {
          // Redirect to child dashboard if not a parent
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
        
        // 2. Load pending transactions
        await loadPendingTransactions();
        
        // 3. Load children
        await loadChildren();
        
        // 4. Load recurring transactions
        await loadRecurringTransactions();
        
        // 5. Set up event listeners
        setupEventListeners();

        // Edit functionality has been moved to child-detail.html page
        
      } catch (error) {
        console.error('Initialization error:', error);
        alert('Error loading data. See console for details.');
      }
    }
    
    // Load pending transactions
    async function loadPendingTransactions() {
      try {
        const response = await fetch(`${API_URL}/transactions`);
        const data = await response.json();
        
        // Filter for unapproved and non-rejected transactions
        pendingTransactions = data.data.filter(transaction => !transaction.approved && !transaction.rejected);
        
        // Update badge
        approvalsBadgeEl.textContent = pendingTransactions.length;
        
        // Update table
        if (pendingTransactions.length === 0) {
          approvalsTableEl.innerHTML = `
            <tr>
              <td colspan="6" class="text-center">No pending approvals</td>
            </tr>
          `;
          return;
        }
        
        // Sort by date, newest first
        pendingTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        approvalsTableEl.innerHTML = pendingTransactions.map(transaction => {
          const date = new Date(transaction.date).toLocaleDateString();
          const amount = formatCurrency(transaction.amount);
          const amountClass = transaction.type === 'deposit' ? 'text-success' : 'text-danger';
          const amountPrefix = transaction.type === 'deposit' ? '+' : '-';
          
          // Get child name and account name
          const childName = transaction.account.owner ? transaction.account.owner.name : 'Unknown';
          const accountName = transaction.account.name || 'Unknown';
          
          return `
            <tr>
              <td>${date}</td>
              <td>${childName}</td>
              <td>${transaction.description}</td>
              <td>${accountName}</td>
              <td class="${amountClass}">${amountPrefix}${amount}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary view-transaction" data-id="${transaction._id}">
                  View
                </button>
              </td>
            </tr>
          `;
        }).join('');
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-transaction').forEach(button => {
          button.addEventListener('click', () => {
            const transactionId = button.getAttribute('data-id');
            showTransactionDetails(transactionId);
          });
        });
        
      } catch (error) {
        console.error('Error loading pending transactions:', error);
        approvalsTableEl.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-danger">Error loading approvals</td>
          </tr>
        `;
      }
    }
    
    // Load children
// Updated loadChildren function
async function loadChildren() {
    try {
      // Get all users
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      
      // Filter for children
      childrenData = data.data.filter(user => user.role === 'child');
      
      if (childrenData.length === 0) {
        childrenContainerEl.innerHTML = `
          <div class="col-12 text-center py-4">
            <p class="mb-0">No children found. Add your first child to get started.</p>
          </div>
        `;
        return;
      }
      
      // Get accounts for each child
      const childrenWithAccounts = await Promise.all(childrenData.map(async (child) => {
        const accountsResponse = await fetch(`${API_URL}/accounts?userId=${child._id}`);
        const accountsData = await accountsResponse.json();
        return {
          ...child,
          accounts: accountsData.data
        };
      }));
      
      // Display children
      childrenContainerEl.innerHTML = childrenWithAccounts.map(child => {
        // Calculate total balance across all accounts
        const totalBalance = child.accounts.reduce((sum, account) => sum + account.balance, 0);
        
        // Get display name - use firstName & lastName if available, otherwise fall back to name
        let displayName = '';
        if (child.firstName && child.lastName) {
          displayName = `${child.firstName} ${child.lastName}`;
        } else if (child.name) {
          displayName = child.name;
        } else {
          displayName = 'Unknown';
        }
        
        return `
          <div class="col-md-6 mb-4">
            <div class="card child-card h-100">
              <div class="card-body">
                <h5 class="card-title">${displayName}</h5>
                <h6 class="card-subtitle mb-2 text-muted">${child.email}</h6>
                <p class="card-text">Total Balance: ${formatCurrency(totalBalance)}</p>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  ${child.accounts.map(account => `
                    <span class="badge bg-light text-dark border">
                      ${account.type}: ${formatCurrency(account.balance)}
                    </span>
                  `).join('')}
                </div>
              </div>
              <div class="card-footer bg-transparent">
                <div class="d-grid gap-2">
                  <button type="button" class="btn btn-outline-success btn-sm view-child" data-id="${child._id}">
                    View Details
                  </button>
                  <button type="button" class="btn btn-primary btn-sm add-transaction-btn" data-child-id="${child._id}" data-child-name="${displayName}">
                    <i class="bi bi-plus-circle me-1"></i>Add Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      // Add event listeners to the buttons
      addChildButtonEventListeners();
      
    } catch (error) {
      console.error('Error loading children:', error);
      childrenContainerEl.innerHTML = `
        <div class="col-12 text-center py-4">
          <p class="text-danger mb-0">Error loading children</p>
        </div>
      `;
    }
  }
  
  // Load recurring transactions
  async function loadRecurringTransactions() {
    try {
      const response = await fetch(`${API_URL}/recurring`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load recurring transactions');
      }
      
      const recurringTransactions = data.data;
      
      if (recurringTransactions.length === 0) {
        recurringListEl.innerHTML = `
          <div class="text-center py-3">
            <p class="mb-0">No recurring transactions found</p>
          </div>
        `;
        return;
      }
      
      // Group by type for better organization
      const groupedTransactions = {
        allowance: recurringTransactions.filter(item => item.type === 'allowance'),
        subscription: recurringTransactions.filter(item => item.type === 'subscription'),
        interest: recurringTransactions.filter(item => item.type === 'interest'),
        other: recurringTransactions.filter(item => item.type === 'other')
      };
      
      // Create list items
      let recurringHtml = '';
      
      // Add each group if it has items
      for (const [type, items] of Object.entries(groupedTransactions)) {
        if (items.length > 0) {
          // Add group header
          recurringHtml += `
            <div class="list-group-item list-group-item-action active">
              ${capitalizeFirstLetter(type)} (${items.length})
            </div>
          `;
          
          // Add items in this group
          items.forEach(item => {
            const nextDate = new Date(item.nextDate).toLocaleDateString();
            const amount = formatCurrency(item.amount);
            const childName = item.user?.name || 'Unknown';
            const accountName = item.account?.name || 'Unknown';
            const badgeClass = item.active ? 'bg-success' : 'bg-secondary';
            const statusText = item.active ? 'Active' : 'Inactive';
            
            recurringHtml += `
              <button class="list-group-item list-group-item-action recurring-item" data-id="${item._id}">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">${item.name}</h6>
                  <span class="badge ${badgeClass}">${statusText}</span>
                </div>
                <p class="mb-1">${amount} · ${getFrequencyText(item.frequency)} · Next: ${nextDate}</p>
                <small class="text-muted">For: ${childName} · Account: ${accountName}</small>
              </button>
            `;
          });
        }
      }
      
      recurringListEl.innerHTML = recurringHtml;
      
      // Add event listeners to recurring item buttons
      document.querySelectorAll('.recurring-item').forEach(button => {
        button.addEventListener('click', (e) => {
          const id = e.target.closest('.recurring-item').dataset.id;
          showRecurringTransactionDetails(id);
        });
      });
      
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
      recurringListEl.innerHTML = `
        <div class="text-center py-3">
          <div class="alert alert-danger mb-0">
            Error loading recurring transactions. Please try again later.
          </div>
        </div>
      `;
    }
  }
   
    // Add this to the setupEventListeners function in parent-dashboard.js
// after the loadChildren() function has completed successfully

// Add event listeners to View Details and Add Transaction buttons
function addChildButtonEventListeners() {
    // View Details buttons
    document.querySelectorAll('.view-child').forEach(button => {
      button.addEventListener('click', () => {
        const childId = button.getAttribute('data-id');
        // Navigate to child details page with the child ID
        window.location.href = `/child-detail.html?id=${childId}`;
      });
    });
    
    // Add Transaction buttons
    document.querySelectorAll('.add-transaction-btn').forEach(button => {
      button.addEventListener('click', () => {
        const childId = button.getAttribute('data-child-id');
        const childName = button.getAttribute('data-child-name');
        showQuickTransactionModal(childId, childName);
      });
    });
  }
  
  // Edit functionality has been removed - all child editing is now done on child-detail.html page
  
  // Modify the saveChild function to handle both creating and updating
  async function saveChild() {
    try {
      // Get form values
      const fullName = childNameEl.value;
      const email = childEmailEl.value;
      
      // Split the name into firstName and lastName
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Ensure date is properly formatted (YYYY-MM-DD)
      let dateOfBirth = null;
      if (childDobEl.value) {
        // Format date properly for API
        const dobDate = new Date(childDobEl.value);
        if (!isNaN(dobDate.getTime())) {
          // Format as ISO string and just keep the date part (YYYY-MM-DD)
          dateOfBirth = dobDate.toISOString().split('T')[0];
          console.log('Formatted DOB:', childDobEl.value, '->', dateOfBirth);
        } else {
          console.error('Invalid date format in input:', childDobEl.value);
        }
      }
      
      const createAccounts = createAccountsEl.checked;
      const initialBalance = parseFloat(initialBalanceEl.value) || 0;
      
      if (!fullName || !email) {
        alert('Please fill out name and email fields');
        return;
      }
      
      // IMPORTANT: Removed date of birth validation completely
      
      // Check if we're editing an existing child or creating a new one
      if (currentEditChildId) {
        // Debug: log what we're sending
        console.log('Updating child with:', { firstName, lastName, email, dateOfBirth });
        
        // *** IMPORTANT *** 
        // Log what we're about to do so we can debug it
        console.log(`PUT request to ${API_URL}/users/${currentEditChildId} with:`, {
          firstName,
          lastName,
          email,
          dateOfBirth
        });
        
        // Update existing child
        try {
          console.log('✅ DIRECT UPDATE: Updating child with ID', currentEditChildId);
          console.log('✅ Date of birth value:', dateOfBirth);
          console.log('✅ First Name:', firstName);
          console.log('✅ Last Name:', lastName);
          
          // Create update data object
          const updateData = {
            firstName,
            lastName,
            email
          };
          
          // Only include dateOfBirth if it's not empty
          if (dateOfBirth) {
            updateData.dateOfBirth = dateOfBirth;
            console.log('✅ Including DOB in update:', dateOfBirth);
          } else {
            console.log('❌ DOB is empty, not including in update');
          }
          
          // Use direct update API
          const userResponse = await fetch(`${API_URL}/users/${currentEditChildId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });
          
          // If fetch succeeded but API returned an error
          if (!userResponse.ok) {
            const errorData = await userResponse.json();
            console.error('Error response from server:', errorData);
            throw new Error(errorData.error || `Server returned ${userResponse.status}: ${userResponse.statusText}`);
          }
          
          const userData = await userResponse.json();
          
          if (!userData.success) {
            throw new Error(userData.error || 'Failed to update child');
          }
          
          // Reset currentEditChildId
          currentEditChildId = null;
          
          // Reset modal title and button text
          document.querySelector('#addChildModal .modal-title').textContent = 'Add New Child';
          saveChildBtn.textContent = 'Save';
          
          // Close modal
          addChildModal.hide();
          
          // Refresh children list
          await loadChildren();
          
          // Success message
          alert(`Child ${fullName} updated successfully!`);
        } catch (error) {
          console.error('Error updating child:', error);
          alert(`Error updating child: ${error.message || 'Unknown error'}`);
        }
      } else {
        // Debug: log what we're sending for new child
        console.log('Creating new child with:', { 
          firstName,
          lastName,
          email, 
          dateOfBirth, 
          dateValid: !isNaN(new Date(dateOfBirth).getTime())
        });
        
        // Check if a child with this email already exists
        try {
          const checkResponse = await fetch(`${API_URL}/users`);
          const checkData = await checkResponse.json();
          
          if (checkData.success) {
            const existingChild = checkData.data.find(user => 
              user.email.toLowerCase() === email.toLowerCase() && user.role === 'child'
            );
            
            if (existingChild) {
              // If the child exists, switch to update mode instead
              console.log('Child with this email already exists, switching to update mode');
              currentEditChildId = existingChild._id;
              
              // Recursively call saveChild again, but now in edit mode
              return saveChild();
            }
          }
        } catch (checkError) {
          console.error('Error checking for existing child:', checkError);
          // Continue with creation attempt
        }
        
        // Create new child user
        const userResponse = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstName,
            lastName,
            name: fullName,
            email,
            dateOfBirth,
            role: 'child',
            parent: currentUser.id
          })
        });
        
        const userData = await userResponse.json();
        
        if (!userData.success) {
          throw new Error(userData.error || 'Failed to create user');
        }
        
        const childId = userData.data._id;
        
        // Create accounts if selected
        if (createAccounts) {
          const accountTypes = ['spending', 'saving', 'donation'];
          
          for (const type of accountTypes) {
            await fetch(`${API_URL}/accounts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: capitalizeFirstLetter(type),
                type,
                balance: initialBalance,
                interestRate: type === 'saving' ? 5 : 0, // 5% interest for saving account
                owner: childId
              })
            });
          }
        }
        
        // Close modal
        addChildModal.hide();
        
        // Refresh children list
        await loadChildren();
        
        // Success message
        alert(`Child ${fullName} added successfully!`);
      }
    } catch (error) {
      console.error('Error saving child:', error);
      alert(`Error: ${error.message}`);
    }
  }
    
    // Show transaction details
    function showTransactionDetails(transactionId) {
      const transaction = pendingTransactions.find(t => t._id === transactionId);
      
      if (!transaction) {
        alert('Transaction not found');
        return;
      }
      
      // Store current transaction ID for approve/reject
      currentTransactionId = transactionId;
      
      // Format data for display
      const date = new Date(transaction.date).toLocaleString();
      const amount = formatCurrency(transaction.amount);
      const amountClass = transaction.type === 'deposit' ? 'text-success' : 'text-danger';
      const amountPrefix = transaction.type === 'deposit' ? '+' : '-';
      
      // Get child name and account name
      const childName = transaction.account.owner ? transaction.account.owner.name : 'Unknown';
      const accountName = transaction.account.name || 'Unknown Account';
      const accountType = transaction.account.type || 'Unknown Type';
      
      // Update modal content
      approvalModalBodyEl.innerHTML = `
        <div class="mb-3">
          <h6>Child:</h6>
          <p>${childName}</p>
        </div>
        <div class="mb-3">
          <h6>Description:</h6>
          <p>${transaction.description}</p>
        </div>
        <div class="mb-3">
          <h6>Amount:</h6>
          <p class="${amountClass}">${amountPrefix}${amount}</p>
        </div>
        <div class="mb-3">
          <h6>Type:</h6>
          <p>${capitalizeFirstLetter(transaction.type)}</p>
        </div>
        <div class="mb-3">
          <h6>Account:</h6>
          <p>${accountName} (${capitalizeFirstLetter(accountType)})</p>
        </div>
        <div class="mb-3">
          <h6>Date:</h6>
          <p>${date}</p>
        </div>
      `;
      
      // Show modal
      approvalModal.show();
    }
    
    // Set up event listeners
    function setupEventListeners() {
      // Add child button
      addChildBtn.addEventListener('click', () => {
        addChildFormEl.reset();
        addChildModal.show();
      });
      
      // Save child button
      saveChildBtn.addEventListener('click', saveChild);
      
      // Process all recurring transactions button
      processRecurringBtn.addEventListener('click', processRecurringTransactions);
      
      // Approve transaction button
      approveTransactionBtn.addEventListener('click', () => {
        approveTransaction(currentTransactionId);
      });
      
      // Reject transaction button
      rejectTransactionBtn.addEventListener('click', () => {
        rejectTransaction(currentTransactionId);
      });
      
      // Recurring transactions buttons
      refreshRecurringBtn.addEventListener('click', loadRecurringTransactions);
      
      addRecurringBtn.addEventListener('click', () => {
        // Reset the form and prepare for new transaction
        recurringFormEl.reset();
        recurringIdEl.value = '';
        currentEditRecurringId = null;
        recurringModalTitleEl.textContent = 'Add Recurring Transaction';
        deleteRecurringBtn.classList.add('d-none');
        
        // Set default values
        const today = new Date();
        recurringNextDateEl.value = formatDateForInput(today);
        recurringActiveEl.checked = true;
        
        // Show distribution fields only for allowance type
        recurringTypeEl.value = 'allowance';
        toggleDistributionFields();
        updateRecurringDistributionTotal();
        
        // Populate children dropdown
        populateChildrenDropdown();
        
        // Show modal
        recurringTransactionModal.show();
      });
      
      // Recurring transaction type change event
      recurringTypeEl.addEventListener('change', toggleDistributionFields);
      
      // Recurring child change event
      recurringChildEl.addEventListener('change', () => loadChildAccounts(recurringChildEl.value));
      
      // Recurring distribution fields change events
      recurringSpendingEl.addEventListener('input', updateRecurringDistributionTotal);
      recurringSavingEl.addEventListener('input', updateRecurringDistributionTotal);
      recurringDonationEl.addEventListener('input', updateRecurringDistributionTotal);
      
      // Save recurring transaction button
      saveRecurringBtn.addEventListener('click', saveRecurringTransaction);
      
      // Delete recurring transaction button
      deleteRecurringBtn.addEventListener('click', deleteRecurringTransaction);
      
      // Quick transaction save button
      saveQuickTransactionBtn.addEventListener('click', saveQuickTransaction);
    }
    
    // Save child
    async function saveChild() {
      try {
        const name = childNameEl.value;
        const email = childEmailEl.value;
        const createAccounts = createAccountsEl.checked;
        const initialBalance = parseFloat(initialBalanceEl.value) || 0;
        
        if (!name || !email) {
          alert('Please fill out all required fields');
          return;
        }
        
        // Create child user
        const userResponse = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            role: 'child',
            parent: currentUser.id
          })
        });
        
        const userData = await userResponse.json();
        
        if (!userData.success) {
          throw new Error(userData.error || 'Failed to create user');
        }
        
        const childId = userData.data._id;
        
        // Create accounts if selected
        if (createAccounts) {
          const accountTypes = ['spending', 'saving', 'donation'];
          
          for (const type of accountTypes) {
            await fetch(`${API_URL}/accounts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: capitalizeFirstLetter(type),
                type,
                balance: initialBalance,
                interestRate: type === 'saving' ? 5 : 0, // 5% interest for saving account
                owner: childId
              })
            });
          }
        }
        
        // Close modal
        addChildModal.hide();
        
        // Refresh children list
        await loadChildren();
        
        // Success message
        alert(`Child ${name} added successfully!`);
        
      } catch (error) {
        console.error('Error saving child:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Process all recurring transactions
    async function processRecurringTransactions() {
      try {
        if (!confirm('Are you sure you want to process all recurring transactions? This will process allowances, subscriptions, and other recurring items that are due.')) {
          return;
        }
        
        // Show loading state
        processRecurringBtn.disabled = true;
        processRecurringBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';
        
        const response = await fetch(`${API_URL}/recurring/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          const { processed, errors } = data.data;
          let message = `Successfully processed ${processed.length} recurring transactions.`;
          
          if (errors.length > 0) {
            message += `\n\nErrors occurred with ${errors.length} transactions:`;
            errors.forEach(error => {
              message += `\n- ${error.name}: ${error.error}`;
            });
          }
          
          alert(message);
          
          // Refresh the recurring transactions list
          await loadRecurringTransactions();
          
          // Optionally refresh the entire page to show updated balances
          if (processed.length > 0) {
            location.reload();
          }
        } else {
          throw new Error(data.error || 'Failed to process recurring transactions');
        }
        
      } catch (error) {
        console.error('Error processing recurring transactions:', error);
        alert(`Error: ${error.message}`);
      } finally {
        // Reset button state
        processRecurringBtn.disabled = false;
        processRecurringBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Process All Recurring Transactions';
      }
    }
    
    // Process allowance
    // Toggle distribution fields based on transaction type
    function toggleDistributionFields() {
      if (recurringTypeEl.value === 'allowance') {
        distributionContainerEl.classList.remove('d-none');
      } else {
        distributionContainerEl.classList.add('d-none');
      }
    }
    
    // Update recurring distribution total
    function updateRecurringDistributionTotal() {
      const spendingPercent = parseInt(recurringSpendingEl.value) || 0;
      const savingPercent = parseInt(recurringSavingEl.value) || 0;
      const donationPercent = parseInt(recurringDonationEl.value) || 0;
      
      const total = spendingPercent + savingPercent + donationPercent;
      
      recurringDistributionTotalEl.textContent = `Total: ${total}%`;
      
      if (total !== 100) {
        recurringDistributionTotalEl.classList.add('text-danger');
      } else {
        recurringDistributionTotalEl.classList.remove('text-danger');
      }
    }
    
    // Populate children dropdown for recurring transactions
    function populateChildrenDropdown() {
      // Clear existing options
      recurringChildEl.innerHTML = '';
      
      // Add options for each child
      childrenData.forEach(child => {
        const option = document.createElement('option');
        option.value = child._id;
        option.textContent = child.name;
        recurringChildEl.appendChild(option);
      });
      
      // If at least one child exists, load their accounts
      if (childrenData.length > 0) {
        loadChildAccounts(childrenData[0]._id);
      }
    }
    
    // Load child accounts for recurring transactions
    async function loadChildAccounts(childId) {
      try {
        const response = await fetch(`${API_URL}/accounts?userId=${childId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load accounts');
        }
        
        accountsData = data.data;
        
        // Clear existing options
        recurringAccountEl.innerHTML = '';
        
        if (accountsData.length === 0) {
          const option = document.createElement('option');
          option.textContent = 'No accounts available';
          recurringAccountEl.appendChild(option);
          recurringAccountEl.disabled = true;
          return;
        }
        
        recurringAccountEl.disabled = false;
        
        // Add options for each account
        accountsData.forEach(account => {
          const option = document.createElement('option');
          option.value = account._id;
          option.textContent = `${account.name} (${capitalizeFirstLetter(account.type)})`;
          recurringAccountEl.appendChild(option);
        });
        
      } catch (error) {
        console.error('Error loading child accounts:', error);
        recurringAccountEl.innerHTML = '<option>Error loading accounts</option>';
        recurringAccountEl.disabled = true;
      }
    }
    
    // Show recurring transaction details for edit
    async function showRecurringTransactionDetails(id) {
      try {
        const response = await fetch(`${API_URL}/recurring/${id}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load recurring transaction');
        }
        
        const transaction = data.data;
        currentEditRecurringId = id;
        
        // Set form values
        recurringIdEl.value = id;
        recurringNameEl.value = transaction.name;
        recurringDescriptionEl.value = transaction.description || '';
        recurringAmountEl.value = transaction.amount.toFixed(2);
        recurringTypeEl.value = transaction.type;
        recurringFrequencyEl.value = transaction.frequency;
        recurringActiveEl.checked = transaction.active;
        recurringNextDateEl.value = formatDateForInput(transaction.nextDate);
        
        // Show or hide distribution fields
        toggleDistributionFields();
        
        // For allowance type, set distribution values
        if (transaction.type === 'allowance' && transaction.distribution) {
          recurringSpendingEl.value = transaction.distribution.spending || 0;
          recurringSavingEl.value = transaction.distribution.saving || 0;
          recurringDonationEl.value = transaction.distribution.donation || 0;
          updateRecurringDistributionTotal();
        }
        
        // Populate children dropdown and select the right child
        await populateChildrenDropdown();
        recurringChildEl.value = transaction.user._id;
        
        // Load accounts for this child and select the right account
        await loadChildAccounts(transaction.user._id);
        recurringAccountEl.value = transaction.account._id;
        
        // Update modal title and show delete button
        recurringModalTitleEl.textContent = 'Edit Recurring Transaction';
        deleteRecurringBtn.classList.remove('d-none');
        
        // Show modal
        recurringTransactionModal.show();
        
      } catch (error) {
        console.error('Error loading recurring transaction details:', error);
        alert('Error loading transaction details: ' + error.message);
      }
    }
    
    // Save recurring transaction
    async function saveRecurringTransaction() {
      try {
        // Validate form
        if (!recurringFormEl.checkValidity()) {
          recurringFormEl.reportValidity();
          return;
        }
        
        // For allowance type, validate distribution
        if (recurringTypeEl.value === 'allowance') {
          const spendingPercent = parseInt(recurringSpendingEl.value) || 0;
          const savingPercent = parseInt(recurringSavingEl.value) || 0;
          const donationPercent = parseInt(recurringDonationEl.value) || 0;
          
          const total = spendingPercent + savingPercent + donationPercent;
          
          if (total !== 100) {
            alert('Distribution percentages must add up to 100%');
            return;
          }
        }
        
        // Collect form data
        const transactionData = {
          name: recurringNameEl.value,
          description: recurringDescriptionEl.value,
          amount: parseFloat(recurringAmountEl.value),
          type: recurringTypeEl.value,
          frequency: recurringFrequencyEl.value,
          user: recurringChildEl.value,
          account: recurringAccountEl.value,
          nextDate: recurringNextDateEl.value,
          active: recurringActiveEl.checked
        };
        
        // Add distribution data for allowance type
        if (recurringTypeEl.value === 'allowance') {
          transactionData.distribution = {
            spending: parseInt(recurringSpendingEl.value) || 0,
            saving: parseInt(recurringSavingEl.value) || 0,
            donation: parseInt(recurringDonationEl.value) || 0
          };
        }
        
        // Determine if this is a create or update operation
        const isUpdate = currentEditRecurringId !== null;
        const url = isUpdate ? `${API_URL}/recurring/${currentEditRecurringId}` : `${API_URL}/recurring`;
        const method = isUpdate ? 'PUT' : 'POST';
        
        // Send to API
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to save recurring transaction');
        }
        
        // Close modal
        recurringTransactionModal.hide();
        
        // Refresh recurring transactions
        await loadRecurringTransactions();
        
        // Reset edit state
        currentEditRecurringId = null;
        
        // Success message
        alert(`Recurring transaction ${isUpdate ? 'updated' : 'created'} successfully!`);
        
      } catch (error) {
        console.error('Error saving recurring transaction:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Delete recurring transaction
    async function deleteRecurringTransaction() {
      try {
        if (!currentEditRecurringId) {
          throw new Error('No transaction selected for deletion');
        }
        
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this recurring transaction? This action cannot be undone.')) {
          return;
        }
        
        // Send to API
        const response = await fetch(`${API_URL}/recurring/${currentEditRecurringId}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete recurring transaction');
        }
        
        // Close modal
        recurringTransactionModal.hide();
        
        // Refresh recurring transactions
        await loadRecurringTransactions();
        
        // Reset edit state
        currentEditRecurringId = null;
        
        // Success message
        alert('Recurring transaction deleted successfully!');
        
      } catch (error) {
        console.error('Error deleting recurring transaction:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Approve transaction
    async function approveTransaction(transactionId) {
      try {
        const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            approved: true,
            approvedBy: currentUser.id
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Close modal
          approvalModal.hide();
          
          // Refresh pending transactions
          await loadPendingTransactions();
          
          // Refresh children list to show updated balances
          await loadChildren();
          
          // Success message
          alert('Transaction approved successfully!');
        } else {
          throw new Error(data.error || 'Failed to approve transaction');
        }
        
      } catch (error) {
        console.error('Error approving transaction:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Reject transaction
    async function rejectTransaction(transactionId) {
      try {
        const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Close modal
          approvalModal.hide();
          
          // Refresh pending transactions
          await loadPendingTransactions();
          
          // Success message
          alert('Transaction rejected successfully!');
        } else {
          throw new Error(data.error || 'Failed to reject transaction');
        }
        
      } catch (error) {
        console.error('Error rejecting transaction:', error);
        alert(`Error: ${error.message}`);
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
    
    // Format date for input field (YYYY-MM-DD)
    function formatDateForInput(dateString) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Get frequency text
    function getFrequencyText(frequency) {
      switch (frequency) {
        case 'daily':
          return 'Daily';
        case 'weekly':
          return 'Weekly';
        case 'monthly':
          return 'Monthly';
        case 'yearly':
          return 'Yearly';
        default:
          return 'Custom';
      }
    }
    
    // Show quick transaction modal
    async function showQuickTransactionModal(childId, childName) {
      try {
        // Set modal title and child ID
        quickTransactionTitleEl.textContent = `Add Transaction for ${childName}`;
        quickTransactionChildIdEl.value = childId;
        
        // Reset form
        document.getElementById('quick-transaction-form').reset();
        
        // Load child's accounts
        const response = await fetch(`${API_URL}/accounts?userId=${childId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load accounts');
        }
        
        const accounts = data.data;
        
        // Clear existing options
        quickTransactionAccountEl.innerHTML = '';
        
        if (accounts.length === 0) {
          const option = document.createElement('option');
          option.textContent = 'No accounts available';
          quickTransactionAccountEl.appendChild(option);
          quickTransactionAccountEl.disabled = true;
          saveQuickTransactionBtn.disabled = true;
          return;
        }
        
        quickTransactionAccountEl.disabled = false;
        saveQuickTransactionBtn.disabled = false;
        
        // Add options for each account
        accounts.forEach(account => {
          const option = document.createElement('option');
          option.value = account._id;
          option.textContent = `${account.name} (${capitalizeFirstLetter(account.type)}) - ${formatCurrency(account.balance)}`;
          quickTransactionAccountEl.appendChild(option);
        });
        
        // Show modal
        quickTransactionModal.show();
        
      } catch (error) {
        console.error('Error loading accounts for quick transaction:', error);
        alert('Error loading accounts: ' + error.message);
      }
    }
    
    // Save quick transaction
    async function saveQuickTransaction() {
      try {
        // Validate form
        const form = document.getElementById('quick-transaction-form');
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        
        // Get form values
        const childId = quickTransactionChildIdEl.value;
        const description = quickTransactionDescriptionEl.value;
        const amount = parseFloat(quickTransactionAmountEl.value);
        const type = quickTransactionTypeEl.value;
        const accountId = quickTransactionAccountEl.value;
        
        if (!childId || !accountId) {
          alert('Missing required information');
          return;
        }
        
        // Disable save button and show loading
        saveQuickTransactionBtn.disabled = true;
        saveQuickTransactionBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
        
        // Create transaction
        const response = await fetch(`${API_URL}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            description,
            amount,
            type,
            account: accountId,
            approved: true, // Parent-created transactions are auto-approved
            approvedBy: currentUser.id
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to create transaction');
        }
        
        // Close modal
        quickTransactionModal.hide();
        
        // Refresh children list to show updated balances
        await loadChildren();
        
        // Refresh pending transactions (in case there are any effects)
        await loadPendingTransactions();
        
        // Success message
        alert(`Transaction "${description}" created successfully!`);
        
      } catch (error) {
        console.error('Error saving quick transaction:', error);
        alert(`Error: ${error.message}`);
      } finally {
        // Reset button state
        saveQuickTransactionBtn.disabled = false;
        saveQuickTransactionBtn.innerHTML = 'Save Transaction';
      }
    }
  });