let treeData = null;
let selectedNode = null;
let currentSearchQuery = ''; // <-- TAMBAHKAN BARIS INI
let hasUnsavedChanges = false; // <-- TAMBAHKAN INI
let quill;

// Inisialisasi editor Quill
// Fungsi handler yang diberi nama
function onTextChange() {
    if (selectedNode) {
        selectedNode.content = quill.root.innerHTML;
        saveToLocalStorage();
		markUnsavedChanges();//alert unsaved changes

    }
}

window.onload = function () {
    quill = new Quill('#editor', {
        theme: 'snow'
    });

    // Gunakan fungsi bernama di sini
    quill.on('text-change', onTextChange);

    document.getElementById('nodeTitle').addEventListener('input', function () {
        if (selectedNode) {
            selectedNode.title = this.value;
            saveToLocalStorage();
			markUnsavedChanges();//alert unsaved changes
            renderMindMap();
        }
    });

    loadDefaultMindMap();
};

// Load default mind map dari JSON
function loadDefaultMindMap() {
    fetch('mindmap.json')
        .then(res => res.json())
        .then(data => {
            treeData = data;
            autoLoadFromLocalStorage(); // Load dari local storage jika ada
            renderMindMap();
        });
}

// Render mind map dengan D3.js
function renderMindMap() {
    // Simpan transform zoom saat ini agar tidak reset
    let currentTransform = d3.zoomIdentity;
    const svgNode = d3.select('#mindmap svg').node();
    if (svgNode) {
        currentTransform = d3.zoomTransform(svgNode);
    }

    document.getElementById('mindmap').innerHTML = '';

    let width = document.getElementById('mindmap').clientWidth;
    let height = document.getElementById('mindmap').clientHeight;
    
    // Variabel svg utama
    let svgRoot = d3.select('#mindmap').append('svg')
        .attr('width', width)
        .attr('height', height);

    // Grup utama untuk semua elemen, yang akan di-zoom dan di-pan
    let g = svgRoot.append('g');
    
    // Atur zoom dan pan, pastikan double click tidak memicu zoom
    svgRoot.call(d3.zoom()
        .on("zoom", function (event) {
            g.attr("transform", event.transform);
        })
        .filter(event => event.type !== 'dblclick')
    ).on("dblclick.zoom", null);
    
    let root = d3.hierarchy(treeData);
    let treeLayout = d3.tree().size([height, width - 200]);
    treeLayout(root);

    g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x)
        );

    // --- AWAL KODE DRAG AND DROP YANG DIPERBAIKI ---
    let dragNode = null;
    let dropTarget = null;
    let ghost = null; // Variabel untuk ghost element
    
    let node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => {
            let cls = 'node';
            if (selectedNode && selectedNode === d.data) cls += ' selected';
            if (d.data._children) cls += ' collapsed';
            return cls;
        })
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .on('click', (event, d) => {
            event.stopPropagation();
            selectNode(d.data);
            renderMindMap();
        })
        .on('dblclick', (event, d) => {
            event.stopPropagation();
            toggleCollapse(d.data);
            saveToLocalStorage();
			markUnsavedChanges();//alert unsaved changes
            renderMindMap();
        })
        .call(d3.drag()
            .on('start', (event, d) => {
                if (d.data === treeData) return; // Jangan drag root node
                dragNode = d.data;

                // 1. Buat Ghost Element
                ghost = g.append('g')
                    .attr('class', 'ghost-node')
                    .attr('pointer-events', 'none'); // Penting agar tidak mengganggu deteksi target
                ghost.append('circle')
                    .attr('r', 20)
                    .attr('fill', '#ccc')
                    .attr('opacity', 0.7);
                ghost.append('text')
                    .attr('dy', 4)
                    .attr('x', 25)
                    .text(d.data.title)
                    .attr('opacity', 0.8);
            })
            .on('drag', (event) => {
                if (!dragNode) return;
                
                // 2. Perbarui posisi ghost dengan memperhitungkan zoom/pan
                const transform = d3.zoomTransform(svgRoot.node());
                const [mx, my] = transform.invert(d3.pointer(event, svgRoot.node()));
                
                if (ghost) {
                    ghost.attr('transform', `translate(${mx},${my})`);
                }

                // Reset drop target dan highlight
                dropTarget = null;
                d3.selectAll('.node circle').attr('stroke', null);

                // Cari node yang berada di bawah kursor
                g.selectAll('.node').each(function(nd) {
                    // Jangan jadikan diri sendiri atau anak dari node yg di-drag sebagai target
                    let isDescendant = false;
                    let p = nd;
                    while (p) {
                        if (p.data === dragNode) {
                            isDescendant = true;
                            break;
                        }
                        p = p.parent;
                    }
                    if (nd.data === dragNode || isDescendant) return;

                    const bbox = this.getBBox();
                    if (mx > nd.y + bbox.x && mx < nd.y + bbox.x + bbox.width &&
                        my > nd.x + bbox.y && my < nd.x + bbox.y + bbox.height) {
                        
                        dropTarget = nd.data;
                        d3.select(this).select('circle')
                            .attr('stroke', '#e74c3c')
                            .attr('stroke-width', 3);
                    }
                });
            })
            .on('end', () => {
                // 3. Hapus Ghost Element
                if (ghost) {
                    ghost.remove();
                    ghost = null;
                }
                
                d3.selectAll('.node circle').attr('stroke', null);

                if (dragNode && dropTarget && dropTarget !== dragNode) {
                    moveNode(dragNode, dropTarget);
                    saveToLocalStorage();
					markUnsavedChanges();//alert unsaved changes
                    renderMindMap();
                }
                
                dragNode = null;
                dropTarget = null;
            })
        );
    // --- AKHIR KODE DRAG AND DROP ---

    node.append('circle')
        .attr('r', 20);

    node.append('text')
        .attr('dy', 4)
        .attr('x', d => (d.children || d.data._children) ? -25 : 25)
        .style('text-anchor', d => (d.children || d.data._children) ? 'end' : 'start')
        .text(d => d.data.title);
        
    g.attr('transform', currentTransform);
}

