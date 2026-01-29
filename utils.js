// Utility functions for TruCash application

class Utils {
    constructor() {
        this.currency = 'ZMW';
    }

    // Format currency for display
    formatCurrency(amount) {
        if (amount === undefined || amount === null) return 'ZMW 0.00';
        
        return new Intl.NumberFormat('en-ZM', {
            style: 'currency',
            currency: this.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Format date
    formatDate(date, includeTime = false) {
        if (!date) return 'N/A';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
        
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return d.toLocaleDateString('en-ZM', options);
    }

    // Format time
    formatTime(date) {
        if (!date) return 'N/A';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Time';
        
        return d.toLocaleTimeString('en-ZM', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // Calculate days between dates
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Calculate loan repayment schedule
    calculateRepaymentSchedule(principal, interestRate, durationMonths, startDate = new Date()) {
        const monthlyInterestRate = interestRate / 100 / 12;
        const monthlyPayment = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, durationMonths) / 
                              (Math.pow(1 + monthlyInterestRate, durationMonths) - 1);
        
        const schedule = [];
        let remainingBalance = principal;
        let currentDate = new Date(startDate);
        
        for (let i = 1; i <= durationMonths; i++) {
            const interestPayment = remainingBalance * monthlyInterestRate;
            const principalPayment = monthlyPayment - interestPayment;
            remainingBalance -= principalPayment;
            
            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1);
            
            schedule.push({
                installment: i,
                dueDate: new Date(currentDate),
                amount: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
                status: 'pending'
            });
        }
        
        return {
            totalPayable: monthlyPayment * durationMonths,
            monthlyPayment: monthlyPayment,
            schedule: schedule
        };
    }

    // Calculate penalty
    calculatePenalty(amount, overdueDays, penaltyRate) {
        const dailyPenaltyRate = penaltyRate / 100 / 30; // Convert annual rate to daily
        return amount * dailyPenaltyRate * overdueDays;
    }

    // Validate NRC number (Zambian format)
    validateNRC(nrc) {
        const regex = /^\d{6}\/\d{2}\/\d{1}$/;
        return regex.test(nrc);
    }

    // Validate phone number (Zambian format)
    validatePhone(phone) {
        // Accepts formats: +260XXXXXXXXX, 260XXXXXXXXX, 0XXXXXXXXX
        const regex = /^(\+?260|0)?\d{9}$/;
        return regex.test(phone.replace(/\s/g, ''));
    }

    // Validate email
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Generate random ID
    generateId(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}_${timestamp}_${random}`;
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Sanitize input
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .trim();
    }

    // Generate CSV from array of objects
    generateCSV(data, headers = null) {
        if (!data || !data.length) return '';
        
        const actualHeaders = headers || Object.keys(data[0]);
        const csvRows = [];
        
        // Add headers
        csvRows.push(actualHeaders.join(','));
        
        // Add data rows
        data.forEach(row => {
            const values = actualHeaders.map(header => {
                const value = row[header];
                // Handle values that might contain commas
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    // Download file
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Generate PDF (placeholder - would use a PDF library in production)
    generatePDF(content, filename = 'document.pdf') {
        console.log('PDF generation would be implemented with a library like jsPDF');
        // This is a placeholder - in production, you would use jsPDF or similar
        return new Promise((resolve) => {
            resolve({ success: true, message: 'PDF generation would be implemented' });
        });
    }

    // Calculate age from birth date
    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    // Debounce function for performance
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

    // Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Merge objects
    mergeObjects(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this.mergeObjects(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    // Generate color from string (for avatars, etc.)
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        
        return color;
    }

    // Get initials from name
    getInitials(name) {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    // Create data URL for image
    createImageDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    // Check if object is empty
    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    // Get query parameter from URL
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Set query parameter in URL
    setQueryParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.pushState({}, '', url);
    }

    // Remove query parameter from URL
    removeQueryParam(param) {
        const url = new URL(window.location);
        url.searchParams.delete(param);
        window.history.pushState({}, '', url);
    }

    // Copy to clipboard
    copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(() => resolve(true))
                    .catch(() => reject(false));
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    resolve(true);
                } catch (err) {
                    reject(false);
                }
                
                textArea.remove();
            }
        });
    }

    // Generate QR code (placeholder)
    generateQRCode(text, elementId) {
        // In production, use a QR code library like qrcode.js
        console.log('QR Code generation would be implemented');
        return Promise.resolve();
    }

    // Format number with commas
    formatNumber(number) {
        return number.toLocaleString('en-ZM');
    }

    // Calculate percentage
    calculatePercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    // Validate loan amount
    validateLoanAmount(amount, minAmount, maxAmount) {
        if (amount < minAmount) {
            return { valid: false, message: `Amount must be at least ${this.formatCurrency(minAmount)}` };
        }
        
        if (amount > maxAmount) {
            return { valid: false, message: `Amount cannot exceed ${this.formatCurrency(maxAmount)}` };
        }
        
        return { valid: true };
    }

    // Generate repayment reminder message
    generateReminderMessage(loan, daysUntilDue) {
        const amount = this.formatCurrency(loan.monthlyPayment);
        const dueDate = this.formatDate(loan.nextDueDate);
        
        if (daysUntilDue > 0) {
            return `Reminder: Your payment of ${amount} is due in ${daysUntilDue} days (${dueDate})`;
        } else if (daysUntilDue === 0) {
            return `Reminder: Your payment of ${amount} is due today (${dueDate})`;
        } else {
            const daysOverdue = Math.abs(daysUntilDue);
            const penalty = this.formatCurrency(this.calculatePenalty(loan.monthlyPayment, daysOverdue, loan.penaltyRate));
            return `Overdue: Payment of ${amount} was due ${daysOverdue} days ago. Penalty: ${penalty}`;
        }
    }

    // Get Zambian provinces
    getZambianProvinces() {
        return [
            'Central', 'Copperbelt', 'Eastern', 'Luapula', 'Lusaka',
            'Muchinga', 'North-Western', 'Northern', 'Southern', 'Western'
        ];
    }

    // Get Zambian districts by province
    getZambianDistricts(province) {
        const districts = {
            'Lusaka': ['Lusaka', 'Chongwe', 'Kafue', 'Luangwa'],
            'Copperbelt': ['Kitwe', 'Ndola', 'Chingola', 'Mufulira', 'Luanshya', 'Kalulushi', 'Chililabombwe'],
            'Southern': ['Livingstone', 'Choma', 'Mazabuka', 'Kalomo', 'Siavonga'],
            'Eastern': ['Chipata', 'Lundazi', 'Chadiza', 'Petauke'],
            'Northern': ['Kasama', 'Mpika', 'Mbala', 'Mungwi'],
            'North-Western': ['Solwezi', 'Mwinilunga', 'Zambezi'],
            'Western': ['Mongu', 'Sesheke', 'Kalabo'],
            'Central': ['Kabwe', 'Kapiri Mposhi', 'Mkushi', 'Serenje'],
            'Luapula': ['Mansa', 'Samfya', 'Kawambwa'],
            'Muchinga': ['Chinsali', 'Isoka', 'Nakonde']
        };
        
        return districts[province] || [];
    }

    // Calculate distance between coordinates (in km)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // Generate random Zambian phone number
    generateZambianPhone() {
        const prefixes = ['76', '77', '96', '97'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        return `+260${prefix}${number}`;
    }

    // Format Zambian address
    formatZambianAddress(address) {
        if (!address) return '';
        
        let formatted = '';
        if (address.houseNumber) formatted += `${address.houseNumber} `;
        if (address.street) formatted += `${address.street}, `;
        if (address.area) formatted += `${address.area}, `;
        if (address.town) formatted += `${address.town}, `;
        if (address.province) formatted += address.province;
        
        return formatted.trim().replace(/,\s*$/, '');
    }

    // Validate Zambian address
    validateZambianAddress(address) {
        const errors = [];
        
        if (!address.houseNumber || address.houseNumber.trim() === '') {
            errors.push('House number is required');
        }
        
        if (!address.street || address.street.trim() === '') {
            errors.push('Street name is required');
        }
        
        if (!address.town || address.town.trim() === '') {
            errors.push('Town/City is required');
        }
        
        if (!address.province || address.province.trim() === '') {
            errors.push('Province is required');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Get month name
    getMonthName(monthIndex, short = false) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const shortMonths = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        return short ? shortMonths[monthIndex] : months[monthIndex];
    }

    // Get day name
    getDayName(dayIndex, short = false) {
        const days = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
        ];
        
        const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        return short ? shortDays[dayIndex] : days[dayIndex];
    }

    // Create date picker options
    getDatePickerOptions() {
        return {
            dateFormat: 'Y-m-d',
            minDate: '1900-01-01',
            maxDate: new Date(),
            disableMobile: true,
            position: 'auto center'
        };
    }

    // Generate loan agreement number
    generateLoanAgreementNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `LA/${year}${month}/${random}`;
    }

    // Generate receipt number
    generateReceiptNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `RCPT/${year}${month}${day}/${random}`;
    }

    // Calculate agent commission
    calculateAgentCommission(loanAmount, commissionRate) {
        return loanAmount * (commissionRate / 100);
    }

    // Format commission statement
    formatCommissionStatement(agent, period) {
        const commission = agent.totalCommission || 0;
        const formattedCommission = this.formatCurrency(commission);
        const periodFormatted = this.formatDate(period.start) + ' to ' + this.formatDate(period.end);
        
        return {
            agentName: agent.fullName,
            agentId: agent.agentId,
            period: periodFormatted,
            totalCommission: formattedCommission,
            numberOfLoans: agent.loansProcessed || 0,
            averageLoanSize: this.formatCurrency((agent.totalLoanVolume || 0) / (agent.loansProcessed || 1))
        };
    }

    // Generate performance rating
    generatePerformanceRating(score) {
        if (score >= 90) return { rating: 'Excellent', color: '#10B981', stars: 5 };
        if (score >= 80) return { rating: 'Very Good', color: '#34D399', stars: 4 };
        if (score >= 70) return { rating: 'Good', color: '#60A5FA', stars: 3 };
        if (score >= 60) return { rating: 'Fair', color: '#FBBF24', stars: 2 };
        return { rating: 'Needs Improvement', color: '#F87171', stars: 1 };
    }

    // Create pagination data
    createPagination(items, itemsPerPage, currentPage) {
        const totalPages = Math.ceil(items.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = items.slice(startIndex, endIndex);
        
        return {
            items: paginatedItems,
            currentPage: currentPage,
            totalPages: totalPages,
            totalItems: items.length,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        };
    }

    // Generate pagination controls HTML
    generatePaginationHTML(paginationData, onPageChange) {
        if (paginationData.totalPages <= 1) return '';
        
        let html = '<div class="flex items-center justify-center gap-2">';
        
        // Previous button
        if (paginationData.hasPreviousPage) {
            html += `<button class="btn btn-sm btn-outline" onclick="${onPageChange}(${paginationData.currentPage - 1})">
                        <i class="fas fa-chevron-left"></i>
                     </button>`;
        }
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, paginationData.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(paginationData.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="btn btn-sm ${i === paginationData.currentPage ? 'btn-primary' : 'btn-outline'}" 
                            onclick="${onPageChange}(${i})">
                        ${i}
                     </button>`;
        }
        
        // Next button
        if (paginationData.hasNextPage) {
            html += `<button class="btn btn-sm btn-outline" onclick="${onPageChange}(${paginationData.currentPage + 1})">
                        <i class="fas fa-chevron-right"></i>
                     </button>`;
        }
        
        html += '</div>';
        return html;
    }

    // Export data to Excel
    exportToExcel(data, filename = 'export.xlsx') {
        // In production, use a library like SheetJS
        console.log('Excel export would be implemented with SheetJS');
        return Promise.resolve();
    }

    // Import data from Excel
    importFromExcel(file) {
        // In production, use a library like SheetJS
        console.log('Excel import would be implemented with SheetJS');
        return Promise.resolve([]);
    }

    // Validate imported data
    validateImportedData(data, schema) {
        const errors = [];
        
        data.forEach((row, index) => {
            Object.keys(schema).forEach(field => {
                const rules = schema[field];
                const value = row[field];
                
                if (rules.required && (value === undefined || value === null || value === '')) {
                    errors.push(`Row ${index + 1}: ${field} is required`);
                }
                
                if (value && rules.type) {
                    if (rules.type === 'number' && isNaN(Number(value))) {
                        errors.push(`Row ${index + 1}: ${field} must be a number`);
                    }
                    
                    if (rules.type === 'email' && !this.validateEmail(value)) {
                        errors.push(`Row ${index + 1}: ${field} must be a valid email`);
                    }
                    
                    if (rules.type === 'phone' && !this.validatePhone(value)) {
                        errors.push(`Row ${index + 1}: ${field} must be a valid phone number`);
                    }
                }
                
                if (value && rules.minLength && value.length < rules.minLength) {
                    errors.push(`Row ${index + 1}: ${field} must be at least ${rules.minLength} characters`);
                }
                
                if (value && rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`Row ${index + 1}: ${field} cannot exceed ${rules.maxLength} characters`);
                }
            });
        });
        
        return {
            valid: errors.length === 0,
            errors: errors,
            validatedData: data
        };
    }

