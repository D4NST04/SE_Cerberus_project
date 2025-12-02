import React, { useState } from 'react';
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

  const [employees, setEmployees] = useState([
    { id_person: 1, first_name: "Janusz", last_name: "Szefowski", role: "admin", login: "boss" },
    { id_person: 10, first_name: "Michał", last_name: "Programista", role: "manager", login: "dev_mike" },
    { id_person: 1001, first_name: "Marek", last_name: "Operator", role: "employee", login: "worker_01" },
  ]);

  const [logs] = useState([
    { id: 1, time: "2025-11-07 07:55", employee: "Marek Operator", status: "success", info: "Wejście poprawne" },
    { id: 2, time: "2025-11-07 08:01", employee: "Janusz Szefowski", status: "success", info: "Wejście poprawne" },
    { id: 3, time: "2025-11-07 08:15", employee: "Nieznany", status: "error", info: "Błąd rozpoznawania twarzy" },
  ]);

  // --- FUNKCJE LOGIKI (HANDLERS) ---

  const handleDelete = (id) => {
    if (window.confirm("Czy na pewno chcesz zwolnić tego pracownika?")) {
      setEmployees(employees.filter((emp) => emp.id_person !== id));
    }
  };

  // Ta funkcja obsługuje TERAZ zarówno dodawanie jak i edycję
  const handleSaveEmployee = (formData) => {
    if (editingEmployee) {
      // --- SCENARIUSZ 1: EDYCJA ---
      // Tworzymy nową listę, podmieniając tylko tego jednego pracownika
      const updatedList = employees.map((emp) => {
        if (emp.id_person === editingEmployee.id_person) {
          return { ...emp, ...formData }; // Zostawiamy stare ID, nadpisujemy imię/nazwisko
        }
        return emp; // Resztę zostawiamy bez zmian
      });
      setEmployees(updatedList);
    } else {
      // --- SCENARIUSZ 2: DODAWANIE ---
      const newPerson = {
        id_person: Date.now(),
        ...formData,
        photo_path: "placeholder"
      };
      setEmployees([...employees, newPerson]);
    }

    setIsModalOpen(false); // Zamykamy
    setEditingEmployee(null); // Czyścimy
  };

  const handleAddClick = () => {
    setEditingEmployee(null); // Resetujemy edycję (tryb dodawania)
    setIsModalOpen(true);
  };

  const handleEditClick = (employee) => {
    setEditingEmployee(employee); // Zapamiętaj kogo edytujemy
    setIsModalOpen(true);         // Otwórz okno
  };

  const handleGenerateQR = (id) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}`;
    window.open(qrUrl, "_blank", "width=300,height=300");
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
                {/* Przycisk dodawania jest nad tabelą, ale poza komponentem tabeli */}
                <div style={{width: '90%', maxWidth: '1000px', display: 'flex', justifyContent: 'flex-end', marginBottom: '-40px', zIndex: 10, position: 'relative'}}>
                  <button className="btn-add" onClick={handleAddClick}>+ Dodaj Pracownika</button>
                </div>

                <EmployeeTable
                    employees={employees}
                    onDelete={handleDelete}
                    onGenerateQR={handleGenerateQR}
                    onEdit={handleEditClick} // Przekazujemy nową funkcję
                />
              </>
          ) : (
              <LogTable
                  logs={logs}
                  onExport={handleExportCSV}
              />
          )}

          {/* Modal jest zawsze w kodzie, ale wyświetla się tylko gdy isOpen=true */}
          <AddEmployeeModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={handleSaveEmployee} // Tu teraz jest nowa funkcja
              employeeToEdit={editingEmployee} // Przekazujemy dane do edycji
          />

        </header>
      </div>
  );
}

export default App;