// Pilih node untuk diedit
function OLDselectNode(nodeData) {
    selectedNode = nodeData;
    document.getElementById('nodeTitle').value = nodeData.title || '';
    quill.root.innerHTML = nodeData.content || '';
}

function selectNode(nodeData) {
    selectedNode = nodeData;
    document.getElementById('nodeTitle').value = nodeData.title || '';

    // --- MEKANISME PENTING UNTUK MENCEGAH PENYIMPANAN SOROTAN ---
    // 1. Matikan sementara listener auto-save
    quill.off('text-change', onTextChange);

    // 2. Set konten editor seperti biasa
    quill.root.innerHTML = nodeData.content || '';

    // 3. Panggil fungsi untuk menyorot teks jika ada pencarian aktif
    highlightInEditor(currentSearchQuery);

    // 4. Aktifkan kembali listener auto-save setelah jeda singkat.
    // Timeout memastikan semua operasi format Quill selesai.
    setTimeout(() => {
        quill.on('text-change', onTextChange);
    }, 10);
}

// Update node setelah edit
function updateNodeContent() {
    if (!selectedNode) return;
    selectedNode.title = document.getElementById('nodeTitle').value;
    selectedNode.content = quill.root.innerHTML;
    saveToLocalStorage();
			markUnsavedChanges();//alert unsaved changes
    renderMindMap();
}

// Buat mind map baru
function newMindMap() {
    if (!confirm("Mulai mind map baru? Perubahan yang belum disimpan akan hilang.")) return;
    treeData = { title: "Topik Baru", content: "", children: [] };
    selectedNode = null;
    saveToLocalStorage();
			markUnsavedChanges();//alert unsaved changes
    renderMindMap();
}

// Save ke localStorage
function saveToLocalStorage() {
    localStorage.setItem('mindmapData', JSON.stringify(treeData));
}