    // Create data validation rules
    createValidationRules() {
        return {
            email: {
                required: true,
                type: 'email',
                maxLength: 100
            },
            phone: {
                required: true,
                type: 'phone',
                maxLength: 15
            },
            nrc: {
                required: true,
                pattern: /^\d{6}\/\d{2}\/\d{1}$/
            },
            fullName: {
                required: true,
                minLength: 2,
                maxLength: 100
            },
            loanAmount: {
                required: true,
                type: 'number',
                min: 100,
                max: 1000000
            },
            address: {
                required: true,
                minLength: 5,
                maxLength: 200
            }
        };
    }

    // Generate verification code
    generateVerificationCode(length = 6) {
        const chars = '0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    // Validate verification code
    validateVerificationCode(code, input) {
        return code === input;
    }

    // Create time ago string
    timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) {
            return interval === 1 ? '1 year ago' : interval + ' years ago';
        }
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) {
            return interval === 1 ? '1 month ago' : interval + ' months ago';
        }
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) {
            return interval === 1 ? '1 day ago' : interval + ' days ago';
        }
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
            return interval === 1 ? '1 hour ago' : interval + ' hours ago';
        }
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) {
            return interval === 1 ? '1 minute ago' : interval + ' minutes ago';
        }
        
        return seconds <= 10 ? 'just now' : Math.floor(seconds) + ' seconds ago';
    }

    // Create countdown timer
    createCountdownTimer(targetDate, elementId) {
        const updateTimer = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const distance = target - now;
            
            if (distance < 0) {
                document.getElementById(elementId).innerHTML = 'EXPIRED';
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            document.getElementById(elementId).innerHTML = 
                `${days}d ${hours}h ${minutes}m ${seconds}s`;
        };
        
        updateTimer();
        return setInterval(updateTimer, 1000);
    }

    // Format duration
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
        
        return parts.join(' ');
    }

    // Get browser information
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        
        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'IE';
        
        return {
            browser: browser,
            userAgent: ua,
            language: navigator.language,
            platform: navigator.platform,
            online: navigator.onLine
        };
    }

    // Check if device is mobile
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Get screen orientation
    getScreenOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    // Create responsive breakpoint checker
    createBreakpointChecker() {
        const breakpoints = {
            xs: 0,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
            '2xl': 1536
        };
        
        return {
            current: () => {
                const width = window.innerWidth;
                for (const [breakpoint, minWidth] of Object.entries(breakpoints).reverse()) {
                    if (width >= minWidth) return breakpoint;
                }
                return 'xs';
            },
            isMobile: () => window.innerWidth < 768,
            isTablet: () => window.innerWidth >= 768 && window.innerWidth < 1024,
            isDesktop: () => window.innerWidth >= 1024
        };
    }

    // Create animation
    animate(element, animation, duration = 300) {
        return new Promise((resolve) => {
            element.classList.add(`animate-${animation}`);
            element.style.animationDuration = `${duration}ms`;
            
            const handleAnimationEnd = () => {
                element.classList.remove(`animate-${animation}`);
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
        });
    }

    // Create tooltip
    createTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        
        const updatePosition = (e) => {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
        };
        
        element.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
        });
        
        element.addEventListener('mousemove', updatePosition);
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        return {
            destroy: () => {
                element.removeEventListener('mouseenter', updatePosition);
                element.removeEventListener('mousemove', updatePosition);
                element.removeEventListener('mouseleave', updatePosition);
                tooltip.remove();
            }
        };
    }

    // Create modal
    createModal(options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: ${options.width || '600px'}">
                <div class="modal-header">
                    <h3 class="modal-title">${options.title || ''}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">${options.content || ''}</div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        const show = () => {
            modal.classList.add('active');
        };
        
        const hide = closeModal;
        
        const setContent = (content) => {
            modal.querySelector('.modal-body').innerHTML = content;
        };
        
        return { show, hide, setContent, modal };
    }

    // Create confirmation dialog
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modal = this.createModal({
                title: options.title || 'Confirm Action',
                content: `<p>${message}</p>`,
                footer: `
                    <button class="btn btn-outline" id="confirmCancel">${options.cancelText || 'Cancel'}</button>
                    <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">
                        ${options.okText || 'OK'}
                    </button>
                `
            });
            
            modal.show();
            
            modal.modal.querySelector('#confirmCancel').addEventListener('click', () => {
                modal.hide();
                resolve(false);
            });
            
            modal.modal.querySelector('#confirmOk').addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
        });
    }

    // Create loading overlay
    createLoadingOverlay(text = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const show = () => {
            overlay.style.display = 'flex';
        };
        
        const hide = () => {
            overlay.style.display = 'none';
        };
        
        const remove = () => {
            overlay.remove();
        };
        
        const setText = (newText) => {
            overlay.querySelector('.loading-text').textContent = newText;
        };
        
        return { show, hide, remove, setText };
    }

    // Create toast notification
    createToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                               type === 'error' ? 'exclamation-circle' : 
                               type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        const close = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };
        
        toast.querySelector('.toast-close').addEventListener('click', close);
        
        if (duration > 0) {
            setTimeout(close, duration);
        }
        
        return { close };
    }

    // Create progress bar
    createProgressBar(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = `
            <div class="progress-fill" style="width: ${options.value || 0}%"></div>
            ${options.showLabel ? `<div class="progress-label">${options.value || 0}%</div>` : ''}
        `;
        
        container.appendChild(progressBar);
        
        const setValue = (value) => {
            const fill = progressBar.querySelector('.progress-fill');
            const label = progressBar.querySelector('.progress-label');
            fill.style.width = `${value}%`;
            if (label) label.textContent = `${value}%`;
        };
        
        const destroy = () => {
            progressBar.remove();
        };
        
        return { setValue, destroy };
    }

    // Create date range picker
    createDateRangePicker(elementId, onDateSelect) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        element.type = 'text';
        element.readOnly = true;
        element.addEventListener('click', () => {
            // In production, use a date range picker library
            console.log('Date range picker would be implemented');
        });
        
        const setDates = (startDate, endDate) => {
            element.value = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
            if (onDateSelect) onDateSelect(startDate, endDate);
        };
        
        const clear = () => {
            element.value = '';
        };
        
        return { setDates, clear };
    }

    // Create search input with suggestions
    createSearchInput(elementId, dataSource, onSelect) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        const suggestions = document.createElement('div');
        suggestions.className = 'search-suggestions';
        suggestions.style.display = 'none';
        element.parentNode.appendChild(suggestions);
        
        const showSuggestions = (items) => {
            suggestions.innerHTML = '';
            suggestions.style.display = 'block';
            
            items.slice(0, 10).forEach(item => {
                const suggestion = document.createElement('div');
                suggestion.className = 'search-suggestion';
                suggestion.textContent = item.label || item;
                suggestion.addEventListener('click', () => {
                    element.value = item.value || item;
                    suggestions.style.display = 'none';
                    if (onSelect) onSelect(item);
                });
                suggestions.appendChild(suggestion);
            });
        };
        
        element.addEventListener('input', async () => {
            const query = element.value;
            if (query.length < 2) {
                suggestions.style.display = 'none';
                return;
            }
            
            let items;
            if (typeof dataSource === 'function') {
                items = await dataSource(query);
            } else if (Array.isArray(dataSource)) {
                items = dataSource.filter(item => 
                    (item.label || item).toLowerCase().includes(query.toLowerCase())
                );
            }
            
            if (items && items.length > 0) {
                showSuggestions(items);
            } else {
                suggestions.style.display = 'none';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!element.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
        
        const destroy = () => {
            suggestions.remove();
            element.removeEventListener('input', () => {});
        };
        
        return { destroy };
    }

    // Create file upload with preview
    createFileUpload(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        element.parentNode.appendChild(preview);
        
        const updatePreview = (files) => {
            preview.innerHTML = '';
            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.maxWidth = '100px';
                    img.style.maxHeight = '100px';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        };
        
        element.addEventListener('change', (e) => {
            updatePreview(e.target.files);
            if (options.onChange) options.onChange(e.target.files);
        });
        
        const clear = () => {
            element.value = '';
            preview.innerHTML = '';
        };
        
        const getFiles = () => element.files;
        
        return { clear, getFiles };
    }

    // Create image cropper
    createImageCropper(imageUrl, options = {}) {
        return new Promise((resolve) => {
            const modal = this.createModal({
                title: 'Crop Image',
                content: `
                    <div class="image-cropper-container">
                        <img src="${imageUrl}" id="imageToCrop" style="max-width: 100%">
                    </div>
                `,
                footer: `
                    <button class="btn btn-outline" id="cropCancel">Cancel</button>
                    <button class="btn btn-primary" id="cropSave">Crop & Save</button>
                `
            });
            
            modal.show();
            
            // In production, use a cropping library like Cropper.js
            console.log('Image cropper would be implemented with Cropper.js');
            
            modal.modal.querySelector('#cropCancel').addEventListener('click', () => {
                modal.hide();
                resolve(null);
            });
            
            modal.modal.querySelector('#cropSave').addEventListener('click', () => {
                modal.hide();
                resolve(imageUrl); // Would return cropped image
            });
        });
    }

    // Create signature pad
    createSignaturePad(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        
        element.innerHTML = '<canvas style="border: 1px solid #ccc; background: white;"></canvas>';
        const canvas = element.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        
        let drawing = false;
        let lastX = 0;
        let lastY = 0;
        
        canvas.width = element.clientWidth;
        canvas.height = 200;
        
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = options.color || '#000000';
        
        const startDrawing = (e) => {
            drawing = true;
            [lastX, lastY] = [e.offsetX, e.offsetY];
        };
        
        const draw = (e) => {
            if (!drawing) return;
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            [lastX, lastY] = [e.offsetX, e.offsetY];
        };
        
        const stopDrawing = () => {
            drawing = false;
        };
        
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        const clear = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        
        const getSignature = () => {
            return canvas.toDataURL('image/png');
        };
        
        const setSignature = (dataUrl) => {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = dataUrl;
        };
        
        return { clear, getSignature, setSignature };
    }

    // Create barcode scanner
    createBarcodeScanner(options = {}) {
        return new Promise((resolve, reject) => {
            // In production, use a barcode scanning library
            console.log('Barcode scanner would be implemented with a library like QuaggaJS');
            
            // For demo purposes, simulate scanning after delay
            if (options.simulate) {
                setTimeout(() => {
                    resolve('1234567890123'); // Sample barcode
                }, 2000);
            } else {
                reject(new Error('Barcode scanning not implemented'));
            }
        });
    }

    // Create QR code scanner
    createQRCodeScanner(options = {}) {
        return new Promise((resolve, reject) => {
            // In production, use a QR code scanning library
            console.log('QR code scanner would be implemented');
            
            if (options.simulate) {
                setTimeout(() => {
                    resolve('https://example.com/qr-data');
                }, 2000);
            } else {
                reject(new Error('QR code scanning not implemented'));
            }
        });
    }

    // Create geolocation service
    createGeolocationService() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    // Create offline storage
    createOfflineStorage(name = 'trucash-offline') {
        const storage = {
            set: (key, value) => {
                localStorage.setItem(`${name}_${key}`, JSON.stringify(value));
            },
            get: (key) => {
                const item = localStorage.getItem(`${name}_${key}`);
                return item ? JSON.parse(item) : null;
            },
            remove: (key) => {
                localStorage.removeItem(`${name}_${key}`);
            },
            clear: () => {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(name)) {
                        localStorage.removeItem(key);
                    }
                });
            },
            getAll: () => {
                const items = {};
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(name)) {
                        const itemKey = key.replace(`${name}_`, '');
                        items[itemKey] = JSON.parse(localStorage.getItem(key));
                    }
                });
                return items;
            }
        };
        
        return storage;
    }

    // Create sync manager for offline data
    createSyncManager() {
        const pendingSyncs = [];
        let isSyncing = false;
        
        const addSync = (action, data) => {
            pendingSyncs.push({ action, data, timestamp: Date.now() });
            localStorage.setItem('pending_syncs', JSON.stringify(pendingSyncs));
        };
        
        const sync = async () => {
            if (isSyncing || pendingSyncs.length === 0) return;
            
            isSyncing = true;
            
            try {
                const syncs = [...pendingSyncs];
                pendingSyncs.length = 0;
                localStorage.setItem('pending_syncs', JSON.stringify(pendingSyncs));
                
                for (const sync of syncs) {
                    // Process each sync item
                    console.log('Syncing:', sync);
                    // In production, this would sync with Firebase
                }
                
                return { success: true, synced: syncs.length };
            } catch (error) {
                // Restore pending syncs on error
                pendingSyncs.push(...JSON.parse(localStorage.getItem('pending_syncs') || '[]'));
                throw error;
            } finally {
                isSyncing = false;
            }
        };
        
        // Load pending syncs from localStorage
        const savedSyncs = JSON.parse(localStorage.getItem('pending_syncs') || '[]');
        pendingSyncs.push(...savedSyncs);
        
        // Auto-sync when online
        window.addEventListener('online', sync);
        
        return { addSync, sync, pendingSyncs: () => [...pendingSyncs] };
    }

    // Create cache manager
    createCacheManager() {
        const cache = new Map();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        const set = (key, value) => {
            cache.set(key, {
                value,
                timestamp: Date.now()
            });
        };
        
        const get = (key) => {
            const item = cache.get(key);
            if (!item) return null;
            
            if (Date.now() - item.timestamp > maxAge) {
                cache.delete(key);
                return null;
            }
            
            return item.value;
        };
        
        const remove = (key) => {
            cache.delete(key);
        };
        
        const clear = () => {
            cache.clear();
        };
        
        const size = () => cache.size;
        
        return { set, get, remove, clear, size };
    }

    // Create performance monitor
    createPerformanceMonitor() {
        const metrics = {
            pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domReadyTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            networkLatency: performance.timing.responseEnd - performance.timing.requestStart,
            pageRenderTime: performance.timing.loadEventEnd - performance.timing.domLoading
        };
        
        const startTimer = (name) => {
            const start = performance.now();
            return {
                stop: () => {
                    const duration = performance.now() - start;
                    metrics[name] = duration;
                    return duration;
                }
            };
        };
        
        const getMetrics = () => ({ ...metrics });
        
        const logMetrics = () => {
            console.log('Performance Metrics:', metrics);
        };
        
        return { startTimer, getMetrics, logMetrics };
    }

    // Create error logger
    createErrorLogger() {
        const errors = [];
        
        const log = (error, context = {}) => {
            const errorEntry = {
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : error,
                context,
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            errors.push(errorEntry);
            
            // In production, send to error tracking service
            console.error('Error logged:', errorEntry);
            
            // Store in localStorage for debugging
            const storedErrors = JSON.parse(localStorage.getItem('error_logs') || '[]');
            storedErrors.push(errorEntry);
            localStorage.setItem('error_logs', JSON.stringify(storedErrors.slice(-100))); // Keep last 100 errors
        };
        
        const getErrors = () => [...errors];
        
        const clearErrors = () => {
            errors.length = 0;
            localStorage.removeItem('error_logs');
        };
        
        // Listen for unhandled errors
        window.addEventListener('error', (event) => {
            log(event.error, { type: 'unhandled' });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            log(event.reason, { type: 'unhandled_rejection' });
        });
        
        return { log, getErrors, clearErrors };
    }

    // Create analytics tracker
    createAnalyticsTracker() {
        const track = (event, properties = {}) => {
            const eventData = {
                event,
                properties,
                timestamp: new Date().toISOString(),
                userId: authManager.currentUser?.uid,
                page: window.location.pathname
            };
            
            // Send to Firebase Analytics in production
            if (typeof firebase !== 'undefined' && firebase.analytics) {
                firebase.analytics().logEvent(event, properties);
            }
            
            // Also log to console for debugging
            console.log('Analytics Event:', eventData);
        };
        
        const trackPageView = (pageName) => {
            track('page_view', { page: pageName });
        };
        
        const trackButtonClick = (buttonName) => {
            track('button_click', { button: buttonName });
        };
        
        const trackFormSubmit = (formName) => {
            track('form_submit', { form: formName });
        };
        
        return { track, trackPageView, trackButtonClick, trackFormSubmit };
    }

    // Create A/B testing framework
    createABTestFramework() {
        const experiments = new Map();
        
        const defineExperiment = (name, variants, weights = []) => {
            if (variants.length === 0) return null;
            
            // Assign equal weights if not provided
            const actualWeights = weights.length === variants.length ? weights : 
                                 Array(variants.length).fill(1 / variants.length);
            
            experiments.set(name, { variants, weights: actualWeights });
            
            // Get or assign variant for current user
            const storageKey = `ab_test_${name}`;
            let assignedVariant = localStorage.getItem(storageKey);
            
            if (!assignedVariant || !variants.includes(assignedVariant)) {
                // Assign variant based on weights
                const random = Math.random();
                let cumulativeWeight = 0;
                
                for (let i = 0; i < variants.length; i++) {
                    cumulativeWeight += actualWeights[i];
                    if (random <= cumulativeWeight) {
                        assignedVariant = variants[i];
                        break;
                    }
                }
                
                localStorage.setItem(storageKey, assignedVariant);
            }
            
            return assignedVariant;
        };
        
        const getVariant = (name) => {
            const experiment = experiments.get(name);
            if (!experiment) return null;
            
            const storageKey = `ab_test_${name}`;
            return localStorage.getItem(storageKey);
        };
        
        const trackConversion = (experimentName, variant, conversionName) => {
            const key = `ab_conversion_${experimentName}_${variant}_${conversionName}`;
            let count = parseInt(localStorage.getItem(key) || '0');
            count++;
            localStorage.setItem(key, count.toString());
            
            // In production, send to analytics service
            console.log(`Conversion: ${experimentName}.${variant}.${conversionName} = ${count}`);
        };
        
        const getResults = (experimentName) => {
            const experiment = experiments.get(experimentName);
            if (!experiment) return null;
            
            const results = {};
            experiment.variants.forEach(variant => {
                results[variant] = {
                    assignments: 0,
                    conversions: {}
                };
                
                // Count assignments
                Object.keys(localStorage).forEach(key => {
                    if (key === `ab_test_${experimentName}` && localStorage.getItem(key) === variant) {
                        results[variant].assignments++;
                    }
                });
                
                // Count conversions
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(`ab_conversion_${experimentName}_${variant}_`)) {
                        const conversionName = key.split('_').pop();
                        results[variant].conversions[conversionName] = 
                            parseInt(localStorage.getItem(key) || '0');
                    }
                });
            });
            
            return results;
        };
        
        return { defineExperiment, getVariant, trackConversion, getResults };
    }

    // Create feature flag system
    createFeatureFlagSystem() {
        const flags = new Map();
        
        const defineFlag = (name, defaultValue = false, rules = {}) => {
            flags.set(name, { defaultValue, rules });
            
            // Check if flag should be enabled for current user
            const shouldEnable = evaluateFlagRules(name, rules);
            localStorage.setItem(`feature_flag_${name}`, shouldEnable.toString());
            
            return shouldEnable;
        };
        
        const evaluateFlagRules = (name, rules) => {
            // Default to false if no rules
            if (!rules || Object.keys(rules).length === 0) {
                return flags.get(name)?.defaultValue || false;
            }
            
            // Check user-based rules
            if (rules.userIds && authManager.currentUser) {
                if (rules.userIds.includes(authManager.currentUser.uid)) {
                    return true;
                }
            }
            
            // Check percentage-based rollout
            if (rules.percentage) {
                const random = Math.random() * 100;
                if (random <= rules.percentage) {
                    return true;
                }
            }
            
            // Check environment-based rules
            if (rules.environments) {
                const env = window.location.hostname;
                if (rules.environments.includes(env)) {
                    return true;
                }
            }
            
            // Check time-based rules
            if (rules.startDate && rules.endDate) {
                const now = new Date();
                const start = new Date(rules.startDate);
                const end = new Date(rules.endDate);
                
                if (now >= start && now <= end) {
                    return true;
                }
            }
            
            return flags.get(name)?.defaultValue || false;
        };
        
        const isEnabled = (name) => {
            const stored = localStorage.getItem(`feature_flag_${name}`);
            if (stored !== null) {
                return stored === 'true';
            }
            
            const flag = flags.get(name);
            return flag ? flag.defaultValue : false;
        };
        
        const enable = (name) => {
            localStorage.setItem(`feature_flag_${name}`, 'true');
        };
        
        const disable = (name) => {
            localStorage.setItem(`feature_flag_${name}`, 'false');
        };
        
        const getAllFlags = () => {
            const allFlags = {};
            flags.forEach((value, key) => {
                allFlags[key] = isEnabled(key);
            });
            return allFlags;
        };
        
        return { defineFlag, isEnabled, enable, disable, getAllFlags };
    }

    // Create internationalization (i18n) system
    createI18nSystem(defaultLanguage = 'en') {
        const translations = {
            en: {
                // English translations would go here
                welcome: 'Welcome',
                login: 'Login',
                logout: 'Logout'
            },
            // Other languages would be added here
        };
        
        let currentLanguage = localStorage.getItem('preferred_language') || defaultLanguage;
        
        const t = (key, params = {}) => {
            let translation = translations[currentLanguage]?.[key] || translations[defaultLanguage]?.[key] || key;
            
            // Replace parameters
            Object.keys(params).forEach(param => {
                translation = translation.replace(`{{${param}}}`, params[param]);
            });
            
            return translation;
        };
        
        const setLanguage = (language) => {
            if (translations[language]) {
                currentLanguage = language;
                localStorage.setItem('preferred_language', language);
                
                // Dispatch language change event
                window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
            }
        };
        
        const getLanguage = () => currentLanguage;
        
        const getAvailableLanguages = () => Object.keys(translations);
        
        const addTranslations = (language, newTranslations) => {
            if (!translations[language]) {
                translations[language] = {};
            }
            
            Object.assign(translations[language], newTranslations);
        };
        
        return { t, setLanguage, getLanguage, getAvailableLanguages, addTranslations };
    }

    // Create accessibility utilities
    createAccessibilityUtils() {
        const isHighContrast = () => {
            return window.matchMedia('(prefers-contrast: high)').matches;
        };
        
        const isReducedMotion = () => {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        };
        
        const getTextSize = () => {
            const style = window.getComputedStyle(document.documentElement);
            return parseFloat(style.fontSize);
        };
        
        const setTextSize = (multiplier) => {
            document.documentElement.style.fontSize = `${16 * multiplier}px`;
        };
        
        const resetTextSize = () => {
            document.documentElement.style.fontSize = '';
        };
        
        const focusFirstInteractive = (container) => {
            const focusable = container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        };
        
        const trapFocus = (container) => {
            const focusable = container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusable.length === 0) return;
            
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            
            const trap = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }
            };
            
            container.addEventListener('keydown', trap);
            
            return () => {
                container.removeEventListener('keydown', trap);
            };
        };
        
        const announce = (message, priority = 'polite') => {
            const ariaLive = document.getElementById('aria-live-region');
            let region = ariaLive;
            
            if (!region) {
                region = document.createElement('div');
                region.id = 'aria-live-region';
                region.setAttribute('aria-live', priority);
                region.setAttribute('aria-atomic', 'true');
                region.style.position = 'absolute';
                region.style.left = '-9999px';
                region.style.height = '1px';
                region.style.width = '1px';
                region.style.overflow = 'hidden';
                document.body.appendChild(region);
            }
            
            region.textContent = message;
            
            // Clear after announcement
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        };
        
        return {
            isHighContrast,
            isReducedMotion,
            getTextSize,
            setTextSize,
            resetTextSize,
            focusFirstInteractive,
            trapFocus,
            announce
        };
    }

    // Create security utilities
    createSecurityUtils() {
        const sanitizeHTML = (html) => {
            const temp = document.createElement('div');
            temp.textContent = html;
            return temp.innerHTML;
        };
        
        const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };
        
        const validatePasswordStrength = (password) => {
            const requirements = {
                length: password.length >= 8,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                number: /\d/.test(password),
                special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
            };
            
            const score = Object.values(requirements).filter(Boolean).length;
            let strength = 'weak';
            
            if (score >= 4) strength = 'strong';
            else if (score >= 3) strength = 'medium';
            
            return {
                requirements,
                score,
                strength,
                isValid: score >= 3
            };
        };
        
        const generateSecureToken = (length = 32) => {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        };
        
        const hashString = async (string) => {
            // Simple hash for demo - in production use proper cryptographic hash
            const encoder = new TextEncoder();
            const data = encoder.encode(string);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };
        
        const detectXSS = (input) => {
            const xssPatterns = [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /<\s*iframe/gi,
                /<\s*object/gi,
                /<\s*embed/gi,
                /<\s*applet/gi,
                /<\s*meta/gi,
                /<\s*link/gi,
                /expression\s*\(/gi
            ];
            
            return xssPatterns.some(pattern => pattern.test(input));
        };
        
        const detectSQLInjection = (input) => {
            const sqlPatterns = [
                /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
                /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
                /union\s+select/gi,
                /exec(\s|\+)+(s|x)p\w+/gi,
                /insert\s+into/gi,
                /select\s+from/gi,
                /delete\s+from/gi,
                /update\s+\w+\s+set/gi,
                /drop\s+table/gi,
                /truncate\s+table/gi
            ];
            
            return sqlPatterns.some(pattern => pattern.test(input));
        };
        
        const createRateLimiter = (limit, interval) => {
            const requests = new Map();
            
            return (key) => {
                const now = Date.now();
                const userRequests = requests.get(key) || [];
                
                // Clean old requests
                const validRequests = userRequests.filter(time => now - time < interval);
                
                if (validRequests.length >= limit) {
                    return false; // Rate limited
                }
                
                validRequests.push(now);
                requests.set(key, validRequests);
                return true; // Allowed
            };
        };
        
        return {
            sanitizeHTML,
            escapeRegExp,
            validatePasswordStrength,
            generateSecureToken,
            hashString,
            detectXSS,
            detectSQLInjection,
            createRateLimiter
        };
    }

    // Create performance optimization utilities
    createPerformanceUtils() {
        const lazyLoadImages = () => {
            const images = document.querySelectorAll('img[data-src]');
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => observer.observe(img));
        };
        
        const debounceImages = () => {
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    // Adjust image sizes on resize
                    document.querySelectorAll('img').forEach(img => {
                        if (img.dataset.srcset) {
                            const width = img.clientWidth;
                            const srcset = img.dataset.srcset.split(',');
                            const bestSrc = srcset.reduce((best, current) => {
                                const [url, size] = current.trim().split(' ');
                                const currentSize = parseInt(size);
                                if (!best || Math.abs(currentSize - width) < Math.abs(best.size - width)) {
                                    return { url, size: currentSize };
                                }
                                return best;
                            }, null);
                            
                            if (bestSrc && img.src !== bestSrc.url) {
                                img.src = bestSrc.url;
                            }
                        }
                    });
                }, 250);
            });
        };
        
        const optimizeImages = () => {
            // Add lazy loading and responsive images
            document.querySelectorAll('img').forEach(img => {
                if (!img.loading) {
                    img.loading = 'lazy';
                }
                
                if (!img.decoding) {
                    img.decoding = 'async';
                }
            });
        };
        
        const preloadCriticalResources = () => {
            const critical = [
                // Add critical resource URLs here
            ];
            
            critical.forEach(url => {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = url;
                link.as = url.endsWith('.css') ? 'style' : 
                         url.endsWith('.js') ? 'script' : 'fetch';
                document.head.appendChild(link);
            });
        };
        
        const measurePaintTimes = () => {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.log(`${entry.name}:`, entry.startTime);
                }
            });
            
            observer.observe({ entryTypes: ['paint'] });
        };
        
        const monitorLongTasks = () => {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn('Long task detected:', entry);
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            }
        };
        
        const createVirtualList = (container, items, renderItem, itemHeight) => {
            let visibleItems = [];
            let scrollTop = 0;
            
            const updateVisibleItems = () => {
                const containerHeight = container.clientHeight;
                const startIndex = Math.floor(scrollTop / itemHeight);
                const visibleCount = Math.ceil(containerHeight / itemHeight);
                const endIndex = Math.min(startIndex + visibleCount, items.length);
                
                // Remove old items
                visibleItems.forEach(item => item.element.remove());
                visibleItems = [];
                
                // Add new items
                for (let i = startIndex; i < endIndex; i++) {
                    const element = renderItem(items[i], i);
                    element.style.position = 'absolute';
                    element.style.top = `${i * itemHeight}px`;
                    element.style.height = `${itemHeight}px`;
                    element.style.width = '100%';
                    
                    container.appendChild(element);
                    visibleItems.push({ element, index: i });
                }
                
                // Set container height for scroll
                container.style.height = `${items.length * itemHeight}px`;
            };
            
            container.addEventListener('scroll', () => {
                scrollTop = container.scrollTop;
                updateVisibleItems();
            });
            
            updateVisibleItems();
            
            return {
                updateItems: (newItems) => {
                    items = newItems;
                    updateVisibleItems();
                },
                destroy: () => {
                    visibleItems.forEach(item => item.element.remove());
                    container.removeEventListener('scroll', () => {});
                }
            };
        };
        
        return {
            lazyLoadImages,
            debounceImages,
            optimizeImages,
            preloadCriticalResources,
            measurePaintTimes,
            monitorLongTasks,
            createVirtualList
        };
    }

    // Create data visualization utilities
    createDataVizUtils() {
        const colorPalettes = {
            sequential: ['#FF6B6B', '#FF8E53', '#FFB142', '#FFD93D', '#6BCF7F', '#4ECDC4', '#45B7D1', '#4A90E2', '#8B6DFF'],
            categorical: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFD93D', '#6BCF7F', '#8B6DFF', '#FF8E53', '#FFB142'],
            diverging: ['#D32F2F', '#F44336', '#FF9800', '#FFC107', '#FFEB3B', '#CDDC39', '#8BC34A', '#4CAF50', '#009688']
        };
        
        const getColor = (index, palette = 'categorical') => {
            const colors = colorPalettes[palette] || colorPalettes.categorical;
            return colors[index % colors.length];
        };
        
        const createGradient = (color1, color2) => {
            return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        };
        
        const formatLargeNumber = (num) => {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        };
        
        const createSparkline = (data, width = 100, height = 30) => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.style.verticalAlign = 'middle';
            
            if (data.length < 2) return svg;
            
            const max = Math.max(...data);
            const min = Math.min(...data);
            const range = max - min || 1;
            
            const points = data.map((value, index) => {
                const x = (index / (data.length - 1)) * (width - 4) + 2;
                const y = height - 2 - ((value - min) / range) * (height - 4);
                return `${x},${y}`;
            }).join(' ');
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            path.setAttribute('points', points);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#4A90E2');
            path.setAttribute('stroke-width', '1.5');
            
            svg.appendChild(path);
            return svg;
        };
        
        const createDonutChart = (data, size = 100) => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
            
            const total = data.reduce((sum, item) => sum + item.value, 0);
            let currentAngle = 0;
            const center = size / 2;
            const radius = size / 2 - 5;
            const holeRadius = radius * 0.6;
            
            data.forEach((item, index) => {
                const angle = (item.value / total) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                
                // Convert angles to radians
                const startRad = (startAngle - 90) * Math.PI / 180;
                const endRad = (endAngle - 90) * Math.PI / 180;
                
                // Calculate points for the arc
                const x1 = center + radius * Math.cos(startRad);
                const y1 = center + radius * Math.sin(startRad);
                const x2 = center + radius * Math.cos(endRad);
                const y2 = center + radius * Math.sin(endRad);
                
                const x3 = center + holeRadius * Math.cos(endRad);
                const y3 = center + holeRadius * Math.sin(endRad);
                const x4 = center + holeRadius * Math.cos(startRad);
                const y4 = center + holeRadius * Math.sin(startRad);
                
                // Create path for the segment
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const largeArc = angle > 180 ? 1 : 0;
                
                const d = [
                    `M ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                    `L ${x3} ${y3}`,
                    `A ${holeRadius} ${holeRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                    'Z'
                ].join(' ');
                
                path.setAttribute('d', d);
                path.setAttribute('fill', item.color || getColor(index));
                
                svg.appendChild(path);
                currentAngle = endAngle;
            });
            
            // Add center text
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', center);
            text.setAttribute('y', center);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dy', '0.35em');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.textContent = formatLargeNumber(total);
            
            svg.appendChild(text);
            return svg;
        };
        
        const createBarChart = (data, options = {}) => {
            const width = options.width || 400;
            const height = options.height || 200;
            const padding = options.padding || { top: 20, right: 20, bottom: 30, left: 40 };
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;
            
            const maxValue = Math.max(...data.map(d => d.value));
            const barWidth = chartWidth / data.length * 0.8;
            const barSpacing = chartWidth / data.length * 0.2;
            
            // Draw bars
            data.forEach((item, index) => {
                const barHeight = (item.value / maxValue) * chartHeight;
                const x = padding.left + index * (barWidth + barSpacing) + barSpacing / 2;
                const y = height - padding.bottom - barHeight;
                
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', barWidth);
                rect.setAttribute('height', barHeight);
                rect.setAttribute('fill', item.color || getColor(index));
                
                svg.appendChild(rect);
                
                // Add label
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x + barWidth / 2);
                text.setAttribute('y', height - padding.bottom + 15);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '10');
                text.textContent = item.label;
                
                svg.appendChild(text);
            });
            
            // Add value labels on top of bars
            data.forEach((item, index) => {
                const barHeight = (item.value / maxValue) * chartHeight;
                const x = padding.left + index * (barWidth + barSpacing) + barWidth / 2;
                const y = height - padding.bottom - barHeight - 5;
                
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x);
                text.setAttribute('y', y);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '10');
                text.setAttribute('font-weight', 'bold');
                text.textContent = formatLargeNumber(item.value);
                
                svg.appendChild(text);
            });
            
            return svg;
        };
        
        return {
            getColor,
            createGradient,
            formatLargeNumber,
            createSparkline,
            createDonutChart,
            createBarChart,
            colorPalettes
        };
    }

    // Create testing utilities
    createTestingUtils() {
        const createMockData = (type, count = 10) => {
            const mockData = {
                users: Array.from({ length: count }, (_, i) => ({
                    id: `user_${i}`,
                    email: `user${i}@example.com`,
                    fullName: `User ${i}`,
                    role: i === 0 ? 'sudo' : i < 3 ? 'admin' : i < 8 ? 'agent' : 'customer',
                    status: i < 8 ? 'active' : 'pending',
                    phone: this.generateZambianPhone(),
                    createdAt: new Date(Date.now() - i * 86400000).toISOString()
                })),
                
                loans: Array.from({ length: count }, (_, i) => ({
                    id: `loan_${i}`,
                    loanNumber: `LN${2024000 + i}`,
                    customerId: `customer_${i}`,
                    customerName: `Customer ${i}`,
                    amount: 1000 + i * 500,
                    interestRate: 12.5,
                    duration: 6 + (i % 6),
                    status: ['pending', 'approved', 'active', 'overdue', 'defaulted', 'completed'][i % 6],
                    disbursedAmount: 1000 + i * 500,
                    repaidAmount: i > 5 ? (1000 + i * 500) * 0.7 : 0,
                    disbursementDate: new Date(Date.now() - i * 86400000).toISOString(),
                    dueDate: new Date(Date.now() + (30 + i * 30) * 86400000).toISOString(),
                    agentId: `agent_${i % 5}`,
                    agentName: `Agent ${i % 5}`,
                    collateralValue: 1500 + i * 750,
                    penaltyAmount: i > 8 ? 50 + i * 10 : 0
                })),
                
                agents: Array.from({ length: Math.min(count, 5) }, (_, i) => ({
                    id: `agent_${i}`,
                    agentId: `AG${1000 + i}`,
                    fullName: `Agent ${i}`,
                    email: `agent${i}@example.com`,
                    phone: this.generateZambianPhone(),
                    nrcNumber: `${123456 + i}/78/9`,
                    status: i < 4 ? 'approved' : 'pending',
                    totalCustomers: 5 + i * 3,
                    activeLoans: 3 + i * 2,
                    totalCommission: 500 + i * 250,
                    rating: 3 + (i % 3),
                    joinedDate: new Date(Date.now() - i * 86400000 * 30).toISOString()
                })),
                
                repayments: Array.from({ length: count * 3 }, (_, i) => ({
                    id: `repayment_${i}`,
                    loanId: `loan_${Math.floor(i / 3)}`,
                    amount: 200 + (i % 5) * 50,
                    installment: (i % 3) + 1,
                    dueDate: new Date(Date.now() + (i % 30) * 86400000).toISOString(),
                    paymentDate: i < count * 2 ? new Date(Date.now() - (i % 10) * 86400000).toISOString() : null,
                    status: i < count * 2 ? 'paid' : 'pending',
                    paymentMethod: ['bank', 'mobile_money', 'cash'][i % 3],
                    transactionId: `TXN${2024000000 + i}`,
                    verified: i < count * 1.5,
                    verifiedBy: i < count * 1.5 ? `admin_${i % 2}` : null
                })),
                
                collaterals: Array.from({ length: count }, (_, i) => ({
                    id: `collateral_${i}`,
                    loanId: `loan_${i}`,
                    type: ['vehicle', 'electronics', 'jewelry', 'property', 'equipment'][i % 5],
                    description: `Description for collateral ${i}`,
                    estimatedValue: 1500 + i * 750,
                    actualValue: 1400 + i * 700,
                    condition: ['new', 'like_new', 'good', 'fair', 'poor'][i % 5],
                    location: `Location ${i}`,
                    photos: Array.from({ length: 3 }, (_, j) => 
                        `https://example.com/collateral_${i}_${j}.jpg`),
                    verified: i < 8,
                    verificationDate: i < 8 ? new Date(Date.now() - i * 86400000).toISOString() : null,
                    verifiedBy: i < 8 ? `admin_${i % 2}` : null,
                    status: i < 8 ? 'verified' : 'pending'
                }))
            };
            
            return mockData[type] || [];
        };
        
        const runPerformanceTest = async (testFunction, iterations = 1000) => {
            const startTime = performance.now();
            
            for (let i = 0; i < iterations; i++) {
                await testFunction();
            }
            
            const endTime = performance.now();
            const averageTime = (endTime - startTime) / iterations;
            
            return {
                totalTime: endTime - startTime,
                averageTime,
                iterations,
                opsPerSecond: 1000 / averageTime
            };
        };
        
        const createTestUser = (role = 'customer') => {
            const id = this.generateId('test_user');
            return {
                id,
                email: `test_${role}_${Date.now()}@example.com`,
                password: 'Test123!',
                role,
                fullName: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                phone: this.generateZambianPhone(),
                nrcNumber: `${Math.floor(Math.random() * 900000) + 100000}/78/9`,
                status: 'active'
            };
        };
        
        const simulateNetworkDelay = (min = 100, max = 1000) => {
            const delay = Math.random() * (max - min) + min;
            return new Promise(resolve => setTimeout(resolve, delay));
        };
        
        const createLoadTest = (concurrentUsers, duration, requestFunction) => {
            return new Promise((resolve) => {
                const results = {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    averageResponseTime: 0,
                    requestsPerSecond: 0,
                    errors: []
                };
                
                const startTime = Date.now();
                const endTime = startTime + duration * 1000;
                
                const makeRequest = async () => {
                    if (Date.now() >= endTime) return;
                    
                    const requestStart = Date.now();
                    
                    try {
                        await requestFunction();
                        results.successfulRequests++;
                    } catch (error) {
                        results.failedRequests++;
                        results.errors.push(error.message);
                    } finally {
                        results.totalRequests++;
                        const responseTime = Date.now() - requestStart;
                        results.averageResponseTime = 
                            (results.averageResponseTime * (results.totalRequests - 1) + responseTime) / results.totalRequests;
                        
                        // Schedule next request
                        setTimeout(makeRequest, Math.random() * 100);
                    }
                };
                
                // Start concurrent users
                for (let i = 0; i < concurrentUsers; i++) {
                    makeRequest();
                }
                
                // Calculate final results
                const calculateResults = () => {
                    const actualDuration = (Date.now() - startTime) / 1000;
                    results.requestsPerSecond = results.totalRequests / actualDuration;
                    resolve(results);
                };
                
                setTimeout(calculateResults, duration * 1000 + 1000);
            });
        };
        
        const createStressTest = (initialLoad, increment, maxLoad, requestFunction) => {
            return new Promise(async (resolve) => {
                const results = [];
                let currentLoad = initialLoad;
                
                while (currentLoad <= maxLoad) {
                    const result = await createLoadTest(currentLoad, 30, requestFunction);
                    results.push({
                        load: currentLoad,
                        ...result
                    });
                    
                    if (result.failedRequests > result.successfulRequests * 0.1) {
                        // More than 10% failures, stop test
                        break;
                    }
                    
                    currentLoad += increment;
                }
                
                resolve(results);
            });
        };
        
        const validateDataConsistency = (data, rules) => {
            const inconsistencies = [];
            
            rules.forEach(rule => {
                switch (rule.type) {
                    case 'foreign_key':
                        const parentData = data[rule.parent];
                        const childData = data[rule.child];
                        
                        if (parentData && childData) {
                            childData.forEach(childItem => {
                                const parentId = childItem[rule.childField];
                                if (parentId && !parentData.find(p => p[rule.parentField] === parentId)) {
                                    inconsistencies.push({
                                        type: 'foreign_key',
                                        message: `Child record references non-existent parent: ${parentId}`,
                                        childId: childItem.id,
                                        parentId
                                    });
                                }
                            });
                        }
                        break;
                        
                    case 'required_field':
                        const dataset = data[rule.dataset];
                        if (dataset) {
                            dataset.forEach(item => {
                                rule.fields.forEach(field => {
                                    if (!item[field] && item[field] !== 0) {
                                        inconsistencies.push({
                                            type: 'required_field',
                                            message: `Missing required field: ${field}`,
                                            recordId: item.id,
                                            field
                                        });
                                    }
                                });
                            });
                        }
                        break;
                        
                    case 'data_type':
                        const dataset2 = data[rule.dataset];
                        if (dataset2) {
                            dataset2.forEach(item => {
                                rule.fields.forEach(field => {
                                    const value = item[field];
                                    if (value !== undefined && value !== null) {
                                        const expectedType = rule.types[field];
                                        const actualType = typeof value;
                                        
                                        if (actualType !== expectedType) {
                                            inconsistencies.push({
                                                type: 'data_type',
                                                message: `Field ${field} expected ${expectedType}, got ${actualType}`,
                                                recordId: item.id,
                                                field,
                                                expectedType,
                                                actualType
                                            });
                                        }
                                    }
                                });
                            });
                        }
                        break;
                }
            });
            
            return inconsistencies;
        };
        
        const createTestReport = (tests) => {
            const report = {
                timestamp: new Date().toISOString(),
                totalTests: tests.length,
                passedTests: tests.filter(t => t.passed).length,
                failedTests: tests.filter(t => !t.passed).length,
                tests: tests.map(test => ({
                    name: test.name,
                    passed: test.passed,
                    duration: test.duration,
                    error: test.error
                })),
                summary: function() {
                    const passRate = (this.passedTests / this.totalTests) * 100;
                    return {
                        passRate: passRate.toFixed(2) + '%',
                        status: passRate >= 95 ? 'Excellent' : 
                               passRate >= 90 ? 'Good' : 
                               passRate >= 80 ? 'Fair' : 'Poor'
                    };
                }
            };
            
            return report;
        };
        
        return {
            createMockData,
            runPerformanceTest,
            createTestUser,
            simulateNetworkDelay,
            createLoadTest,
            createStressTest,
            validateDataConsistency,
            createTestReport
        };
    }

    // Create backup and restore utilities
    createBackupUtils() {
        const createBackup = async (includeTypes = ['users', 'loans', 'agents', 'collaterals', 'repayments']) => {
            const backup = {
                metadata: {
                    version: '1.0',
                    created: new Date().toISOString(),
                    createdBy: authManager.currentUser?.uid,
                    includeTypes
                },
                data: {}
            };
            
            try {
                for (const type of includeTypes) {
                    const snapshot = await database.ref(type).once('value');
                    backup.data[type] = snapshot.val() || {};
                }
                
                return backup;
            } catch (error) {
                throw new Error(`Backup failed: ${error.message}`);
            }
        };
        
        const restoreBackup = async (backup, options = {}) => {
            const { merge = false, validate = true } = options;
            
            if (validate) {
                const validation = validateBackup(backup);
                if (!validation.valid) {
                    throw new Error(`Invalid backup: ${validation.errors.join(', ')}`);
                }
            }
            
            try {
                const updates = {};
                
                Object.entries(backup.data).forEach(([type, data]) => {
                    if (merge) {
                        updates[type] = data;
                    } else {
                        // Clear existing data first
                        updates[type] = null;
                        updates[type] = data;
                    }
                });
                
                await database.ref().update(updates);
                
                // Log the restore action
                await db.logActivity(authManager.currentUser.uid, 'BACKUP_RESTORE', {
                    backupDate: backup.metadata.created,
                    includeTypes: backup.metadata.includeTypes,
                    merge
                });
                
                return { success: true, message: 'Backup restored successfully' };
            } catch (error) {
                throw new Error(`Restore failed: ${error.message}`);
            }
        };
        
        const validateBackup = (backup) => {
            const errors = [];
            
            if (!backup.metadata) {
                errors.push('Missing metadata');
            }
            
            if (!backup.metadata.version) {
                errors.push('Missing version information');
            }
            
            if (!backup.metadata.created) {
                errors.push('Missing creation date');
            }
            
            if (!backup.data) {
                errors.push('Missing data');
            }
            
            // Check for required top-level keys
            const requiredTypes = ['users', 'loans'];
            requiredTypes.forEach(type => {
                if (!backup.data[type]) {
                    errors.push(`Missing required data type: ${type}`);
                }
            });
            
            return {
                valid: errors.length === 0,
                errors
            };
        };
        
        const exportBackup = (backup, format = 'json') => {
            let content, filename, mimeType;
            
            switch (format) {
                case 'json':
                    content = JSON.stringify(backup, null, 2);
                    filename = `trucash_backup_${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                    break;
                    
                case 'csv':
                    // Convert to CSV (simplified)
                    const csvData = [];
                    Object.entries(backup.data).forEach(([type, data]) => {
                        if (Object.keys(data).length > 0) {
                            const sample = Object.values(data)[0];
                            const headers = Object.keys(sample).join(',');
                            const rows = Object.values(data).map(item => 
                                Object.values(item).map(v => 
                                    typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
                                ).join(',')
                            );
                            csvData.push(`=== ${type.toUpperCase()} ===`);
                            csvData.push(headers);
                            csvData.push(...rows);
                            csvData.push('');
                        }
                    });
                    content = csvData.join('\n');
                    filename = `trucash_backup_${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                    break;
                    
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            
            this.downloadFile(content, filename, mimeType);
        };
        
        const importBackup = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        let backup;
                        
                        if (file.name.endsWith('.json')) {
                            backup = JSON.parse(content);
                        } else if (file.name.endsWith('.csv')) {
                            // Convert CSV to backup format (simplified)
                            backup = {
                                metadata: {
                                    version: '1.0',
                                    created: new Date().toISOString(),
                                    createdBy: authManager.currentUser?.uid,
                                    includeTypes: []
                                },
                                data: {}
                            };
                            // CSV parsing logic would go here
                        } else {
                            reject(new Error('Unsupported file format'));
                            return;
                        }
                        
                        resolve(backup);
                    } catch (error) {
                        reject(new Error(`Failed to parse file: ${error.message}`));
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('Failed to read file'));
                };
                
                reader.readAsText(file);
            });
        };
        
        const createIncrementalBackup = async (since) => {
            const changes = {};
            const sinceDate = new Date(since);
            
            // This is a simplified version - in production, you'd track changes differently
            const allTypes = ['users', 'loans', 'agents', 'collaterals', 'repayments'];
            
            for (const type of allTypes) {
                const snapshot = await database.ref(type)
                    .orderByChild('updatedAt')
                    .startAt(sinceDate.getTime())
                    .once('value');
                
                const data = snapshot.val();
                if (data) {
                    changes[type] = data;
                }
            }
            
            return {
                metadata: {
                    type: 'incremental',
                    since: sinceDate.toISOString(),
                    created: new Date().toISOString(),
                    createdBy: authManager.currentUser?.uid
                },
                changes
            };
        };
        
        const applyIncrementalBackup = async (incrementalBackup) => {
            try {
                const updates = {};
                
                Object.entries(incrementalBackup.changes).forEach(([type, changes]) => {
                    Object.entries(changes).forEach(([id, data]) => {
                        updates[`${type}/${id}`] = data;
                    });
                });
                
                await database.ref().update(updates);
                
                return { success: true, message: 'Incremental backup applied' };
            } catch (error) {
                throw new Error(`Failed to apply incremental backup: ${error.message}`);
            }
        };
        
        const scheduleBackup = (interval = 24 * 60 * 60 * 1000) => {
            let backupInterval;
            
            const start = () => {
                backupInterval = setInterval(async () => {
                    try {
                        const backup = await createBackup();
                        // Store backup somewhere (in production, this would be cloud storage)
                        localStorage.setItem(
                            `auto_backup_${new Date().toISOString().split('T')[0]}`,
                            JSON.stringify(backup)
                        );
                        
                        console.log('Auto-backup completed');
                    } catch (error) {
                        console.error('Auto-backup failed:', error);
                    }
                }, interval);
            };
            
            const stop = () => {
                if (backupInterval) {
                    clearInterval(backupInterval);
                }
            };
            
            return { start, stop };
        };
        
        const getBackupHistory = () => {
            const backups = [];
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('auto_backup_') || key.startsWith('manual_backup_')) {
                    try {
                        const backup = JSON.parse(localStorage.getItem(key));
                        backups.push({
                            key,
                            date: key.split('_').pop(),
                            size: JSON.stringify(backup).length,
                            type: key.startsWith('auto_') ? 'auto' : 'manual'
                        });
                    } catch (error) {
                        console.error('Failed to parse backup:', key, error);
                    }
                }
            });
            
            return backups.sort((a, b) => b.date.localeCompare(a.date));
        };
        
        const cleanupOldBackups = (maxAge = 7 * 24 * 60 * 60 * 1000) => {
            const cutoff = Date.now() - maxAge;
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('auto_backup_') || key.startsWith('manual_backup_')) {
                    const dateStr = key.split('_').pop();
                    const date = new Date(dateStr);
                    
                    if (date.getTime() < cutoff) {
                        localStorage.removeItem(key);
                    }
                }
            });
        };
        
        return {
            createBackup,
            restoreBackup,
            validateBackup,
            exportBackup,
            importBackup,
            createIncrementalBackup,
            applyIncrementalBackup,
            scheduleBackup,
            getBackupHistory,
            cleanupOldBackups
        };
    }
}

// Initialize Utils
const utils = new Utils();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}
