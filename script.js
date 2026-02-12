// ===================================
// GLOBAL DEĞİŞKENLER
// ===================================

const STORAGE_KEY = 'mediaTrackerData';
const THEME_KEY = 'mediaTrackerTheme';

let mediaItems = [];
let editingId = null;
let deleteItemId = null; // Silinecek öğenin ID'si

// ===================================
// ÖRNEK MEDYA VERİTABANI
// Arama yaparken öneri göstermek için
// ===================================



// ===================================
// SAYFA YÜKLENDİĞİNDE ÇALIŞACAK
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    loadTheme(); // Kaydedilmiş temayı yükle
    setupEventListeners();
    renderMediaList(); // İlk render
});

// ===================================
// EVENT LISTENER'LARI KURMA
// ===================================

function setupEventListeners() {
    // Yeni Ekle butonu
    document.getElementById('addBtn').addEventListener('click', openModal);

    // Modal kapatma
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    // Form gönderme
    document.getElementById('mediaForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveMedia();
    });

    // Modal dışına tıklama
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target.id === 'modal') closeModal();
    });

    // Puan slider
    document.getElementById('rating').addEventListener('input', function(e) {
        updateRatingDisplay(e.target.value);
    });

    // Arama kutusu - Otomatik Tamamlama
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        handleSearch(this.value);
        renderMediaList(); // Filtrelenmiş listeyi göster
    });

    // Arama dışına tıklandığında önerileri kapat
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-wrapper')) {
            hideAutocomplete();
        }
    });

    // Filtreler
    document.getElementById('filterType').addEventListener('change', renderMediaList);
    document.getElementById('filterStatus').addEventListener('change', renderMediaList);

    // Tema değiştirme butonu
    document.getElementById('themeToggle').addEventListener('click', changeTheme);

    // Silme Modal butonları
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    
    // Silme modal dışına tıklama
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target.id === 'deleteModal') closeDeleteModal();
    });

    // ÖNEMLİ: Durum değiştiğinde puan ve tarih alanlarını göster/gizle
    document.getElementById('status').addEventListener('change', function() {
        toggleConditionalFields(this.value);
    });

    // Resim yükleme
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    
    // Resmi kaldır butonu
    document.getElementById('removeImage').addEventListener('click', removeImage);
}

// ===================================
// TEMA SİSTEMİ
// 3 Tema: Mor (default), Koyu, Açık
// ===================================

// Mevcut temalar
const themes = ['theme-purple', 'theme-dark', 'theme-light'];
let currentThemeIndex = 0;

// Kaydedilmiş temayı yükle
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        // Kaydedilmiş tema varsa uygula
        document.body.className = savedTheme;
        currentThemeIndex = themes.indexOf(savedTheme);
        if (currentThemeIndex === -1) currentThemeIndex = 0;
    }
}

// Tema değiştir (sırayla döngü)
function changeTheme() {
    // Mevcut temaları temizle
    document.body.className = '';
    
    // Sonraki temaya geç
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const newTheme = themes[currentThemeIndex];
    
    // Yeni temayı uygula (purple için class ekleme)
    if (newTheme !== 'theme-purple') {
        document.body.classList.add(newTheme);
    }
    
    // LocalStorage'a kaydet
    localStorage.setItem(THEME_KEY, newTheme);
    
    // Kullanıcıya bilgi ver (console)
    const themeNames = {
        'theme-purple': 'Mor Gradient 🟣',
        'theme-dark': 'Koyu Mod 🌙',
        'theme-light': 'Açık Mod ☀️'
    };
    console.log('Tema değiştirildi:', themeNames[newTheme]);
}

// ===================================
// OTOMATİK TAMAMLAMA (AUTOCOMPLETE)
// ===================================

function handleSearch(searchText) {
    const autocompleteList = document.getElementById('autocompleteList');

    if (searchText.trim().length < 2) {
        hideAutocomplete();
        return;
    }

    // 🔥 KENDİ EKLEDİKLERİNDE ARA
    const results = mediaItems.filter(item =>
        item.title.toLowerCase().includes(searchText.toLowerCase())
    );

    if (results.length === 0) {
        hideAutocomplete();
        return;
    }

    showAutocomplete(results);
}

