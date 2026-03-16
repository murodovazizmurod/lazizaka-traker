// Constants
const ELEMENTS = {
    totalBalance: document.getElementById('totalBalance'),
    balanceStatus: document.getElementById('balanceStatus'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpenses: document.getElementById('totalExpenses'),
    totalDebt: document.getElementById('totalDebt'),
    totalLoan: document.getElementById('totalLoan'),
    transactionList: document.getElementById('transactionList'),
    modal: document.getElementById('transactionModal'),
    modalTitle: document.getElementById('modalTitle'),
    transForm: document.getElementById('transactionForm'),
    transType: document.getElementById('transType'),
    transId: document.getElementById('transId'),
    saveBtn: document.getElementById('saveBtn')
};

let transactions = [];

// Helper for API calls
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('auth_token');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(endpoint, options);
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
        return;
    }
    return response.ok ? (method === 'DELETE' ? true : response.json()) : null;
}

// UI Functions
function showModal(type, id = null) {
    ELEMENTS.transForm.reset();
    ELEMENTS.transId.value = id || '';
    ELEMENTS.transType.value = type;

    const titles = {
        income: id ? 'Редактировать доход' : 'Добавить доход',
        expense: id ? 'Редактировать расход' : 'Добавить расход',
        debt: id ? 'Редактировать долг' : 'Я занял (Долг)',
        loan: id ? 'Редактировать заем' : 'Я дал в долг',
        repay_debt: id ? 'Редактировать выплату' : 'Я вернул долг',
        collect_loan: id ? 'Редактировать возврат' : 'Мне вернули долг'
    };

    if (id) {
        const t = transactions.find(t => t.id === id);
        if (t) {
            document.getElementById('amount').value = t.amount;
            document.getElementById('description').value = t.description;
            ELEMENTS.transType.value = t.type;
        }
    }

    // Update save button color
    ELEMENTS.saveBtn.className = 'btn';
    const currentType = ELEMENTS.transType.value;
    if (currentType === 'income') ELEMENTS.saveBtn.classList.add('btn-income');
    else if (currentType === 'expense') ELEMENTS.saveBtn.classList.add('btn-expense');
    else ELEMENTS.saveBtn.classList.add('btn-primary');

    ELEMENTS.modalTitle.innerText = titles[currentType];
    ELEMENTS.modal.style.display = 'flex';
    document.getElementById('amount').focus();
}

function closeModal() {
    ELEMENTS.modal.style.display = 'none';
}

async function loadData() {
    const data = await apiRequest('/api/transactions');
    if (data) {
        transactions = data;
        updateSummary();
        renderTransactions();
    }
}

function updateSummary() {
    const totals = transactions.reduce((acc, t) => {
        const type = t.type ? t.type.toLowerCase() : 'unknown';
        const amount = parseFloat(t.amount || 0);
        
        if (type === 'income') acc.income += amount;
        else if (type === 'expense') acc.expense += amount;
        else if (type === 'debt') acc.debt += amount;
        else if (type === 'loan') acc.loan += amount;
        else if (type === 'repay_debt') {
            acc.debt -= amount; // Reduce what I owe
            acc.expense += amount; // Treat as outgoing cash
        }
        else if (type === 'collect_loan') {
            acc.loan -= amount; // Reduce what is owed to me
            acc.income += amount; // Treat as incoming cash
        }
        return acc;
    }, { income: 0, expense: 0, debt: 0, loan: 0 });

    const balance = totals.income - totals.expense;
    
    ELEMENTS.totalBalance.innerText = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    if (balance >= 0) {
        ELEMENTS.balanceStatus.innerText = 'Профицит';
        ELEMENTS.balanceStatus.className = 'status-indicator status-surplus';
    } else {
        ELEMENTS.balanceStatus.innerText = 'Дефицит';
        ELEMENTS.balanceStatus.className = 'status-indicator status-deficit';
    }

    ELEMENTS.totalIncome.innerText = `$${totals.income.toLocaleString('en-US')}`;
    ELEMENTS.totalExpenses.innerText = `$${totals.expense.toLocaleString('en-US')}`;
    ELEMENTS.totalDebt.innerText = `$${totals.debt.toLocaleString('en-US')}`;
    ELEMENTS.totalLoan.innerText = `$${totals.loan.toLocaleString('en-US')}`;
}

