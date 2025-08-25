import { set, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

export function startApp(database, dbRef) {

    // ======= Пользователи =======
    const USERS = [
        { username: 'admin', password: '33002565', role: 'admin' },
        { username: 'operator', password: '12345', role: 'user' }
    ];

    const loginOverlay = document.getElementById('loginOverlay');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentUserRole = null;

    // ======= Компау́нды =======
    const compounds = [
        { name: 'M1-A00205', min: 140, max: 150 },
        { name: 'M1-A00268', min: 140, max: 150 },
        { name: 'M1-A00517', min: 140, max: 150 },
        { name: 'M1-B00460', min: 140, max: 160 },
        { name: 'M2-R00037', min: 170, max: 180 }
    ];

    // Заполнение datalist
    const dataList = document.getElementById("compoundList");
    compounds.forEach(c => {
        const option = document.createElement("option");
        option.value = c.name;
        dataList.appendChild(option);
    });

    // ======= Вспомогательные функции =======
    function getToday() {
        return new Date().toLocaleDateString("ru-RU");
    }

    function checkRange(cell, min, max) {
        const val = parseFloat(cell.textContent);
        if (!isNaN(val) && (val < min || val > max)) {
            cell.classList.add("out-of-range");
        } else {
            cell.classList.remove("out-of-range");
        }
    }

    function restoreOutOfRange(row) {
        const input = row.querySelector(".compound-input");
        const minCell = row.querySelector(".min-value");
        const maxCell = row.querySelector(".max-value");
        const tddCell = row.children[5];
        const tdpCell = row.children[6];
        const compound = compounds.find(c => c.name === input.value);
        if (compound) {
            checkRange(tddCell, compound.min, compound.max);
            checkRange(tdpCell, compound.min, compound.max);
        }
    }

    function showMainContent(show) {
        document.querySelector('.main').style.display = show ? 'block' : 'none';
        document.querySelector('.header').style.display = show ? 'flex' : 'none';
    }

    function updatePermissions() {
        document.querySelectorAll('.deleteBtn').forEach(btn => {
            btn.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none';
        });
        document.getElementById('addRowBtn').style.display = 'inline-block';
    }

    // ======= Таблица =======
    function addRow(rowData = null, initialLoad = false) {
        const tbody = document.querySelector("#compoundTable tbody");
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td class="date-cell">${rowData ? rowData[0] : getToday()}</td>
            <td contenteditable="true">${rowData ? rowData[1] : ""}</td>
            <td><input type="text" class="compound-input" list="compoundList" value="${rowData ? rowData[2] : ""}"></td>
            <td class="min-value">${rowData ? rowData[3] : ""}</td>
            <td class="max-value">${rowData ? rowData[4] : ""}</td>
            <td contenteditable="true">${rowData ? rowData[5] : ""}</td>
            <td contenteditable="true">${rowData ? rowData[6] : ""}</td>
            <td contenteditable="true">${rowData ? rowData[7] : ""}</td>
            <td><button class="deleteBtn">✖</button></td>`;
        tbody.appendChild(newRow);
        bindRow(newRow, initialLoad);
        updatePermissions();
        restoreOutOfRange(newRow);
        if (!initialLoad) saveTable(); // сохраняем только если не инициализация
    }

    function bindRow(row, initialLoad = false) {
        const input = row.querySelector(".compound-input");
        const minCell = row.querySelector(".min-value");
        const maxCell = row.querySelector(".max-value");
        const tddCell = row.children[5];
        const tdpCell = row.children[6];
        const commentCell = row.children[7];
        const deleteBtn = row.querySelector(".deleteBtn");

        input.addEventListener("input", () => {
            const compound = compounds.find(c => c.name === input.value);
            if (compound) {
                minCell.textContent = compound.min;
                maxCell.textContent = compound.max;
            } else {
                minCell.textContent = "";
                maxCell.textContent = "";
            }
            checkRange(tddCell, compound?.min, compound?.max);
            checkRange(tdpCell, compound?.min, compound?.max);
            if (!initialLoad) saveTable();
        });

        [tddCell, tdpCell, commentCell].forEach(cell => {
            cell.addEventListener("input", () => {
                const min = parseFloat(minCell.textContent);
                const max = parseFloat(maxCell.textContent);
                if (!isNaN(min) && !isNaN(max)) {
                    checkRange(cell, min, max);
                }
                if (!initialLoad) saveTable();
            });
        });

        deleteBtn.addEventListener("click", () => {
            if (currentUserRole === 'admin') {
                row.remove();
                saveTable();
            }
        });
    }

    // ======= Сортировка =======
    let sortAsc = true;
    document.getElementById("sortCompound").addEventListener("click", () => {
        const tbody = document.querySelector("#compoundTable tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));
        rows.sort((a, b) => {
            const aVal = a.querySelector(".compound-input").value.toLowerCase();
            const bVal = b.querySelector(".compound-input").value.toLowerCase();
            return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
        rows.forEach(r => tbody.appendChild(r));
        sortAsc = !sortAsc;
    });

    document.getElementById("addRowBtn").addEventListener("click", () => addRow());

    // ======= Авторизация =======
    function login(username, password) {
        const user = USERS.find(u => u.username === username && u.password === password);
        if (user) {
            loginOverlay.style.display = 'none';
            showMainContent(true);
            currentUserRole = user.role;
            updatePermissions();
            localStorage.setItem("currentUser", JSON.stringify(user));
            loadTable();
        } else {
            loginError.style.display = 'block';
        }
    }

    loginBtn.addEventListener('click', () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        login(username, password);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && loginOverlay.style.display !== "none") {
            loginBtn.click();
        }
    });

    logoutBtn.addEventListener("click", () => {
        currentUserRole = null;
        loginOverlay.style.display = 'flex';
        showMainContent(false);
        localStorage.removeItem("currentUser");
    });

    // ======= Firebase =======
    function saveTable() {
        const rows = [];
        document.querySelectorAll("#compoundTable tbody tr").forEach(row => {
            const cells = row.querySelectorAll("td");
            rows.push([
                cells[0].textContent,
                cells[1].textContent,
                row.querySelector(".compound-input").value,
                cells[3].textContent,
                cells[4].textContent,
                cells[5].textContent,
                cells[6].textContent,
                cells[7].textContent
            ]);
        });
        set(dbRef, rows);
    }

    function loadTable() {
        onValue(dbRef, snapshot => {
            const data = snapshot.val() || [];
            const tbody = document.querySelector("#compoundTable tbody");
            tbody.innerHTML = '';
            if (data.length === 0) addRow();
            else data.forEach(rowData => addRow(rowData, true));
        });
    }

    // ======= Автологин =======
    window.addEventListener("DOMContentLoaded", () => {
        const savedUser = JSON.parse(localStorage.getItem("currentUser"));
        if (savedUser) {
            currentUserRole = savedUser.role;
            loginOverlay.style.display = 'none';
            showMainContent(true);
            updatePermissions();
            loadTable();
        } else {
            showMainContent(false);
        }
    });

}
