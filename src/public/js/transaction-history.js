document.addEventListener('DOMContentLoaded', function() {
    const API_URL = '/api';
    
    // State
    let currentUser = null;
    let currentPage = 1;
    let currentFilters = {};
    let totalPages = 1;
    let totalTransactions = 0;
    
    // DOM Elements
    const filterForm = document.getElementById('filter-form');
    const searchInput = document.getElementById('search');
    const typeSelect = document.getElementById('type');
    const accountSelect = document.getElementById('account');
    const childSelect = document.getElementById('child');
    const childFilterContainer = document.getElementById('child-filter-container');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const pageSizeSelect = document.getElementById('page-size');
    const exportBtn = document.getElementById('export-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const tableBody = document.getElementById('transactions-table-body');
    const pagination = document.getElementById('pagination');
    const resultsInfo = document.getElementById('results-info');
    const emptyState = document.getElementById('empty-state');
    
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
            
            // Load user accounts and children for filter dropdowns
            await loadUserAccounts();
            await loadChildren();
            
            // Load initial transactions
            await loadTransactions();
            
            // Setup event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Failed to initialize transaction history');
        }
    }
    
    function setupEventListeners() {
        // Filter form submission
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            currentPage = 1;
            loadTransactions();
        });
        
        // Clear filters
        clearFiltersBtn.addEventListener('click', function() {
            filterForm.reset();
            currentFilters = {};
            currentPage = 1;
            loadTransactions();
        });
        
        // Page size change
        pageSizeSelect.addEventListener('change', function() {
            currentPage = 1;
            loadTransactions();
        });
        
        // Export button
        exportBtn.addEventListener('click', exportTransactions);
        
        // Real-time search (debounced)
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadTransactions();
            }, 500);
        });
    }
    
    async function loadUserAccounts() {
        try {
            const response = await fetch(`${API_URL}/accounts`);
            const data = await response.json();
            
            if (data.success) {
                // Clear existing options except "All Accounts"
                accountSelect.innerHTML = '<option value="">All Accounts</option>';
                
                // Add user's accounts
                data.data.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account._id;
                    option.textContent = `${account.name} (${account.type})`;
                    accountSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }
    
    async function loadChildren() {
        try {
            // Only show child filter for parents
            if (currentUser.role === 'parent') {
                childFilterContainer.style.display = 'block';
                
                const response = await fetch(`${API_URL}/users`);
                const data = await response.json();
                
                if (data.success) {
                    // Clear existing options except "All Children"
                    childSelect.innerHTML = '<option value="">All Children</option>';
                    
                    // Add children
                    data.data.forEach(user => {
                        if (user.role === 'child' && user.parent === currentUser.id) {
                            const option = document.createElement('option');
                            option.value = user._id;
                            const displayName = user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.name;
                            option.textContent = displayName;
                            childSelect.appendChild(option);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading children:', error);
        }
    }
    
    async function loadTransactions() {
        try {
            showLoading(true);
            
            // Build query parameters  
            const params = new URLSearchParams({
                page: currentPage,
                limit: pageSizeSelect.value,
                includeRejected: 'true'  // Include rejected transactions in history view
            });
            
            // Backend will automatically filter based on user role:
            // - Parents see their own + children's transactions
            // - Children see only their own transactions
            
            // Add filters
            if (searchInput.value.trim()) {
                params.append('search', searchInput.value.trim());
            }
            if (typeSelect.value) {
                params.append('type', typeSelect.value);
            }
            if (accountSelect.value) {
                params.append('accountId', accountSelect.value);
            }
            if (childSelect.value) {
                params.append('userId', childSelect.value);
            }
            if (startDateInput.value) {
                params.append('startDate', startDateInput.value);
            }
            if (endDateInput.value) {
                params.append('endDate', endDateInput.value);
            }
            
            const response = await fetch(`${API_URL}/transactions?${params}`);
            const data = await response.json();
            
            if (data.success) {
                displayTransactions(data.data);
                updatePagination(data.pagination, data.total);
                updateResultsInfo(data.count, data.total);
                
                // Show/hide empty state
                if (data.data.length === 0) {
                    tableBody.closest('.card').style.display = 'none';
                    pagination.style.display = 'none';
                    emptyState.classList.remove('d-none');
                } else {
                    tableBody.closest('.card').style.display = 'block';
                    pagination.style.display = 'flex';
                    emptyState.classList.add('d-none');
                }
            } else {
                showError(data.error || 'Failed to load transactions');
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            showError('Failed to load transactions');
        } finally {
            showLoading(false);
        }
    }
    
    function displayTransactions(transactions) {
        tableBody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.className = transaction.rejected ? 'transaction-row rejected-transaction' : 'transaction-row';
            
            // Format date
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // Format amount
            const isPositive = transaction.type === 'deposit' || transaction.type === 'interest';
            const amountClass = isPositive ? 'positive' : 'negative';
            const amountPrefix = isPositive ? '+' : '-';
            const formattedAmount = formatCurrency(Math.abs(transaction.amount));
            
            // Format status
            let statusClass, statusText;
            if (transaction.rejected) {
                statusClass = 'danger';
                statusText = 'Rejected';
            } else if (transaction.approved) {
                statusClass = 'success';
                statusText = 'Approved';
            } else {
                statusClass = 'warning';
                statusText = 'Pending';
            }
            
            // Capitalize transaction type
            const typeText = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
            
            // Get user display name
            const userDisplayName = transaction.account?.owner 
                ? (transaction.account.owner.firstName && transaction.account.owner.lastName 
                    ? `${transaction.account.owner.firstName} ${transaction.account.owner.lastName}`
                    : transaction.account.owner.name)
                : 'Unknown User';
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${transaction.description || 'N/A'}</td>
                <td>${userDisplayName}</td>
                <td>${transaction.account?.name || 'Unknown Account'}</td>
                <td>${typeText}</td>
                <td class="text-end">
                    <span class="transaction-amount ${amountClass}">
                        ${amountPrefix}${formattedAmount}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    function updatePagination(paginationData, total) {
        pagination.innerHTML = '';
        
        if (!paginationData || total <= parseInt(pageSizeSelect.value)) {
            return;
        }
        
        const limit = parseInt(pageSizeSelect.value);
        totalPages = Math.ceil(total / limit);
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        `;
        pagination.appendChild(prevLi);
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            const firstLi = document.createElement('li');
            firstLi.className = 'page-item';
            firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
            pagination.appendChild(firstLi);
            
            if (startPage > 2) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(ellipsisLi);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            pagination.appendChild(pageLi);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                ellipsisLi.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(ellipsisLi);
            }
            
            const lastLi = document.createElement('li');
            lastLi.className = 'page-item';
            lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
            pagination.appendChild(lastLi);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        `;
        pagination.appendChild(nextLi);
        
        // Add click event listeners
        pagination.addEventListener('click', function(e) {
            e.preventDefault();
            const pageLink = e.target.closest('[data-page]');
            if (pageLink && !pageLink.closest('.disabled')) {
                const page = parseInt(pageLink.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    loadTransactions();
                }
            }
        });
    }
    
    function updateResultsInfo(count, total) {
        const start = (currentPage - 1) * parseInt(pageSizeSelect.value) + 1;
        const end = Math.min(start + count - 1, total);
        
        resultsInfo.textContent = `Showing ${start}-${end} of ${total} transactions`;
        totalTransactions = total;
    }
    
    async function exportTransactions() {
        try {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Exporting...';
            
            // Build query parameters for export (all results, no pagination)
            const params = new URLSearchParams({
                limit: 10000 // Large limit to get all results
            });
            
            // Backend automatically handles parent-child filtering
            
            // Add current filters
            if (searchInput.value.trim()) {
                params.append('search', searchInput.value.trim());
            }
            if (typeSelect.value) {
                params.append('type', typeSelect.value);
            }
            if (accountSelect.value) {
                params.append('accountId', accountSelect.value);
            }
            if (childSelect.value) {
                params.append('userId', childSelect.value);
            }
            if (startDateInput.value) {
                params.append('startDate', startDateInput.value);
            }
            if (endDateInput.value) {
                params.append('endDate', endDateInput.value);
            }
            
            const response = await fetch(`${API_URL}/transactions?${params}`);
            const data = await response.json();
            
            if (data.success) {
                downloadCSV(data.data);
            } else {
                showError('Failed to export transactions');
            }
        } catch (error) {
            console.error('Export error:', error);
            showError('Failed to export transactions');
        } finally {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="bi bi-download me-2"></i>Export CSV';
        }
    }
    
    function downloadCSV(transactions) {
        const headers = ['Date', 'Description', 'User', 'Account', 'Type', 'Amount', 'Status'];
        const csvContent = [
            headers.join(','),
            ...transactions.map(transaction => {
                const userDisplayName = transaction.account?.owner 
                    ? (transaction.account.owner.firstName && transaction.account.owner.lastName 
                        ? `${transaction.account.owner.firstName} ${transaction.account.owner.lastName}`
                        : transaction.account.owner.name)
                    : 'Unknown User';
                
                return [
                    new Date(transaction.date).toLocaleDateString(),
                    `"${transaction.description || 'N/A'}"`,
                    `"${userDisplayName}"`,
                    `"${transaction.account?.name || 'Unknown Account'}"`,
                    transaction.type,
                    transaction.amount,
                    transaction.approved ? 'Approved' : 'Pending'
                ].join(',');
            })
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    function showLoading(show) {
        loadingSpinner.style.display = show ? 'block' : 'none';
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
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
});