let deleteConfirmState = null;

function renderTransactions() {
    const emptyState = document.getElementById('emptyState');
    if (transactions.length === 0) {
        ELEMENTS.transactionList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const typeLabels = {
        income: 'Доход',
        expense: 'Расход',
        debt: 'Взял в долг',
        loan: 'Дал в долг',
        repay_debt: 'Вернул долг',
        collect_loan: 'Получил возврат'
    };

    ELEMENTS.transactionList.innerHTML = transactions
        .slice().reverse()
        .map(t => {
            const isNeg = t.type === 'expense' || t.type === 'loan';
            const sign = isNeg ? '-' : '+';
            const date = new Date(t.date);
            const dateStr = date.toLocaleDateString('ru-RU');
            const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            const isConfirming = deleteConfirmState === t.id;

            return `
                <tr class="time-row">
                    <td>${dateStr} ${timeStr} <span class="type-tag">${typeLabels[t.type] || t.type || 'Транзакция'}</span></td>
                    <td style="text-align: right;">
                        <div class="action-btns">
                            <button class="btn" style="padding: 2px 8px; font-size: 0.7rem;" onclick="showModal('${t.type}', '${t.id}')">🖉</button>
                            <button class="btn" style="padding: 2px 8px; font-size: 0.7rem; color: ${isConfirming ? '#fff' : '#dc2626'}; background: ${isConfirming ? '#dc2626' : 'transparent'};" 
                                    onclick="deleteTransaction('${t.id}')">
                                ${isConfirming ? 'Удалить?' : '✕'}
                            </button>
                        </div>
                    </td>
                </tr>
                <tr class="main-row">
                    <td style="font-weight: 500; font-size: 1.1rem;">${t.description}</td>
                    <td style="text-align: right; font-size: 1.1rem;" class="${isNeg ? 'amount-neg' : 'amount-pos'}">
                        ${sign}$${parseFloat(t.amount).toLocaleString('en-US')}
                    </td>
                </tr>
            `;
        }).join('');
}

async function saveTransaction(e) {
    e.preventDefault();
    
    const id = ELEMENTS.transId.value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;
    const type = ELEMENTS.transType.value;

    const transactionData = {
        amount: parseFloat(amount),
        description,
        type,
        date: id ? transactions.find(t => t.id == id).date : new Date().toISOString()
    };

    if (id) {
        await apiRequest(`/api/transactions/${id}`, 'PUT', transactionData);
    } else {
        await apiRequest('/api/transactions', 'POST', transactionData);
    }
    
    closeModal();
    loadData();
}

async function deleteTransaction(id) {
    // Stringify ID if it's numeric to match the render state
    const normalizedId = typeof id === 'number' ? id : parseInt(id);

    if (deleteConfirmState === normalizedId) {
        await apiRequest(`/api/transactions/${normalizedId}`, 'DELETE');
        deleteConfirmState = null;
        loadData();
    } else {
        deleteConfirmState = normalizedId;
        renderTransactions();
        // Reset confirmation state after 3 seconds
        setTimeout(() => {
            if (deleteConfirmState === normalizedId) {
                deleteConfirmState = null;
                renderTransactions();
            }
        }, 3000);
    }
}

// Event Listeners
ELEMENTS.transForm.addEventListener('submit', saveTransaction);

window.onclick = function(event) {
    if (event.target == ELEMENTS.modal) {
        closeModal();
    }
}

// Initial Load
loadData();
