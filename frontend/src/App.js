import React, { useState, useEffect } from 'react';
import './App.css';

// Komponenty
import EmployeeTable from './components/EmployeeTable';
import LogTable from './components/LogTable';
import AddEmployeeModal from './components/AddEmployeeModal';

function App() {
  const API_URL = 'http://localhost:8080/api';

  const [activeTab, setActiveTab] = useState('employees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [dbLogs, setDbLogs] = useState([]);       // Godziny pracy
  const [securityLogs, setSecurityLogs] = useState([]); // Logi wejść
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
    fetchWorkHours();
    fetchSecurityLogs();
  }, []);

  // --- POBIERANIE DANYCH ---

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      if (response.ok) setEmployees(await response.json());
    } catch (e) { console.error("Błąd employees:", e); }
    setIsLoading(false);
  };

  const fetchWorkHours = async () => {
    try {
      const response = await fetch(`${API_URL}/hours`);
      if (response.ok) setDbLogs(await response.json());
    } catch (e) { console.error("Błąd hours:", e); }
  };

  const fetchSecurityLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/access_logs`);
      if (response.ok) {
        const data = await response.json();
        setSecurityLogs(data);
      }
    } catch (e) {
      console.error("Błąd logów bezpieczeństwa:", e);
    }
  };

  // --- ZAPISYWANIE (Dwuetapowe: Dane -> ID -> Zdjęcie) ---

  // --- ZAPISYWANIE (Edycja po ID lub Dodawanie nowego) ---

  const handleSaveEmployee = async (fullData) => {
    // 1. Rozdzielamy zdjęcie od reszty danych (bo zdjęcie idzie osobnym strzałem)
    const { photo, ...jsonData } = fullData;

    try {
      let url;
      let method;
      let employeeId;

      if (editingEmployee) {
        // === EDYCJA PRACOWNIKA ===
        // Wykorzystujemy ID, o którym mówił kolega!
        employeeId = editingEmployee.id_person;

        // Adres wskazuje na konkretnego pracownika (np. .../employees/5)
        url = `${API_URL}/employees/${employeeId}`;
        method = 'PATCH'; // Metoda do aktualizacji częściowej

        console.log(`Edytuję pracownika o ID: ${employeeId}`);
      } else {
        // === TWORZENIE NOWEGO ===
        url = `${API_URL}/employees`;
        method = 'POST';
      }

      // KROK 1: Wysyłamy dane tekstowe (Imię, Nazwisko, Rola...)
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Błąd zapisu danych: ${err}`);
      }

      // Jeśli tworzyliśmy nowego, musimy wyciągnąć jego nowe ID z odpowiedzi,
      // żeby wiedzieć, gdzie wysłać zdjęcie.
      if (!editingEmployee) {
        const resData = await response.json();
        if (resData.id_person) {
          employeeId = resData.id_person;
        }
      }

      // KROK 2: Jeśli wybrano zdjęcie (i mamy ID pracownika), wysyłamy je teraz
      // To działa zarówno przy dodawaniu, jak i przy edycji (jeśli ktoś zmienił zdjęcie)
      if (photo && employeeId) {
        console.log(`Wysyłam zdjęcie dla ID: ${employeeId}...`);
        const formData = new FormData();
        formData.append("photo", photo);

        // Backend kolegów ma osobny endpoint na zdjęcie: /employees/{id}/photo
        const photoResponse = await fetch(`${API_URL}/employees/${employeeId}/photo`, {
          method: 'POST',
          body: formData
        });

        if (!photoResponse.ok) {
          console.warn("Udało się zapisać dane, ale wystąpił błąd przy zdjęciu.");
        }
      }

      // Sukces - odświeżamy tabelę i zamykamy okno
      await fetchEmployees();
      setIsModalOpen(false);
      setEditingEmployee(null);

    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Czy na pewno chcesz usunąć pracownika?")) {
      try {
        await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
        // Aktualizujemy lokalnie, żeby nie strzelać do API niepotrzebnie
        setEmployees(employees.filter(e => e.id_person !== id));
      } catch (e) { alert("Błąd usuwania"); }
    }
  };

  // --- QR CODES (TERAZ TYLKO PO ID!) ---

  const handleGenerateQR = (employee) => {
    // Prosta logika: QR to po prostu ID pracownika (np. "5")
    const qrContent = employee.id_person.toString();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrContent}`;
    window.open(qrUrl, "_blank", "width=300,height=300");
  };

  const handleDownloadQR = async (employee) => {
    const qrContent = employee.id_person.toString();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrContent}`;
    try {
      const blob = await (await fetch(qrUrl)).blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `QR_${employee.last_name}_${employee.first_name}.png`;
      link.click();
    } catch(e) { window.open(qrUrl); }
  };

  // --- TABELE I WYŚWIETLANIE ---

  const handleExportCSV = () => {
    alert("Funkcja eksportu dostępna wkrótce!");
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id_person === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : `ID: ${id}`;
  };

  const allLogs = [
    ...dbLogs.map(log => ({
      id: `work-${log.id_record}`,
      time: log.time_start,
      employee: getEmployeeName(log.id_employee),
      status: log.time_end ? "✅ Koniec" : "⏳ Praca",
      info: log.time_end ? `Wyjście: ${log.time_end.split('T')[1].substring(0,5)}` : "W trakcie"
    })),
    ...securityLogs.map(log => ({
      id: `sec-${log.id_log}`,
      time: log.timestamp,
      employee: getEmployeeName(log.id_employee),
      status: log.direction === "IN" ? "➡️ WEJŚCIE" : "⬅️ WYJŚCIE",
      info: "Bramka"
    }))
  ].sort((a,b) => new Date(b.time) - new Date(a.time));

  return (
      <div className="App">
        <header className="App-header">
          <h1>🐶 Cerberus - Panel Administratora</h1>

          <div className="tabs">
            <button className={activeTab === 'employees' ? 'tab active' : 'tab'} onClick={() => setActiveTab('employees')}>
              👥 Pracownicy
            </button>
            <button className={activeTab === 'logs' ? 'tab active' : 'tab'} onClick={() => setActiveTab('logs')}>
              📋 Logi i Raporty
            </button>
          </div>

          {activeTab === 'employees' ? (
              <>
                <div style={{width: '90%', maxWidth: '1000px', display: 'flex', justifyContent: 'flex-end', marginBottom: '-40px', zIndex: 10, position: 'relative'}}>
                  <button className="btn-add" onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }}>
                    + Dodaj Pracownika
                  </button>
                </div>
                {isLoading ? <p>Ładowanie...</p> : (
                    <EmployeeTable
                        employees={employees}
                        onDelete={handleDelete}
                        onGenerateQR={handleGenerateQR}
                        onDownloadQR={handleDownloadQR}
                        onEdit={(emp) => { setEditingEmployee(emp); setIsModalOpen(true); }}
                    />
                )}
              </>
          ) : (
              <LogTable logs={allLogs} onExport={handleExportCSV} />
          )}

          <AddEmployeeModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={handleSaveEmployee}
              employeeToEdit={editingEmployee}
          />
        </header>
      </div>
  );
}

export default App;