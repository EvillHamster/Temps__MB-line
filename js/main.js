import { set, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

export function startApp(database, dbRef) {

    const USERS = [
        { username: 'admin', password: '33002565', role: 'admin' },
        { username: 'operator', password: '12345', role: 'user' }
    ];

    const loginOverlay = document.getElementById('loginOverlay');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    const compounds = [
        { name: 'M1-A00205', min: 140, max: 150 },
        { name: 'M1-A00268', min: 140, max: 150 },
        { name: 'M1-A00517', min: 140, max: 150 },
        { name: 'M1-B00460', min: 140, max: 160 },
        { name: 'M2-R00037', min: 170, max: 180 }
    ];

    const dataList = document.getElementById("compoundList");
    compounds.forEach(c => {
        const option = document.createElement("option");
        option.value = c.name;
        dataList.appendChild(option);
    });

    let currentUserRole = null;

    function getToday() { return new Date().toLocaleDateString("ru-RU"); }

    function addRow(rowData=null) {
        const tbody = document.querySelector("#compoundTable tbody");
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${rowData ? rowData[0] : getToday()}</td>
            <td contenteditable="true">${rowData ? rowData[1] : ""}</td>
            <td><input class="compound-input" list="compoundList" value="${rowData ? rowData[2] : ""}"></td>
            <td class="min-value">${rowData ? rowData[3] : ""}</td>
            <td class="max-value">${rowData ? rowData[4] : ""}</td>
            <td contenteditable="true">${rowData ? rowData[5] : ""}</td>
            <td contenteditable="true">${rowData ? rowData[6] : ""}</td>
            <td contenteditable="true">${rowData ? rowData[7] : ""}</td>
            <td><button class="deleteBtn">✖</button></td>`;
        tbody.appendChild(tr);
        bindRow(tr);
        updatePermissions();
        restoreOutOfRange(tr);
        saveTable();
    }

    function bindRow(tr) {
        const input = tr.querySelector(".compound-input");
        const minCell = tr.querySelector(".min-value");
        const maxCell = tr.querySelector(".max-value");
        const tddCell = tr.children[5];
        const tdpCell = tr.children[6];
        const commentCell = tr.children[7];
        const deleteBtn = tr.querySelector(".deleteBtn");

        input.addEventListener("input", () => {
            const comp = compounds.find(c => c.name === input.value);
            if(comp) { minCell.textContent = comp.min; maxCell.textContent = comp.max; }
            else { minCell.textContent = ""; maxCell.textContent = ""; }
            checkRange(tddCell, comp?.min, comp?.max);
            checkRange(tdpCell, comp?.min, comp?.max);
            saveTable();
        });

        [tddCell, tdpCell, commentCell].forEach(cell => {
            cell.addEventListener("input", () => {
                const min = parseFloat(minCell.textContent);
                const max = parseFloat(maxCell.textContent);
                if(!isNaN(min) && !isNaN(max)) checkRange(cell, min, max);
                saveTable();
            });
        });

        deleteBtn.addEventListener("click", () => {
            if(currentUserRole === 'admin') { tr.remove(); saveTable(); }
        });
    }

    function checkRange(cell, min, max) {
        const val = parseFloat(cell.textContent);
        if(!isNaN(val) && (val < min || val > max)) cell.classList.add("out-of-range");
        else cell.classList.remove("out-of-range");
    }

    function restoreOutOfRange(tr) {
        const input = tr.querySelector(".compound-input");
        const minCell = tr.querySelector(".min-value");
        const maxCell = tr.querySelector(".max-value");
        const tddCell = tr.children[5];
        const tdpCell = tr.children[6];
        const comp = compounds.find(c => c.name === input.value);
        if(comp) { checkRange(tddCell, comp.min, comp.max); checkRange(tdpCell, comp.min, comp.max); }
    }

    function updatePermissions() {
        document.querySelectorAll('.deleteBtn').forEach(b => b.style.display = currentUserRole === 'admin' ? 'inline-block' : 'none');
        document.getElementById('addRowBtn').style.display = 'inline-block';
    }

    function showMain(show) {
        document.querySelector('.main').style.display = show ? 'block' : 'none';
        document.querySelector('.header').style.display = show ? 'block' : 'none';
    }

    function login(username, password) {
        const u = USERS.find(u => u.username === username && u.password === password);
        if(u) { loginOverlay.style.display='none'; showMain(true); currentUserRole=u.role; updatePermissions(); localStorage.setItem("currentUser", JSON.stringify(u)); loadTable(); }
        else loginError.style.display='block';
    }

    loginBtn.addEventListener('click', () => {
        login(document.getElementById('username').value, document.getElementById('password').value);
    });

    document.addEventListener("keydown", (e)=>{ if(e.key==="Enter" && loginOverlay.style.display!=="none") loginBtn.click(); });

    logoutBtn.addEventListener("click", ()=>{
        currentUserRole=null; loginOverlay.style.display='flex'; showMain(false); localStorage.removeItem("currentUser");
    });

    document.getElementById("addRowBtn").addEventListener("click", ()=>addRow());

    // Сортировка по смеси
    let sortAsc = true;
    document.getElementById("sortCompound").addEventListener("click", ()=>{
        const tbody = document.querySelector("#compoundTable tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));
        rows.sort((a,b)=>{
            const aVal = a.querySelector(".compound-input").value.toLowerCase();
            const bVal = b.querySelector(".compound-input").value.toLowerCase();
            return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
        rows.forEach(r => tbody.appendChild(r));
        sortAsc = !sortAsc;
    });

    // ===== Работа с Firebase =====
    function saveTable() {
        const rows=[];
        document.querySelectorAll("#compoundTable tbody tr").forEach(tr=>{
            const c = tr.children;
            rows.push([
                c[0].textContent, c[1].textContent, tr.querySelector(".compound-input").value,
                c[3].textContent, c[4].textContent, c[5].textContent, c[6].textContent, c[7].textContent
            ]);
        });
        set(dbRef, rows);
    }

    function loadTable() {
        onValue(dbRef, snapshot=>{
            const data = snapshot.val()||[];
            const tbody = document.querySelector("#compoundTable tbody");
            tbody.innerHTML='';
            if(data.length===0) addRow();
            else data.forEach(r=>addRow(r));
        });
    }

    const savedUser = JSON.parse(localStorage.getItem("currentUser"));
    if(savedUser) { currentUserRole=savedUser.role; loginOverlay.style.display='none'; showMain(true); updatePermissions(); loadTable(); }
}
