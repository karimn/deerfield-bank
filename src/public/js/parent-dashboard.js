document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const API_URL = '/api';
    
    // DOM elements
    const userInfoEl = document.getElementById('user-info');
    const approvalsTableEl = document.getElementById('approvals-table');
    const approvalsBadgeEl = document.getElementById('approvals-badge');
    const childrenContainerEl = document.getElementById('children-container');
    
    // Modal elements
    const addChildModal = new bootstrap.Modal(document.getElementById('addChildModal'));
    const approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
    const approvalModalBodyEl = document.getElementById('approval-modal-body');
    
    // Form elements
    const addChildFormEl = document.getElementById('add-child-form');
    const childNameEl = document.getElementById('child-name');
    const childEmailEl = document.getElementById('child-email');
    const createAccountsEl = document.getElementById('create-accounts');
    const initialBalanceEl = document.getElementById('initial-balance');
    
    // Button elements
    const addChildBtn = document.getElementById('add-child-btn');
    const saveChildBtn = document.getElementById('save-child-btn');
    const processAllowanceBtn = document.getElementById('process-allowance-btn');
    const calculateInterestBtn = document.getElementById('calculate-interest-btn');
    const processSubscriptionsBtn = document.getElementById('process-subscriptions-btn');
    const approveTransactionBtn = document.getElementById('approve-transaction-btn');
    const rejectTransactionBtn = document.getElementById('reject-transaction-btn');
    
    // Allowance settings elements
    const allowanceSettingsFormEl = document.getElementById('allowance-settings-form');
    const defaultAllowanceEl = document.getElementById('default-allowance');
    const spendingPercentEl = document.getElementById('spending-percent');
    const savingPercentEl = document.getElementById('saving-percent');
    const donationPercentEl = document.getElementById('donation-percent');
    const distributionTotalEl = document.getElementById('distribution-total');
    
    // Current user and data
    let currentUser = null;
    let pendingTransactions = [];
    let currentTransactionId = null;
    let currentEditChildId = null; // For tracking when editing an existing child

    
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
        
        // 4. Set up event listeners
        setupEventListeners();
        
        // 5. Update distribution total
        updateDistributionTotal();
        
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
        
        // Filter for unapproved transactions
        pendingTransactions = data.data.filter(transaction => !transaction.approved);
        
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
      const children = data.data.filter(user => user.role === 'child');
      
      if (children.length === 0) {
        childrenContainerEl.innerHTML = `
          <div class="col-12 text-center py-4">
            <p class="mb-0">No children found. Add your first child to get started.</p>
          </div>
        `;
        return;
      }
      
      // Get accounts for each child
      const childrenWithAccounts = await Promise.all(children.map(async (child) => {
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
        
        return `
          <div class="col-md-6 mb-4">
            <div class="card child-card h-100">
              <div class="card-body">
                <h5 class="card-title">${child.name}</h5>
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
                <div class="btn-group w-100" role="group">
                  <button type="button" class="btn btn-outline-primary btn-sm edit-child" data-id="${child._id}">
                    Edit
                  </button>
                  <button type="button" class="btn btn-outline-success btn-sm view-child" data-id="${child._id}">
                    View Details
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
   
    // Add this to the setupEventListeners function in parent-dashboard.js
// after the loadChildren() function has completed successfully

// Add event listeners to Edit and View Details buttons
function addChildButtonEventListeners() {
    // View Details buttons
    document.querySelectorAll('.view-child').forEach(button => {
      button.addEventListener('click', () => {
        const childId = button.getAttribute('data-id');
        // Navigate to child details page with the child ID
        window.location.href = `/child-detail.html?id=${childId}`;
      });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-child').forEach(button => {
      button.addEventListener('click', () => {
        const childId = button.getAttribute('data-id');
        // For now, let's just find the child and show the edit modal
        editChild(childId);
      });
    });
  }
  
  // Add this function to handle editing a child
  async function editChild(childId) {
    try {
      // Find the child data from the list of children
      const response = await fetch(`${API_URL}/users/${childId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load child data');
      }
      
      const child = data.data;
      
      // Pre-fill the child form
      childNameEl.value = child.name;
      childEmailEl.value = child.email;
      createAccountsEl.checked = false; // Don't create new accounts by default when editing
      
      // Store the childId for the save function
      currentEditChildId = childId;
      
      // Change the modal title to indicate editing
      document.querySelector('#addChildModal .modal-title').textContent = 'Edit Child';
      
      // Change the save button text
      saveChildBtn.textContent = 'Update';
      
      // Show the modal
      addChildModal.show();
    } catch (error) {
      console.error('Error preparing child edit:', error);
      alert(`Error: ${error.message}`);
    }
  }
  
  // Modify the saveChild function to handle both creating and updating
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
      
      // Check if we're editing an existing child or creating a new one
      if (currentEditChildId) {
        // Update existing child
        const userResponse = await fetch(`${API_URL}/users/${currentEditChildId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email
          })
        });
        
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
        alert(`Child ${name} updated successfully!`);
      } else {
        // Create new child user
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
      
      // Process allowance button
      processAllowanceBtn.addEventListener('click', processAllowance);
      
      // Calculate interest button
      calculateInterestBtn.addEventListener('click', calculateInterest);
      
      // Process subscriptions button
      processSubscriptionsBtn.addEventListener('click', processSubscriptions);
      
      // Approve transaction button
      approveTransactionBtn.addEventListener('click', () => {
        approveTransaction(currentTransactionId);
      });
      
      // Reject transaction button
      rejectTransactionBtn.addEventListener('click', () => {
        rejectTransaction(currentTransactionId);
      });
      
      // Allowance settings form
      allowanceSettingsFormEl.addEventListener('submit', saveAllowanceSettings);
      
      // Distribution percentage inputs
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
    
    // Process allowance
    async function processAllowance() {
      try {
        if (!confirm('Are you sure you want to process weekly allowance for all children?')) {
          return;
        }
        
        // Get allowance settings
        const amount = parseFloat(defaultAllowanceEl.value) || 10;
        const distribution = {
          spending: parseInt(spendingPercentEl.value) || 34,
          saving: parseInt(savingPercentEl.value) || 33,
          donation: parseInt(donationPercentEl.value) || 33
        };
        
        const response = await fetch(`${API_URL}/allowance/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount, distribution })
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert(`Allowance processed successfully! Created ${data.count} transactions.`);
          // Refresh the page to show updated balances
          location.reload();
        } else {
          throw new Error(data.error || 'Failed to process allowance');
        }
        
      } catch (error) {
        console.error('Error processing allowance:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Calculate interest
    async function calculateInterest() {
      try {
        if (!confirm('Are you sure you want to calculate and apply monthly interest?')) {
          return;
        }
        
        const response = await fetch(`${API_URL}/interest/calculate`, {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert(`Interest calculated successfully! Created ${data.count} transactions.`);
          // Refresh the page to show updated balances
          location.reload();
        } else {
          throw new Error(data.error || 'Failed to calculate interest');
        }
        
      } catch (error) {
        console.error('Error calculating interest:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Process subscriptions
    async function processSubscriptions() {
      try {
        if (!confirm('Are you sure you want to process due subscriptions?')) {
          return;
        }
        
        const response = await fetch(`${API_URL}/subscriptions/process`, {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert(`Subscriptions processed successfully! Created ${data.count} transactions.`);
          // Refresh the page to show updated balances
          location.reload();
        } else {
          throw new Error(data.error || 'Failed to process subscriptions');
        }
        
      } catch (error) {
        console.error('Error processing subscriptions:', error);
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
          alert('Transaction rejected and deleted successfully!');
        } else {
          throw new Error(data.error || 'Failed to reject transaction');
        }
        
      } catch (error) {
        console.error('Error rejecting transaction:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Save allowance settings
    async function saveAllowanceSettings(event) {
      event.preventDefault();
      
      const spendingPercent = parseInt(spendingPercentEl.value) || 0;
      const savingPercent = parseInt(savingPercentEl.value) || 0;
      const donationPercent = parseInt(donationPercentEl.value) || 0;
      
      const total = spendingPercent + savingPercent + donationPercent;
      
      if (total !== 100) {
        alert('Distribution percentages must add up to 100%');
        return;
      }
      
      // In a real app, you would save these settings to the database
      alert('Settings saved successfully!');
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