// Load dari localStorage
function autoLoadFromLocalStorage() {
    let saved = localStorage.getItem('mindmapData');
    if (saved) {
        treeData = JSON.parse(saved);
    }
}

// Save As file JSON
function saveAsMindMap() {
    let blob = new Blob([JSON.stringify(treeData, null, 2)], { type: "application/json" });
    saveAs(blob, "mindmap.json");
	
	// Reset status
    hasUnsavedChanges = false;
    document.title = document.title.replace("* ", "");
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.remove('unsaved');
    }
}

// Save overwrite
function saveMindMap() {
    saveToLocalStorage();
    alert("Mind map disimpan di penyimpanan lokal.");
	// Reset status
    hasUnsavedChanges = false;
    document.title = document.title.replace("* ", "");
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.remove('unsaved');
    }
}

// Open file JSON
function openMindMap(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function (e) {
        treeData = JSON.parse(e.target.result);
        renderMindMap();
        saveToLocalStorage();
				markUnsavedChanges();//alert unsaved changes
    };
    reader.readAsText(file);
	
	// Reset status
    hasUnsavedChanges = false;
    document.title = document.title.replace("* ", "");
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.remove('unsaved');
    }
}

// Export outline ke TXT atau DOCX
// Ganti fungsi lama Anda dengan versi yang lebih canggih ini
function OLDexportOutline(type) {
    if (type === 'txt') {
        // Ekspor ke TXT tetap menggunakan metode lama yang sederhana
        let outlineText = generateOutline(treeData, 0); // Asumsi generateOutline() masih ada
        let blob = new Blob([outlineText], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "mindmap.txt");
        return;
    }

    if (type === 'docx') {
        // --- PROSES BARU UNTUK DOCX ---
        const docChildren = []; // Array untuk menampung semua paragraf
        generateDocxRecursive(treeData, 0, docChildren);

        const doc = new docx.Document({
            // Konfigurasi numbering untuk membuat daftar hierarkis
            numbering: {
                config: [
                    {
                        reference: "mindmap-outline",
                        levels: [
                            { level: 0, format: "decimal", text: "%1.", alignment: "left" },
                            { level: 1, format: "lowerLetter", text: "%2.", alignment: "left", indent: { left: 720 } },
                            { level: 2, format: "lowerRoman", text: "%3.", alignment: "left", indent: { left: 1440 } },
                            { level: 3, format: "decimal", text: "%4.", alignment: "left", indent: { left: 2160 } },
                            // Tambahkan level lebih banyak jika perlu
                        ],
                    },
                ],
            },
            sections: [{
                children: docChildren,
            }],
        });

        docx.Packer.toBlob(doc).then(blob => {
            saveAs(blob, "mindmap-outline.docx");
        });
    }
}

// Ganti fungsi exportOutline Anda dengan versi yang lebih lengkap ini
function exportOutline(type) {
    if (type === 'txt') {
        // Ekspor ke TXT tetap menggunakan metode lama yang sederhana
        let outlineText = generateOutline(treeData, 0); // Asumsi generateOutline() masih ada
        let blob = new Blob([outlineText], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "mindmap.txt");
        return;
    }

    if (type === 'docx') {
        const docChildren = [];
        // Panggil fungsi rekursif dengan parameter baru untuk melacak parent
        generateDocxRecursive(treeData, 0, docChildren, null);

        const doc = new docx.Document({
            // Konfigurasi numbering untuk membuat daftar hierarkis
            numbering: {
                config: [
                    {
                        reference: "mindmap-outline",
                        levels: [
                            { level: 0, format: "decimal", text: "%1.", alignment: "left" },
                            { level: 1, format: "lowerLetter", text: "%2.", alignment: "left", indent: { left: 720 } },
                            { level: 2, format: "lowerRoman", text: "%3.", alignment: "left", indent: { left: 1440 } },
                            { level: 3, format: "decimal", text: "%4.", alignment: "left", indent: { left: 2160 } },
                            // Tambahkan level lebih banyak jika perlu
                        ],
                    },
                ],
            },
			
			
            // --- PENAMBAHAN STYLE BARU ---
            styles: {
                paragraphStyles: [
                    {
                        id: "mainTitle",
                        name: "Main Title",
                        basedOn: "Normal",
                        next: "Normal",
                        run: {
                            size: 32, // Ukuran font 16pt (32 / 2)
                            bold: true,
                        },
                        paragraph: {
                            alignment: "center", // Rata tengah
                            spacing: { after: 240 }, // Spasi setelah paragraf
                        },
                    },
                    {
                        id: "abstractTitle",
                        name: "Abstract Title",
                        basedOn: "Normal",
                        next: "Normal",
                        run: {
                            size: 24, // 12pt
                            bold: true,
                        },
                        paragraph: {
                            spacing: { after: 120 },
                        },
                    },
                ],
            },
            sections: [{
                children: docChildren,
            }],
        });

        docx.Packer.toBlob(doc).then(blob => {
            saveAs(blob, "jurnal-ilmiah.docx");
        });
    }
}



