import React, { useState, useEffect } from 'react';
import './App.css';

// Komponenty (upewnij się, że pliki istnieją w folderze components/)
import EmployeeTable from './components/EmployeeTable';
import LogTable from './components/LogTable';
import AddEmployeeModal from './components/AddEmployeeModal';
import Login from './components/Login';

function App() {
  const API_URL = 'http://localhost:8080/api';

  // --- STANY APLIKACJI ---
  const [activeTab, setActiveTab] = useState('employees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [dbLogs, setDbLogs] = useState([]);       // Godziny pracy (WorkHours)
  const [securityLogs, setSecurityLogs] = useState([]); // Logi z bramek (AccessLogs)
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- START APLIKACJI ---
  useEffect(() => {
    fetchEmployees();
    fetchWorkHours();
    fetchSecurityLogs();
  }, []);

  // --- POBIERANIE DANYCH ---

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      if (response.ok) {
        setEmployees(await response.json());
      }
    } catch (e) { console.error("Błąd employees:", e); }
    setIsLoading(false);
  };

  const fetchWorkHours = async () => {
    try {
      const response = await fetch(`${API_URL}/hours`);
      if (response.ok) {
        setDbLogs(await response.json());
      }
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

  // --- LOGIKA DO TABELI LOGÓW (Obliczenia i Formatowanie) ---

  const calculateDuration = (start, end) => {
    if (!end) return "W trakcie...";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate; // Różnica w ms

    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);

    return `${diffHrs}h ${diffMins}m`;
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id_person === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : `ID: ${id}`;
  };

  // Łączymy logi pracy i logi bezpieczeństwa w jedną listę
  const allLogs = [
    ...dbLogs.map(log => ({
      id: `work-${log.id_record}`,
      time: log.time_start,
      employee: getEmployeeName(log.id_employee),
      status: log.time_end ? "✅ Koniec zmiany" : "⏳ W pracy",
      info: log.time_end
          ? `Czas pracy: ${calculateDuration(log.time_start, log.time_end)}`
          : "Zmiana trwa"
    })),
    ...securityLogs.map(log => ({
      id: `sec-${log.id_log}`,
      time: log.timestamp,
      employee: getEmployeeName(log.id_employee),
      status: log.direction === "IN" ? "➡️ WEJŚCIE" : "⬅️ WYJŚCIE",
      info: "Log z bramki (Station)"
    }))
  ].sort((a,b) => new Date(b.time) - new Date(a.time));

  // --- OBSŁUGA EKSPORTU CSV ---

  const handleExportCSV = () => {
    if (allLogs.length === 0) {
      alert("Brak danych do wyeksportowania!");
      return;
    }

    const headers = ["ID Logu", "Data i Czas", "Pracownik", "Status", "Informacje"];

    const csvContent = [
      headers.join(","),
      ...allLogs.map(log => {
        return [
          log.id,
          new Date(log.time).toLocaleString(),
          `"${log.employee}"`,
          `"${log.status}"`,
          `"${log.info}"`
        ].join(",");
      })
    ].join("\n");

    // Dodajemy BOM (\uFEFF) dla obsługi polskich znaków w Excelu
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `raport_cerberus_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- ZAPISYWANIE (Edycja / Dodawanie) ---

  const handleSaveEmployee = async (fullData) => {
    const { photo, ...jsonData } = fullData;

    try {
      let url;
      let method;
      let employeeId;

      if (editingEmployee) {
        // === EDYCJA (PATCH) ===
        employeeId = editingEmployee.id_person;
        url = `${API_URL}/employees/${employeeId}`;
        method = 'PATCH';
      } else {
        // === TWORZENIE (POST) ===
        url = `${API_URL}/employees`;
        method = 'POST';
      }

      // KROK 1: Wysyłamy dane tekstowe
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Błąd zapisu danych: ${err}`);
      }

      // Jeśli tworzyliśmy nowego, pobieramy jego ID z odpowiedzi
      if (!editingEmployee) {
        const resData = await response.json();
        if (resData.id_person) {
          employeeId = resData.id_person;
        }
      }

      // KROK 2: Jeśli wybrano zdjęcie (i mamy ID), wysyłamy je
      if (photo && employeeId) {
        console.log(`Wysyłam zdjęcie dla ID: ${employeeId}...`);
        const formData = new FormData();
        formData.append("photo", photo);

        const photoResponse = await fetch(`${API_URL}/employees/${employeeId}/photo`, {
          method: 'POST',
          body: formData
        });

        if (!photoResponse.ok) {
          console.warn("Dane zapisano, ale wystąpił błąd przy wysyłaniu zdjęcia.");
        }
      }

      // Sukces
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
        setEmployees(employees.filter(e => e.id_person !== id));
      } catch (e) { alert("Błąd usuwania"); }
    }
  };

  // --- QR CODES (Generowane z ID) ---

  const handleGenerateQR = (employee) => {
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

  // --- INTERFEJS (JSX) ---

  if (!isAuthenticated) {
    return <Login onLogin={(status) => setIsAuthenticated(status)} />;
  }

  return (
      <div className="App">
        <header className="App-header">
          <div style={{width: '100%', padding: '10px', textAlign: 'right'}}>
            <button
                onClick={() => setIsAuthenticated(false)}
                style={{background: 'red', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer'}}>
              Wyloguj
            </button>
          </div>

          <h1>Cerberus - Panel Administratora</h1>

          {/* ... RESZTA TWOJEGO KODU BEZ ZMIAN ... */}

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