// Unfortunately, comments are in Polish
import React, { useState, useEffect } from 'react';
import './App.css';

// Importujemy nasze nowe komponenty
import EmployeeTable from './components/EmployeeTable';
import LogTable from './components/LogTable';
import AddEmployeeModal from './components/AddEmployeeModal';

function App() {
  // --- STAN DANYCH ---
  const [activeTab, setActiveTab] = useState('employees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // null = tryb dodawania

  // ZMIANA 1: Zaczynamy od pustej listy. Dane przyjdą z backendu.
  const [employees, setEmployees] = useState([]);

  // Stan ładowania i błędów (opcjonalnie, dla lepszego UX)
  const [isLoading, setIsLoading] = useState(true);

  // ZMIANA 2: Pobieranie danych z API przy starcie
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      // Backend (Rust) wystawia endpoint pod tym adresem:
      const response = await fetch('http://localhost:8080/api/employees');

      if (!response.ok) {
        throw new Error('Błąd pobierania danych z serwera');
      }

      const data = await response.json();
      console.log("Pobrano pracowników:", data);
      setEmployees(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Nie udało się połączyć z backendem:", error);
      // Fallback: Jeśli backend leży, pokaż stare dane testowe, żebyś widział interfejs
      setEmployees([
        { id_person: 1, first_name: "Janusz", last_name: "Szefowski (OFFLINE)", role: "admin", login: "boss" },
        { id_person: 2, first_name: "Błąd", last_name: "Połączenia", role: "error", login: "err" },
      ]);
      setIsLoading(false);
    }
  };

  const [logs] = useState([
    { id: 1, time: "2025-11-07 07:55", employee: "Marek Operator", status: "success", info: "Wejście poprawne" },
    { id: 2, time: "2025-11-07 08:01", employee: "Janusz Szefowski", status: "success", info: "Wejście poprawne" },
    { id: 3, time: "2025-11-07 08:15", employee: "Nieznany", status: "error", info: "Błąd rozpoznawania twarzy" },
  ]);

  // --- FUNKCJE LOGIKI (HANDLERS) ---

  const handleDelete = async (id) => {
    if (window.confirm("Czy na pewno chcesz zwolnić tego pracownika?")) {
      try {
        const response = await fetch(`http://localhost:8080/api/employees/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Błąd usuwania pracownika');
        }

        setEmployees(employees.filter((emp) => emp.id_person !== id));
      } catch (error) {
        console.error("Nie udało się usunąć pracownika:", error);
        alert("Nie udało się usunąć pracownika.");
      }
    }
  };

  // Ta funkcja obsługuje TERAZ zarówno dodawanie jak i edycję
  const handleSaveEmployee = (formData) => {
    // 1. Generujemy bezpieczny, losowy token (np. "36b8f84d-df4e...")
    const qrToken = crypto.randomUUID();

    if (editingEmployee) {
      // --- EDYCJA ---
      const updatedList = employees.map((emp) => {
        if (emp.id_person === editingEmployee.id_person) {
          // Przy edycji zazwyczaj NIE zmieniamy tokena QR, żeby nie drukować karty na nowo.
          // Ale jeśli pole było puste (stary pracownik), to możemy mu je dodać teraz:
          return {
            ...emp,
            ...formData,
            account_number: emp.account_number || qrToken
          };
        }
        return emp;
      });
      setEmployees(updatedList);
    } else {
      // --- DODAWANIE ---
      const newPerson = {
        // Tymczasowe ID dla Reacta (zostanie nadpisane przez SERIAL w bazie)
        id_person: Date.now(),

        ...formData,

        // --- TUTAJ DZIEJE SIĘ MAGIA ---
        account_number: qrToken,  // Zapisujemy UUID w polu konta

        // Reszta pól na null (uzupełni backend/baza)
        face_embedded: null,
        photo_path: null,
        date_of_termination: null
      };

      console.log("Nowy pracownik z tokenem QR:", newPerson);
      setEmployees([...employees, newPerson]);
    }

    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleAddClick = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleGenerateQR = (employee) => {
    // Pobieramy token z pola account_number.
    // Fallback: Jeśli pracownik jest stary i nie ma tokena, użyj id_person, żeby cokolwiek zadziałało.
    const qrContent = employee.account_number || employee.id_person;

    // Generujemy link do obrazka
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrContent}`;

    // Otwieramy w nowym oknie
    window.open(qrUrl, "_blank", "width=300,height=300");
  };

  const handleDownloadQR = async (employee) => {
    // 1. Ustalamy treść kodu (UUID lub ID)
    const qrContent = employee.account_number || employee.id_person;

    // 2. Adres API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrContent}`;

    try {
      // 3. Pobieramy obrazek jako "Blob" (plik binarny)
      const response = await fetch(qrUrl);
      const blob = await response.blob();

      // 4. Tworzymy wirtualny link do pobrania
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(blob);

      // 5. Nadajemy ładną nazwę pliku: QR_Nazwisko_Imie.png
      downloadLink.download = `QR_${employee.last_name}_${employee.first_name}.png`;

      // 6. Klikamy w link programowo i sprzątamy
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

    } catch (error) {
      console.error("Błąd pobierania QR:", error);
      alert("Coś poszło nie tak przy pobieraniu. Otwieram w nowym oknie.");
      // Fallback: jak pobieranie nie zadziała, otwórz po staremu
      window.open(qrUrl, "_blank");
    }
  };

  const handleExportCSV = () => {
    const headers = ["ID,Data,Pracownik,Status,Opis"];
    const csvRows = logs.map(log => `${log.id},${log.time},${log.employee},${log.status},${log.info}`);
    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "raport_cerberus.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- WIDOK ---
  return (
      <div className="App">
        <header className="App-header">
          <h1>🐶 Cerberus - Panel Administratora</h1>

          {/* Nawigacja */}
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

          {/* Zawartość zależna od zakładki */}
          {activeTab === 'employees' ? (
              <>
                <div style={{width: '90%', maxWidth: '1000px', display: 'flex', justifyContent: 'flex-end', marginBottom: '-40px', zIndex: 10, position: 'relative'}}>
                  <button className="btn-add" onClick={handleAddClick}>+ Dodaj Pracownika</button>
                </div>

                {isLoading ? (
                    <p>Ładowanie danych z bazy...</p>
                ) : (
                    <EmployeeTable
                        employees={employees}
                        onDelete={handleDelete}
                        onGenerateQR={handleGenerateQR}
                        onDownloadQR={handleDownloadQR}
                        onEdit={handleEditClick}
                    />
                )}
              </>
          ) : (
              <LogTable
                  logs={logs}
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