// Fungsi recursive buat outline
/**
 * Fungsi rekursif untuk membuat outline dalam format TXT yang bersih.
 * Menggunakan htmlToPlainText untuk membersihkan konten.
 */
function generateOutline(node, level) {
    let prefix = "  ".repeat(level);
    let text = prefix + (node.title || "Tanpa Judul") + "\n";

    // Cek apakah ada konten yang berarti sebelum memprosesnya
    if (node.content && node.content.trim() !== '<p><br></p>') {
        
        // Gunakan fungsi pembantu baru kita untuk membersihkan konten
        const cleanContent = htmlToPlainText(node.content);

        // Hanya tambahkan konten jika setelah dibersihkan masih ada isinya
        if (cleanContent) {
            // Beri indentasi pada konten agar terlihat rapi di bawah judulnya
            const contentPrefix = "  ".repeat(level + 1);
            // Ganti setiap baris baru di dalam konten dengan baris baru + indentasi
            const indentedContent = contentPrefix + cleanContent.replace(/\n/g, '\n' + contentPrefix);
            text += indentedContent + "\n\n"; // Tambahkan spasi ekstra setelah blok konten
        }
    }

    // Lakukan rekursi untuk anak-anak node (termasuk yang ter-collapse)
    const children = node.children || node._children || [];
    children.forEach(child => {
        text += generateOutline(child, level + 1);
    });

    return text;
}


function addChildNode() {
    if (!selectedNode) {
        alert("Pilih sebuah node terlebih dahulu.");
        return;
    }
    // Jika node ter-collapse, expand dulu
    if (selectedNode._children) {
        selectedNode.children = selectedNode._children;
        selectedNode._children = null;
    }
    if (!selectedNode.children) {
        selectedNode.children = [];
    }
    selectedNode.children.push({
        title: "Node Baru",
        content: "",
        children: []
    });
    saveToLocalStorage();
    renderMindMap();
			markUnsavedChanges();//alert unsaved changes
}

// --- FUNGSI DELETE YANG LEBIH BAIK DAN REKURSIF ---
function deleteNode() {
    if (!selectedNode) {
        alert("Pilih sebuah node terlebih dahulu.");
        return;
    }
    if (selectedNode === treeData) {
        alert("Tidak bisa menghapus node utama.");
        return;
    }

    // Fungsi rekursif untuk mencari dan menghapus node
    function removeNodeRecursive(parent, nodeToRemove) {
        if (!parent.children) return false;
        
        const index = parent.children.indexOf(nodeToRemove);
        if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
        }
        
        // Cari di anak-anaknya
        for (const child of parent.children) {
            if (removeNodeRecursive(child, nodeToRemove)) {
                return true;
            }
        }
        return false;
    }

    removeNodeRecursive(treeData, selectedNode);
    selectedNode = null;
    // Bersihkan editor
    document.getElementById('nodeTitle').value = '';
    quill.setText('');

    saveToLocalStorage();
    renderMindMap();
			markUnsavedChanges();//alert unsaved changes
}


