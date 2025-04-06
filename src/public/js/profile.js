document.addEventListener('DOMContentLoaded', function() {
    // Base API URL
    const API_URL = '/api';
    
    // DOM elements
    const userInfoEl = document.getElementById('user-info');
    const profileFormEl = document.getElementById('profile-form');
    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const roleEl = document.getElementById('role');
    const dobEl = document.getElementById('dob');
    const phoneEl = document.getElementById('phone');
    const parentInfoContainerEl = document.getElementById('parent-info-container');
    const childrenContainerEl = document.getElementById('children-container');
    const accountsListEl = document.getElementById('accounts-list');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const dashboardLinkEl = document.getElementById('dashboard-link');
    
    // Current user
    let currentUser = null;
    
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

        // Set the proper dashboard link based on user role
        const dashboardPath = currentUser.role === 'parent' ? '/parent-dashboard.html' : '/dashboard.html';
        dashboardLinkEl.href = dashboardPath;

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
        
        // 2. Get full user details
        await loadUserDetails(currentUser.id);
        
        // 3. Load accounts
        await loadAccounts(currentUser.id);
        
        // 4. For parent users, load children
        if (currentUser.role === 'parent') {
          await loadChildren();
        }
        
        // 5. Set up form submission event
        setupEventListeners();
        
      } catch (error) {
        console.error('Initialization error:', error);
        alert('Error loading data. See console for details.');
      }
    }
    
    // Set up event listeners
    function setupEventListeners() {
      // Form submission
      profileFormEl.addEventListener('submit', async function(event) {
        event.preventDefault();
        await saveProfile();
      });
    }
    
    // Load user details
    async function loadUserDetails(userId) {
      try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        const data = await response.json();
        
        if (data.success) {
          const user = data.data;
          
          // Populate form fields
          nameEl.value = user.name;
          emailEl.value = user.email;
          roleEl.value = capitalizeFirstLetter(user.role);
          
          // Load date of birth if available
          if (user.dateOfBirth) {
            dobEl.value = formatDateForInput(user.dateOfBirth);
            
            // Make date of birth field readonly for child users
            if (user.role === 'child') {
              dobEl.readOnly = true;
              dobEl.classList.add('readonly-field');
              // Add explanatory text
              const dobParent = dobEl.parentElement;
              if (!dobParent.querySelector('.form-text')) {
                const helpText = document.createElement('div');
                helpText.className = 'form-text';
                helpText.textContent = 'Date of birth can only be changed by your parent';
                dobParent.appendChild(helpText);
              }
            }
          }
          
          // Load phone if available
          if (user.phone) {
            phoneEl.value = user.phone;
          }
          
          // If user is a child, load parent info
          if (user.role === 'child' && user.parent) {
            await loadParentInfo(user.parent);
          }
        } else {
          throw new Error(data.error || 'Failed to load user details');
        }
      } catch (error) {
        console.error('Error loading user details:', error);
        alert('Error loading user profile. Please try again later.');
      }
    }
    
    // Load parent information for child users
    async function loadParentInfo(parentId) {
      try {
        const response = await fetch(`${API_URL}/users/${parentId}`);
        const data = await response.json();
        
        if (data.success) {
          const parent = data.data;
          
          parentInfoContainerEl.innerHTML = `
            <label class="col-sm-3 col-form-label">Parent</label>
            <div class="col-sm-9">
              <input type="text" class="form-control readonly-field" value="${parent.name}" readonly>
              <div class="form-text">${parent.email}</div>
            </div>
          `;
        }
      } catch (error) {
        console.error('Error loading parent info:', error);
        parentInfoContainerEl.innerHTML = `
          <label class="col-sm-3 col-form-label">Parent</label>
          <div class="col-sm-9">
            <input type="text" class="form-control readonly-field" value="Unable to load parent info" readonly>
          </div>
        `;
      }
    }
    
    // Load accounts
    async function loadAccounts(userId) {
      try {
        const response = await fetch(`${API_URL}/accounts?userId=${userId}`);
        const data = await response.json();
        
        if (data.success) {
          const accounts = data.data;
          
          if (accounts.length === 0) {
            accountsListEl.innerHTML = `
              <div class="text-center">
                <p class="mb-0">No accounts found</p>
              </div>
            `;
            return;
          }
          
          accountsListEl.innerHTML = accounts.map(account => `
            <div class="mb-3">
              <h6>${account.name}</h6>
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="badge bg-secondary">${capitalizeFirstLetter(account.type)}</span>
                  ${account.interestRate > 0 ? `<span class="badge bg-info">${account.interestRate}% Interest</span>` : ''}
                </div>
                <div class="h5 mb-0">${formatCurrency(account.balance)}</div>
              </div>
            </div>
            ${accounts.indexOf(account) < accounts.length - 1 ? '<hr>' : ''}
          `).join('');
        } else {
          throw new Error(data.error || 'Failed to load accounts');
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
        accountsListEl.innerHTML = `
          <div class="text-center">
            <p class="text-danger mb-0">Error loading accounts</p>
          </div>
        `;
      }
    }
    
    // Load children (for parent users)
    async function loadChildren() {
      try {
        const response = await fetch(`${API_URL}/users`);
        const data = await response.json();
        
        if (data.success) {
          // Filter for children
          const children = data.data.filter(user => user.role === 'child');
          
          if (children.length === 0) {
            childrenContainerEl.innerHTML = '';
            return;
          }
          
          // Create children container
          childrenContainerEl.innerHTML = `
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Your Children</h5>
              </div>
              <div class="card-body">
                <div class="row" id="children-list">
                  ${children.map(child => `
                    <div class="col-md-6 mb-3">
                      <div class="card h-100">
                        <div class="card-body">
                          <h5 class="card-title">${child.name}</h5>
                          <p class="card-text">
                            <small class="text-muted">${child.email}</small>
                          </p>
                          <a href="/child-detail.html?id=${child._id}" class="btn btn-sm btn-outline-primary">View Details</a>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        } else {
          throw new Error(data.error || 'Failed to load children');
        }
      } catch (error) {
        console.error('Error loading children:', error);
        childrenContainerEl.innerHTML = '';
      }
    }
    
    // Save profile
    async function saveProfile() {
      try {
        // Collect form data
        const profileData = {
          // Fields to update
          phone: phoneEl.value || null
        };
        
        // Only include dateOfBirth for parent users or if the field isn't readonly
        if (currentUser.role === 'parent' && !dobEl.readOnly) {
          profileData.dateOfBirth = dobEl.value || null;
        }
        
        // Update the user
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileData)
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('Profile updated successfully!');
        } else {
          throw new Error(data.error || 'Failed to update profile');
        }
      } catch (error) {
        console.error('Error saving profile:', error);
        alert(`Error: ${error.message}`);
      }
    }
    
    // Format date for input field (YYYY-MM-DD)
    function formatDateForInput(dateString) {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
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