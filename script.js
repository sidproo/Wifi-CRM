// OmniNet CRM - Ultra Elite ISP Dashboard JavaScript
// Professional, Interactive, Production-Ready

class OmniNetCRM {
    constructor() {
        this.currentPage = 'dashboard';
        this.charts = {};
		this.firebase = null;
		this.firestore = null;
		this.storage = null;
		this.cachedPlans = null;
		this.cachedCustomers = null;
        this.init();
    }

    init() {
        this.hideLoadingScreen();
		this.setupFirebase();
        this.setupEventListeners();
        this.initializeCharts();
        this.setupSidebar();
        this.setupNavigation();
        this.setupMessaging();
        this.setupAIAssistant();
        this.setupFloatingActions();
        this.setupTableInteractions();
        this.setupFormValidation();
        this.setupAnimations();
    }

    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 2000);
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const mobileToggle = document.getElementById('mobileSidebarToggle');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        // Mobile open button
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.add('open');
            });
        }

        // Mobile sidebar
        if (window.innerWidth <= 1024 && sidebar) {
            document.addEventListener('click', (e) => {
                const withinSidebar = sidebar.contains(e.target);
                const clickedToggle = sidebarToggle?.contains(e.target) || mobileToggle?.contains(e.target);
                if (!withinSidebar && !clickedToggle) {
                    sidebar.classList.remove('open');
                }
            });
        }

        // Search functionality
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }

        // Notification button
        const notificationBtn = document.querySelector('.notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', this.showNotifications.bind(this));
        }

        // Settings button
        const settingsBtn = document.querySelector('.settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', this.showSettings.bind(this));
        }
    }

    setupSidebar() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });
    }

    setupNavigation() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.showPage(e.state.page);
            }
        });

        // Update breadcrumb
        this.updateBreadcrumb();
    }

    navigateToPage(page) {
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({ page }, '', url);

        // Show page
        this.showPage(page);
        this.updateBreadcrumb();

        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Close mobile sidebar
        if (window.innerWidth <= 1024) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }

    showPage(page) {
		// Hide all pages
		document.querySelectorAll('.page').forEach(p => {
			p.style.display = 'none';
			p.classList.remove('active');
		});

		// Resolve target element id
		const candidateIds = [`${page}Page`];
		if (page === 'ai-assistant') candidateIds.unshift('aiAssistantPage');
		const targetPage = candidateIds.map(id => document.getElementById(id)).find(Boolean);
		if (targetPage) {
			targetPage.style.display = 'block';
			targetPage.classList.add('active');
			this.currentPage = page;

			// Update page title
			const pageTitle = document.getElementById('pageTitle');
			if (pageTitle) {
				pageTitle.textContent = this.getPageTitle(page);
			}

			// Initialize page-specific functionality
			this.initializePage(page);
		}
    }

    getPageTitle(page) {
        const titles = {
            'dashboard': 'Dashboard Overview',
            'analytics': 'Analytics & Reports',
            'customers': 'Customer Management',
            'plans': 'Service Plans',
            'payments': 'Payment Management',
            'messaging': 'Omni Messaging Hub',
            'notifications': 'Notifications Center',
            'tickets': 'Support Tickets',
			'ai-assistant': 'AI Assistant'
        };
        return titles[page] || 'Dashboard';
    }

    updateBreadcrumb() {
        const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
        if (breadcrumbCurrent) {
            breadcrumbCurrent.textContent = this.getPageTitle(this.currentPage);
        }
    }

    initializePage(page) {
        switch (page) {
            case 'dashboard':
                this.initializeDashboard();
                break;
            case 'analytics':
                this.initializeAnalytics();
                break;
            case 'customers':
				this.initializeCustomers();
                break;
            case 'plans':
				this.initializePlans();
                break;
			case 'payments':
				this.initializePayments();
				break;
            case 'messaging':
                this.initializeMessaging();
                break;
            case 'ai-assistant':
                this.initializeAIAssistant();
                break;
        }
    }

	// Firebase setup and data helpers
	setupFirebase() {
		try {
			if (window.firebase && window.firebase.apps) {
				const isInitialized = window.firebase.apps.length > 0;
				if (!isInitialized) {
					if (!window.FIREBASE_CONFIG) {
						console.warn('FIREBASE_CONFIG not found on window. Firebase features will be disabled.');
						return;
					}
					window.firebase.initializeApp(window.FIREBASE_CONFIG);
				}
				this.firebase = window.firebase;
				this.firestore = this.firebase.firestore();
				this.storage = this.firebase.storage ? this.firebase.storage() : null;
			} else {
				console.warn('Firebase SDK not detected. Include Firebase scripts to enable data features.');
			}
		} catch (err) {
			console.error('Failed to initialize Firebase:', err);
		}
	}

	async fetchPlans(forceRefresh = false) {
		if (this.cachedPlans && !forceRefresh) return this.cachedPlans;
		if (!this.firestore) return [];
		const snapshot = await this.firestore.collection('plans').orderBy('name').get();
		this.cachedPlans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
		return this.cachedPlans;
	}

	async fetchCustomers(forceRefresh = false) {
		if (this.cachedCustomers && !forceRefresh) return this.cachedCustomers;
		if (!this.firestore) return [];
		const snapshot = await this.firestore.collection('customers').orderBy('name').get();
		this.cachedCustomers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
		return this.cachedCustomers;
	}

	async addCustomerRecord(customer) {
		if (!this.firestore) throw new Error('Firestore not available');
		const ref = await this.firestore.collection('customers').add({
			...customer,
			createdAt: this.firebase.firestore.FieldValue.serverTimestamp()
		});
		this.cachedCustomers = null;
		return ref.id;
	}

	async addPaymentRecord(payment) {
		if (!this.firestore) throw new Error('Firestore not available');
		const ref = await this.firestore.collection('payments').add({
			...payment,
			createdAt: this.firebase.firestore.FieldValue.serverTimestamp()
		});
		return ref.id;
	}

	// UI: Plan picker modal
	ensurePlanPickerContainer() {
		let container = document.getElementById('planPickerModal');
		if (container) return container;
		container = document.createElement('div');
		container.id = 'planPickerModal';
		container.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:none;align-items:center;justify-content:center;z-index:10000;';
		container.innerHTML = `
			<div style="background:#0b1220;color:#e2e8f0;border:1px solid #1f2a44;border-radius:12px;max-width:560px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
				<div style="padding:16px 20px;border-bottom:1px solid #1f2a44;display:flex;align-items:center;justify-content:space-between;">
					<h3 style="margin:0;font-size:18px;">Select a Plan</h3>
					<button id="planPickerClose" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;">×</button>
				</div>
				<div style="padding:12px 16px;">
					<input id="planSearchInput" placeholder="Search plans..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #233255;background:#0f172a;color:#e2e8f0;" />
				</div>
				<div id="planList" style="max-height:360px;overflow:auto;padding:4px 8px 16px 8px;"></div>
				<div style="padding:12px 16px;border-top:1px solid #1f2a44;text-align:right;">
					<button id="planPickerCancel" style="background:#334155;border:none;color:#e2e8f0;padding:8px 12px;border-radius:8px;cursor:pointer;">Cancel</button>
				</div>
			</div>
		`;
		document.body.appendChild(container);
		const close = () => container.style.display = 'none';
		container.querySelector('#planPickerClose').addEventListener('click', close);
		container.querySelector('#planPickerCancel').addEventListener('click', close);
		container.addEventListener('click', (e) => { if (e.target === container) close(); });
		return container;
	}

	async showPlanPicker(onSelect) {
		const container = this.ensurePlanPickerContainer();
		const planList = container.querySelector('#planList');
		planList.innerHTML = '<div style="padding:12px;color:#94a3b8;">Loading plans...</div>';
		container.style.display = 'flex';
		const plans = await this.fetchPlans(true).catch(() => []);
		if (!plans.length) {
			planList.innerHTML = '<div style="padding:12px;color:#ef4444;">No plans found.</div>';
			return;
		}
		const render = (items) => {
			planList.innerHTML = items.map(p => `
				<button data-id="${p.id}" style="width:100%;text-align:left;margin:6px 0;padding:10px 12px;border-radius:10px;border:1px solid #1f2a44;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
					<span>
						<strong>${p.name || 'Unnamed Plan'}</strong>
						<div style="font-size:12px;color:#94a3b8;">$${(p.price ?? 0).toLocaleString()} • ${p.speed || ''}</div>
					</span>
					<span style="color:#22d3ee;">Select</span>
				</button>
			`).join('');
			planList.querySelectorAll('button[data-id]').forEach(btn => {
				btn.addEventListener('click', () => {
					const plan = plans.find(x => x.id === btn.getAttribute('data-id'));
					container.style.display = 'none';
					onSelect && onSelect(plan);
				});
			});
		};
		render(plans);
		const search = container.querySelector('#planSearchInput');
		search.value = '';
		search.oninput = this.debounce(() => {
			const q = search.value.toLowerCase();
			render(plans.filter(p => JSON.stringify(p).toLowerCase().includes(q)));
		}, 150);
	}

	// Customers page
	initializeCustomers() {
		console.log('Initializing Customers page');
		const form = document.getElementById('addCustomerForm');
		const selectPlanBtn = document.getElementById('selectPlanForCustomer');
		const planInput = document.getElementById('customerPlanId');
		if (selectPlanBtn) {
			selectPlanBtn.addEventListener('click', async (e) => {
				e.preventDefault();
				await this.showPlanPicker((plan) => {
					if (planInput) planInput.value = plan.id;
					const planNameEl = document.getElementById('customerPlanName');
					if (planNameEl) planNameEl.textContent = plan.name || plan.id;
				});
			});
		}
		if (form) {
			form.addEventListener('submit', async (e) => {
				try {
					const data = new FormData(form);
					if (!data.get('planId')) {
						// require plan selection
						e.preventDefault();
						await this.showPlanPicker((plan) => {
							if (planInput) planInput.value = plan.id;
							form.querySelector('[name="planId"]').value = plan.id;
							form.requestSubmit();
						});
						return;
					}
					// Persist to Firestore if available
					if (this.firestore) {
						e.preventDefault();
						const customer = {
							name: data.get('name') || '',
							email: data.get('email') || '',
							phone: data.get('phone') || '',
							address: data.get('address') || '',
							planId: data.get('planId'),
							status: 'active'
						};
						const id = await this.addCustomerRecord(customer);
						this.showNotification(`Customer created (${customer.name || id})`, 'success');
						form.reset();
					}
				} catch (err) {
					this.showNotification('Failed to add customer', 'error');
					console.error(err);
				}
			});
		}
	}

	// Plans page
	initializePlans() {
		console.log('Initializing Plans page');
		// Optionally, populate a list if container exists
		const container = document.getElementById('plansListContainer');
		if (container) {
			this.fetchPlans(true).then(plans => {
				container.innerHTML = plans.map(p => `
					<div class="plan-row">
						<div class="name">${p.name || 'Unnamed'}</div>
						<div class="price">$${(p.price ?? 0).toLocaleString()}</div>
					</div>
				`).join('');
			}).catch(() => {
				container.innerHTML = '<div class="empty">Unable to load plans</div>';
			});
		}
	}

	// Payments page
	initializePayments() {
		console.log('Initializing Payments page');
		const customerSelect = document.getElementById('paymentCustomer');
		const planSelect = document.getElementById('paymentPlan');
		const amountInput = document.getElementById('paymentAmount');
		const dueDateInput = document.getElementById('paymentDueDate');
		const nameInput = document.getElementById('paymentCustomerName');
		const form = document.getElementById('addPaymentForm');

		const populateCustomersAndPlans = async () => {
			try {
				const [customers, plans] = await Promise.all([
					this.fetchCustomers(true),
					this.fetchPlans(true)
				]);
				if (customerSelect && !customerSelect.children.length) {
					customerSelect.innerHTML = '<option value="">Select customer</option>' + customers.map(c => `<option value="${c.id}">${c.name || c.id}</option>`).join('');
				}
				if (planSelect && !planSelect.children.length) {
					planSelect.innerHTML = '<option value="">Select plan</option>' + plans.map(p => `<option value="${p.id}">${p.name || p.id}</option>`).join('');
				}
			} catch (e) {
				console.warn('Failed to populate customers/plans', e);
			}
		};

		const syncFromSelections = () => {
			const selectedCustomerId = customerSelect ? customerSelect.value : '';
			const selectedPlanId = planSelect ? planSelect.value : '';
			const customer = (this.cachedCustomers || []).find(c => c.id === selectedCustomerId);
			const plan = (this.cachedPlans || []).find(p => p.id === selectedPlanId);
			if (nameInput && customer) nameInput.value = customer.name || '';
			if (amountInput && plan && plan.price != null) amountInput.value = Number(plan.price).toFixed(2);
			if (dueDateInput) dueDateInput.value = this.computeNextDueDate(plan) || '';
		};

		if (customerSelect) customerSelect.addEventListener('change', syncFromSelections);
		if (planSelect) planSelect.addEventListener('change', syncFromSelections);
		populateCustomersAndPlans().then(syncFromSelections);

		if (form) {
			form.addEventListener('submit', async (e) => {
				try {
					if (this.firestore) {
						e.preventDefault();
						const data = new FormData(form);
						const payment = {
							customerId: data.get('customerId') || (customerSelect ? customerSelect.value : ''),
							planId: data.get('planId') || (planSelect ? planSelect.value : ''),
							amount: Number(data.get('amount') || (amountInput ? amountInput.value : 0)) || 0,
							currency: data.get('currency') || 'USD',
							status: 'due',
							dueDate: data.get('dueDate') || (dueDateInput ? dueDateInput.value : ''),
							customerName: data.get('customerName') || (nameInput ? nameInput.value : '')
						};
						await this.addPaymentRecord(payment);
						this.showNotification('Payment recorded', 'success');
						form.reset();
					}
				} catch (err) {
					this.showNotification('Failed to add payment', 'error');
					console.error(err);
				}
			});
		}
	}

	computeNextDueDate(plan) {
		try {
			const today = new Date();
			if (plan && typeof plan.dueDayOfMonth === 'number') {
				const target = new Date(today.getFullYear(), today.getMonth(), plan.dueDayOfMonth);
				if (target <= today) target.setMonth(target.getMonth() + 1);
				return target.toISOString().slice(0, 10);
			}
			const cycleDays = (plan && plan.billingCycleDays) ? Number(plan.billingCycleDays) : 30;
			const due = new Date(today);
			due.setDate(due.getDate() + cycleDays);
			return due.toISOString().slice(0, 10);
		} catch (_) {
			return '';
		}
	}

    initializeDashboard() {
        // Initialize dashboard charts
        this.createRevenueChart();
        this.createCustomerChart();
        
        // Setup chart controls
        this.setupChartControls();
        
        // Load recent activity
        this.loadRecentActivity();
    }

    initializeCharts() {
        // Chart.js configuration
        Chart.defaults.font.family = 'Inter, sans-serif';
        Chart.defaults.color = '#64748b';
        Chart.defaults.plugins.legend.display = false;
    }

    createRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const data = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                data: [12000, 15000, 18000, 14000, 22000, 19000, 25000],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#06b6d4',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#06b6d4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        };

        this.charts.revenue = new Chart(ctx, config);
    }

    createCustomerChart() {
        const ctx = document.getElementById('customerChart');
        if (!ctx) return;

        const data = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                data: [1200, 1350, 1500, 1650, 1800, 2000],
                backgroundColor: [
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(34, 211, 238, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        };

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#06b6d4',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return 'Customers: ' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        };

        this.charts.customer = new Chart(ctx, config);
    }

    setupChartControls() {
        const chartBtns = document.querySelectorAll('.chart-btn');
        chartBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from siblings
                e.target.parentNode.querySelectorAll('.chart-btn').forEach(b => {
                    b.classList.remove('active');
                });
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Update chart data based on selected period
                this.updateChartData(e.target.textContent);
            });
        });
    }

    updateChartData(period) {
        // Mock data for different periods
        const dataSets = {
            '7D': {
                revenue: [12000, 15000, 18000, 14000, 22000, 19000, 25000],
                customers: [1200, 1350, 1500, 1650, 1800, 2000, 2200]
            },
            '30D': {
                revenue: [45000, 52000, 48000, 61000, 58000, 67000, 72000],
                customers: [2000, 2200, 2100, 2400, 2300, 2600, 2800]
            },
            '90D': {
                revenue: [120000, 135000, 150000, 165000, 180000, 195000, 210000],
                customers: [5000, 5500, 6000, 6500, 7000, 7500, 8000]
            }
        };

        const data = dataSets[period];
        if (data && this.charts.revenue && this.charts.customer) {
            this.charts.revenue.data.datasets[0].data = data.revenue;
            this.charts.revenue.update();
            
            this.charts.customer.data.datasets[0].data = data.customers;
            this.charts.customer.update();
        }
    }

    loadRecentActivity() {
        // Mock recent activity data
        const activities = [
            {
                icon: 'fas fa-user-plus',
                content: 'New customer <strong>Sarah Johnson</strong> subscribed to Premium Plan',
                time: '2 minutes ago'
            },
            {
                icon: 'fas fa-credit-card',
                content: 'Payment received from <strong>Mike Chen</strong> - $89.99',
                time: '15 minutes ago'
            },
            {
                icon: 'fas fa-ticket-alt',
                content: 'Support ticket #1234 resolved by <strong>Alex Smith</strong>',
                time: '1 hour ago'
            },
            {
                icon: 'fas fa-wifi',
                content: 'Network maintenance completed in Zone A',
                time: '2 hours ago'
            },
            {
                icon: 'fas fa-chart-line',
                content: 'Monthly revenue target achieved - 105%',
                time: '3 hours ago'
            }
        ];

        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.content}</p>
                        <span class="activity-time">${activity.time}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    setupMessaging() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                
                // Remove active class from all tabs and panels
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                btn.classList.add('active');
                document.getElementById(`${tab}Tab`).classList.add('active');
            });
        });

        // Message form handling
        const messageForms = document.querySelectorAll('.message-form');
        messageForms.forEach(form => {
            form.addEventListener('submit', this.handleMessageSubmit.bind(this));
        });

        // Character count for SMS
        const smsTextarea = document.querySelector('#smsTab textarea');
        if (smsTextarea) {
            smsTextarea.addEventListener('input', (e) => {
                const charCount = e.target.value.length;
                const charCountEl = e.target.parentNode.querySelector('.char-count');
                if (charCountEl) {
                    charCountEl.textContent = `${charCount}/160`;
                    charCountEl.style.color = charCount > 160 ? '#ef4444' : '#64748b';
                }
            });
        }
    }

    handleMessageSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            this.showNotification('Message sent successfully!', 'success');
            form.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }, 2000);
    }

    setupAIAssistant() {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendMessage');
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');

        if (chatInput && sendBtn) {
            const sendMessage = () => {
                const message = chatInput.value.trim();
                if (message) {
                    this.sendAIMessage(message);
                    chatInput.value = '';
                }
            };

            sendBtn.addEventListener('click', sendMessage);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        // Quick action buttons
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                if (query) {
                    chatInput.value = query;
                    this.sendAIMessage(query);
                }
            });
        });
    }

    sendAIMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Add user message
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        chatMessages.appendChild(userMessage);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message';
        typingIndicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p><i class="fas fa-spinner fa-spin"></i> AI is thinking...</p>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Simulate AI response
        setTimeout(() => {
            typingIndicator.remove();
            this.generateAIResponse(message);
        }, 1500);
    }

    generateAIResponse(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Mock AI responses based on keywords
        let response = this.getAIResponse(message);
        
        const aiMessage = document.createElement('div');
        aiMessage.className = 'message ai-message';
        aiMessage.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${response}</p>
            </div>
        `;
        chatMessages.appendChild(aiMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    getAIResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('churn') || lowerMessage.includes('churning')) {
            return `Based on our analysis, 23 customers are at high risk of churning in the next 30 days. Here are the key factors:
            <ul>
                <li>Payment delays (15 customers)</li>
                <li>Low usage patterns (8 customers)</li>
                <li>Support ticket frequency (5 customers)</li>
            </ul>
            I recommend reaching out with retention offers and addressing their specific concerns.`;
        } else if (lowerMessage.includes('revenue') || lowerMessage.includes('report')) {
            return `Here's your current revenue analysis:
            <ul>
                <li>Monthly Revenue: $45,230 (+8.5% from last month)</li>
                <li>Average Revenue per User: $15.89</li>
                <li>Top performing plan: Premium (2,156 subscribers)</li>
                <li>Projected next month: $48,500 (+7.2%)</li>
            </ul>
            Would you like me to generate a detailed report?`;
        } else if (lowerMessage.includes('growth') || lowerMessage.includes('prediction')) {
            return `Based on current trends and historical data, I predict:
            <ul>
                <li>Next month's customer growth: +12% (3,200 total customers)</li>
                <li>Revenue growth: +7.2% ($48,500)</li>
                <li>Churn rate: 2.1% (below industry average)</li>
                <li>Upsell opportunities: 156 customers</li>
            </ul>
            The growth is primarily driven by our Premium plan adoption.`;
        } else {
            return `I understand you're asking about "${message}". I can help you with:
            <ul>
                <li>Customer analytics and insights</li>
                <li>Churn prediction and prevention</li>
                <li>Revenue optimization suggestions</li>
                <li>Automated report generation</li>
                <li>Business intelligence queries</li>
            </ul>
            Could you be more specific about what you'd like to know?`;
        }
    }

    setupFloatingActions() {
        const quickMessage = document.getElementById('quickMessage');
        const quickAdd = document.getElementById('quickAdd');
        const quickSearch = document.getElementById('quickSearch');

        if (quickMessage) {
            quickMessage.addEventListener('click', () => {
                this.navigateToPage('messaging');
            });
        }

        if (quickAdd) {
            quickAdd.addEventListener('click', () => {
                this.showQuickAddModal();
            });
        }

        if (quickSearch) {
            quickSearch.addEventListener('click', () => {
                document.querySelector('.search-input').focus();
            });
        }
    }

    setupTableInteractions() {
        // Table row selection
        const tableCheckboxes = document.querySelectorAll('.table-checkbox');
        tableCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleTableSelection.bind(this));
        });

        // Action buttons
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.title;
                this.handleTableAction(action, btn);
            });
        });
    }

    handleTableSelection(e) {
        const checkbox = e.target;
        const row = checkbox.closest('tr');
        
        if (checkbox.checked) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }

        // Update bulk actions if needed
        this.updateBulkActions();
    }

    handleTableAction(action, btn) {
        const row = btn.closest('tr');
        const customerName = row.querySelector('.customer-name')?.textContent || 'Customer';
        
        switch (action) {
            case 'View':
                this.showCustomerDetails(customerName);
                break;
            case 'Edit':
                this.editCustomer(customerName);
                break;
            case 'Message':
                this.messageCustomer(customerName);
                break;
        }
    }

    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                }
            });
        });
    }

    validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        return isValid;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        let errorEl = field.parentNode.querySelector('.error-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            field.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorEl = field.parentNode.querySelector('.error-message');
        if (errorEl) {
            errorEl.remove();
        }
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        // Observe elements for animation
        document.querySelectorAll('.stat-card, .chart-container, .activity-item').forEach(el => {
            observer.observe(el);
        });
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    handleSearch(e) {
        const query = e.target.value.toLowerCase();
        console.log('Searching for:', query);
        // Implement search functionality
    }

    showNotifications() {
        this.showNotification('You have 3 new notifications', 'info');
    }

    showSettings() {
        this.showNotification('Settings panel coming soon', 'info');
    }

    showQuickAddModal() {
        this.showNotification('Quick add modal coming soon', 'info');
    }

    showCustomerDetails(name) {
        this.showNotification(`Viewing details for ${name}`, 'info');
    }

    editCustomer(name) {
        this.showNotification(`Editing ${name}`, 'info');
    }

    messageCustomer(name) {
        this.navigateToPage('messaging');
        this.showNotification(`Opening message composer for ${name}`, 'info');
    }

    updateBulkActions() {
        const selectedRows = document.querySelectorAll('tr.selected');
        console.log(`${selectedRows.length} rows selected`);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || '#3b82f6';
    }

    // Page-specific initialization methods
    initializeAnalytics() {
        console.log('Initializing Analytics page');
    }

	// (Placeholder initializers above replaced with functional ones)

    initializeMessaging() {
        console.log('Initializing Messaging page');
    }

    initializeAIAssistant() {
        console.log('Initializing AI Assistant page');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.omniNetCRM = new OmniNetCRM();
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .animate-in {
        animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .notification {
        font-family: 'Inter', sans-serif;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    }

    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .error {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }

    .error-message {
        color: #ef4444;
        font-size: 0.75rem;
        margin-top: 0.25rem;
    }

    .selected {
        background-color: rgba(6, 182, 212, 0.1) !important;
    }

    .notification-close i {
        font-size: 12px;
    }
`;
document.head.appendChild(style);

// Handle responsive sidebar
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 1024) {
        sidebar.classList.remove('open');
    }
});

// Export for global access
window.OmniNetCRM = OmniNetCRM;