function showAutocomplete(results) {
    const autocompleteList = document.getElementById('autocompleteList');

    const typeEmojis = {
        film: '🎬',
        dizi: '📺',
        anime: '🎌',
        manga: '📖',
        kitap: '📚',
        belgesel: '🎥'
    };

    let html = '';

    results.forEach(item => {
        const imgSrc = item.imageData && item.imageData.trim() !== ''
            ? item.imageData
            : ''; // resim yoksa boş bırak

        html += `
            <div class="autocomplete-item" data-id="${item.id}">
                ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(item.title)}">` : `<div class="autocomplete-noimg">${typeEmojis[item.type]}</div>`}
                <div class="autocomplete-info">
                    <div class="autocomplete-title">${escapeHtml(item.title)}</div>
                    <div class="autocomplete-type">${typeEmojis[item.type]} ${item.type}</div>
                </div>
            </div>
        `;
    });

    autocompleteList.innerHTML = html;
    autocompleteList.classList.add('show');

    // Tıklanınca o kaydı düzenlemeye aç
    const items = autocompleteList.querySelectorAll('.autocomplete-item');
    items.forEach(el => {
        el.addEventListener('click', function () {
            const id = parseInt(this.getAttribute('data-id'));
            const item = mediaItems.find(x => x.id === id);
            if (item) {
                hideAutocomplete();
                document.getElementById('searchInput').value = '';
                openModal(item); // direkt senin eklediğin kaydı açar
            }
        });
    });
}


function hideAutocomplete() {
    const autocompleteList = document.getElementById('autocompleteList');
    autocompleteList.classList.remove('show');
    autocompleteList.innerHTML = '';
}

// Otomatik tamamlamadan seçim yapıldığında
function selectAutocompleteItem(title, type, image) {
    // Arama kutusunu temizle
    document.getElementById('searchInput').value = '';
    hideAutocomplete();
    
    // Modal'ı aç ve formu doldur
    openModal();
    document.getElementById('title').value = title;
    document.getElementById('type').value = type;
    
    // Resmi Base64'e çevir ve kaydet (URL'den)
    if (image) {
        // URL'den resmi yükle ve önizleme göster
        document.getElementById('imageData').value = image; // Geçici olarak URL kaydet
        document.getElementById('imagePreview').innerHTML = `<img src="${image}" alt="Önizleme">`;
        document.getElementById('removeImage').style.display = 'block';
    }
}

// ===================================
// LOCALSTORAGE İŞLEMLERİ
// ===================================

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            mediaItems = JSON.parse(data);
        }
    } catch (error) {
        console.error('Veriler yüklenirken hata:', error);
        mediaItems = [];
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mediaItems));
    } catch (error) {
        console.error('Veriler kaydedilirken hata:', error);
        alert('Veriler kaydedilemedi!');
    }
}

// ===================================
// RESİM YÜKLEME (BASE64 OLARAK)
// Mobilde dosya seçimi kolay
// ===================================

function handleImageUpload(event) {
    const file = event.target.files[0];
    
    // Dosya seçilmemişse çık
    if (!file) return;
    
    // Sadece resim dosyaları kabul et
    if (!file.type.startsWith('image/')) {
        alert('Lütfen sadece resim dosyası seçin (JPG, PNG, WebP)');
        return;
    }
    
    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu çok büyük! Maksimum 5MB olmalı.');
        return;
    }
    
    // FileReader ile resmi Base64'e çevir
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        // Gizli input'a Base64 veriyi kaydet
        document.getElementById('imageData').value = base64Image;
        
        // Önizleme göster
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${base64Image}" alt="Önizleme">`;
        
        // Kaldır butonunu göster
        document.getElementById('removeImage').style.display = 'block';
    };
    
    // Dosyayı oku
    reader.readAsDataURL(file);
}

// Yüklenen resmi kaldır
function removeImage() {
    document.getElementById('imageInput').value = '';
    document.getElementById('imageData').value = '';
    document.getElementById('imagePreview').innerHTML = '<span class="preview-placeholder">📷 Resim seçilmedi</span>';
    document.getElementById('removeImage').style.display = 'none';
}

// ===================================
// DURUMA GÖRE ALANLAR GÖSTER/GİZLE
// İzlenmediyse puan sorma mantığı
// ===================================

function toggleConditionalFields(status) {
    const ratingGroup = document.getElementById('ratingGroup');
    const dateFieldsWrapper = document.getElementById('dateFieldsWrapper');
    const endDateGroup = document.getElementById('endDateGroup');
    
    // PUAN ALANI: Sadece "izlendi" veya "yarim" durumunda göster
    if (status === 'izlendi' || status === 'yarim') {
        ratingGroup.style.display = 'block';
    } else {
        ratingGroup.style.display = 'none';
    }
    
    // TARİH ALANLARI
    if (status === 'izlenecek') {
        // İzlenecek: Tarih alanları gizli
        dateFieldsWrapper.style.display = 'none';
    } else if (status === 'devam') {
        // Devam ediyor: Sadece başlama tarihi
        dateFieldsWrapper.style.display = 'block';
        endDateGroup.style.display = 'none';
    } else {
        // İzlendi veya Yarım: Her iki tarih
        dateFieldsWrapper.style.display = 'block';
        endDateGroup.style.display = 'block';
    }
}