// GANTI FUNGSI LAMA ANDA DENGAN INI
function OLDsearchNode() {
    let query = document.getElementById('searchInput').value.toLowerCase();

    d3.selectAll('.node').classed('search-match', function(d) {
        // Jika query kosong, hapus semua highlight dan kembalikan false
        if (!query) {
            return false;
        }

        // 1. Cek judul node (ini sudah benar)
        const titleMatch = d.data.title && d.data.title.toLowerCase().includes(query);

        // 2. Cek konten node (INI BAGIAN YANG DIPERBAIKI)
        let contentMatch = false;
        if (d.data.content) {
            // Gunakan fungsi pembantu kita untuk mengubah HTML menjadi teks biasa
            const plainTextContent = htmlToPlainText(d.data.content);
            // Lakukan pencarian pada teks yang sudah bersih
            contentMatch = plainTextContent.toLowerCase().includes(query);
        }

        // Kembalikan true jika salah satu cocok
        return titleMatch || contentMatch;
    });
}

function searchNode() {
    // Perbarui variabel global dengan query saat ini
    currentSearchQuery = document.getElementById('searchInput').value.toLowerCase();

    // Jika query kosong, pastikan untuk membersihkan sorotan di editor
    if (!currentSearchQuery && selectedNode) {
        clearEditorHighlight();
    }

    d3.selectAll('.node').classed('search-match', function(d) {
        if (!currentSearchQuery) {
            return false;
        }
        const titleMatch = d.data.title && d.data.title.toLowerCase().includes(currentSearchQuery);
        let contentMatch = false;
        if (d.data.content) {
            const plainTextContent = htmlToPlainText(d.data.content);
            contentMatch = plainTextContent.toLowerCase().includes(currentSearchQuery);
        }
        return titleMatch || contentMatch;
    });

    // Jika node yang sedang dipilih saat ini masih cocok dengan pencarian baru,
    // perbarui sorotannya di editor secara langsung.
    if (selectedNode && currentSearchQuery) {
        highlightInEditor(currentSearchQuery);
    }
}

/**
 * Menghapus semua sorotan latar belakang dari editor Quill.
 */
function clearEditorHighlight() {
    // Format seluruh dokumen dengan latar belakang default (null/false)
    quill.formatText(0, quill.getLength(), 'background', false);
}

/**
 * Menemukan dan menyorot semua kemunculan query di dalam editor Quill.
 * @param {string} query - Teks yang akan dicari dan disorot.
 */
function highlightInEditor(query) {
    // Pastikan untuk membersihkan sorotan sebelumnya terlebih dahulu
    clearEditorHighlight();

    if (!query) return;

    const text = quill.getText().toLowerCase();
    let matchIndex = text.indexOf(query);

    while (matchIndex !== -1) {
        // Beri warna latar belakang pada teks yang cocok
        quill.formatText(matchIndex, query.length, 'background', '#fff3cd'); // Warna kuning pastel
        // Cari kemunculan berikutnya
        matchIndex = text.indexOf(query, matchIndex + query.length);
    }
}


function toggleCollapse(node) {
    if (node.children) {
        node._children = node.children;
        node.children = null;
    } else if (node._children) {
        node.children = node._children;
        node._children = null;
    }
}

// --- FUNGSI BARU UNTUK MEMINDAHKAN NODE ---
function moveNode(nodeToMove, newParent) {
    // Fungsi untuk menghapus node dari parent lamanya
    function removeFromParent(parent, node) {
        if (!parent.children) return false;
        
        let index = parent.children.indexOf(node);
        if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
        }
        
        // Cari di anak-anaknya jika tidak ketemu
        for (const child of parent.children) {
            if (removeFromParent(child, node)) {
                return true;
            }
        }
        return false;
    }

    // Hapus node dari posisi lamanya
    removeFromParent(treeData, nodeToMove);

    // Tambahkan node ke parent barunya
    // Jika parent baru ter-collapse, expand dulu
    if (newParent._children) {
        newParent.children = newParent._children;
        newParent._children = null;
    }
    if (!newParent.children) {
        newParent.children = [];
    }
    newParent.children.push(nodeToMove);
			markUnsavedChanges();//alert unsaved changes
}

