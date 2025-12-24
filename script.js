document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    const productList = document.getElementById('product-list');
    const predictionList = document.getElementById('prediction-list');
    const reorderList = document.getElementById('reorder-list');

    let products = JSON.parse(localStorage.getItem('products')) || [];

    let currentPage = 1;
    const itemsPerPage = 10;

    function renderProducts(filteredProducts = products) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        productList.innerHTML = '';
        predictionList.innerHTML = '';
        reorderList.innerHTML = '';

        paginatedProducts.forEach((product, index) => {
            const actualIndex = startIndex + index;
            // Inventory list
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" onchange="toggleSelect(${actualIndex})">
                <span>${product.name} (${product.category}) - Quantity: ${product.quantity} - Threshold: ${product.threshold} - Price: ₹${product.price || 'N/A'}</span>
                <div>
                    <button onclick="editProduct(${actualIndex})">Edit</button>
                    <button onclick="removeProduct(${actualIndex})">Remove</button>
                </div>
            `;
            if (product.quantity <= product.threshold) {
                li.classList.add('low-stock');
            }
            productList.appendChild(li);

            // Improved AI Prediction: Use timestamp for trend analysis
            const daysSinceUpdate = product.lastUpdated ? Math.floor((new Date() - new Date(product.lastUpdated)) / (1000 * 60 * 60 * 24)) : 0;
            if (product.quantity <= product.threshold || (product.quantity <= product.threshold * 1.5 && daysSinceUpdate > 7)) {
                const predLi = document.createElement('li');
                predLi.textContent = `${product.name} is predicted to go out of stock soon (last updated ${daysSinceUpdate} days ago).`;
                predictionList.appendChild(predLi);

                // Automated Reorder: Simulate reordering
                const reorderLi = document.createElement('li');
                reorderLi.classList.add('reorder');
                reorderLi.textContent = `Automated reorder initiated for ${product.name}.`;
                reorderList.appendChild(reorderLi);

                // Browser notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`Low Stock Alert: ${product.name}`);
                }
            }
        });

        // Add pagination controls
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        if (totalPages > 1) {
            const paginationDiv = document.createElement('div');
            paginationDiv.id = 'pagination';
            paginationDiv.innerHTML = `
                <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span>Page ${currentPage} of ${totalPages}</span>
                <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            `;
            productList.appendChild(paginationDiv);
        }
    }

    window.changePage = (page) => {
        currentPage = page;
        filterProducts();
    };

    window.toggleSelect = (index) => {
        products[index].selected = !products[index].selected;
        localStorage.setItem('products', JSON.stringify(products));
    };

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('product-name').value;
        const category = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const quantity = parseInt(document.getElementById('product-quantity').value);
        const threshold = parseInt(document.getElementById('product-threshold').value);

        products.push({ name, category, price, quantity, threshold, lastUpdated: new Date().toISOString() });
        localStorage.setItem('products', JSON.stringify(products));
        updateCategories();
        filterProducts();
        renderChart();
        productForm.reset();
    });

    window.removeProduct = (index) => {
        products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(products));
        filterProducts();
    };

    window.editProduct = (index) => {
        const product = products[index];
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-quantity').value = product.quantity;
        document.getElementById('product-threshold').value = product.threshold;
        products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(products));
        filterProducts();
    };

    function updateCategories() {
        const categorySelect = document.getElementById('filter-category');
        const categories = [...new Set(products.map(p => p.category))];
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    }

    function filterProducts() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const selectedCategory = document.getElementById('filter-category').value;
        const showLowStockOnly = document.getElementById('filter-low-stock').classList.contains('active');

        let filtered = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm);
            const matchesCategory = !selectedCategory || product.category === selectedCategory;
            const matchesLowStock = !showLowStockOnly || product.quantity <= product.threshold;
            return matchesSearch && matchesCategory && matchesLowStock;
        });

        renderProducts(filtered);
    }

    // Event listeners for search and filter
    document.getElementById('search-input').addEventListener('input', filterProducts);
    document.getElementById('filter-category').addEventListener('change', filterProducts);
    document.getElementById('filter-low-stock').addEventListener('click', () => {
        document.getElementById('filter-low-stock').classList.toggle('active');
        filterProducts();
    });

    // Export to CSV
    document.getElementById('export-csv').addEventListener('click', () => {
        const csvContent = 'data:text/csv;charset=utf-8,' +
            'Name,Category,Price,Quantity,Threshold,Last Updated\n' +
            products.map(p => `${p.name},${p.category},${p.price || ''},${p.quantity},${p.threshold},${p.lastUpdated || ''}`).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'inventory.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Import from CSV
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-csv').click();
    });

    document.getElementById('import-csv').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const csv = event.target.result;
                const lines = csv.split('\n').slice(1); // Skip header
                lines.forEach(line => {
                    const [name, category, price, quantity, threshold, lastUpdated] = line.split(',');
                    if (name && category && quantity && threshold) {
                        products.push({
                            name: name.trim(),
                            category: category.trim(),
                            price: price ? parseFloat(price.trim()) : undefined,
                            quantity: parseInt(quantity.trim()),
                            threshold: parseInt(threshold.trim()),
                            lastUpdated: lastUpdated ? lastUpdated.trim() : new Date().toISOString()
                        });
                    }
                });
                localStorage.setItem('products', JSON.stringify(products));
                updateCategories();
                filterProducts();
            };
            reader.readAsText(file);
        }
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    function renderChart() {
        // Clear existing charts
        const chartContainer = document.getElementById('analytics');
        const existingCanvas = chartContainer.querySelectorAll('canvas');
        existingCanvas.forEach(canvas => canvas.remove());

        if (products.length === 0) {
            chartContainer.innerHTML += '<p>No data available for analytics.</p>';
            return;
        }

        const categories = [...new Set(products.map(p => p.category))];
        const categoryData = categories.map(cat => {
            const catProducts = products.filter(p => p.category === cat);
            return {
                category: cat,
                totalQuantity: catProducts.reduce((sum, p) => sum + p.quantity, 0),
                lowStockCount: catProducts.filter(p => p.quantity <= p.threshold).length,
                totalValue: catProducts.reduce((sum, p) => sum + (p.quantity * (p.price || 10)), 0) // Assuming default price
            };
        });

        // Bar Chart: Total Quantity and Low Stock
        const barCanvas = document.createElement('canvas');
        barCanvas.id = 'barChart';
        chartContainer.appendChild(barCanvas);
        const barCtx = barCanvas.getContext('2d');
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: categoryData.map(d => d.category),
                datasets: [{
                    label: 'Total Quantity',
                    data: categoryData.map(d => d.totalQuantity),
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }, {
                    label: 'Low Stock Items',
                    data: categoryData.map(d => d.lowStockCount),
                    backgroundColor: 'rgba(255, 107, 107, 0.6)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Inventory Overview by Category'
                    }
                }
            }
        });

        // Pie Chart: Category Distribution
        const pieCanvas = document.createElement('canvas');
        pieCanvas.id = 'pieChart';
        chartContainer.appendChild(pieCanvas);
        const pieCtx = pieCanvas.getContext('2d');
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: categoryData.map(d => d.category),
                datasets: [{
                    data: categoryData.map(d => d.totalQuantity),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 205, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 205, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Category Distribution'
                    }
                }
            }
        });

        // Line Chart: Stock Trends (simulated over last 7 days)
        const lineCanvas = document.createElement('canvas');
        lineCanvas.id = 'lineChart';
        chartContainer.appendChild(lineCanvas);
        const lineCtx = lineCanvas.getContext('2d');
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString();
        });
        const trendData = last7Days.map(day => {
            // Simulate trend data based on current stock levels
            const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
            return Math.max(0, totalStock + Math.floor(Math.random() * 20 - 10)); // Random variation
        });
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Total Stock Trend',
                    data: trendData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Stock Level Trends (Last 7 Days)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Summary Statistics
        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => p.quantity <= p.threshold).length;
        const totalValue = products.reduce((sum, p) => sum + (p.quantity * (p.price || 10)), 0);
        const statsDiv = document.createElement('div');
        statsDiv.id = 'summary-stats';
        statsDiv.innerHTML = `
            <h3>Summary Statistics</h3>
            <p>Total Products: ${totalProducts}</p>
            <p>Low Stock Items: ${lowStockProducts}</p>
            <p>Total Inventory Value: $${totalValue.toFixed(2)}</p>
            <p>Categories: ${categories.length}</p>
        `;
        chartContainer.appendChild(statsDiv);
    }

    // Dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Bulk operations
    window.bulkDelete = () => {
        const selectedProducts = products.filter(p => p.selected);
        if (selectedProducts.length === 0) {
            alert('No products selected for deletion.');
            return;
        }
        if (confirm(`Are you sure you want to delete ${selectedProducts.length} selected products?`)) {
            products = products.filter(p => !p.selected);
            localStorage.setItem('products', JSON.stringify(products));
            filterProducts();
        }
    };

    updateCategories();
    filterProducts();
    renderChart();
});