// ===================================
// MODAL İŞLEMLERİ - UNDEFINED BUG FIX
// ===================================

function openModal(item = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('mediaForm');
    
    // Formu temizle
    form.reset();
    removeImage(); // Resmi temizle
    
    if (item) {
        // DÜZENLEME MODU
        editingId = item.id;
        modalTitle.textContent = '✏️ Düzenle';
        
        // UNDEFINED BUG FIX: || '' ile boş değer kontrolü
        document.getElementById('title').value = item.title || '';
        document.getElementById('type').value = item.type || 'film';
        document.getElementById('status').value = item.status || 'izlenecek';
        document.getElementById('rating').value = item.rating || 5;
        document.getElementById('notes').value = item.notes || '';
        
        // Tarih alanları
        document.getElementById('startDate').value = item.startDate || '';
        document.getElementById('endDate').value = item.endDate || '';
        
        // Resim varsa göster
        if (item.imageData) {
            document.getElementById('imageData').value = item.imageData;
            document.getElementById('imagePreview').innerHTML = `<img src="${item.imageData}" alt="Önizleme">`;
            document.getElementById('removeImage').style.display = 'block';
        }
        
        updateRatingDisplay(item.rating || 5);
        toggleConditionalFields(item.status || 'izlenecek');
    } else {
        // YENİ EKLEME MODU
        editingId = null;
        modalTitle.textContent = '➕ Yeni İçerik Ekle';
        updateRatingDisplay(5);
        toggleConditionalFields('izlenecek'); // Varsayılan: izlenecek
    }
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
    editingId = null;
}

// ===================================
// PUAN GÖSTERME
// ===================================

function updateRatingDisplay(value) {
    document.getElementById('ratingValue').textContent = value;
    
    const starsDisplay = document.getElementById('starsDisplay');
    let stars = '';
    
    for (let i = 1; i <= 10; i++) {
        stars += i <= value ? '⭐' : '☆';
    }
    
    starsDisplay.textContent = stars;
}

// ===================================
// MEDYA KAYDETME
// Resim, tarih ve puan mantığı dahil
// ===================================