/**
 * Fungsi rekursif untuk membangun konten DOCX dengan hierarki dan format.
 * @param {object} node - Node mind map saat ini.
 * @param {number} level - Level kedalaman saat ini.
 * @param {Array} docChildren - Array untuk mengumpulkan elemen paragraf.
 */
function NEWOLDgenerateDocxRecursive(node, level, docChildren) {
    // 1. Tambahkan judul node sebagai item daftar bernomor
    if (node.title) {
        docChildren.push(new docx.Paragraph({
            text: node.title,
            numbering: {
                reference: "mindmap-outline", // Referensi ke konfigurasi numbering
                level: level,                // Level indentasi
            },
        }));
    }

    // 2. Tambahkan konten node (dari Quill), dengan parsing HTML
    if (node.content && node.content !== '<p><br></p>') {
        const contentRuns = htmlToDocxRuns(node.content);
        if (contentRuns.length > 0) {
            docChildren.push(new docx.Paragraph({
                children: contentRuns,
                indent: { left: 720 * (level + 1) }, // Beri indentasi manual untuk konten
            }));
        }
    }

    // 3. Lakukan rekursi untuk anak-anak node
    const children = node.children || node._children || [];
    children.forEach(child => {
        generateDocxRecursive(child, level + 1, docChildren);
    });
}



// GANTI SELURUH FUNGSI INI DENGAN VERSI BARU YANG LEBIH PINTAR
/**
 * Fungsi rekursif untuk membangun konten DOCX, sekarang dengan logika gaya kondisional.
 * @param {object} node - Node mind map saat ini.
 * @param {number} level - Level kedalaman saat ini.
 * @param {Array} docChildren - Array untuk mengumpulkan elemen paragraf.
 * @param {object | null} parentNode - Node induk dari node saat ini.
 */
function NEWNEWOLDgenerateDocxRecursive(node, level, docChildren, parentNode) {
    let paragraphOptions = {};


    // --- LOGIKA KONDISIONAL BARU ---
    if (level === 0) {
        // Ini adalah node judul utama
        paragraphOptions.style = "mainTitle";
    } else if (node.title.toLowerCase().includes("abstrak")) {
        // Ini adalah node abstrak
        paragraphOptions.style = "abstractTitle";
    } else {
        // Ini adalah node biasa, gunakan numbering
        paragraphOptions.numbering = {
            reference: "mindmap-outline",
            level: level - 1, // Kurangi satu karena kita tidak menomori judul utama
        };
    }

    // 1. Tambahkan judul node
    if (node.title) {
        paragraphOptions.children = [new docx.TextRun(node.title)];
        docChildren.push(new docx.Paragraph(paragraphOptions));
    }

    // 2. Tambahkan konten node
    if (node.content && node.content.trim() !== '<p><br></p>') {
        const contentRuns = htmlToDocxRuns(node.content);
        if (contentRuns.length > 0) {
            let contentIndent = { left: 720 * level };
            // Jangan beri indentasi pada konten judul utama dan abstrak
            if (level === 0 || node.title.toLowerCase().includes("abstrak")) {
                contentIndent = {};
            }
            docChildren.push(new docx.Paragraph({
                children: contentRuns,
                indent: contentIndent,
				spacing: { after: 200 }, // <-- BARIS INI YANG MEMPERBAIKINYA

            }));
        }
    }

    // 3. Lakukan rekursi untuk anak-anak node
    const children = node.children || node._children || [];
    children.forEach(child => {
        // Kirim 'node' saat ini sebagai parentNode untuk iterasi berikutnya
        generateDocxRecursive(child, level + 1, docChildren, node);
    });
}

// GANTI SELURUH FUNGSI INI DENGAN VERSI YANG BENAR
/**
 * Fungsi rekursif untuk membangun konten DOCX.
 * Sekarang menerapkan numbering otomatis HANYA JIKA judul tidak sudah memiliki nomor.
 * @param {object} node - Node mind map saat ini.
 * @param {number} level - Level kedalaman saat ini.
 * @param {Array} docChildren - Array untuk mengumpulkan elemen paragraf.
 */
