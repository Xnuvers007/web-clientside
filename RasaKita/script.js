const Security = {
    generateCSRFToken: function () {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },
    sanitizeInput: function (input) {
        // if (!input) return "";
        // return input.replace(/[<>]/g, function (match) {
        //     return match === "<" ? "&lt;" : "&gt;";
        // });
        if (!input) return '';
    
        if (typeof input === 'string') {
            return DOMPurify.sanitize(input, {ALLOWED_TAGS: []});
        }
        
        return DOMPurify.sanitize(input);
    },
    validateInput: function (input, pattern) {
        if (!pattern) return true;
        // return new RegExp(pattern).test(input);
        return DOMPurify.sanitize(input, {ALLOWED_TAGS: [], ALLOWED_ATTR: []}).match(new RegExp(pattern)) !== null;
    },
    init: function () {
        if (document.getElementById("csrf_token")) {
            document.getElementById("csrf_token").value = this.generateCSRFToken();
        }
        if (document.getElementById("contact_csrf_token")) {
            document.getElementById("contact_csrf_token").value = this.generateCSRFToken();
        }
        if (document.getElementById("login_csrf_token")) {
            document.getElementById("login_csrf_token").value = this.generateCSRFToken();
        }
        if (document.getElementById("register_csrf_token")) {
            document.getElementById("register_csrf_token").value = this.generateCSRFToken();
        }
        if (document.getElementById("checkoutForm")) {
            document.getElementById("checkoutForm").addEventListener("submit", function (e) {
                e.preventDefault();
                processOrder();
            });
        }

        if (document.getElementById("contactForm")) {
            document.getElementById("contactForm").addEventListener("submit", function (e) {
                e.preventDefault();
                processContactForm();
            });
        }
    },
};
const Auth = {
    isLoggedIn: false,
    currentUser: null,
    init: function () {
        if (document.getElementById("login_csrf_token")) {
            document.getElementById("login_csrf_token").value = Security.generateCSRFToken();
        }
        if (document.getElementById("register_csrf_token")) {
            document.getElementById("register_csrf_token").value = Security.generateCSRFToken();
        }
        document.getElementById("showRegisterBtn").addEventListener("click", function (e) {
            e.preventDefault();
            Modal.closeModal("loginModal");
            Modal.openModal("registerModal");
        });

        document.getElementById("showLoginBtn").addEventListener("click", function (e) {
            e.preventDefault();
            Modal.closeModal("registerModal");
            Modal.openModal("loginModal");
        });

        document.getElementById("loginForm").addEventListener("submit", function (e) {
            e.preventDefault();
            Auth.login();
        });

        document.getElementById("registerForm").addEventListener("submit", function (e) {
            e.preventDefault();
            Auth.register();
        });
        this.checkAuth();
    },
    showContent: function () {
        document.getElementById("landingPage").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
    },
    hideContent: function () {
        document.getElementById("landingPage").style.display = "flex";
        document.getElementById("mainContent").style.display = "none";
    },
    register: function () {
        const name = Security.sanitizeInput(document.getElementById("registerName").value);
        const email = Security.sanitizeInput(document.getElementById("registerEmail").value.toLowerCase());
        const phone = Security.sanitizeInput(document.getElementById("registerPhone").value);
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        if (!Security.validateInput(name, "^[A-Za-z\\s]+$")) {
            showToast("Nama hanya boleh berisi huruf dan spasi.", "error");
            return;
        }

        if (!Security.validateInput(email, "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$")) {
            showToast("Format email tidak valid.", "error");
            return;
        }

        if (!Security.validateInput(phone, "^[0-9]{10,13}$")) {
            showToast("Nomor telepon harus berisi 10-13 digit angka.", "error");
            return;
        }

        if (password.length < 6) {
            showToast("Password minimal 6 karakter.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Konfirmasi password tidak cocok.", "error");
            return;
        }
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        if (users.some((user) => user.email === email)) {
            showToast("Email sudah terdaftar. Silakan gunakan email lain.", "error");
            return;
        }
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email,
            phone: phone,
            password: this.hashPassword(password),
            orders: [],
        };
        users.push(newUser);
        localStorage.setItem("users", JSON.stringify(users));
        this.createSession(newUser);
        Modal.closeModal("registerModal");
        this.showContent();
        alert(`Selamat datang, ${name}! Akun Anda berhasil dibuat.`);
    },
    login: function () {
        const email = Security.sanitizeInput(document.getElementById("loginEmail").value.toLowerCase());
        const password = document.getElementById("loginPassword").value;
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        const user = users.find((user) => user.email === email);

        if (!user) {
            showToast("Email tidak terdaftar.", "error");
            return;
        }
        if (user.password !== this.hashPassword(password)) {
            showToast("Password salah.", "error");
            return;
        }
        this.createSession(user);
        Modal.closeModal("loginModal");
        this.showContent();
        alert(`Selamat datang kembali, ${user.name}!`);
    },
    createSession: function (user) {
        const session = {
            userId: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };

        localStorage.setItem("session", JSON.stringify(session));
        this.isLoggedIn = true;
        this.currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
        };
        this.updateAuthUI();
    },
    checkAuth: function () {
        const session = JSON.parse(localStorage.getItem("session") || "null");

        if (!session) {
            this.isLoggedIn = false;
            this.currentUser = null;
            this.updateAuthUI();
            this.hideContent();
            return;
        }
        if (new Date(session.expiresAt) < new Date()) {
            this.logout();
            return;
        }
        this.isLoggedIn = true;
        this.currentUser = {
            id: session.userId,
            name: session.name,
            email: session.email,
            phone: session.phone,
        };
        this.updateAuthUI();
        this.showContent();
    },
    updateAuthUI: function () {
        if (this.isLoggedIn && this.currentUser) {
            document.getElementById("userNameDisplay").textContent = this.currentUser.name;
            document.getElementById("userInfo").innerHTML = `
            <p><strong>${this.currentUser.name}</strong></p>
            <p style="font-size: 12px; color: #666;">${this.currentUser.email}</p>
        `;
            if (document.getElementById("name")) {
                document.getElementById("name").value = this.currentUser.name;
            }

            if (document.getElementById("phone")) {
                document.getElementById("phone").value = this.currentUser.phone;
            }
        }
    },
    logout: function () {
        localStorage.removeItem("session");
        this.isLoggedIn = false;
        this.currentUser = null;
        this.updateAuthUI();
        this.hideContent();
        document.getElementById("accountDropdown").classList.remove("show");
        showToast("Anda telah keluar dari akun.", "success");
    },
    hashPassword: function (password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    },
};
const Cart = {
    items: [],
    addItem: function (id, name, price, img) {
        const existingItem = this.items.find((item) => item.id === id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                id: id,
                name: name,
                price: price,
                img: img,
                quantity: 1,
            });
        }

        this.updateCartCount();
        this.saveCart();
        document.querySelector(".cart-icon").classList.add("pulse");
        setTimeout(() => {
            document.querySelector(".cart-icon").classList.remove("pulse");
        }, 500);
    },
    removeItem: function (id) {
        this.items = this.items.filter((item) => item.id !== id);
        this.updateCartCount();
        this.updateCartModal();
        this.saveCart();
    },
    updateQuantity: function (id, quantity) {
        const item = this.items.find((item) => item.id === id);

        if (item) {
            item.quantity = quantity;

            if (item.quantity <= 0) {
                this.removeItem(id);
            } else {
                this.updateCartCount();
                this.updateCartModal();
                this.saveCart();
            }
        }
    },
    calculateTotal: function () {
        return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
    },
    formatPrice: function (price) {
        return "Rp " + parseInt(price).toLocaleString("id-ID");
    },
    updateCartCount: function () {
        const totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
        document.getElementById("cart-count").textContent = totalItems;
    },
    updateCartModal: function () {
        const cartItemsElement = document.getElementById("cartItems");
        if (!cartItemsElement) {
            console.error("Cart items container not found");
            return;
        }
        cartItemsElement.innerHTML = "";

        if (this.items.length === 0) {
            cartItemsElement.innerHTML = '<p style="text-align: center; padding: 20px;">Keranjang belanja Anda kosong.</p>';
            document.getElementById("checkoutBtn").style.display = "none";
        } else {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                const itemElement = document.createElement("div");
                itemElement.className = "cart-item";

                itemElement.innerHTML = `
                <div class="cart-item-info">
                    <img src="${Security.sanitizeInput(item.img)}" alt="${Security.sanitizeInput(item.name)}" onerror="this.src='https://via.placeholder.com/60x60?text=Gambar'">
                    <div class="cart-item-details">
                        <h4>${Security.sanitizeInput(item.name)}</h4>
                        <p class="cart-item-price">${this.formatPrice(item.price)}</p>
                    </div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="Cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                    <span class="item-quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="Cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    <i class="fas fa-trash remove-item" onclick="Cart.removeItem('${item.id}')"></i>
                </div>
            `;

                cartItemsElement.appendChild(itemElement);
            }

            document.getElementById("checkoutBtn").style.display = "block";
        }
        document.getElementById("cartTotal").textContent = this.formatPrice(this.calculateTotal());
    },
    saveCart: function () {
        localStorage.setItem("cart", JSON.stringify(this.items));
    },
    loadCart: function () {
        const savedCart = localStorage.getItem("cart");

        if (savedCart) {
            try {
                this.items = JSON.parse(savedCart);
                this.updateCartCount();
            } catch (e) {
                console.error("Error loading cart from localStorage:", e);
                this.items = [];
            }
        }
    },
    clearCart: function () {
        this.items = [];
        this.updateCartCount();
        this.saveCart();
    },
};
const Menu = {
    filterItems: function (category) {
        const menuItems = document.querySelectorAll(".menu-item");
        const categoryButtons = document.querySelectorAll(".category-btn");
        categoryButtons.forEach((button) => {
            if (button.dataset.category === category) {
                button.classList.add("active");
            } else {
                button.classList.remove("active");
            }
        });
        menuItems.forEach((item) => {
            if (category === "all" || item.dataset.category === category) {
                item.style.display = "block";
            } else {
                item.style.display = "none";
            }
        });
    },
    init: function () {
        const categoryButtons = document.querySelectorAll(".category-btn");
        categoryButtons.forEach((button) => {
            button.addEventListener("click", function () {
                Menu.filterItems(this.dataset.category);
            });
        });
        const addToCartButtons = document.querySelectorAll(".add-to-cart");
        addToCartButtons.forEach((button) => {
            button.addEventListener("click", function () {
                const id = this.dataset.id;
                const name = this.dataset.name;
                const price = this.dataset.price;
                const img = this.dataset.img;

                Cart.addItem(id, name, price, img);
            });
        });
    },
};
const Modal = {
    openModal: function (modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = "block";

        if (modalId === "cartModal") {
            Cart.updateCartModal();
        }
    },
    closeModal: function (modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = "none";
    },
    init: function () {
        const closeButtons = document.querySelectorAll(".close");
        closeButtons.forEach((button) => {
            button.addEventListener("click", function () {
                const modal = this.closest(".modal");
                modal.style.display = "none";
            });
        });
        window.addEventListener("click", function (event) {
            if (event.target.classList.contains("modal")) {
                event.target.style.display = "none";
            }
        });
        document.querySelector(".cart-icon").addEventListener("click", function () {
            Modal.openModal("cartModal");
        });
        document.getElementById("checkoutBtn").addEventListener("click", function () {
            Modal.closeModal("cartModal");
            Modal.openModal("checkoutModal");
        });
    },
};
function processOrder() {
    const name = Security.sanitizeInput(document.getElementById("name").value);
    const phone = Security.sanitizeInput(document.getElementById("phone").value);
    const address = Security.sanitizeInput(document.getElementById("address").value);
    const paymentMethod = Security.sanitizeInput(document.getElementById("paymentMethod").value);
    const notes = Security.sanitizeInput(document.getElementById("notes").value);
    let orderDetailsHTML = "";
    let total = 0;

    for (let i = 0; i < Cart.items.length; i++) {
        const item = Cart.items[i];
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        orderDetailsHTML += `
                    <div class="order-item">
                        <span>${Security.sanitizeInput(item.name)} x ${item.quantity}</span>
                        <span>${Cart.formatPrice(itemTotal)}</span>
                    </div>
                `;
    }

    orderDetailsHTML += `
                <div class="order-total">
                    <span>Total:</span>
                    <span>${Cart.formatPrice(total)}</span>
                </div>
                <div style="margin-top: 20px;">
                    <p><strong>Nama:</strong> ${name}</p>
                    <p><strong>Telepon:</strong> ${phone}</p>
                    <p><strong>Alamat:</strong> ${address}</p>
                    <p><strong>Metode Pembayaran:</strong> ${paymentMethod === "transfer" ? "Transfer Bank" : paymentMethod === "cod" ? "Bayar di Tempat (COD)" : "E-Wallet"}</p>
                    ${notes ? `<p><strong>Catatan:</strong> ${notes}</p>` : ""}
                </div>
            `;
    document.getElementById("orderDetails").innerHTML = orderDetailsHTML;
    Modal.closeModal("checkoutModal");
    Modal.openModal("confirmationModal");
    let whatsappMessage = `Halo, saya ingin melakukan pembayaran untuk pesanan berikut:\n\n`;
    whatsappMessage += `*Pesanan atas nama: ${name}*\n`;
    whatsappMessage += `*Nomor Telepon: ${phone}*\n`;
    whatsappMessage += `*Alamat: ${address}*\n`;
    whatsappMessage += `*Metode Pembayaran: ${paymentMethod === "transfer" ? "Transfer Bank" : paymentMethod === "cod" ? "Bayar di Tempat (COD)" : "E-Wallet"}*\n\n`;

    whatsappMessage += `*Detail Pesanan:*\n`;
    for (let i = 0; i < Cart.items.length; i++) {
        const item = Cart.items[i];
        whatsappMessage += `${item.name} x ${item.quantity} = ${Cart.formatPrice(item.price * item.quantity)}\n`;
    }

    whatsappMessage += `\n*Total: ${Cart.formatPrice(total)}*`;

    if (notes) {
        whatsappMessage += `\n\n*Catatan: ${notes}*`;
    }
    const orderDetails = document.getElementById("orderDetails");
    const whatsappButton = document.createElement("button");
    whatsappButton.className = "btn-primary";
    whatsappButton.style.backgroundColor = "#25D366";
    whatsappButton.style.marginTop = "20px";
    whatsappButton.style.width = "100%";
    whatsappButton.innerHTML = '<i class="fab fa-whatsapp" style="margin-right: 8px;"></i> Lanjutkan ke WhatsApp untuk Pembayaran';

    whatsappButton.addEventListener("click", function () {
        window.open(`https://wa.me/62123456789?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
    });

    orderDetails.appendChild(whatsappButton);
    Cart.clearCart();
    document.getElementById("checkoutForm").reset();
}
function closeConfirmationModal() {
    Modal.closeModal("confirmationModal");
    document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
}
function scrollToMenu() {
    document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
}

function initMenuSearch() {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchBtn");

    function searchMenu() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const menuItems = document.querySelectorAll(".menu-item");
        let itemsFound = 0;

        menuItems.forEach((item) => {
            const menuText = item.textContent.toLowerCase();
            if (searchTerm === "" || menuText.includes(searchTerm)) {
                item.style.display = "block";
                itemsFound++;
            } else {
                item.style.display = "none";
            }
        });
        document.querySelectorAll(".category-btn").forEach((btn) => {
            btn.classList.remove("active");
        });
        document.querySelector('.category-btn[data-category="all"]').classList.add("active");
        if (itemsFound === 0 && searchTerm !== "") {
            console.log("Tidak ada menu yang sesuai dengan pencarian: " + searchTerm);
        }
    }
    if (searchButton) {
        searchButton.addEventListener("click", searchMenu);
    }
    if (searchInput) {
        searchInput.addEventListener("keyup", function (e) {
            if (e.key === "Enter") {
                searchMenu();
            }
        });
    }
}
document.addEventListener("DOMContentLoaded", function () {
    Security.init();
    Auth.init();
    document.getElementById("ordersBtn").addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("accountDropdown").classList.remove("show"); // Tutup dropdown
        Modal.openModal("cartModal"); // Buka cart modal
    });
    document.getElementById("accountBtn").addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("accountDropdown").classList.toggle("show");
    });

    document.getElementById("logoutBtn").addEventListener("click", function (e) {
        e.preventDefault();
        Auth.logout();
    });
    document.addEventListener("click", function (e) {
        const dropdown = document.getElementById("accountDropdown");
        const accountBtn = document.getElementById("accountBtn");

        if (dropdown.classList.contains("show") && !dropdown.contains(e.target) && e.target !== accountBtn && !accountBtn.contains(e.target)) {
            dropdown.classList.remove("show");
        }
    });
    Menu.init();
    Modal.init();
    Cart.loadCart();

    initMenuSearch();

    function lazyLoadMenuImages() {
        const menuImages = document.querySelectorAll(".menu-image img[data-src]");

        if ("IntersectionObserver" in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute("data-src");
                        if (src) {
                            img.src = src;
                            img.removeAttribute("data-src");
                        }
                        observer.unobserve(img);
                    }
                });
            });

            menuImages.forEach((img) => {
                if (!img.src || img.src === "about:blank") {
                    img.style.backgroundColor = "#f5f5f5";
                    img.style.minHeight = "200px";
                }
                imageObserver.observe(img);
            });
        } else {
            menuImages.forEach((img) => {
                const src = img.getAttribute("data-src");
                if (src) {
                    img.src = src;
                    img.removeAttribute("data-src");
                }
            });
        }
    }
    window.addEventListener("load", function () {
        const loadingOverlay = document.getElementById("loadingOverlay");
        loadingOverlay.style.opacity = "0";
        loadingOverlay.style.transition = "opacity 0.5s";
        setTimeout(() => {
            loadingOverlay.style.display = "none";
        }, 500);
        lazyLoadMenuImages();
        document.getElementById("currentYear").textContent = new Date().getFullYear();
    });
    function loadScript(src, async = true, defer = true) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = async;
            script.defer = defer;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    Cart.addItem = function (id, name, price, img) {
        if (!img || img.trim() === "") {
            img = "https://via.placeholder.com/60x60?text=Gambar";
        }
        const existingItem = this.items.find((item) => item.id === id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                id: id,
                name: name,
                price: price,
                img: img,
                quantity: 1,
            });
        }

        this.updateCartCount();
        this.updateCartModal();
        this.saveCart();
        const cartIcon = document.querySelector(".cart-icon");
        cartIcon.classList.add("pulse");
        setTimeout(() => {
            cartIcon.classList.remove("pulse");
        }, 500);
        showToast(`${name} ditambahkan ke keranjang!`, "success");
    };

    setTimeout(() => {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = "https://images.unsplash.com";
        document.head.appendChild(link);
        document.querySelectorAll("nav a").forEach((link) => {
            link.addEventListener("click", function (e) {
                const target = this.getAttribute("href");
                if (target === "#tentang" || target === "#kontak") {
                    const section = document.querySelector(target);
                    if (section && !section.dataset.loaded) {
                        section.dataset.loaded = "true";
                        section.querySelectorAll("img[data-src]").forEach((img) => {
                            img.src = img.dataset.src;
                            img.removeAttribute("data-src");
                        });
                    }
                }
            });
        });
    }, 1000);
    lazyLoadMenuImages();
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            const href = this.getAttribute("href");
            if (href === "#") {
                return;
            }

            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        });
    });
});
function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");
    const toastIcon = document.getElementById("toast-icon");
    let icon = "fa-info-circle";
    let color = "#3498db";

    if (type === "success") {
        icon = "fa-check-circle";
        color = "#2ecc71";
    } else if (type === "error") {
        icon = "fa-exclamation-circle";
        color = "#e74c3c";
    } else if (type === "warning") {
        icon = "fa-exclamation-triangle";
        color = "#f39c12";
    }

    toastIcon.innerHTML = `<i class="fas ${icon}" style="color: ${color}"></i>`;
    toastMessage.textContent = message;

    toast.style.visibility = "visible";
    toast.style.opacity = "1";
    toast.style.transition = "opacity 0.5s";
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.style.visibility = "hidden";
        }, 500);
    }, 3000);
}
