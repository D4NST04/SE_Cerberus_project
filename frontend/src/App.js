import React, { useState, useEffect } from 'react';
import './App.css';

// Komponenty
import EmployeeTable from './components/EmployeeTable';
import LogTable from './components/LogTable';
import AddEmployeeModal from './components/AddEmployeeModal';

function App() {
  // --- KONFIGURACJA ---
  const API_URL = 'http://localhost:8080/api';

  // --- STAN APLIKACJI ---
  const [activeTab, setActiveTab] = useState('employees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // null = tryb dodawania

  // Dane
  const [employees, setEmployees] = useState([]);
  const [dbLogs, setDbLogs] = useState([]);       // Udane wejścia (Godziny pracy) - to już macie
  const [securityLogs, setSecurityLogs] = useState([]); // Nieudane/Wszystkie próby - to DOPIERO BĘDZIE
  const [isLoading, setIsLoading] = useState(true);

  // --- POBIERANIE DANYCH ---
  useEffect(() => {
    fetchEmployees();
    fetchWorkHours();

    // ODKOMENTUJ TO, jak koledzy zrobią endpoint do logów bezpieczeństwa
    // fetchSecurityLogs();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/employees`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Błąd pobierania pracowników:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkHours = async () => {
    try {
      const response = await fetch(`${API_URL}/hours`); // Tabela 'hours'
      if (response.ok) {
        const data = await response.json();
        setDbLogs(data);
      }
    } catch (error) {
      console.error("Błąd pobierania godzin:", error);
    }
  };

  /* // ODKOMENTUJ TO W PRZYSZŁOŚCI
  const fetchSecurityLogs = async () => {
      try {
          // Endpoint, który zwróci tabelę access_logs (próby wejścia, odrzucenia)
          const response = await fetch(`${API_URL}/access_logs`);
          if (response.ok) {
              const data = await response.json();
              setSecurityLogs(data);
          }
      } catch (e) { console.error(e); }
  };
  */

  // --- AKCJE UŻYTKOWNIKA ---

  const handleDelete = async (id) => {
    if (window.confirm("Czy na pewno chcesz usunąć tego pracownika?")) {
      try {
        // Strzał do API usuwania (jeśli koledzy już dodali DELETE)
        await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });

        // Aktualizacja lokalna
        setEmployees(employees.filter((emp) => emp.id_person !== id));
      } catch (err) {
        console.error("Błąd usuwania:", err);
        alert("Nie udało się usunąć pracownika (czy backend obsługuje DELETE?).");
      }
    }
  };

  // HYBRYDOWA FUNKCJA ZAPISU (Działa z JSON i FormData)
  const handleSaveEmployee = async (dataOrFormData) => {
    // Sprawdzamy, czy formularz przysłał nam FormData (ze zdjęciem) czy zwykły obiekt JSON
    const isMultipart = dataOrFormData instanceof FormData;

    // Jeśli edytujemy, używamy ID. Jeśli dodajemy, endpoint główny.
    const url = editingEmployee
        ? `${API_URL}/employees/${editingEmployee.id_person}`
        : `${API_URL}/employees`;

    const method = editingEmployee ? 'PATCH' : 'POST';

    // Konfiguracja żądania
    const options = {
      method: method,
      // WAŻNE: Przy FormData przeglądarka sama ustawia Content-Type, nie dotykamy tego!
      // Przy JSON musimy ustawić ręcznie.
      headers: isMultipart ? {} : { 'Content-Type': 'application/json' },
      body: isMultipart ? dataOrFormData : JSON.stringify(dataOrFormData)
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Błąd serwera");
      }

      // Odświeżamy listę po sukcesie
      await fetchEmployees();

      // Zamykamy okno
      setIsModalOpen(false);
      setEditingEmployee(null);

    } catch (error) {
      console.error(error);
      alert("Błąd zapisu: " + error.message);
    }
  };

  // --- OBSŁUGA QR ---
  const handleGenerateQR = (employee) => {
    // Jeśli nie ma account_number, używamy id_person jako fallback
    const qrContent = employee.account_number || employee.id_person.toString();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrContent}`;
    window.open(qrUrl, "_blank", "width=300,height=300");
  };

  const handleDownloadQR = async (employee) => {
    const qrContent = employee.account_number || employee.id_person.toString();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrContent}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `QR_${employee.last_name}_${employee.first_name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      window.open(qrUrl, "_blank");
    }
  };

  const handleExportCSV = () => {
    alert("Eksport do CSV zrobisz, jak będziesz miał pełne logi!");
  };

  // --- PRZYGOTOWANIE DANYCH DO TABELI ---

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id_person === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : `ID: ${id}`;
  };

  // Łączymy godziny pracy (dbLogs) z przyszłymi logami bezpieczeństwa (securityLogs)
  // Na razie securityLogs jest puste, więc wyświetli tylko godziny.
  const allLogs = [
    ...dbLogs.map(log => ({
      id: `work-${log.id_record}`,
      time: log.time_start,
      employee: getEmployeeName(log.id_employee),
      status: log.time_end ? "✅ Zakończono" : "⏳ W pracy",
      info: log.time_end ? `Wyjście: ${log.time_end}` : "Pracownik na zmianie"
    })),
    ...securityLogs.map(log => ({
      id: `sec-${log.id}`,
      time: log.timestamp, // Zakładam nazwę pola z przyszłego API
      employee: getEmployeeName(log.employee_id), // Zakładam nazwę pola
      status: log.granted ? "🟢 WEJŚCIE" : "🔴 ODMOWA",
      info: log.granted ? "Weryfikacja OK" : `Powód: ${log.reason || 'Brak uprawnień'}`
    }))
  ].sort((a,b) => new Date(b.time) - new Date(a.time));


  // --- WIDOK (JSX) ---
  return (
      <div className="App">
        <header className="App-header">
          <h1>🐶 Cerberus - Panel Administratora</h1>

          <div className="tabs">
            <button
                className={activeTab === 'employees' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('employees')}
            >
              👥 Pracownicy
            </button>
            <button
                className={activeTab === 'logs' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('logs')}
            >
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

                {isLoading ? (
                    <p>Ładowanie danych z bazy...</p>
                ) : (
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
              <LogTable
                  logs={allLogs}
                  onExport={handleExportCSV}
              />
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