function generateDocxRecursive(node, level, docChildren) {
    let paragraphOptions = {};
    const title = node.title || "Tanpa Judul";

    // Regex untuk mendeteksi apakah judul sudah diawali dengan pola penomoran
    const hasExistingNumbering = /^\s*(\d+(\.\d+)*\.|[a-zA-Z]\.)/.test(title);

    // --- LOGIKA KONDISIONAL YANG DIPERBAIKI ---
    if (level === 0) {
        paragraphOptions.style = "mainTitle";
    } else if (title.toLowerCase().includes("abstrak")) {
        paragraphOptions.style = "abstractTitle";
    } else if (hasExistingNumbering) {
        // Jika judul SUDAH punya nomor, JANGAN tambahkan numbering otomatis.
        // Kita hanya perlu mengatur indentasi agar sejajar dengan yang lain.
        paragraphOptions.indent = { left: 720 * (level - 1) };
    } else {
        // Jika judul TIDAK punya nomor, BARU kita tambahkan numbering otomatis.
		// Tapi didisable oleh ROY
        //paragraphOptions.numbering = {
          //  reference: "mindmap-outline",
          //  level: level - 1,
        //};
    }

    // 1. Tambahkan judul node
    paragraphOptions.children = [new docx.TextRun(title)]; // Gunakan judul asli
    docChildren.push(new docx.Paragraph(paragraphOptions));
    
    // 2. Tambahkan konten node
    if (node.content && node.content.trim() !== '<p><br></p>') {
        const contentRuns = htmlToDocxRuns(node.content);
        if (contentRuns.length > 0) {
            let contentIndent = { left: 720 * level };
            if (level === 0 || title.toLowerCase().includes("abstrak")) {
                contentIndent = {};
            }
            
            docChildren.push(new docx.Paragraph({
                children: contentRuns,
                indent: contentIndent,
                spacing: { after: 200 },
            }));
        }
    }

    // 3. Lakukan rekursi untuk anak-anak node
    const children = node.children || node._children || [];
    children.forEach(child => {
        generateDocxRecursive(child, level + 1, docChildren);
    });
}


/**
 * Mengubah string HTML sederhana (dari Quill) menjadi array elemen untuk pustaka docx.
 * SEKARANG MENDUKUNG: <strong>, <em>, <u>, <br>, dan <a> (Hyperlink).
 * @param {string} htmlString - Konten HTML dari node.
 * @returns {Array<docx.TextRun | docx.Hyperlink>} Array dari objek TextRun atau Hyperlink.
 */
/**
 * Mengubah string HTML sederhana (dari Quill) menjadi array elemen untuk pustaka docx.
 * MENDUKUNG: <strong>, <em>, <u>, <br>, dan <a> (Hyperlink).
 * @param {string} htmlString - Konten HTML dari node.
 * @returns {Array<docx.TextRun | docx.ExternalHyperlink>} Array dari objek yang valid.
 */
function htmlToDocxRuns(htmlString) {
    const runs = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    function processNode(node, style = {}) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim() !== "" || node.textContent === " ") {
                runs.push(new docx.TextRun({ text: node.textContent, ...style }));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            let newStyle = { ...style };
            
            switch (node.tagName.toUpperCase()) {
                case 'STRONG':
                case 'B':
                    newStyle.bold = true;
                    node.childNodes.forEach(child => processNode(child, newStyle));
                    break;
                case 'EM':
                case 'I':
                    newStyle.italics = true;
                    node.childNodes.forEach(child => processNode(child, newStyle));
                    break;
                case 'U':
                    newStyle.underline = {};
                    node.childNodes.forEach(child => processNode(child, newStyle));
                    break;
                case 'BR':
                    runs.push(new docx.TextRun({ text: "", break: 1 }));
                    break;
                
                // --- PERBAIKAN UNTUK HYPERLINK ---
                case 'A':
                    const href = node.getAttribute('href');
                    if (href) {
                        // Gunakan docx.ExternalHyperlink dan properti 'children' dalam bentuk array
                        runs.push(
                            new docx.ExternalHyperlink({
                                children: [ // <-- Properti 'children' harus array
                                    new docx.TextRun({
                                        text: node.textContent,
                                        style: "Hyperlink", // Style bawaan untuk teks biru bergaris bawah
                                    }),
                                ],
                                link: href,
                            })
                        );
                    }
                    // Jangan proses anak-anak dari <a> lagi
                    break;
                
                default:
                    node.childNodes.forEach(child => processNode(child, newStyle));
                    break;
            }
        }
    }

    doc.body.childNodes.forEach(child => processNode(child));
    return runs;
}


