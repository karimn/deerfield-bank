document.addEventListener('DOMContentLoaded', function() {
    const API_URL = '/api';
    
    // State
    let currentUser = null;
    let children = [];
    let allowances = [];
    let selectedAllowance = null;
    
    // DOM Elements
    const processAllowanceBtn = document.getElementById('process-allowance-btn');
    const addAllowanceBtn = document.getElementById('add-allowance-btn');
    const saveAllowanceBtn = document.getElementById('save-allowance-btn');
    const allowanceModal = new bootstrap.Modal(document.getElementById('allowanceModal'));
    const allowanceForm = document.getElementById('allowance-form');
    
    // Sections
    const statsSection = document.getElementById('stats-section');
    const parentSection = document.getElementById('parent-section');
    const childSection = document.getElementById('child-section');
    const dashboardNav = document.getElementById('dashboard-nav');
    
    // Form elements
    const childSelect = document.getElementById('allowance-child');
    const childSelectContainer = document.getElementById('child-select-container');
    const amountInput = document.getElementById('allowance-amount');
    const useAgeFormulaCheck = document.getElementById('use-age-formula');
    const distributionInputs = document.getElementById('distribution-inputs');
    const distributionTotal = document.getElementById('distribution-total');
    const frequencySelect = document.getElementById('allowance-frequency');
    const startDateInput = document.getElementById('allowance-start-date');
    const activeCheck = document.getElementById('allowance-active');
    
    // History elements
    const historyFilter = document.getElementById('history-filter');
    const historyTableBody = document.getElementById('history-table-body');
    
    // Initialize
    init();
    
    async function init() {
        try {
            // Check authentication
            const authResponse = await fetch('/auth/check');
            const authData = await authResponse.json();
            
            if (!authData.isAuthenticated) {
                window.location.href = '/login.html';
                return;
            }
            
            currentUser = authData.user;
            
            // Update navigation based on role
            if (currentUser.role === 'parent') {
                dashboardNav.innerHTML = '<a class="nav-link" href="/parent-dashboard.html">Dashboard</a>';
                showParentInterface();
            } else {
                dashboardNav.innerHTML = '<a class="nav-link" href="/dashboard.html">Dashboard</a>';
                showChildInterface();
            }
            
            // Setup event listeners
            setupEventListeners();
            
            // Load initial data
            await loadData();
            
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Failed to initialize allowance management');
        }
    }
    
    function setupEventListeners() {
        // Process allowance button
        processAllowanceBtn.addEventListener('click', processWeeklyAllowance);
        
        // Add allowance button
        addAllowanceBtn.addEventListener('click', showAddAllowanceModal);
        
        // Save allowance button
        saveAllowanceBtn.addEventListener('click', saveAllowance);
        
        // Child selection change
        childSelect.addEventListener('change', onChildSelectChange);
        
        // Age formula checkbox
        useAgeFormulaCheck.addEventListener('change', updateAmountFromAge);
        
        // History filter
        historyFilter.addEventListener('change', loadAllowanceHistory);
        
        // Set default start date to today
        startDateInput.value = new Date().toISOString().split('T')[0];
    }
    
    function showParentInterface() {
        statsSection.style.display = 'block';
        parentSection.style.display = 'block';
        childSection.style.display = 'none';
    }
    
    function showChildInterface() {
        statsSection.style.display = 'none';
        parentSection.style.display = 'none';
        childSection.style.display = 'block';
        
        // Hide parent-only elements
        processAllowanceBtn.style.display = 'none';
        addAllowanceBtn.style.display = 'none';
    }
    
    async function loadData() {
        try {
            showLoading(true);
            
            if (currentUser.role === 'parent') {
                await Promise.all([
                    loadChildren(),
                    loadRecurringTransactions(),
                    loadStats()
                ]);
            } else {
                await loadChildAllowance();
            }
            
            await loadAllowanceHistory();
            
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load allowance data');
        } finally {
            showLoading(false);
        }
    }
    
    async function loadChildren() {
        try {
            const response = await fetch(`${API_URL}/users`);
            const data = await response.json();
            
            if (data.success) {
                children = data.data.filter(user => 
                    user.role === 'child' && user.parent === currentUser.id
                );
                
                // Update stats
                document.getElementById('total-children').textContent = children.length;
                
                // Populate child select
                childSelect.innerHTML = '<option value="">Select a child</option>';
                children.forEach(child => {
                    const option = document.createElement('option');
                    option.value = child._id;
                    const displayName = child.firstName && child.lastName 
                        ? `${child.firstName} ${child.lastName}` 
                        : child.name;
                    option.textContent = displayName;
                    option.dataset.dateOfBirth = child.dateOfBirth;
                    childSelect.appendChild(option);
                });
                
                // Load allowance cards for each child
                await loadChildrenAllowances();
            }
        } catch (error) {
            console.error('Error loading children:', error);
        }
    }
    
    async function loadRecurringTransactions() {
        try {
            const response = await fetch(`${API_URL}/recurring`);
            const data = await response.json();
            
            if (data.success) {
                allowances = data.data.filter(rt => rt.type === 'allowance');
                await updateAllowanceDisplay();
            }
        } catch (error) {
            console.error('Error loading recurring transactions:', error);
        }
    }
    
    async function loadChildrenAllowances() {
        const container = document.getElementById('children-allowances');
        container.innerHTML = '';
        
        for (const child of children) {
            const childAllowances = allowances.filter(a => a.user === child._id);
            const card = createChildAllowanceCard(child, childAllowances);
            container.appendChild(card);
        }
    }
    
    function createChildAllowanceCard(child, childAllowances) {
        const displayName = child.firstName && child.lastName 
            ? `${child.firstName} ${child.lastName}` 
            : child.name;
        
        const age = child.dateOfBirth ? calculateAge(new Date(child.dateOfBirth)) : 'N/A';
        const activeAllowance = childAllowances.find(a => a.active);
        
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        
        col.innerHTML = `
            <div class="card allowance-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">${displayName}</h5>
                            <span class="badge age-badge">Age ${age}</span>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="editChildAllowance('${child._id}')">
                                    <i class="bi bi-pencil me-2"></i>Edit
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="viewChildDetails('${child._id}')">
                                    <i class="bi bi-eye me-2"></i>View Details
                                </a></li>
                                ${activeAllowance ? `
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deactivateAllowance('${activeAllowance._id}')">
                                    <i class="bi bi-pause-circle me-2"></i>Pause Allowance
                                </a></li>
                                ` : ''}
                            </ul>
                        </div>
                    </div>
                    
                    ${activeAllowance ? `
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="fw-semibold">Current Allowance</span>
                                <span class="badge bg-success">Active</span>
                            </div>
                            <h4 class="text-primary mb-1">${formatCurrency(activeAllowance.amount)}</h4>
                            <small class="text-muted">${activeAllowance.frequency}</small>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted d-block mb-1">Distribution</small>
                            <div class="distribution-bar d-flex">
                                <div class="spending-segment" style="width: ${activeAllowance.distribution.spending}%"></div>
                                <div class="saving-segment" style="width: ${activeAllowance.distribution.saving}%"></div>
                                <div class="donation-segment" style="width: ${activeAllowance.distribution.donation}%"></div>
                            </div>
                            <div class="d-flex justify-content-between mt-1">
                                <small class="text-muted">
                                    <span class="spending-segment" style="width: 12px; height: 12px; display: inline-block; border-radius: 2px;"></span>
                                    Spending ${activeAllowance.distribution.spending}%
                                </small>
                                <small class="text-muted">
                                    <span class="saving-segment" style="width: 12px; height: 12px; display: inline-block; border-radius: 2px;"></span>
                                    Saving ${activeAllowance.distribution.saving}%
                                </small>
                                <small class="text-muted">
                                    <span class="donation-segment" style="width: 12px; height: 12px; display: inline-block; border-radius: 2px;"></span>
                                    Donation ${activeAllowance.distribution.donation}%
                                </small>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted">Next Payment</small>
                            <div>${formatDate(activeAllowance.nextDate)}</div>
                        </div>
                    ` : `
                        <div class="text-center py-4">
                            <i class="bi bi-plus-circle text-muted mb-2" style="font-size: 2rem;"></i>
                            <p class="text-muted mb-3">No active allowance</p>
                            <button class="btn btn-primary btn-sm" onclick="addAllowanceForChild('${child._id}')">
                                Set Up Allowance
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        return col;
    }
    
    async function loadChildAllowance() {
        try {
            const response = await fetch(`${API_URL}/recurring`);
            const data = await response.json();
            
            if (data.success) {
                const childAllowances = data.data.filter(rt => 
                    rt.type === 'allowance' && rt.user === currentUser.id
                );
                
                const container = document.getElementById('child-allowance-card');
                
                if (childAllowances.length > 0) {
                    const activeAllowance = childAllowances.find(a => a.active);
                    container.innerHTML = createChildOwnAllowanceCard(activeAllowance || childAllowances[0]);
                } else {
                    container.innerHTML = `
                        <div class="card">
                            <div class="card-body text-center py-5">
                                <i class="bi bi-currency-dollar text-muted mb-3" style="font-size: 3rem;"></i>
                                <h5 class="text-muted">No Allowance Set Up</h5>
                                <p class="text-muted">Ask your parent to set up an allowance for you!</p>
                            </div>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading child allowance:', error);
        }
    }
    
    function createChildOwnAllowanceCard(allowance) {
        return `
            <div class="card">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h5 class="card-title">My Allowance</h5>
                            <h2 class="text-primary mb-2">${formatCurrency(allowance.amount)}</h2>
                            <p class="text-muted mb-3">${allowance.frequency}</p>
                            
                            <div class="mb-3">
                                <small class="text-muted d-block mb-1">Distribution</small>
                                <div class="distribution-bar d-flex mb-2">
                                    <div class="spending-segment" style="width: ${allowance.distribution.spending}%"></div>
                                    <div class="saving-segment" style="width: ${allowance.distribution.saving}%"></div>
                                    <div class="donation-segment" style="width: ${allowance.distribution.donation}%"></div>
                                </div>
                                <div class="small text-muted">
                                    Spending: ${formatCurrency(allowance.amount * allowance.distribution.spending / 100)} (${allowance.distribution.spending}%) | 
                                    Saving: ${formatCurrency(allowance.amount * allowance.distribution.saving / 100)} (${allowance.distribution.saving}%) | 
                                    Donation: ${formatCurrency(allowance.amount * allowance.distribution.donation / 100)} (${allowance.distribution.donation}%)
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h6 class="card-title">Next Payment</h6>
                                    <p class="card-text h5 text-success">${formatDate(allowance.nextDate)}</p>
                                    
                                    <h6 class="card-title mt-3">Status</h6>
                                    <span class="badge ${allowance.active ? 'bg-success' : 'bg-warning'}">${allowance.active ? 'Active' : 'Paused'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async function loadStats() {
        try {
            // Calculate total weekly amount
            const weeklyTotal = allowances
                .filter(a => a.active && a.frequency === 'weekly')
                .reduce((sum, a) => sum + a.amount, 0);
            
            const monthlyTotal = weeklyTotal * 4.33; // Average weeks per month
            
            document.getElementById('total-weekly').textContent = formatCurrency(weeklyTotal);
            document.getElementById('monthly-total').textContent = formatCurrency(monthlyTotal);
            
            // Find next payment date
            const nextDates = allowances
                .filter(a => a.active)
                .map(a => new Date(a.nextDate))
                .sort((a, b) => a - b);
            
            if (nextDates.length > 0) {
                document.getElementById('next-date').textContent = formatDate(nextDates[0]);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    async function loadAllowanceHistory() {
        try {
            const days = parseInt(historyFilter.value);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const params = new URLSearchParams({
                type: 'deposit',
                search: 'allowance',
                startDate: startDate.toISOString().split('T')[0],
                limit: 50
            });
            
            const response = await fetch(`${API_URL}/transactions?${params}`);
            const data = await response.json();
            
            if (data.success) {
                displayAllowanceHistory(data.data);
            }
        } catch (error) {
            console.error('Error loading allowance history:', error);
        }
    }
    
    function displayAllowanceHistory(transactions) {
        historyTableBody.innerHTML = '';
        
        if (transactions.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No allowance history found</td>
                </tr>
            `;
            return;
        }
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const userDisplayName = transaction.account?.owner 
                ? (transaction.account.owner.firstName && transaction.account.owner.lastName 
                    ? `${transaction.account.owner.firstName} ${transaction.account.owner.lastName}`
                    : transaction.account.owner.name)
                : 'Unknown User';
            
            row.innerHTML = `
                <td>${formatDate(transaction.date)}</td>
                <td>${userDisplayName}</td>
                <td>${formatCurrency(transaction.amount)}</td>
                <td>
                    <small class="text-muted">
                        ${transaction.account?.name || 'N/A'}
                    </small>
                </td>
                <td>
                    <span class="badge bg-primary">${transaction.type}</span>
                </td>
                <td>
                    <span class="badge ${transaction.approved ? 'bg-success' : 'bg-warning'}">
                        ${transaction.approved ? 'Approved' : 'Pending'}
                    </span>
                </td>
            `;
            
            historyTableBody.appendChild(row);
        });
    }
    
    async function processWeeklyAllowance() {
        try {
            processAllowanceBtn.disabled = true;
            processAllowanceBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
            
            const response = await fetch(`${API_URL}/allowance/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(`Processed ${data.count} allowance transactions`);
                await loadAllowanceHistory();
            } else {
                showError(data.error || 'Failed to process allowances');
            }
        } catch (error) {
            console.error('Error processing allowance:', error);
            showError('Failed to process allowances');
        } finally {
            processAllowanceBtn.disabled = false;
            processAllowanceBtn.innerHTML = '<i class="bi bi-play-circle me-2"></i>Process Weekly Allowance';
        }
    }
    
    function showAddAllowanceModal() {
        selectedAllowance = null;
        document.getElementById('allowanceModalTitle').textContent = 'Add New Allowance';
        
        // Show child select for parents
        if (currentUser.role === 'parent') {
            childSelectContainer.style.display = 'block';
        } else {
            childSelectContainer.style.display = 'none';
        }
        
        // Reset form
        allowanceForm.reset();
        startDateInput.value = new Date().toISOString().split('T')[0];
        distributionInputs.innerHTML = '';
        
        allowanceModal.show();
    }
    
    async function onChildSelectChange() {
        const selectedOption = childSelect.selectedOptions[0];
        if (!selectedOption || !selectedOption.value) return;
        
        // Update age-based calculation if enabled
        if (useAgeFormulaCheck.checked) {
            updateAmountFromAge();
        }
        
        // Load child's accounts for distribution
        await loadChildAccountsForDistribution(selectedOption.value);
    }
    
    function updateAmountFromAge() {
        const selectedOption = childSelect.selectedOptions[0];
        if (!selectedOption || !selectedOption.dataset.dateOfBirth) return;
        
        if (useAgeFormulaCheck.checked) {
            const age = calculateAge(new Date(selectedOption.dataset.dateOfBirth));
            const calculatedAmount = Math.floor(age) * 1.2;
            amountInput.value = calculatedAmount.toFixed(2);
        }
    }
    
    async function loadChildAccountsForDistribution(childId) {
        try {
            const response = await fetch(`${API_URL}/accounts`);
            const data = await response.json();
            
            if (data.success) {
                const childAccounts = data.data.filter(account => account.owner === childId);
                createDistributionInputs(childAccounts);
            }
        } catch (error) {
            console.error('Error loading child accounts:', error);
        }
    }
    
    function createDistributionInputs(accounts) {
        distributionInputs.innerHTML = '';
        
        accounts.forEach(account => {
            const div = document.createElement('div');
            div.className = 'mb-2';
            div.innerHTML = `
                <label class="form-label">${account.name} (%)</label>
                <input type="number" class="form-control distribution-input" 
                       data-account="${account._id}" 
                       data-type="${account.type}"
                       min="0" max="100" value="0" 
                       onchange="updateDistributionTotal()">
            `;
            distributionInputs.appendChild(div);
        });
        
        // Set default distribution if available
        const spendingInput = distributionInputs.querySelector('[data-type="spending"]');
        const savingInput = distributionInputs.querySelector('[data-type="saving"]');
        const donationInput = distributionInputs.querySelector('[data-type="donation"]');
        
        if (spendingInput) spendingInput.value = 34;
        if (savingInput) savingInput.value = 33;
        if (donationInput) donationInput.value = 33;
        
        updateDistributionTotal();
    }
    
    function updateDistributionTotal() {
        const inputs = distributionInputs.querySelectorAll('.distribution-input');
        let total = 0;
        
        inputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        
        distributionTotal.textContent = total;
        distributionTotal.style.color = total === 100 ? '#198754' : '#dc3545';
    }
    
    async function saveAllowance() {
        try {
            // Validate form
            if (!allowanceForm.checkValidity()) {
                allowanceForm.reportValidity();
                return;
            }
            
            // Check distribution total
            const total = parseInt(distributionTotal.textContent);
            if (total !== 100) {
                showError('Distribution must total 100%');
                return;
            }
            
            // Collect distribution data
            const distribution = {};
            const distributionInputsElements = distributionInputs.querySelectorAll('.distribution-input');
            distributionInputsElements.forEach(input => {
                const type = input.dataset.type;
                distribution[type] = parseInt(input.value) || 0;
            });
            
            const allowanceData = {
                name: `${childSelect.selectedOptions[0]?.textContent || currentUser.name} Allowance`,
                description: `${frequencySelect.value} allowance`,
                amount: parseFloat(amountInput.value),
                type: 'allowance',
                frequency: frequencySelect.value,
                user: currentUser.role === 'parent' ? childSelect.value : currentUser.id,
                distribution: distribution,
                nextDate: startDateInput.value,
                active: activeCheck.checked
            };
            
            saveAllowanceBtn.disabled = true;
            saveAllowanceBtn.textContent = 'Saving...';
            
            const url = selectedAllowance 
                ? `${API_URL}/recurring/${selectedAllowance._id}`
                : `${API_URL}/recurring`;
            
            const method = selectedAllowance ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(allowanceData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(selectedAllowance ? 'Allowance updated successfully' : 'Allowance created successfully');
                allowanceModal.hide();
                await loadData();
            } else {
                showError(data.error || 'Failed to save allowance');
            }
        } catch (error) {
            console.error('Error saving allowance:', error);
            showError('Failed to save allowance');
        } finally {
            saveAllowanceBtn.disabled = false;
            saveAllowanceBtn.textContent = 'Save Allowance';
        }
    }
    
    // Global functions for onclick handlers
    window.editChildAllowance = function(childId) {
        const childAllowance = allowances.find(a => a.user === childId && a.active);
        if (childAllowance) {
            selectedAllowance = childAllowance;
            populateAllowanceForm(childAllowance);
            allowanceModal.show();
        }
    };
    
    window.viewChildDetails = function(childId) {
        window.location.href = `/child-detail.html?id=${childId}`;
    };
    
    window.addAllowanceForChild = function(childId) {
        showAddAllowanceModal();
        childSelect.value = childId;
        onChildSelectChange();
    };
    
    window.deactivateAllowance = function(allowanceId) {
        if (confirm('Are you sure you want to pause this allowance?')) {
            // Implementation for deactivating allowance
            // This would make an API call to update the allowance status
        }
    };
    
    window.updateDistributionTotal = updateDistributionTotal;
    
    function populateAllowanceForm(allowance) {
        document.getElementById('allowanceModalTitle').textContent = 'Edit Allowance';
        childSelect.value = allowance.user;
        amountInput.value = allowance.amount;
        frequencySelect.value = allowance.frequency;
        startDateInput.value = allowance.nextDate.split('T')[0];
        activeCheck.checked = allowance.active;
        
        onChildSelectChange().then(() => {
            // Set distribution values
            Object.keys(allowance.distribution).forEach(type => {
                const input = distributionInputs.querySelector(`[data-type="${type}"]`);
                if (input) {
                    input.value = allowance.distribution[type];
                }
            });
            updateDistributionTotal();
        });
    }
    
    async function updateAllowanceDisplay() {
        if (currentUser.role === 'parent') {
            await loadChildrenAllowances();
            await loadStats();
        }
    }
    
    // Utility functions
    function calculateAge(dateOfBirth) {
        const today = new Date();
        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
            age--;
        }
        
        return age;
    }
    
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
    
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    function showLoading(show) {
        const loadingSpinner = document.getElementById('loading-spinner');
        if (show) {
            loadingSpinner.classList.remove('d-none');
        } else {
            loadingSpinner.classList.add('d-none');
        }
    }
    
    function showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    function showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
});