function saveMedia() {
    const title = document.getElementById('title').value.trim();
    const type = document.getElementById('type').value;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value.trim();
    const imageData = document.getElementById('imageData').value; // Base64 resim
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    // Puan: Sadece izlendi/yarım durumunda al
    let rating = 0;
    if (status === 'izlendi' || status === 'yarim') {
        rating = parseInt(document.getElementById('rating').value);
    }
    
    if (!title) {
        alert('Başlık alanı boş bırakılamaz!');
        return;
    }
    
    if (editingId) {
        // GÜNCELLEME
        const index = mediaItems.findIndex(item => item.id === editingId);
        
        if (index !== -1) {
            mediaItems[index] = {
                ...mediaItems[index],
                title,
                type,
                status,
                rating,
                notes,
                imageData,
                startDate,
                endDate,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // YENİ EKLEME
        const newItem = {
            id: Date.now(),
            title,
            type,
            status,
            rating,
            notes,
            imageData,
            startDate,
            endDate,
            createdAt: new Date().toISOString()
        };
        
        mediaItems.push(newItem);
    }
    
    // LocalStorage'a kaydet
    saveToStorage();
    
    // Listeyi ANINDA güncelle
    renderMediaList();
    
    closeModal();
}

// ===================================
// MEDYA SİLME - ÖZEL MODAL İLE
// ===================================

function deleteMedia(id) {
    // Silinecek öğeyi bul
    const item = mediaItems.find(item => item.id === id);
    if (!item) return;
    
    // Silme modalını aç
    deleteItemId = id;
    document.getElementById('deleteItemName').textContent = `"${item.title}"`;
    document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    deleteItemId = null;
}

function confirmDelete() {
    if (deleteItemId) {
        // Öğeyi sil
        mediaItems = mediaItems.filter(item => item.id !== deleteItemId);
        
        // LocalStorage'a kaydet
        saveToStorage();
        
        // Listeyi ANINDA güncelle
        renderMediaList();
        
        // Modal'ı kapat
        closeDeleteModal();
    }
}

// ===================================
// LİSTELEME VE FİLTRELEME
// ===================================

function renderMediaList() {
    const filteredItems = getFilteredItems();
    const mediaList = document.getElementById('mediaList');
    const emptyMessage = document.getElementById('emptyMessage');
    
    // Liste boşsa
    if (filteredItems.length === 0) {
        mediaList.innerHTML = '';
        emptyMessage.classList.add('show');
        return;
    }
    
    emptyMessage.classList.remove('show');
    
    // Kartları oluştur
    let html = '';
    filteredItems.forEach(item => {
        html += createMediaCard(item);
    });
    
    mediaList.innerHTML = html;
    
    // Event listener'ları ekle
    attachCardEventListeners();
}

function getFilteredItems() {
    let filtered = [...mediaItems];
    
    // Arama
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(item => {
            return item.title.toLowerCase().includes(searchTerm) ||
                   (item.notes && item.notes.toLowerCase().includes(searchTerm));
        });
    }
    
    // Tür filtresi
    const filterType = document.getElementById('filterType').value;
    if (filterType !== 'all') {
        filtered = filtered.filter(item => item.type === filterType);
    }
    
    // Durum filtresi
    const filterStatus = document.getElementById('filterStatus').value;
    if (filterStatus !== 'all') {
        filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    // Sıralama (yeniden eskiye)
    filtered.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return filtered;
}

// ===================================
// MEDYA KARTI OLUŞTURMA
// Netflix/IMDb Tarzı + Duruma Göre Puan
// ===================================

function createMediaCard(item) {
    const typeEmojis = {
        film: '🎬',
        dizi: '📺',
        anime: '🎌',
        manga: '📖',
        kitap: '📚',
        belgesel: '🎥'
    };
    
    const statusLabels = {
        izlendi: '✅ İzlendi/Okundu',
        izlenecek: '⏰ İzlenecek/Okunacak',
        devam: '🔄 Devam Ediyor',
        yarim: '❌ Yarım Bırakıldı'
    };
    
    // PUAN GÖSTERME MANTIKI
    let ratingHTML = '';
    
    if (item.status === 'izlendi' || item.status === 'yarim') {
        // İzlendi/Yarım: Yıldızlarla puan göster
        let stars = '';
        for (let i = 1; i <= 10; i++) {
            stars += i <= item.rating ? '⭐' : '☆';
        }
        ratingHTML = `<div class="card-rating card-rating-stars">${stars} <strong>${item.rating}/10</strong></div>`;
    } else {
        // İzlenecek/Devam: "Henüz puanlanmadı" mesajı
        ratingHTML = `<div class="card-rating card-rating-text">⏳ Henüz puanlanmadı</div>`;
    }
    
    // POSTER RESMİ (Base64 veya Placeholder)
    const imageHTML = item.imageData 
        ? `<div class="card-image-container"><img src="${item.imageData}" alt="${escapeHtml(item.title)}" class="card-image"></div>`
        : `<div class="card-image-container"><div class="card-image-placeholder">${typeEmojis[item.type]}</div></div>`;
    
    // TARİH BİLGİLERİ
    let datesHTML = '';
    if (item.startDate || item.endDate) {
        datesHTML = '<div class="card-dates">';
        if (item.startDate) {
            const formattedStart = formatDate(item.startDate);
            datesHTML += `<div class="card-date-item">📅 Başladı: ${formattedStart}</div>`;
        }
        if (item.endDate) {
            const formattedEnd = formatDate(item.endDate);
            datesHTML += `<div class="card-date-item">🏁 Bitti: ${formattedEnd}</div>`;
        }
        datesHTML += '</div>';
    }
    
    // NOTLAR
    const notesHTML = item.notes 
        ? `<div class="card-notes">${escapeHtml(item.notes)}</div>` 
        : '';
    
    return `
        <div class="media-card">
            ${imageHTML}
            <div class="card-body">
                <div class="card-header">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                </div>
                
                <div class="card-meta">
                    <span class="status-badge status-${item.status}">
                        ${statusLabels[item.status]}
                    </span>
                    <div class="card-type">${typeEmojis[item.type]}</div>
                </div>
                
                ${ratingHTML}
                ${datesHTML}
                ${notesHTML}
                
                <div class="card-actions">
                    <button class="edit-btn" data-id="${item.id}">
                        ✏️ Düzenle
                    </button>
                    <button class="delete-btn" data-id="${item.id}">
                        🗑️ Sil
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Tarihi okunabilir formata çevir
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('tr-TR', options);
}

// ===================================
// KART BUTONLARINA EVENT EKLEME
// ===================================

function attachCardEventListeners() {
    // Düzenleme butonları
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const item = mediaItems.find(item => item.id === id);
            if (item) openModal(item);
        });
    });
    
    // Silme butonları
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteMedia(id);
        });
    });
}

// ===================================
// YARDIMCI FONKSİYON
// ===================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================
// KONSOL BİLGİSİ
// ===================================

console.log('🎬 Geliştirilmiş Medya Takip Uygulaması yüklendi!');
console.log('📦 Kayıtlı içerik sayısı:', mediaItems.length);
console.log('💡 Özellikler: Anında render, Özel silme modalı, 3 tema, Akıllı arama, Resimli kartlar');