// Tambahkan fungsi baru ini di mana saja di script.js
function markUnsavedChanges() {
    if (hasUnsavedChanges) return; // Jika sudah ditandai, tidak perlu lakukan lagi

    hasUnsavedChanges = true;
    
    // Tambahkan tanda bintang (*) ke judul tab browser
    if (!document.title.startsWith('*')) {
        document.title = "* " + document.title;
    }
    
    // Ubah tampilan tombol Save As agar menarik perhatian
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.add('unsaved');
    }
}


/**
 * Mengubah string HTML yang kompleks menjadi teks biasa yang bersih.
 * Fungsi ini akan:
 * 1. Mengubah <br> menjadi baris baru.
 * 2. Menggunakan parser DOM untuk menghilangkan semua tag HTML lainnya.
 * 3. Secara otomatis mengubah entitas HTML (seperti &nbsp;) menjadi karakter yang sesuai.
 * 4. Membersihkan spasi dan baris baru yang berlebihan.
 * @param {string} htmlString - Konten HTML dari Quill.
 * @returns {string} Teks biasa yang sudah dibersihkan.
 */
function htmlToPlainText(htmlString) {
    if (!htmlString) return "";

    // 1. Ganti tag <p> dan <br> dengan newline untuk menjaga struktur paragraf.
    // Ini membantu memisahkan blok teks sebelum tag-nya dihilangkan.
    let text = htmlString
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n");

    // 2. Gunakan DOMParser untuk menghilangkan semua tag yang tersisa dan mengubah entitas.
    // Ini adalah langkah paling kuat, karena ia menggunakan mesin browser.
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    text = doc.body.textContent || "";

    // 3. Bersihkan hasil akhir.
    // Ganti beberapa baris baru berturut-turut dengan maksimal dua (untuk spasi antar paragraf).
    text = text.replace(/(\n\s*){3,}/g, '\n\n');
    // Hapus spasi di awal atau akhir.
    text = text.trim();

    return text;
}


window.addEventListener('beforeunload', function (e) {
    if (hasUnsavedChanges) {
        // Baris ini akan memicu dialog konfirmasi bawaan browser
        e.preventDefault(); 
        // Chrome memerlukan returnValue untuk di-set
        e.returnValue = ''; 
    }
});


// Keyboard shortcuts
document.addEventListener('keydown', function (event) {
    const activeElement = document.activeElement;
    const isTyping = activeElement.tagName === 'INPUT' || activeElement.classList.contains('ql-editor');

    if (!isTyping) {
        if (event.ctrlKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveAsMindMap();
        }
        if (event.ctrlKey && event.key.toLowerCase() === 'e') {
            event.preventDefault();
            exportOutline('txt');
        }
        if (event.ctrlKey && event.key.toLowerCase() === 'd') {
            event.preventDefault();
            exportOutline('docx');
        }
        if (event.ctrlKey && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            newMindMap();
        }
    }

    // Tambahkan shortcut untuk delete node
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        if (!isTyping) {
            event.preventDefault();
            if (confirm(`Anda yakin ingin menghapus node "${selectedNode.title}"?`)) {
                deleteNode();
            }
        }
    }
});

//script.01+gemini.2.5 Pro full